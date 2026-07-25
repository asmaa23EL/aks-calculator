import { NextRequest, NextResponse } from 'next/server';
import { getAdminLeadById, getAdminSessionCookieName, isValidAdminSessionToken, updateAdminLead } from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: { leadId: string } }) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  if (token && !isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const { leadId } = context.params;
  const id = Number(leadId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    pdfSent?: boolean;
    contacted?: boolean;
    statusNote?: string | null;
  } | null;

  if (!body || (typeof body.pdfSent === 'undefined' && typeof body.contacted === 'undefined' && typeof body.statusNote === 'undefined')) {
    return NextResponse.json({ error: 'Aucune donnee a mettre a jour' }, { status: 400 });
  }

  const existing = await getAdminLeadById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
  }

  await updateAdminLead(id, body);
  return NextResponse.json({ success: true });
}
