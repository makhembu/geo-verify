/**
 * Database Service Layer - Supabase Implementation
 * 
 * This replaces the in-memory storage with Supabase/PostgreSQL backend.
 */

import { Campaign, Redemption, User, Role, Coordinates } from '@/types';
import { encodeGeohash } from './geohash';
import { supabase } from './supabase';

// ============================================================================
// TYPE MAPPERS (Convert between app types and database schema)
// ============================================================================

interface DbCampaign {
  id: string;
  title: string;
  description: string;
  location: string; // PostGIS geography as GeoJSON
  radius: number;
  dwell_time_required: number;
  reward: string;
  image: string | null;
  expiry_date: string;
  active: boolean;
  geohash: string | null;
  created_at: string;
  updated_at: string;
}

interface DbRedemption {
  id: string;
  user_id: string;
  campaign_id: string;
  verified_location: string | null;
  verification_data: any;
  redemption_status: 'pending' | 'verified' | 'redeemed' | 'rejected';
  redemption_code: string | null;
  redeemed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbUser {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// Convert PostGIS point to Coordinates
function parseLocation(geoJson: any): Coordinates {
  if (typeof geoJson === 'string') {
    geoJson = JSON.parse(geoJson);
  }
  const [lng, lat] = geoJson.coordinates;
  return { lat, lng };
}

// Convert Coordinates to PostGIS point format
function formatLocation(coords: Coordinates): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}

// Map database campaign to app Campaign type
function mapDbCampaign(db: DbCampaign): Campaign {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    coordinates: parseLocation(db.location),
    radius: db.radius,
    dwellTimeRequired: db.dwell_time_required,
    reward: db.reward,
    image: db.image || '',
    expiryDate: new Date(db.expiry_date).getTime(),
    active: db.active,
    geohash: db.geohash || undefined,
  };
}

// Map database redemption to app Redemption type
function mapDbRedemption(db: DbRedemption): Redemption {
  return {
    id: db.id,
    userId: db.user_id,
    campaignId: db.campaign_id,
    location: db.verified_location ? parseLocation(db.verified_location) : { lat: 0, lng: 0 },
    status: db.redemption_status === 'redeemed' ? 'verified' : 
            db.redemption_status === 'rejected' ? 'flagged' :
            db.redemption_status,
    timestamp: new Date(db.created_at).getTime(),
    telemetry: db.verification_data?.telemetry,
    riskScore: db.verification_data?.riskScore,
    fraudFlags: db.verification_data?.fraudFlags,
  };
}

// ============================================================================
// CAMPAIGNS API
// ============================================================================

export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('active', true)
    .gt('expiry_date', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    throw new Error(`Failed to fetch campaigns: ${error.message}`);
  }

  return (data || []).map(mapDbCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching campaign:', error);
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }

  return data ? mapDbCampaign(data) : null;
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'geohash'>): Promise<Campaign> {
  const geohash = encodeGeohash(campaign.coordinates.lat, campaign.coordinates.lng, 7);
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      title: campaign.title,
      description: campaign.description,
      location: formatLocation(campaign.coordinates),
      radius: campaign.radius,
      dwell_time_required: campaign.dwellTimeRequired,
      reward: campaign.reward,
      image: campaign.image || null,
      expiry_date: new Date(campaign.expiryDate).toISOString(),
      active: campaign.active,
      geohash,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    throw new Error(`Failed to create campaign: ${error.message}`);
  }

  return mapDbCampaign(data);
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
  const updateData: any = {};
  
  if (updates.title) updateData.title = updates.title;
  if (updates.description) updateData.description = updates.description;
  if (updates.coordinates) {
    updateData.location = formatLocation(updates.coordinates);
    updateData.geohash = encodeGeohash(updates.coordinates.lat, updates.coordinates.lng, 7);
  }
  if (updates.radius !== undefined) updateData.radius = updates.radius;
  if (updates.dwellTimeRequired !== undefined) updateData.dwell_time_required = updates.dwellTimeRequired;
  if (updates.reward) updateData.reward = updates.reward;
  if (updates.image !== undefined) updateData.image = updates.image || null;
  if (updates.expiryDate) updateData.expiry_date = new Date(updates.expiryDate).toISOString();
  if (updates.active !== undefined) updateData.active = updates.active;

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error updating campaign:', error);
    throw new Error(`Failed to update campaign: ${error.message}`);
  }

  return data ? mapDbCampaign(data) : null;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting campaign:', error);
    return false;
  }

  return true;
}

// ============================================================================
// REDEMPTIONS API
// ============================================================================

