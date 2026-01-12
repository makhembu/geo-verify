import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (id) {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json(campaign);
  }
  
  const campaigns = await getCampaigns();
  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.coordinates || !body.reward) {
      return NextResponse.json(
        { error: 'Missing required fields: title, coordinates, reward' },
        { status: 400 }
      );
    }
    
    const campaign = await createCampaign({
      title: body.title,
      description: body.description || '',
      coordinates: body.coordinates,
      radius: body.radius || 100,
      dwellTimeRequired: body.dwellTimeRequired || 30,
      reward: body.reward,
      image: body.image || '',
      expiryDate: body.expiryDate || Date.now() + 7 * 24 * 60 * 60 * 1000,
      active: body.active ?? true,
    });
    
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json();
    
    const id = queryId || body.id;
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }
    
    const updated = await updateCampaign(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
  }
  
  const deleted = await deleteCampaign(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  
  return NextResponse.json({ success: true });
}
