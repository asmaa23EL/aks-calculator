import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function resolveBackendBaseUrl() {
  const candidates = [
    process.env.INTERNAL_BACKEND_API_URL,
    process.env.BACKEND_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    'http://backend:3001',
    'http://localhost:4001',
  ];

  return candidates.find((value) => value?.trim())?.trim() || 'http://backend:3001';
}

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || '';
  const backendBaseUrl = resolveBackendBaseUrl();

  try {
    const upstreamResponse = await fetch(`${backendBaseUrl}/api/admin/me`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        Accept: 'application/json',
      },
      redirect: 'manual',
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
      const cookieValues = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      for (const cookieValue of cookieValues) {
        response.headers.append('set-cookie', cookieValue);
      }
    }

    return response;
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
