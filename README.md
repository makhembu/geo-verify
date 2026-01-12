# GeoVerify

A location-based verification and rewards platform built with Next.js. GeoVerify enables businesses to create geo-fenced campaigns that reward users for visiting specific locations.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)

## Features

### Location-Based Campaigns
- Create geo-fenced campaigns with customizable radius (in kilometers)
- Set dwell time requirements for verification
- Define rewards and expiry dates
- Interactive map visualization with Leaflet

### Multi-Layered Fraud Prevention
- GPS telemetry analysis for spoof detection
- Speed anomaly detection (walking, driving, impossible speeds)
- Replay attack prevention with session tokens
- Geohash-based location indexing for efficient lookups

### Role-Based Access
- **User**: Browse campaigns, verify location, claim rewards
- **Staff**: View redemptions, manage verifications
- **Business**: Create and manage campaigns
- **Admin**: Full system access and settings

### Responsive Design
- Mobile-first design for on-the-go verification
- Desktop dashboard for business management
- Dark mode support
- Custom scrollbar styling

## Tech Stack

- **Framework**: Next.js 16.1 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Maps**: Leaflet + React-Leaflet
- **Icons**: Lucide React
- **Language**: TypeScript 5

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/geo-verify.git
cd geo-verify

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
geo-verify/
├── app/
│   ├── api/
│   │   ├── auth/         # Authentication endpoints
│   │   ├── campaigns/    # Campaign CRUD operations
│   │   ├── consent/      # User consent management
│   │   ├── redemptions/  # Reward redemption tracking
│   │   └── verify/       # Location verification logic
│   ├── globals.css       # Global styles & custom scrollbar
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page component
├── components/
│   ├── DesktopView.tsx   # Desktop dashboard UI
│   ├── LoginView.tsx     # Role selection login
│   └── MobileView.tsx    # Mobile verification UI
├── lib/
│   ├── db.ts             # In-memory database (replace with real DB)
│   ├── geohash.ts        # Geohash encoding/decoding utilities
│   └── verification.ts   # Server-side verification & fraud detection
├── types/
│   └── index.ts          # TypeScript type definitions
└── public/               # Static assets
```

## How It Works

### Verification Flow

1. **User selects a campaign** from the available list
2. **Location consent** is requested and stored
3. **GPS telemetry** is collected during the dwell period
4. **Server-side analysis** checks for:
   - Distance from campaign location
   - Dwell time requirements
   - GPS spoofing indicators
   - Velocity anomalies
5. **Reward is issued** upon successful verification

### Fraud Detection

The system employs multiple fraud detection mechanisms:

| Check | Description |
|-------|-------------|
| Distance Validation | User must be within campaign radius |
| Dwell Time | User must stay for required duration |
| Speed Analysis | Detects impossible movement patterns |
| Telemetry Quality | Ensures sufficient GPS data points |
| Replay Prevention | Session tokens prevent duplicate claims |

## Configuration

### Campaign Settings

Campaigns can be configured with:

- **Location**: Latitude/longitude coordinates
- **Radius**: Verification zone size (in kilometers)
- **Dwell Time**: Required time at location (in seconds)
- **Reward**: Description of the reward
- **Expiry Date**: Campaign end date
- **Business Hours**: Optional operating hours

### Environment Variables

For production, configure these environment variables:

```env
# Database (replace in-memory storage)
DATABASE_URL=your_database_url

# Authentication
AUTH_SECRET=your_auth_secret

# Map Tiles (optional custom provider)
NEXT_PUBLIC_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

## Sample Campaigns

The app comes with pre-configured Kenya-based sample campaigns:

| Campaign | Location | Radius | Reward |
|----------|----------|--------|--------|
| Java House Kimathi St | Nairobi CBD | 0.04 km | Free Coffee Upgrade |
| TRM Shopping Spree | Thika Road Mall | 0.12 km | 500 KES Voucher |
| MKU Thika Campus | Mount Kenya University | 0.15 km | University Merch Pack |
| The Alchemist Bar | Westlands | 0.05 km | Free Drink |
| Ngong Hills Morning Hike | Ngong Hills | 0.10 km | 15% Off Hiking Gear |
| Sarit Centre Check-In | Sarit Centre | 0.12 km | 10% Off Selected Stores |
| Karura Forest Walk | Karura Forest | 0.20 km | Free Smoothie Voucher |

## Production Considerations

Before deploying to production:

1. **Replace in-memory storage** with a real database (Supabase, PostgreSQL, etc.)
2. **Implement proper authentication** (NextAuth.js, Clerk, etc.)
3. **Add rate limiting** to API endpoints
4. **Use Redis** for session management and replay prevention
5. **Enable HTTPS** for secure location data transmission
6. **Add monitoring** for fraud detection alerts

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with Next.js and React
