import { NextRequest, NextResponse } from 'next/server';
import { exportAdminLeadsCsv, getAdminSessionCookieName, isValidAdminSessionToken } from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  if (token && !isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get('search') || '';
  const status = (request.nextUrl.searchParams.get('status') || 'all') as 'all' | 'new' | 'pdf_sent' | 'contacted';
  const csv = await exportAdminLeadsCsv({ search, status });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads.csv"',
    },
  });
}
