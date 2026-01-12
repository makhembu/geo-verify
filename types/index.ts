export type Role = 'user' | 'staff' | 'business' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  consentGiven?: boolean;
  consentTimestamp?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  coordinates: Coordinates;
  radius: number; // meters
  dwellTimeRequired: number; // seconds
  reward: string;
  image: string;
  expiryDate: number; // timestamp
  active: boolean;
  geohash?: string;
  businessId?: string;
  businessHours?: BusinessHours[];
  timezone?: string;
}

export interface BusinessHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string;  // "09:00"
  closeTime: string; // "22:00"
}

export interface Redemption {
  id: string;
  campaignId: string;
  userId: string;
  timestamp: number;
  status: 'pending' | 'verified' | 'flagged' | 'rejected';
  location: Coordinates;
  sessionId?: string;
  riskScore?: number;
  fraudFlags?: FraudFlag[];
  deviceFingerprint?: string;
  telemetry?: GPSTelemetry[];
}

export interface GPSTelemetry {
  latitude: number;
  longitude: number;
  accuracy: number;        // meters
  altitude?: number;       // meters above sea level
  altitudeAccuracy?: number;
  heading?: number;        // degrees from north (0-360)
  speed?: number;          // meters per second
  timestamp: number;       // Unix timestamp
}

export interface FraudFlag {
  type: 'IMPOSSIBLE_SPEED' | 'GPS_SPOOF' | 'ACCURACY_ANOMALY' | 'TIMESTAMP_DRIFT' | 
        'ALTITUDE_MISMATCH' | 'DEVICE_CLONE' | 'BUSINESS_HOURS' | 'REPLAY_ATTACK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data?: Record<string, unknown>;
}

export interface TelemetrySession {
  sessionId: string;
  userId: string;
  campaignId: string;
  readings: GPSTelemetry[];
  startTime: number;
  deviceFingerprint?: string;
}

export interface VerificationRequest {
  sessionId: string;
  userId: string;
  campaignId: string;
  telemetry: GPSTelemetry[];
  deviceFingerprint: string;
  clientTimestamp: number;
}

export interface VerificationResult {
  success: boolean;
  redemptionId?: string;
  totpCode?: string;
  expiresAt?: number;
  error?: string;
  fraudFlags?: FraudFlag[];
  riskScore: number;
}

export interface ConsentRecord {
  userId: string;
  locationConsent: boolean;
  dataProcessingConsent: boolean;
  timestamp: number;
  ipAddress?: string;
}
