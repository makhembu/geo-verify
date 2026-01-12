'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Calendar,
  Clock,
  Gift,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Grid3X3,
  List,
  X,
  Timer,
  Target
} from 'lucide-react';
import { Campaign, User, Redemption } from '@/types';

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then(mod => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

interface Props {
  user: User;
  onLogout: () => void;
}

export default function DesktopView({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'analytics' | 'redemptions' | 'settings'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [modalOpenTime, setModalOpenTime] = useState<number>(0);

  // Form state for creating campaigns
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    lat: -1.2921,
    lng: 36.8219,
    radius: 100,
    dwellTimeRequired: 30,
    reward: '',
    image: '',
    expiryDays: 7,
  });

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

  // Fetch data
  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then(r => r.json()),
      fetch('/api/redemptions').then(r => r.json()),
    ]).then(([campaignsData, redemptionsData]) => {
      setCampaigns(campaignsData);
      setRedemptions(redemptionsData);
      setIsLoading(false);
    }).catch(err => {
      console.error('Failed to fetch data:', err);
      setIsLoading(false);
    });
  }, []);

  // Create campaign
  const handleCreateCampaign = async () => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCampaign.title,
          description: newCampaign.description,
          coordinates: { lat: newCampaign.lat, lng: newCampaign.lng },
          radius: newCampaign.radius,
          dwellTimeRequired: newCampaign.dwellTimeRequired,
          reward: newCampaign.reward,
          image: newCampaign.image || 'https://images.unsplash.com/photo-1519567242046-7f570eee3ce9?auto=format&fit=crop&w=600&q=80',
          expiryDate: Date.now() + newCampaign.expiryDays * 24 * 60 * 60 * 1000,
          active: true,
        }),
      });

      if (res.ok) {
        const campaign = await res.json();
        setCampaigns(prev => [...prev, campaign]);
        setShowCreateModal(false);
        setNewCampaign({
          title: '',
          description: '',
          lat: -1.2921,
          lng: 36.8219,
          radius: 100,
          dwellTimeRequired: 30,
          reward: '',
          image: '',
          expiryDays: 7,
        });
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const res = await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  // Calculate stats
  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.active).length,
    totalRedemptions: redemptions.length,
    verifiedRedemptions: redemptions.filter(r => r.status === 'verified').length,
    flaggedRedemptions: redemptions.filter(r => r.status === 'flagged').length,
    avgRiskScore: redemptions.length > 0 
      ? Math.round(redemptions.reduce((sum, r) => sum + (r.riskScore || 0), 0) / redemptions.length)
      : 0,
  };

  // Render sidebar
  const renderSidebar = () => (
    <aside className="w-64 bg-zinc-900 text-white min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <MapPin size={20} />
        </div>
        <div>
          <h1 className="font-semibold">GeoVerify</h1>
          <p className="text-xs text-zinc-400">Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {[
          { id: 'campaigns', icon: MapPin, label: 'Campaigns' },
          { id: 'analytics', icon: BarChart3, label: 'Analytics' },
          { id: 'redemptions', icon: Users, label: 'Redemptions' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as typeof activeTab)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white' 
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-zinc-700">
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-zinc-400 capitalize">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );

  // Render campaigns tab
  const renderCampaigns = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Campaigns</h2>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewLayout('list')}
              className={`p-2 rounded-md transition-colors ${
                viewLayout === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <List size={18} />
            </button>
          </div>
          {(user.role === 'business' || user.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Campaign
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <MapPin className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalCampaigns}</p>
              <p className="text-sm text-zinc-500">Total Campaigns</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.activeCampaigns}</p>
              <p className="text-sm text-zinc-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalRedemptions}</p>
              <p className="text-sm text-zinc-500">Redemptions</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <ShieldAlert className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.flaggedRedemptions}</p>
              <p className="text-sm text-zinc-500">Flagged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map View */}
      {leafletLoaded && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="h-80">
            <MapContainer
              center={[-1.2921, 36.8219]}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {campaigns.map(campaign => (
                <React.Fragment key={campaign.id}>
                  <Circle
                    center={[campaign.coordinates.lat, campaign.coordinates.lng]}
                    radius={campaign.radius}
                    pathOptions={{ 
                      color: campaign.active ? '#3b82f6' : '#9ca3af',
                      fillColor: campaign.active ? '#3b82f6' : '#9ca3af',
                      fillOpacity: 0.2
                    }}
                  />
                  <CircleMarker
                    center={[campaign.coordinates.lat, campaign.coordinates.lng]}
                    radius={6}
                    pathOptions={{ 
                      color: campaign.active ? '#3b82f6' : '#9ca3af',
                      fillColor: campaign.active ? '#3b82f6' : '#9ca3af',
                      fillOpacity: 1
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{campaign.title}</strong>
                        <br />
                        {campaign.reward}
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewLayout === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <div 
              key={campaign.id}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedCampaign(campaign);
                setModalOpenTime(Date.now());
                setShowCampaignDetails(true);
              }}
            >
              <div className="relative h-40">
                <img 
                  src={campaign.image} 
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.active 
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-500 text-white'
                  }`}>
                    {campaign.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{campaign.title}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{campaign.description}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Gift size={14} className="text-blue-500" />
                    {campaign.reward}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-orange-500" />
                    {campaign.dwellTimeRequired}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={14} className="text-purple-500" />
                    {(campaign.radius / 1000).toFixed(2)}km
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
                  <span className="text-xs text-zinc-400">
                    Expires: {new Date(campaign.expiryDate).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCampaign(campaign);
                        setModalOpenTime(Date.now());
                        setShowCampaignDetails(true);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Eye size={16} />
                    </button>
                    {(user.role === 'business' || user.role === 'admin') && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCampaign(campaign);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(campaign.id);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View (Table) */}
      {viewLayout === 'list' && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Campaign</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Location</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Radius</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Dwell Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Expires</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {campaigns.map(campaign => (
                <tr key={campaign.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={campaign.image} 
                        alt={campaign.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{campaign.title}</p>
                        <p className="text-sm text-zinc-500">{campaign.reward}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {campaign.coordinates.lat.toFixed(4)}, {campaign.coordinates.lng.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {(campaign.radius / 1000).toFixed(2)}km
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {campaign.dwellTimeRequired}s
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(campaign.expiryDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      campaign.active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                    }`}>
                      {campaign.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setModalOpenTime(Date.now());
                          setShowCampaignDetails(true);
                        }}
                        className="p-1 text-zinc-500 hover:text-blue-600"
                      >
                        <Eye size={16} />
                      </button>
                      {(user.role === 'business' || user.role === 'admin') && (
                        <>
                          <button 
                            onClick={() => setEditingCampaign(campaign)}
                            className="p-1 text-zinc-500 hover:text-green-600"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-1 text-zinc-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render analytics tab
  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Analytics</h2>

      <div className="grid grid-cols-3 gap-6">
        {/* Verification Rate */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-4">Verification Rate</h3>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white">
              {stats.totalRedemptions > 0 
                ? Math.round((stats.verifiedRedemptions / stats.totalRedemptions) * 100)
                : 0}%
            </span>
            <span className="text-green-600 flex items-center gap-1 text-sm mb-1">
              <TrendingUp size={14} />
              +5%
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            {stats.verifiedRedemptions} of {stats.totalRedemptions} verified
          </p>
        </div>

        {/* Fraud Detection */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-4">Fraud Detection</h3>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white">
              {stats.flaggedRedemptions}
            </span>
            <span className="text-yellow-600 flex items-center gap-1 text-sm mb-1">
              <AlertTriangle size={14} />
              Flagged
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            Avg risk score: {stats.avgRiskScore}/100
          </p>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-4">Campaign Health</h3>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white">
              {stats.activeCampaigns}/{stats.totalCampaigns}
            </span>
            <span className="text-blue-600 flex items-center gap-1 text-sm mb-1">
              <CheckCircle size={14} />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="text-blue-600 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">Server-Side Verification Active</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              All location verifications are processed on secure servers with fraud detection. 
              GPS telemetry is analyzed for impossible speeds, coordinate spoofing, and replay attacks.
            </p>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 space-y-1">
              <li>• TOTP codes use HMAC-SHA256 cryptography</li>
              <li>• Session IDs prevent replay attacks</li>
              <li>• Telemetry data deleted after 24 hours</li>
              <li>• GDPR-compliant consent management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Render redemptions tab
  const renderRedemptions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Redemptions</h2>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">
            <option>All Status</option>
            <option>Verified</option>
            <option>Pending</option>
            <option>Flagged</option>
            <option>Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">ID</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Campaign</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">User</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Time</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Risk Score</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
            {redemptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No redemptions yet
                </td>
              </tr>
            ) : (
              redemptions.map(redemption => {
                const campaign = campaigns.find(c => c.id === redemption.campaignId);
                return (
                  <tr key={redemption.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-4 py-3 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                      {redemption.id.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                      {campaign?.title || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {redemption.userId}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(redemption.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          (redemption.riskScore || 0) >= 70 ? 'bg-red-500' :
                          (redemption.riskScore || 0) >= 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {redemption.riskScore || 0}/100
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        redemption.status === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        redemption.status === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                        redemption.status === 'flagged' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {redemption.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render settings tab
  const renderSettings = () => (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h2>

      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Account</h3>
        <div className="flex items-center gap-4">
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
            <p className="text-sm text-zinc-500 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Verification Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Default Dwell Time (seconds)
            </label>
            <input 
              type="number"
              defaultValue={30}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Default Radius (km)
            </label>
            <input 
              type="number"
              defaultValue={100}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Risk Score Threshold
            </label>
            <input 
              type="number"
              defaultValue={70}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Verifications with risk score above this will be automatically rejected
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Data Retention</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Auto-delete telemetry after 24h</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Store device fingerprints (hashed)</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </label>
          <p className="text-xs text-zinc-500">
            GDPR-compliant: Users can request data deletion via the API or mobile app
          </p>
        </div>
      </div>
    </div>
  );

  // Render create campaign modal
  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Create Campaign</h3>
            <button 
              onClick={() => setShowCreateModal(false)}
              className="p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                value={newCampaign.title}
                onChange={e => setNewCampaign(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                placeholder="Campaign title"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
              <textarea
                value={newCampaign.description}
                onChange={e => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                rows={3}
                placeholder="Campaign description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newCampaign.lat}
                  onChange={e => setNewCampaign(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newCampaign.lng}
                  onChange={e => setNewCampaign(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Radius (km)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCampaign.radius / 1000}
                  onChange={e => setNewCampaign(prev => ({ ...prev, radius: parseFloat(e.target.value) * 1000 }))}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Dwell Time (s)</label>
                <input
                  type="number"
                  value={newCampaign.dwellTimeRequired}
                  onChange={e => setNewCampaign(prev => ({ ...prev, dwellTimeRequired: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Reward</label>
              <input
                type="text"
                value={newCampaign.reward}
                onChange={e => setNewCampaign(prev => ({ ...prev, reward: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                placeholder="e.g., Free Coffee"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Image URL</label>
              <input
                type="text"
                value={newCampaign.image}
                onChange={e => setNewCampaign(prev => ({ ...prev, image: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Expires in (days)</label>
              <input
                type="number"
                value={newCampaign.expiryDays}
                onChange={e => setNewCampaign(prev => ({ ...prev, expiryDays: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={!newCampaign.title || !newCampaign.reward}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render campaign details modal
  const renderCampaignDetailsModal = () => {
    if (!showCampaignDetails || !selectedCampaign) return null;

    const campaignRedemptions = redemptions.filter(r => r.campaignId === selectedCampaign.id);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header Image */}
          <div className="relative h-48">
            <img 
              src={selectedCampaign.image} 
              alt={selectedCampaign.title}
              className="w-full h-full object-cover"
            />
            <button 
              onClick={() => {
                setShowCampaignDetails(false);
                setSelectedCampaign(null);
              }}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="absolute top-3 left-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedCampaign.active 
                  ? 'bg-green-500 text-white'
                  : 'bg-zinc-500 text-white'
              }`}>
                {selectedCampaign.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              {selectedCampaign.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {selectedCampaign.description}
            </p>

            {/* Reward Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Gift className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Reward</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">{selectedCampaign.reward}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-purple-500" />
                  <span className="text-xs text-zinc-500">Radius</span>
                </div>
                <p className="font-medium text-zinc-900 dark:text-white">{(selectedCampaign.radius / 1000).toFixed(2)} km</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Timer size={14} className="text-orange-500" />
                  <span className="text-xs text-zinc-500">Dwell Time</span>
                </div>
                <p className="font-medium text-zinc-900 dark:text-white">{selectedCampaign.dwellTimeRequired} seconds</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-green-500" />
                  <span className="text-xs text-zinc-500">Expires</span>
                </div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {new Date(selectedCampaign.expiryDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-zinc-500">
                  {Math.ceil((selectedCampaign.expiryDate - modalOpenTime) / (1000 * 60 * 60 * 24))} days left
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-blue-500" />
                  <span className="text-xs text-zinc-500">Redemptions</span>
                </div>
                <p className="font-medium text-zinc-900 dark:text-white">{campaignRedemptions.length}</p>
              </div>
            </div>

            {/* Location */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} className="text-red-500" />
                <span className="text-xs text-zinc-500">Location</span>
              </div>
              <p className="font-medium text-zinc-900 dark:text-white text-sm">
                {selectedCampaign.coordinates.lat.toFixed(6)}, {selectedCampaign.coordinates.lng.toFixed(6)}
              </p>
              {selectedCampaign.geohash && (
                <p className="text-xs text-zinc-400 mt-1">Geohash: {selectedCampaign.geohash}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCampaignDetails(false);
                  setSelectedCampaign(null);
                }}
                className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Close
              </button>
              {(user.role === 'business' || user.role === 'admin') && (
                <button
                  onClick={() => {
                    setShowCampaignDetails(false);
                    setEditingCampaign(selectedCampaign);
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render edit campaign modal
  const renderEditModal = () => {
    if (!editingCampaign) return null;

    const handleUpdateCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns?id=${editingCampaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingCampaign),
        });

        if (res.ok) {
          const updated = await res.json();
          setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
          setEditingCampaign(null);
        }
      } catch (err) {
        console.error('Failed to update campaign:', err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Edit Campaign</h3>
            <button 
              onClick={() => setEditingCampaign(null)}
              className="p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                value={editingCampaign.title}
                onChange={e => setEditingCampaign(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
              <textarea
                value={editingCampaign.description}
                onChange={e => setEditingCampaign(prev => prev ? { ...prev, description: e.target.value } : null)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingCampaign.coordinates.lat}
                  onChange={e => setEditingCampaign(prev => prev ? { 
                    ...prev, 
                    coordinates: { ...prev.coordinates, lat: parseFloat(e.target.value) } 
                  } : null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingCampaign.coordinates.lng}
                  onChange={e => setEditingCampaign(prev => prev ? { 
                    ...prev, 
                    coordinates: { ...prev.coordinates, lng: parseFloat(e.target.value) } 
                  } : null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Radius (km)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingCampaign.radius / 1000}
                  onChange={e => setEditingCampaign(prev => prev ? { ...prev, radius: parseFloat(e.target.value) * 1000 } : null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Dwell Time (s)</label>
                <input
                  type="number"
                  value={editingCampaign.dwellTimeRequired}
                  onChange={e => setEditingCampaign(prev => prev ? { ...prev, dwellTimeRequired: parseInt(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Reward</label>
              <input
                type="text"
                value={editingCampaign.reward}
                onChange={e => setEditingCampaign(prev => prev ? { ...prev, reward: e.target.value } : null)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Image URL</label>
              <input
                type="text"
                value={editingCampaign.image}
                onChange={e => setEditingCampaign(prev => prev ? { ...prev, image: e.target.value } : null)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="block text-sm text-zinc-600 dark:text-zinc-400">Active</label>
              <input
                type="checkbox"
                checked={editingCampaign.active}
                onChange={e => setEditingCampaign(prev => prev ? { ...prev, active: e.target.checked } : null)}
                className="w-5 h-5"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setEditingCampaign(null)}
              className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateCampaign}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {renderSidebar()}
      
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'campaigns' && renderCampaigns()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'redemptions' && renderRedemptions()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {renderCreateModal()}
      {renderCampaignDetailsModal()}
      {renderEditModal()}
    </div>
  );
}
