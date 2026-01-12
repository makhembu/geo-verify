import { NextRequest, NextResponse } from 'next/server';
import { getRedemptions, updateRedemption } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const campaignId = searchParams.get('campaignId');
  const status = searchParams.get('status') as 'pending' | 'verified' | 'flagged' | 'rejected' | null;
  
  const redemptions = await getRedemptions({
    userId: userId || undefined,
    campaignId: campaignId || undefined,
    status: status || undefined,
  });
  
  return NextResponse.json(redemptions);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'Redemption ID required' }, { status: 400 });
    }
    
    const updated = await updateRedemption(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
