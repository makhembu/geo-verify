/**
 * Server-Side Verification Service
 * 
 * This module contains ALL verification logic that runs on the server.
 * NEVER import this file in client components.
 */

import { createHmac, randomBytes } from 'crypto';
import { 
  Campaign, 
  GPSTelemetry, 
  FraudFlag, 
  VerificationRequest, 
  VerificationResult,
  BusinessHours 
} from '@/types';
import { getDistance } from './geohash';

// ============================================================================
// REPLAY ATTACK PREVENTION (In production, use Redis)
// ============================================================================

// Simple in-memory store - replace with Redis in production
const usedSessionIds = new Map<string, number>(); // sessionId -> timestamp
const recentRedemptions = new Map<string, number>(); // `${userId}-${campaignId}` -> timestamp

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

let lastCleanup = Date.now();

function cleanupExpiredSessions() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  
  for (const [key, timestamp] of usedSessionIds.entries()) {
    if (now - timestamp > SESSION_TTL) {
      usedSessionIds.delete(key);
    }
  }
  
  for (const [key, timestamp] of recentRedemptions.entries()) {
    if (now - timestamp > SESSION_TTL) {
      recentRedemptions.delete(key);
    }
  }
}

// ============================================================================
// SPEED LIMITS FOR FRAUD DETECTION
// ============================================================================

const SPEED_LIMITS = {
  WALKING: 2.5,      // m/s (~9 km/h)
  RUNNING: 6,        // m/s (~21 km/h)
  CYCLING: 12,       // m/s (~43 km/h)
  DRIVING: 35,       // m/s (~126 km/h)
  MAX_POSSIBLE: 100, // m/s (~360 km/h) - airplane
};

// ============================================================================
// FRAUD DETECTION ENGINE
// ============================================================================

export function analyzeTelemetry(
  telemetry: GPSTelemetry[],
  campaign: Campaign,
  userId: string
): { flags: FraudFlag[]; riskScore: number } {
  const flags: FraudFlag[] = [];
  let riskScore = 0;

  if (telemetry.length < 2) {
    flags.push({
      type: 'GPS_SPOOF',
      severity: 'HIGH',
      message: 'Insufficient telemetry data - possible single-point spoof'
    });
    riskScore += 40;
    return { flags, riskScore };
  }

  // Sort by timestamp
  const sorted = [...telemetry].sort((a, b) => a.timestamp - b.timestamp);

  // 1. IMPOSSIBLE SPEED CHECK
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const distance = getDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const timeDelta = (curr.timestamp - prev.timestamp) / 1000;
    
    if (timeDelta > 0) {
      const speed = distance / timeDelta;
      
      if (speed > SPEED_LIMITS.MAX_POSSIBLE) {
        flags.push({
          type: 'IMPOSSIBLE_SPEED',
          severity: 'CRITICAL',
          message: `Teleportation detected: ${Math.round(speed * 3.6)} km/h between readings`,
          data: { speed, distance, timeDelta }
        });
        riskScore += 100;
      } else if (speed > SPEED_LIMITS.DRIVING && distance > 100) {
        flags.push({
          type: 'IMPOSSIBLE_SPEED',
          severity: 'HIGH',
          message: `Suspicious speed: ${Math.round(speed * 3.6)} km/h`,
          data: { speed, distance }
        });
        riskScore += 30;
      }
    }
  }

  // 2. ACCURACY ANOMALY CHECK
  const accuracies = sorted.map(t => t.accuracy);
  const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const hasWildAccuracySwings = accuracies.some(a => Math.abs(a - avgAccuracy) > 50);
  
  if (hasWildAccuracySwings) {
    flags.push({
      type: 'ACCURACY_ANOMALY',
      severity: 'MEDIUM',
      message: 'GPS accuracy fluctuating abnormally',
      data: { avgAccuracy, accuracies }
    });
    riskScore += 20;
  }

  // 3. PERFECT COORDINATES (Spoof Indicator)
  const perfectCoords = sorted.filter(t => 
    t.latitude === sorted[0].latitude && 
    t.longitude === sorted[0].longitude
  );
  if (perfectCoords.length === sorted.length && sorted.length > 5) {
    flags.push({
      type: 'GPS_SPOOF',
      severity: 'CRITICAL',
      message: 'Coordinates are perfectly static - definite spoof',
    });
    riskScore += 100;
  }

  // 4. TIMESTAMP DRIFT CHECK
  const serverTime = Date.now();
  const clientTime = sorted[sorted.length - 1].timestamp;
  const drift = Math.abs(serverTime - clientTime);
  
  if (drift > 60000) {
    flags.push({
      type: 'TIMESTAMP_DRIFT',
      severity: 'MEDIUM',
      message: `Client clock drift: ${Math.round(drift / 1000)}s`,
      data: { drift }
    });
    riskScore += 25;
  }

  // 5. ALTITUDE CONSISTENCY
  const altitudes = sorted.filter(t => t.altitude !== undefined).map(t => t.altitude!);
  if (altitudes.length > 3) {
    const altVariance = Math.max(...altitudes) - Math.min(...altitudes);
    if (altVariance > 500) {
      flags.push({
        type: 'ALTITUDE_MISMATCH',
        severity: 'MEDIUM',
        message: `Altitude variance of ${Math.round(altVariance)}m is suspicious`,
      });
      riskScore += 15;
    }
  }

  // 6. DWELL TIME VERIFICATION
  const timeInZone = sorted.filter(t => {
    const dist = getDistance(t.latitude, t.longitude, campaign.coordinates.lat, campaign.coordinates.lng);
    return dist <= campaign.radius + 20; // 20m grace
  });
  
  const actualDwellTime = timeInZone.length > 1 
    ? (timeInZone[timeInZone.length - 1].timestamp - timeInZone[0].timestamp) / 1000
    : 0;

  if (actualDwellTime < campaign.dwellTimeRequired * 0.8) {
    flags.push({
      type: 'GPS_SPOOF',
      severity: 'HIGH',
      message: `Dwell time ${Math.round(actualDwellTime)}s is below required ${campaign.dwellTimeRequired}s`,
      data: { actualDwellTime, required: campaign.dwellTimeRequired }
    });
    riskScore += 35;
  }

  return { flags, riskScore: Math.min(riskScore, 100) };
}

