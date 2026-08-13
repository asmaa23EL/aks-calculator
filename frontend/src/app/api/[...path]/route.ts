import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';

export const runtime = 'nodejs';

const backendBaseUrl = [
  process.env.INTERNAL_BACKEND_API_URL,
  process.env.BACKEND_API_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
].find((value) => value?.trim())?.trim() || 'http://localhost:4001';

function getProxyUrl(request: NextRequest, pathSegments: string[]) {
  const pathName = pathSegments.length > 0 ? `/api/${pathSegments.join('/')}` : '/api';
  const baseUrl = backendBaseUrl.endsWith('/') ? backendBaseUrl : `${backendBaseUrl}/`;
  return new URL(pathName + request.nextUrl.search, baseUrl);
}

function getHttpModule(url: URL) {
  return url.protocol === 'https:' ? https : http;
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const url = getProxyUrl(request, pathSegments);
  const method = request.method;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('expect');
  headers.delete('content-length');

  const body = method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined;
  const outboundHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    outboundHeaders[key] = value;
  });

  return new Promise<NextResponse>((resolve, reject) => {
    const client = getHttpModule(url);
    const upstreamRequest = client.request(url, {
      method,
      headers: outboundHeaders,
    }, (upstreamResponse) => {
      const chunks: Buffer[] = [];
      upstreamResponse.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      upstreamResponse.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        const response = new NextResponse(responseBody, {
          status: upstreamResponse.statusCode || 500,
          headers: {
            'content-type': upstreamResponse.headers['content-type'] || 'application/json',
          },
        });

        const setCookieHeader = upstreamResponse.headers['set-cookie'];
        if (setCookieHeader) {
          response.headers.set('set-cookie', Array.isArray(setCookieHeader) ? setCookieHeader.join(', ') : setCookieHeader);
        }

        resolve(response);
      });
    });

    upstreamRequest.on('error', reject);

    if (body) {
      upstreamRequest.write(body);
    }

    upstreamRequest.end();
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxyRequest(request, path);
}
