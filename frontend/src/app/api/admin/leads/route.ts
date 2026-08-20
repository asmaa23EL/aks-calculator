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

async function proxyToBackend(request: NextRequest) {
  const backendBaseUrl = resolveBackendBaseUrl();
  const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, backendBaseUrl);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
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
}

export async function GET(request: NextRequest) {
  return proxyToBackend(request);
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request);
}

export async function PATCH(request: NextRequest) {
  return proxyToBackend(request);
}
