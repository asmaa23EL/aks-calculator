import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionCookieName, isValidAdminSessionToken } from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  return NextResponse.json({ authenticated: !token || isValidAdminSessionToken(token) });
}
