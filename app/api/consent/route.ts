import { NextRequest, NextResponse } from 'next/server';
import { updateUserConsent, deleteUserData, getUserById } from '@/lib/db';

// Record consent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, locationConsent, dataProcessingConsent } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Both consents must be given for the app to function
    const consent = locationConsent && dataProcessingConsent;
    
    const user = await updateUserConsent(userId, consent);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      consentGiven: user.consentGiven,
      consentTimestamp: user.consentTimestamp,
      message: consent 
        ? 'Consent recorded. You can now use location-based features.'
        : 'Consent withdrawn. Location features disabled.'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Get consent status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }
  
  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    consentGiven: user.consentGiven,
    consentTimestamp: user.consentTimestamp,
  });
}

// Delete user data (GDPR right to erasure)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }
  
  const result = await deleteUserData(userId);
  
  return NextResponse.json({
    success: true,
    ...result,
    message: 'All user data has been deleted as per GDPR Article 17.'
  });
}
