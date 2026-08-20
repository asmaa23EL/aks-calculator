import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getBackendBaseUrl() {
  return [
    process.env.INTERNAL_BACKEND_API_URL,
    process.env.BACKEND_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ].find((value) => value?.trim())?.trim() || 'http://localhost:3001';
}

export async function PATCH(request: NextRequest, context: { params: { leadId: string } }) {
  const upstream = await fetch(`${getBackendBaseUrl()}/api/admin/leads/${context.params.leadId}`, {
    method: 'PATCH',
    headers: {
      'content-type': request.headers.get('content-type') || 'application/json',
      cookie: request.headers.get('cookie') || '',
    },
    body: await request.text(),
    cache: 'no-store',
  });

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
}
