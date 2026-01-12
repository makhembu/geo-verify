'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, 
  Wallet, 
  User as UserIcon, 
  Navigation, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  LogOut, 
  Loader2, 
  RefreshCw, 
  X, 
  Gift, 
  Car, 
  Bike, 
  Footprints, 
  ShieldAlert,
  Grid3X3,
  List
} from 'lucide-react';
import { Campaign, User, GPSTelemetry, VerificationResult } from '@/types';

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then(mod => mod.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
);

interface Props {
  user: User;
  onLogout: () => void;
}

type TravelMode = 'walking' | 'cycling' | 'driving';

// Helper for seconds to readable string
const formatDuration = (seconds: number) => {
  const min = Math.round(seconds / 60);
  if (min < 1) return '< 1 min';
  if (min > 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h} hr ${m} min`;
  }
  return `${min} min`;
};

// Distance Calculation (Haversine)
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Estimate duration based on mode
const getEstimatedDuration = (meters: number, mode: TravelMode): string => {
  const speeds = {
    walking: 5.0,
    cycling: 20.0,
    driving: 45.0
  };
  
  const km = meters / 1000;
  const hours = km / speeds[mode];
  const minutes = Math.round(hours * 60);
  
  if (minutes < 1) return '< 1 min';
  if (minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} hr ${m} min`;
  }
  return `${minutes} min`;
};

