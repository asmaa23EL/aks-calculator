import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionCookieName, isValidAdminSessionToken, listAdminLeads } from '@/lib/adminStore';

export const runtime = 'nodejs';

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  return !token || isValidAdminSessionToken(token);
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get('search') || '';
  const status = (request.nextUrl.searchParams.get('status') || 'all') as 'all' | 'new' | 'pdf_sent' | 'contacted';

  const leads = await listAdminLeads({ search, status });
  return NextResponse.json({ leads });
}
