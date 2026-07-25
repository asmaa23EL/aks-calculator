import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminLeadById,
  getAdminSessionCookieName,
  isValidAdminSessionToken,
  registerAdminEmailSend,
  sendAdminFollowUpEmail,
} from '@/lib/adminStore';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: { leadId: string } }) {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  if (token && !isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const { leadId } = context.params;
  const id = Number(leadId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { subject?: string; body?: string } | null;
  if (!body?.subject?.trim() || !body?.body?.trim()) {
    return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 });
  }

  const lead = await getAdminLeadById(id);
  if (!lead) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
  }

  await sendAdminFollowUpEmail({
    to: lead.email,
    subject: body.subject,
    body: body.body,
  });

  await registerAdminEmailSend(id);

  return NextResponse.json({ success: true });
}
