import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionCookieName, getAdminStats, isValidAdminSessionToken } from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  if (token && !isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const stats = await getAdminStats();
  return NextResponse.json({ stats });
}