// Generate device fingerprint (client-side only)
const generateDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return 'server';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
  ];
  
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export default function MobileView({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'explore' | 'wallet' | 'profile'>('explore');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  
  // Location State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Verification State
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [verifyingCampaign, setVerifyingCampaign] = useState<Campaign | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  // Server-side verification state
  const [telemetryBuffer, setTelemetryBuffer] = useState<GPSTelemetry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [qrPayload, setQrPayload] = useState<{ payload: string; expiresAt: number } | null>(null);
  const [qrCountdown, setQrCountdown] = useState(30);
  const deviceFingerprint = useRef(generateDeviceFingerprint());
  
  // Directions State
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [routeStats, setRouteStats] = useState<{dist: number, time: number} | null>(null);

  // Leaflet CSS loaded flag
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.onload = () => setLeafletLoaded(true);
      document.head.appendChild(link);
    }
  }, []);

  // Fetch campaigns
  useEffect(() => {
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch campaigns:', err);
        setIsLoading(false);
      });
  }, []);

  // Watch GPS position
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(pos.coords.accuracy);
        setLocationError(null);
      },
      (err) => {
        console.error("GPS Error:", err);
        if (err.code === 1) setLocationError("Permission denied. Please enable Location Services.");
        else if (err.code === 2) setLocationError("Position unavailable. Check GPS signal.");
        else if (err.code === 3) setLocationError("GPS request timed out.");
        else setLocationError("Unknown GPS error.");
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 0, 
        timeout: 10000 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch route from OSRM
  useEffect(() => {
    if (!selectedCampaign || !userLocation) {
      setRoutePolyline(null);
      setRouteStats(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        // OSRM demo only reliably supports 'driving' profile
        // We'll fetch the driving route and calculate time based on travel mode
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${selectedCampaign.coordinates.lng},${selectedCampaign.coordinates.lat}?overview=full&geometries=geojson`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Route fetch failed');
        
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRoutePolyline(coords);
          
          // Calculate time based on travel mode and distance
          const distanceKm = route.distance / 1000;
          let timeSeconds: number;
          
          switch (travelMode) {
            case 'walking':
              // Average walking speed: 5 km/h
              timeSeconds = (distanceKm / 5) * 3600;
              break;
            case 'cycling':
              // Average cycling speed: 18 km/h
              timeSeconds = (distanceKm / 18) * 3600;
              break;
            case 'driving':
              // Use OSRM's calculated time for driving (includes traffic patterns)
              timeSeconds = route.duration;
              break;
            default:
              timeSeconds = route.duration;
          }
          
          setRouteStats({ dist: route.distance, time: timeSeconds });
        }
      } catch (err) {
        console.warn("Routing API error:", err);
        setRoutePolyline(null);
        setRouteStats(null);
      }
    };

    const timer = setTimeout(fetchRoute, 500);
    return () => clearTimeout(timer);
  }, [selectedCampaign?.id, userLocation?.lat, userLocation?.lng, travelMode]);

  // Collect GPS telemetry during verification
  useEffect(() => {
    if (!verifyingCampaign || !userLocation || isVerified) return;

    const newReading: GPSTelemetry = {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      accuracy: gpsAccuracy,
      timestamp: Date.now(),
    };

    setTelemetryBuffer(prev => [...prev, newReading]);
  }, [verifyingCampaign, userLocation, gpsAccuracy, isVerified]);

  // Dwell time progress
  useEffect(() => {
    if (!verifyingCampaign || isVerified) return;

    const interval = setInterval(() => {
      setDwellProgress(prev => {
        const next = prev + 1;
        if (next >= verifyingCampaign.dwellTimeRequired) {
          submitVerification();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [verifyingCampaign, isVerified]);

  // QR countdown
  useEffect(() => {
    if (!qrPayload) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((qrPayload.expiresAt - Date.now()) / 1000));
      setQrCountdown(remaining);
      
      if (remaining <= 0) {
        setQrPayload(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrPayload]);

  // Start verification
  const startVerification = async (campaign: Campaign) => {
    if (!userLocation) {
      setVerifyError('Location not available');
      return;
    }

    const distance = getDistance(
      userLocation.lat, 
      userLocation.lng, 
      campaign.coordinates.lat, 
      campaign.coordinates.lng
    );

    if (distance > campaign.radius) {
      setVerifyError(`You are ${(distance / 1000).toFixed(2)}km away. Get within ${(campaign.radius / 1000).toFixed(2)}km to verify.`);
      return;
    }

    // Get session ID from server
    try {
      const res = await fetch('/api/verify');
      const { sessionId: newSessionId } = await res.json();
      setSessionId(newSessionId);
    } catch (err) {
      setVerifyError('Failed to start verification session');
      return;
    }

    setVerifyingCampaign(campaign);
    setDwellProgress(0);
    setTelemetryBuffer([]);
    setVerifyError(null);
    setIsVerified(false);
    setVerificationResult(null);
  };

  // Submit verification to server
  const submitVerification = async () => {
    if (!verifyingCampaign || !sessionId) return;

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: user.id,
          campaignId: verifyingCampaign.id,
          telemetry: telemetryBuffer,
          deviceFingerprint: deviceFingerprint.current,
          clientTimestamp: Date.now(),
        }),
      });

      const result: VerificationResult = await res.json();
      setVerificationResult(result);

      if (result.success) {
        setIsVerified(true);
        setQrPayload({
          payload: result.totpCode!,
          expiresAt: result.expiresAt!,
        });
      } else {
        setVerifyError(result.error || 'Verification failed');
      }
    } catch (err) {
      setVerifyError('Network error during verification');
    }
  };

  // Cancel verification
  const cancelVerification = () => {
    setVerifyingCampaign(null);
    setDwellProgress(0);
    setTelemetryBuffer([]);
    setVerifyError(null);
    setIsVerified(false);
    setSessionId(null);
  };

  // Render campaign card
  const renderCampaignCard = (campaign: Campaign) => {
    const distance = userLocation 
      ? getDistance(userLocation.lat, userLocation.lng, campaign.coordinates.lat, campaign.coordinates.lng)
      : null;
    const isNearby = distance !== null && distance <= campaign.radius;

    return (
      <div 
        key={campaign.id}
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setSelectedCampaign(campaign)}
      >
        <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${campaign.image})` }} />
        <div className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white">{campaign.title}</h3>
            {isNearby && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                Nearby
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{campaign.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {distance !== null ? `${Math.round(distance)}m` : '...'}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {campaign.dwellTimeRequired}s dwell
            </span>
            <span className="flex items-center gap-1">
              <Gift size={12} />
              {campaign.reward}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render verification modal
  const renderVerificationModal = () => {
    if (!verifyingCampaign) return null;

    const progress = (dwellProgress / verifyingCampaign.dwellTimeRequired) * 100;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Verifying Location</h3>
            <button onClick={cancelVerification} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              <X size={20} />
            </button>
          </div>

          {isVerified ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Verified!</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Show this QR code to claim your reward
              </p>
              
              {qrPayload && (
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4">
                  <div className="text-2xl font-mono tracking-wider text-zinc-900 dark:text-white">
                    {qrPayload.payload.slice(0, 20)}...
                  </div>
                  <div className="text-sm text-zinc-500 mt-2">
                    Expires in {qrCountdown}s
                  </div>
                </div>
              )}

              {verificationResult && verificationResult.fraudFlags && verificationResult.fraudFlags.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
                    <ShieldAlert size={16} />
                    <span>Risk score: {verificationResult.riskScore}/100</span>
                  </div>
                </div>
              )}
            </div>
          ) : verifyError ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Verification Failed</h4>
              <p className="text-sm text-red-600 dark:text-red-400">{verifyError}</p>
              <button 
                onClick={cancelVerification}
                className="mt-4 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg text-zinc-900 dark:text-white"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-zinc-200 dark:text-zinc-700"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * progress / 100)}
                    className="text-blue-600 transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                    {verifyingCampaign.dwellTimeRequired - dwellProgress}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Stay in this location for {verifyingCampaign.dwellTimeRequired - dwellProgress} more seconds
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-zinc-500">
                <Navigation size={12} className="animate-pulse" />
                <span>GPS Accuracy: {Math.round(gpsAccuracy)}m</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render campaign detail modal
  const renderCampaignDetail = () => {
    if (!selectedCampaign) return null;

    const distance = userLocation 
      ? getDistance(userLocation.lat, userLocation.lng, selectedCampaign.coordinates.lat, selectedCampaign.coordinates.lng)
      : null;
    const isNearby = distance !== null && distance <= selectedCampaign.radius;

    return (
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
          {/* Header Image */}
          <div 
            className="h-40 bg-cover bg-center relative rounded-t-2xl"
            style={{ backgroundImage: `url(${selectedCampaign.image})` }}
          >
            <button 
              onClick={() => setSelectedCampaign(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedCampaign.title}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">{selectedCampaign.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <MapPin size={20} className="mx-auto text-blue-600" />
                <div className="text-sm font-medium text-zinc-900 dark:text-white mt-1">
                  {distance !== null ? `${Math.round(distance)}m` : '...'}
                </div>
                <div className="text-xs text-zinc-500">Distance</div>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <Clock size={20} className="mx-auto text-green-600" />
                <div className="text-sm font-medium text-zinc-900 dark:text-white mt-1">
                  {selectedCampaign.dwellTimeRequired}s
                </div>
                <div className="text-xs text-zinc-500">Dwell Time</div>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                <Gift size={20} className="mx-auto text-purple-600" />
                <div className="text-sm font-medium text-zinc-900 dark:text-white mt-1 text-xs">
                  {selectedCampaign.reward}
                </div>
                <div className="text-xs text-zinc-500">Reward</div>
              </div>
            </div>

            {/* Travel Mode Selector */}
            <div className="flex gap-2 mt-4">
              {(['walking', 'cycling', 'driving'] as TravelMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setTravelMode(mode)}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm ${
                    travelMode === mode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {mode === 'walking' && <Footprints size={16} />}
                  {mode === 'cycling' && <Bike size={16} />}
                  {mode === 'driving' && <Car size={16} />}
                  <span className="capitalize">{mode}</span>
                </button>
              ))}
            </div>

            {/* Route Info */}
            {routeStats && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    {travelMode === 'walking' && <Footprints size={16} />}
                    {travelMode === 'cycling' && <Bike size={16} />}
                    {travelMode === 'driving' && <Car size={16} />}
                    <span>{(routeStats.dist / 1000).toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {travelMode === 'driving' && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                        Light traffic
                      </span>
                    )}
                    <span className="font-medium text-blue-700 dark:text-blue-400">
                      {formatDuration(routeStats.time)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Map */}
            {leafletLoaded && userLocation && (
              <div className="aspect-square rounded-lg overflow-hidden mt-4">
                <MapContainer
                  center={[userLocation.lat, userLocation.lng]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <CircleMarker
                    center={[userLocation.lat, userLocation.lng]}
                    radius={8}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1 }}
                  />
                  <CircleMarker
                    center={[selectedCampaign.coordinates.lat, selectedCampaign.coordinates.lng]}
                    radius={8}
                    pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }}
                  />
                  {routePolyline && (
                    <Polyline 
                      positions={routePolyline} 
                      pathOptions={{ color: '#3b82f6', weight: 4 }}
                    />
                  )}
                </MapContainer>
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={() => startVerification(selectedCampaign)}
              disabled={!isNearby || !user.consentGiven}
              className={`w-full mt-4 py-3 rounded-xl font-semibold text-white ${
                isNearby && user.consentGiven
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-zinc-400 cursor-not-allowed'
              }`}
            >
              {!user.consentGiven 
                ? 'Enable Location Consent First'
                : isNearby 
                  ? 'Start Verification' 
                  : `Get within ${(selectedCampaign.radius / 1000).toFixed(2)}km to verify`
              }
            </button>

            {verifyError && (
              <p className="text-red-500 text-sm text-center mt-2">{verifyError}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <MapPin className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-white">GeoVerify</h1>
            <p className="text-xs text-zinc-500">Location Verification</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          <LogOut size={20} />
        </button>
      </header>

      {/* Location Status Banner */}
      {locationError && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 text-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          {locationError}
        </div>
      )}

      {!user.consentGiven && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-4 py-2 text-sm">
          ⚠️ Location consent required. Go to Profile to enable.
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 pb-20">
        {activeTab === 'explore' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Nearby Campaigns</h2>
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`p-1.5 rounded-md transition-colors ${viewLayout === 'grid' ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    <Grid3X3 size={16} />
                  </button>
                  <button
                    onClick={() => setViewLayout('list')}
                    className={`p-1.5 rounded-md transition-colors ${viewLayout === 'list' ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    <List size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => fetch('/api/campaigns').then(r => r.json()).then(setCampaigns)}
                  className="text-blue-600 p-1.5"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-600" size={24} />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                No campaigns available
              </div>
            ) : viewLayout === 'grid' ? (
              <div className="grid grid-cols-2 gap-3">
                {campaigns.map(campaign => {
                  const distance = userLocation 
                    ? getDistance(userLocation.lat, userLocation.lng, campaign.coordinates.lat, campaign.coordinates.lng)
                    : null;
                  const isNearby = distance !== null && distance <= campaign.radius;
                  return (
                    <div 
                      key={campaign.id}
                      className="bg-white dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <div className="h-24 bg-cover bg-center relative" style={{ backgroundImage: `url(${campaign.image})` }}>
                        {isNearby && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded-full">
                            Nearby
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-sm text-zinc-900 dark:text-white line-clamp-1">{campaign.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {distance !== null ? `${Math.round(distance)}m` : '...'}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Gift size={10} />
                            {campaign.reward}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(renderCampaignCard)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My Rewards</h2>
            <div className="text-center py-12 text-zinc-500">
              <Wallet size={48} className="mx-auto mb-4 opacity-50" />
              <p>No rewards yet. Complete a verification to earn!</p>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">{user.name}</h3>
                  <p className="text-sm text-zinc-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>

            {/* Consent Toggle */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4">
              <h4 className="font-medium text-zinc-900 dark:text-white mb-3">Privacy & Consent</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Location Access</span>
                  <input 
                    type="checkbox"
                    checked={user.consentGiven}
                    onChange={async (e) => {
                      await fetch('/api/consent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user.id,
                          locationConsent: e.target.checked,
                          dataProcessingConsent: e.target.checked,
                        }),
                      });
                      window.location.reload();
                    }}
                    className="w-5 h-5"
                  />
                </label>
                <p className="text-xs text-zinc-500">
                  We collect GPS data only during verification. Data is processed per our privacy policy and deleted after 24 hours.
                </p>
              </div>
            </div>

            {/* Data Deletion */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4">
              <h4 className="font-medium text-zinc-900 dark:text-white mb-3">Data Management</h4>
              <button 
                onClick={async () => {
                  if (confirm('This will permanently delete all your data. Continue?')) {
                    await fetch(`/api/consent?userId=${user.id}`, { method: 'DELETE' });
                    onLogout();
                  }
                }}
                className="text-red-600 text-sm hover:underline"
              >
                Delete My Data (GDPR)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
        <div className="flex justify-around">
          {[
            { id: 'explore', icon: MapPin, label: 'Explore' },
            { id: 'wallet', icon: Wallet, label: 'Wallet' },
            { id: 'profile', icon: UserIcon, label: 'Profile' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex flex-col items-center py-2 px-4 ${
                activeTab === tab.id 
                  ? 'text-blue-600' 
                  : 'text-zinc-500'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {renderCampaignDetail()}
      {renderVerificationModal()}
    </div>
  );
}
