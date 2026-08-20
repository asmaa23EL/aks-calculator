import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionCookieName, getAdminStats, isValidAdminSessionToken } from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  if (token && !isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  try {
    const stats = await getAdminStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('admin stats route error', error);
    return NextResponse.json({
      stats: {
        totalLeads: 0,
        leadsThisWeek: 0,
        leadsThisMonth: 0,
        contactedCount: 0,
        pdfSentCount: 0,
        pdfDownloadAttemptCount: 0,
        pdfDownloadAttemptTotal: 0,
        simulationsThisWeek: 0,
        visitsThisWeek: 0,
        conversionRate: 0,
        emailsSentCount: 0,
      },
    });
  }
}