export async function getRedemptions(filters?: { 
  userId?: string; 
  campaignId?: string; 
  status?: Redemption['status'];
}): Promise<Redemption[]> {
  let query = supabase.from('redemptions').select('*');

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }
  if (filters?.status) {
    // Map app status to database status
    const dbStatus = filters.status === 'flagged' ? 'rejected' : filters.status;
    query = query.eq('redemption_status', dbStatus);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching redemptions:', error);
    throw new Error(`Failed to fetch redemptions: ${error.message}`);
  }

  return (data || []).map(mapDbRedemption);
}

export async function createRedemption(redemption: Omit<Redemption, 'id' | 'timestamp'>): Promise<Redemption> {
  const { data, error } = await supabase
    .from('redemptions')
    .insert({
      user_id: redemption.userId,
      campaign_id: redemption.campaignId,
      verified_location: redemption.location ? formatLocation(redemption.location) : null,
      verification_data: {
        telemetry: redemption.telemetry,
        riskScore: redemption.riskScore,
        fraudFlags: redemption.fraudFlags,
        sessionId: redemption.sessionId,
        deviceFingerprint: redemption.deviceFingerprint,
      },
      redemption_status: redemption.status === 'flagged' ? 'rejected' : redemption.status,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating redemption:', error);
    throw new Error(`Failed to create redemption: ${error.message}`);
  }

  return mapDbRedemption(data);
}

export async function updateRedemption(id: string, updates: Partial<Redemption>): Promise<Redemption | null> {
  const updateData: any = {};
  
  if (updates.status) {
    updateData.redemption_status = updates.status === 'flagged' ? 'rejected' : updates.status;
  }
  if (updates.location) {
    updateData.verified_location = formatLocation(updates.location);
  }
  if (updates.telemetry || updates.riskScore || updates.fraudFlags) {
    updateData.verification_data = {
      telemetry: updates.telemetry,
      riskScore: updates.riskScore,
      fraudFlags: updates.fraudFlags,
      sessionId: updates.sessionId,
      deviceFingerprint: updates.deviceFingerprint,
    };
  }

  const { data, error } = await supabase
    .from('redemptions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error updating redemption:', error);
    throw new Error(`Failed to update redemption: ${error.message}`);
  }

  return data ? mapDbRedemption(data) : null;
}

// ============================================================================
// USERS API
// ============================================================================

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching user:', error);
    return null;
  }

  // Get user's consent
  const { data: consents } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', id)
    .eq('consent_type', 'location_tracking')
    .order('created_at', { ascending: false })
    .limit(1);

  const latestConsent = consents?.[0];

  return {
    id: data.id,
    name: data.name || 'Unknown User',
    role: data.role,
    avatar: `https://picsum.photos/seed/${data.id}/100/100`,
    consentGiven: latestConsent?.granted || false,
    consentTimestamp: latestConsent?.granted_at ? new Date(latestConsent.granted_at).getTime() : undefined,
  };
}

export async function getUserByRole(role: Role): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching user by role:', error);
    return null;
  }

  return getUserById(data.id);
}

export async function updateUserConsent(
  userId: string, 
  consent: boolean
): Promise<User | null> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('user_consents')
    .insert({
      user_id: userId,
      consent_type: 'location_tracking',
      granted: consent,
      granted_at: consent ? now : null,
      revoked_at: !consent ? now : null,
    });

  if (error) {
    console.error('Error updating user consent:', error);
    throw new Error(`Failed to update consent: ${error.message}`);
  }

  return getUserById(userId);
}

// ============================================================================
// ANALYTICS (Read-only aggregations)
// ============================================================================

export async function getRedemptionStats(campaignId?: string): Promise<{
  total: number;
  verified: number;
  flagged: number;
  rejected: number;
  pending: number;
}> {
  let query = supabase.from('redemptions').select('redemption_status', { count: 'exact' });
  
  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching redemption stats:', error);
    return { total: 0, verified: 0, flagged: 0, rejected: 0, pending: 0 };
  }

  const stats = {
    total: data?.length || 0,
    verified: data?.filter(r => r.redemption_status === 'verified' || r.redemption_status === 'redeemed').length || 0,
    flagged: data?.filter(r => r.redemption_status === 'rejected').length || 0,
    rejected: 0, // Legacy status, now mapped to flagged
    pending: data?.filter(r => r.redemption_status === 'pending').length || 0,
  };

  return stats;
}

// ============================================================================
// DATA DELETION (GDPR Compliance)
// ============================================================================

export async function deleteUserData(userId: string): Promise<{
  redemptionsDeleted: number;
  userDeleted: boolean;
}> {
  // Delete all user's redemptions
  const { data: redemptions } = await supabase
    .from('redemptions')
    .delete()
    .eq('user_id', userId)
    .select('id');

  // Delete user consents
  await supabase
    .from('user_consents')
    .delete()
    .eq('user_id', userId);

  // Delete user
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  return {
    redemptionsDeleted: redemptions?.length || 0,
    userDeleted: !userError,
  };
}