// ============================================================================
// BUSINESS HOURS VALIDATION
// ============================================================================

const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 0, openTime: '10:00', closeTime: '20:00' },
  { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
  { dayOfWeek: 5, openTime: '08:00', closeTime: '23:00' },
  { dayOfWeek: 6, openTime: '09:00', closeTime: '23:00' },
];

export function isWithinBusinessHours(
  timestamp: number, 
  hours: BusinessHours[] = DEFAULT_BUSINESS_HOURS,
  timezone: string = 'Africa/Nairobi'
): { valid: boolean; message?: string } {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const todayHours = hours.find(h => h.dayOfWeek === dayOfWeek);
  
  if (!todayHours) {
    return { valid: false, message: 'Business closed today' };
  }

  const timeStr = date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: timezone 
  });
  
  if (timeStr < todayHours.openTime || timeStr > todayHours.closeTime) {
    return { 
      valid: false, 
      message: `Business hours are ${todayHours.openTime} - ${todayHours.closeTime}` 
    };
  }

  return { valid: true };
}

// ============================================================================
// SECURE TOTP IMPLEMENTATION (Using crypto module)
// ============================================================================

const TOTP_SECRET = process.env.TOTP_SECRET || 'geoverify-secret-key-change-in-production';
const TOTP_WINDOW = 30000; // 30 seconds

/**
 * Generate a cryptographically secure TOTP code
 */
export function generateTOTP(secret: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const counter = Math.floor(time / TOTP_WINDOW);
  
  const hmac = createHmac('sha256', TOTP_SECRET);
  hmac.update(`${secret}-${counter}`);
  const hash = hmac.digest('hex');
  
  // Take last 6 digits
  const offset = parseInt(hash.slice(-1), 16);
  const code = (parseInt(hash.slice(offset * 2, offset * 2 + 8), 16) % 1000000)
    .toString()
    .padStart(6, '0');
  
  return code;
}

/**
 * Verify a TOTP code within a time window
 */
