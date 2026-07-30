import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const { email, password } = body || {};
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4001';

  const upstreamResponse = await fetch(`${backendBaseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const responseBody = await upstreamResponse.text();
  const response = new NextResponse(responseBody, {
    status: upstreamResponse.status,
    headers: {
      'content-type': upstreamResponse.headers.get('content-type') || 'application/json',
    },
  });

  const setCookieHeader = upstreamResponse.headers.get('set-cookie');
  if (setCookieHeader) {
    response.headers.set('set-cookie', setCookieHeader);
  }

  return response;
}
