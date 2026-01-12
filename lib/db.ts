/**
 * Database Service Layer
 * 
 * In production, replace with Supabase, Prisma, or your preferred database.
 * This implementation uses in-memory storage for development.
 */

import { Campaign, Redemption, User, Role, Coordinates } from '@/types';
import { encodeGeohash } from './geohash';

// ============================================================================
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================================

const futureDate = (days: number) => Date.now() + 1000 * 60 * 60 * 24 * days;

// Seed data with Kenya locations
const campaignsStore: Map<string, Campaign> = new Map([
  ['c_1', {
    id: 'c_1',
    title: 'Java House Kimathi St',
    description: 'Enjoy Nairobi\'s finest coffee in the CBD. Verify your visit to get a free upgrade on your next order.',
    coordinates: { lat: -1.2842, lng: 36.8252 },
    radius: 40,
    dwellTimeRequired: 15,
    reward: 'Free Coffee Upgrade',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(60),
    active: true,
    geohash: encodeGeohash(-1.2842, 36.8252, 7),
  }],
  ['c_2', {
    id: 'c_2',
    title: 'TRM Shopping Spree',
    description: 'Visit Thika Road Mall and check in at the main atrium during the weekend sale event.',
    coordinates: { lat: -1.2206, lng: 36.8962 },
    radius: 120,
    dwellTimeRequired: 30,
    reward: '500 KES Voucher',
    image: 'https://images.unsplash.com/photo-1567449303078-57ad995bd329?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(3),
    active: true,
    geohash: encodeGeohash(-1.2206, 36.8962, 7),
  }],
  ['c_3', {
    id: 'c_3',
    title: 'MKU Thika Campus',
    description: 'Explore the Mount Kenya University main grounds during open day.',
    coordinates: { lat: -1.0409, lng: 37.0782 },
    radius: 150,
    dwellTimeRequired: 45,
    reward: 'University Merch Pack',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(10),
    active: true,
    geohash: encodeGeohash(-1.0409, 37.0782, 7),
  }],
  ['c_4', {
    id: 'c_4',
    title: 'The Alchemist Bar',
    description: 'Check in for the evening event at Westlands. Valid only on Friday nights.',
    coordinates: { lat: -1.2652, lng: 36.8041 },
    radius: 50,
    dwellTimeRequired: 20,
    reward: 'Free Drink',
    image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(7),
    active: true,
    geohash: encodeGeohash(-1.2652, 36.8041, 7),
  }],
  ['c_5', {
    id: 'c_5',
    title: 'Ngong Hills Morning Hike',
    description: 'Check in at the Ngong Hills trailhead and unlock a discount on outdoor gear.',
    coordinates: { lat: -1.3623, lng: 36.6421 },
    radius: 100,
    dwellTimeRequired: 20,
    reward: '15% Off Hiking Gear',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(14),
    active: true,
    geohash: encodeGeohash(-1.3623, 36.6421, 7),
  }],
  ['c_6', {
    id: 'c_6',
    title: 'Sarit Centre Check-In',
    description: 'Visit Sarit Centre and verify your presence to receive a shopping discount code.',
    coordinates: { lat: -1.2585, lng: 36.8047 },
    radius: 120,
    dwellTimeRequired: 25,
    reward: '10% Off Selected Stores',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(5),
    active: true,
    geohash: encodeGeohash(-1.2585, 36.8047, 7),
  }],
  ['c_7', {
    id: 'c_7',
    title: 'Karura Forest Walk',
    description: 'Spend time inside Karura Forest and unlock a wellness reward.',
    coordinates: { lat: -1.2400, lng: 36.8350 },
    radius: 200,
    dwellTimeRequired: 30,
    reward: 'Free Smoothie Voucher',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    expiryDate: futureDate(21),
    active: true,
    geohash: encodeGeohash(-1.2400, 36.8350, 7),
  }],
]);

const redemptionsStore: Map<string, Redemption> = new Map();

const usersStore: Map<string, User> = new Map([
  ['u_1', {
    id: 'u_1',
    name: 'Alex Explorer',
    role: 'user',
    avatar: 'https://picsum.photos/seed/alex/100/100',
    consentGiven: false,
  }],
  ['s_1', {
    id: 's_1',
    name: 'Sarah Staff',
    role: 'staff',
    avatar: 'https://picsum.photos/seed/sarah/100/100',
    consentGiven: true,
    consentTimestamp: Date.now(),
  }],
  ['b_1', {
    id: 'b_1',
    name: 'Tech Cafe HQ',
    role: 'business',
    avatar: 'https://picsum.photos/seed/cafe/100/100',
    consentGiven: true,
    consentTimestamp: Date.now(),
  }],
  ['a_1', {
    id: 'a_1',
    name: 'System Admin',
    role: 'admin',
    avatar: 'https://picsum.photos/seed/admin/100/100',
    consentGiven: true,
    consentTimestamp: Date.now(),
  }],
]);

