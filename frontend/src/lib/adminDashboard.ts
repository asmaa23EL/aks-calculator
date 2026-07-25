import { mysqlPool } from '@/lib/mysql';

type UpdateLeadStatusPayload = {
  leadId: number;
  pdfSent?: boolean;
  contacted?: boolean;
  statusNote?: string | null;
};

export async function updateLeadStatus(payload: UpdateLeadStatusPayload): Promise<void> {
  const updates: string[] = [];
  const params: Array<boolean | string | number | null | Date> = [];

  if (typeof payload.pdfSent === 'boolean') {
    updates.push('pdf_sent = ?');
    params.push(payload.pdfSent);
    updates.push('last_pdf_sent_at = ?');
    params.push(payload.pdfSent ? new Date() : null);
    if (payload.pdfSent) {
      updates.push('email_count = email_count + 1');
      updates.push('last_email_at = ?');
      params.push(new Date());
    }
  }

  if (typeof payload.contacted === 'boolean') {
    updates.push('contacted = ?');
    params.push(payload.contacted);
    updates.push('last_contacted_at = ?');
    params.push(payload.contacted ? new Date() : null);
  }

  if (typeof payload.statusNote !== 'undefined') {
    updates.push('status_note = ?');
    params.push(payload.statusNote);
  }

  if (updates.length === 0) {
    return;
  }

  params.push(payload.leadId);

  await mysqlPool.execute(
    `UPDATE lead_submissions SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
}
