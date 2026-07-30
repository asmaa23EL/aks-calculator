import { NextResponse } from 'next/server';

function getBackendApiBaseUrl(): string {
  const fromEnv = process.env.BACKEND_API_URL?.trim()
    || process.env.INTERNAL_BACKEND_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  return process.env.NODE_ENV === 'production' ? 'http://backend:3001' : 'http://localhost:4001';
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const backendBaseUrl = getBackendApiBaseUrl();
    const response = await fetch(`${backendBaseUrl}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error) {
    console.error('Erreur proxy submit-lead:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
