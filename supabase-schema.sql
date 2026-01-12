-- GeoVerify Database Schema for Supabase/PostgreSQL

-- Enable PostGIS extension for geographic data types
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'staff', 'business', 'admin')),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table with geographic data
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL, -- Using PostGIS geography type
  radius INTEGER NOT NULL, -- in meters
  dwell_time_required INTEGER NOT NULL, -- in seconds
  reward TEXT NOT NULL,
  image TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,
  geohash TEXT, -- For faster spatial queries
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for location queries
CREATE INDEX campaigns_location_idx ON campaigns USING GIST(location);
CREATE INDEX campaigns_geohash_idx ON campaigns(geohash);

-- Redemptions table
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  verified_location GEOGRAPHY(POINT, 4326),
  verification_data JSONB, -- Store GPS telemetry and other verification details
  redemption_status TEXT NOT NULL CHECK (redemption_status IN ('pending', 'verified', 'redeemed', 'rejected')),
  redemption_code TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX redemptions_user_idx ON redemptions(user_id);
CREATE INDEX redemptions_campaign_idx ON redemptions(campaign_id);
CREATE INDEX redemptions_status_idx ON redemptions(redemption_status);

-- User consent tracking
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX user_consents_user_idx ON user_consents(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_redemptions_updated_at BEFORE UPDATE ON redemptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN ST_Distance(
    ST_GeographyFromText('POINT(' || lng1 || ' ' || lat1 || ')'),
    ST_GeographyFromText('POINT(' || lng2 || ' ' || lat2 || ')')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Campaigns policies
CREATE POLICY "Anyone can view active campaigns" ON campaigns
  FOR SELECT USING (active = true);

CREATE POLICY "Business users can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('business', 'admin'))
  );

CREATE POLICY "Business users can update own campaigns" ON campaigns
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Redemptions policies
CREATE POLICY "Users can view own redemptions" ON redemptions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'business', 'admin'))
  );

CREATE POLICY "Users can create redemptions" ON redemptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can update redemptions" ON redemptions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'business', 'admin'))
  );

-- User consents policies
CREATE POLICY "Users can view own consents" ON user_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own consents" ON user_consents
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- SEED DATA (Kenya locations)
-- ============================================================================

-- Insert sample campaigns
INSERT INTO campaigns (title, description, location, radius, dwell_time_required, reward, image, expiry_date, geohash, active) VALUES
  (
    'Java House Kimathi St',
    'Enjoy Nairobi''s finest coffee in the CBD. Verify your visit to get a free upgrade on your next order.',
    ST_GeographyFromText('POINT(36.8252 -1.2842)'),
    40,
    900, -- 15 minutes
    'Free Coffee Upgrade',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    NOW() + INTERVAL '60 days',
    's17gxuc', -- Geohash for efficiency
    true
  ),
  (
    'TRM Shopping Spree',
    'Visit Thika Road Mall and check in at the main atrium during the weekend sale event.',
    ST_GeographyFromText('POINT(36.8962 -1.2206)'),
    120,
    1800, -- 30 minutes
    '500 KES Voucher',
    'https://images.unsplash.com/photo-1567449303078-57ad995bd329?auto=format&fit=crop&w=600&q=80',
    NOW() + INTERVAL '3 days',
    's17h19g',
    true
  ),
  (
    'MKU Thika Campus',
    'Explore the Mount Kenya University main grounds during open day.',
    ST_GeographyFromText('POINT(37.0782 -1.0409)'),
    150,
    2700, -- 45 minutes
    'University Merch Pack',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    NOW() + INTERVAL '10 days',
    's17kqvr',
    true
  ),
  (
    'The Alchemist Bar',
    'Check in for the evening event at Westlands. Valid only on Friday nights.',
    ST_GeographyFromText('POINT(36.8041 -1.2652)'),
    50,
    1200, -- 20 minutes
    'Free Drink',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80',
    NOW() + INTERVAL '7 days',
    's17gwfe',
    true
  ),
  (
    'Ngong Hills Morning Hike',
    'Check in at the Ngong Hills trailhead and unlock a discount on outdoor gear.',
    ST_GeographyFromText('POINT(36.6421 -1.3623)'),
    100,
    1200, -- 20 minutes
    '15% Off Hiking Gear',
    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80',
    NOW() + INTERVAL '14 days',
    's17gmzh',
    true
  );
