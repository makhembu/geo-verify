import { NextRequest, NextResponse } from 'next/server';
import { getUserByRole, updateUserConsent, deleteUserData } from '@/lib/db';
import { Role, ConsentRecord } from '@/types';

// Mock login - returns user by role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = body.role as Role;
    
    if (!['user', 'staff', 'business', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    
    const user = await getUserByRole(role);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Create response with session cookie
    const response = NextResponse.json(user);
    response.cookies.set('geoverify_session', JSON.stringify({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('geoverify_session');
  return response;
}