// ============================================================================
// CAMPAIGNS API
// ============================================================================

export async function getCampaigns(): Promise<Campaign[]> {
  return Array.from(campaignsStore.values()).filter(c => c.active && c.expiryDate > Date.now());
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  return campaignsStore.get(id) || null;
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'geohash'>): Promise<Campaign> {
  const id = `c_${Date.now()}`;
  const geohash = encodeGeohash(campaign.coordinates.lat, campaign.coordinates.lng, 7);
  const newCampaign: Campaign = { ...campaign, id, geohash };
  campaignsStore.set(id, newCampaign);
  return newCampaign;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
  const campaign = campaignsStore.get(id);
  if (!campaign) return null;
  
  const updated = { ...campaign, ...updates };
  if (updates.coordinates) {
    updated.geohash = encodeGeohash(updates.coordinates.lat, updates.coordinates.lng, 7);
  }
  campaignsStore.set(id, updated);
  return updated;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  return campaignsStore.delete(id);
}

// ============================================================================
// REDEMPTIONS API
// ============================================================================

export async function getRedemptions(filters?: { 
  userId?: string; 
  campaignId?: string; 
  status?: Redemption['status'];
}): Promise<Redemption[]> {
  let redemptions = Array.from(redemptionsStore.values());
  
  if (filters?.userId) {
    redemptions = redemptions.filter(r => r.userId === filters.userId);
  }
  if (filters?.campaignId) {
    redemptions = redemptions.filter(r => r.campaignId === filters.campaignId);
  }
  if (filters?.status) {
    redemptions = redemptions.filter(r => r.status === filters.status);
  }
  
  return redemptions.sort((a, b) => b.timestamp - a.timestamp);
}

export async function createRedemption(redemption: Omit<Redemption, 'id' | 'timestamp'>): Promise<Redemption> {
  const id = `r_${Date.now()}`;
  const newRedemption: Redemption = { 
    ...redemption, 
    id, 
    timestamp: Date.now() 
  };
  redemptionsStore.set(id, newRedemption);
  return newRedemption;
}

export async function updateRedemption(id: string, updates: Partial<Redemption>): Promise<Redemption | null> {
  const redemption = redemptionsStore.get(id);
  if (!redemption) return null;
  
  const updated = { ...redemption, ...updates };
  redemptionsStore.set(id, updated);
  return updated;
}

// ============================================================================
// USERS API
// ============================================================================

export async function getUserById(id: string): Promise<User | null> {
  return usersStore.get(id) || null;
}

export async function getUserByRole(role: Role): Promise<User | null> {
  for (const user of usersStore.values()) {
    if (user.role === role) return user;
  }
  return null;
}

export async function updateUserConsent(
  userId: string, 
  consent: boolean
): Promise<User | null> {
  const user = usersStore.get(userId);
  if (!user) return null;
  
  const updated = { 
    ...user, 
    consentGiven: consent,
    consentTimestamp: consent ? Date.now() : undefined 
  };
  usersStore.set(userId, updated);
  return updated;
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
  const redemptions = campaignId 
    ? Array.from(redemptionsStore.values()).filter(r => r.campaignId === campaignId)
    : Array.from(redemptionsStore.values());
  
  return {
    total: redemptions.length,
    verified: redemptions.filter(r => r.status === 'verified').length,
    flagged: redemptions.filter(r => r.status === 'flagged').length,
    rejected: redemptions.filter(r => r.status === 'rejected').length,
    pending: redemptions.filter(r => r.status === 'pending').length,
  };
}

// ============================================================================
// DATA DELETION (GDPR Compliance)
// ============================================================================

export async function deleteUserData(userId: string): Promise<{
  redemptionsDeleted: number;
  userDeleted: boolean;
}> {
  // Delete all user's redemptions
  let deleted = 0;
  for (const [id, redemption] of redemptionsStore.entries()) {
    if (redemption.userId === userId) {
      redemptionsStore.delete(id);
      deleted++;
    }
  }
  
  // Delete user
  const userDeleted = usersStore.delete(userId);
  
  return {
    redemptionsDeleted: deleted,
    userDeleted
  };
}
