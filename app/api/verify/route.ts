import { NextRequest, NextResponse } from 'next/server';
import { verifyRedemption, generateSessionId } from '@/lib/verification';
import { VerificationRequest, Campaign } from '@/types';
import { getCampaignById } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerificationRequest;
    
    // Validate required fields
    if (!body.sessionId || !body.userId || !body.campaignId || !body.telemetry) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', riskScore: 0 },
        { status: 400 }
      );
    }

    // Get campaign
    const campaign = await getCampaignById(body.campaignId);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found', riskScore: 0 },
        { status: 404 }
      );
    }

    // Check if campaign is active
    if (!campaign.active || campaign.expiryDate < Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Campaign is not active or has expired', riskScore: 0 },
        { status: 400 }
      );
    }

    // Run server-side verification
    const result = await verifyRedemption(body, campaign);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', riskScore: 0 },
      { status: 500 }
    );
  }
}

// Generate a new session ID for starting verification
export async function GET() {
  return NextResponse.json({ sessionId: generateSessionId() });
}
