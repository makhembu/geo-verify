/**
 * Geohash Utilities for Spatial Indexing
 * 
 * Geohashes encode lat/lng into strings where nearby locations share prefixes.
 * This enables efficient database queries.
 * 
 * Precision levels:
 * - 4 chars: ~39km x 19km (city level)
 * - 5 chars: ~4.9km x 4.9km (neighborhood)
 * - 6 chars: ~1.2km x 0.6km (block level)
 * - 7 chars: ~150m x 150m (building level)
 * - 8 chars: ~38m x 19m (precise)
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode coordinates to geohash string
 */
export const encodeGeohash = (lat: number, lng: number, precision: number = 7): string => {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isLng = !isLng;
    bit++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
};

/**
 * Decode geohash to bounding box
 */
export const decodeGeohash = (hash: string): {
  lat: number;
  lng: number;
  latError: number;
  lngError: number;
} => {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let isLng = true;

  for (const char of hash.toLowerCase()) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error(`Invalid geohash character: ${char}`);

    for (let bit = 4; bit >= 0; bit--) {
      const bitValue = (idx >> bit) & 1;
      if (isLng) {
        const mid = (minLng + maxLng) / 2;
        if (bitValue === 1) {
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bitValue === 1) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isLng = !isLng;
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
    latError: (maxLat - minLat) / 2,
    lngError: (maxLng - minLng) / 2,
  };
};

/**
 * Get neighboring geohashes
 */
export const getNeighbors = (hash: string): string[] => {
  const { lat, lng, latError, lngError } = decodeGeohash(hash);
  const precision = hash.length;
  
  const neighbors: string[] = [];
  const deltas = [-2, 0, 2];
  
  for (const dLat of deltas) {
    for (const dLng of deltas) {
      if (dLat === 0 && dLng === 0) continue;
      const neighborHash = encodeGeohash(
        lat + (dLat * latError),
        lng + (dLng * lngError),
        precision
      );
      if (!neighbors.includes(neighborHash) && neighborHash !== hash) {
        neighbors.push(neighborHash);
      }
    }
  }
  
  return neighbors;
};

/**
 * Get geohashes covering a radius around a point
 */
export const getGeohashesForRadius = (
  lat: number, 
  lng: number, 
  radiusMeters: number
): string[] => {
  // Determine precision based on radius
  let precision = 7;
  if (radiusMeters > 5000) precision = 4;
  else if (radiusMeters > 1000) precision = 5;
  else if (radiusMeters > 200) precision = 6;
  
  const centerHash = encodeGeohash(lat, lng, precision);
  return [centerHash, ...getNeighbors(centerHash)];
};

/**
 * Haversine distance calculation
 */
export const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
