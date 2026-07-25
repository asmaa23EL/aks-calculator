import { NextResponse } from 'next/server';
import { createAdminSessionToken, getAdminCredentials, getAdminSessionCookieName } from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const { email, password } = body || {};
  const credentials = getAdminCredentials();

  if (email !== credentials.email || password !== credentials.password) {
    return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: getAdminSessionCookieName(),
    value: createAdminSessionToken(credentials.email),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