export function verifyTOTP(code: string, secret: string, windowSize: number = 1): boolean {
  const now = Date.now();
  
  for (let i = -windowSize; i <= windowSize; i++) {
    const timestamp = now + (i * TOTP_WINDOW);
    if (generateTOTP(secret, timestamp) === code) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a secure QR payload for redemption verification
 */
export function generateSecureQRPayload(
  redemptionId: string,
  userId: string,
  campaignId: string
): { payload: string; expiresAt: number } {
  const secret = `${redemptionId}-${userId}-${campaignId}`;
  const totp = generateTOTP(secret);
  const expiresAt = Date.now() + TOTP_WINDOW;
  
  const payload = JSON.stringify({
    rid: redemptionId,
    uid: userId,
    cid: campaignId,
    code: totp,
    exp: expiresAt
  });
  
  return {
    payload: Buffer.from(payload).toString('base64'),
    expiresAt
  };
}

/**
 * Verify a QR payload
 */
export function verifyQRPayload(encodedPayload: string): { 
  valid: boolean; 
  data?: { redemptionId: string; userId: string; campaignId: string };
  error?: string;
} {
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
    
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'QR code expired' };
    }
    
    const secret = `${payload.rid}-${payload.uid}-${payload.cid}`;
    if (!verifyTOTP(payload.code, secret)) {
      return { valid: false, error: 'Invalid verification code' };
    }
    
    return {
      valid: true,
      data: {
        redemptionId: payload.rid,
        userId: payload.uid,
        campaignId: payload.cid
      }
    };
  } catch {
    return { valid: false, error: 'Invalid QR payload' };
  }
}

// ============================================================================
// MAIN VERIFICATION FUNCTION
// ============================================================================

export async function verifyRedemption(
  request: VerificationRequest,
  campaign: Campaign
): Promise<VerificationResult> {
  // Cleanup expired sessions periodically
  cleanupExpiredSessions();
  
  // 1. REPLAY ATTACK CHECK
  if (usedSessionIds.has(request.sessionId)) {
    return {
      success: false,
      error: 'Session already used - possible replay attack',
      riskScore: 100,
      fraudFlags: [{
        type: 'REPLAY_ATTACK',
        severity: 'CRITICAL',
        message: 'Duplicate session ID detected'
      }]
    };
  }

  // 2. RATE LIMITING (1 redemption per campaign per user per 24h)
  const userCampaignKey = `${request.userId}-${request.campaignId}`;
  const lastRedemption = recentRedemptions.get(userCampaignKey);
  if (lastRedemption && Date.now() - lastRedemption < 24 * 60 * 60 * 1000) {
    return {
      success: false,
      error: 'Already redeemed this campaign in the last 24 hours',
      riskScore: 0,
      fraudFlags: []
    };
  }

  // 3. BUSINESS HOURS CHECK (optional - skip if not configured)
  if (campaign.businessHours && campaign.businessHours.length > 0) {
    const hoursCheck = isWithinBusinessHours(
      request.clientTimestamp, 
      campaign.businessHours,
      campaign.timezone
    );
    if (!hoursCheck.valid) {
      return {
        success: false,
        error: hoursCheck.message,
        riskScore: 50,
        fraudFlags: [{
          type: 'BUSINESS_HOURS',
          severity: 'HIGH',
          message: hoursCheck.message || 'Outside business hours'
        }]
      };
    }
  }

  // 4. TELEMETRY ANALYSIS
  const { flags, riskScore } = analyzeTelemetry(request.telemetry, campaign, request.userId);

  // 5. DECISION
  if (riskScore >= 70) {
    return {
      success: false,
      error: 'Verification failed: Suspicious activity detected',
      riskScore,
      fraudFlags: flags
    };
  }

  // 6. SUCCESS - Record session and generate QR
  usedSessionIds.set(request.sessionId, Date.now());
  recentRedemptions.set(userCampaignKey, Date.now());

  const redemptionId = `r_${Date.now()}_${randomBytes(8).toString('hex')}`;
  const { payload, expiresAt } = generateSecureQRPayload(redemptionId, request.userId, request.campaignId);

  return {
    success: true,
    redemptionId,
    totpCode: payload,
    expiresAt,
    riskScore,
    fraudFlags: flags.length > 0 ? flags : undefined
  };
}

// ============================================================================
// SESSION GENERATION
// ============================================================================

export function generateSessionId(): string {
  return `sess_${Date.now()}_${randomBytes(16).toString('hex')}`;
}
