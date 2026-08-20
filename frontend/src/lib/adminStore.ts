import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { RowDataPacket } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';

export type AdminLead = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  societe: string | null;
  role: string | null;
  telephone: string | null;
  submittedAt: string;
  pdfSent: boolean;
  contacted: boolean;
  statusNote: string | null;
  lastContactedAt: string | null;
  lastPdfSentAt: string | null;
  emailCount: number;
  lastEmailAt: string | null;
  pdfDownloadCount: number;
  lastPdfDownloadAt: string | null;
  results: Record<string, unknown>;
  leadPayload: Record<string, unknown>;
};

export type AdminStats = {
  totalLeads: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  contactedCount: number;
  pdfSentCount: number;
  pdfDownloadAttemptCount: number;
  pdfDownloadAttemptTotal: number;
  simulationsThisWeek: number;
  visitsThisWeek: number;
  conversionRate: number | null;
  emailsSentCount: number;
};

export type AdminLeadFilter = {
  search?: string;
  status?: 'all' | 'new' | 'pdf_sent' | 'contacted';
};

type LeadRow = RowDataPacket & {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  societe: string | null;
  role: string | null;
  telephone: string | null;
  submitted_at: Date | string;
  lead_json: string;
  results_json: string;
  pdf_sent: number;
  contacted: number;
  status_note: string | null;
  last_contacted_at: Date | string | null;
  last_pdf_sent_at: Date | string | null;
  email_count: number;
  last_email_at: Date | string | null;
  pdf_download_count: number;
  last_pdf_download_at: Date | string | null;
};

type AdminCountRow = RowDataPacket & {
  value: number;
};

type ColumnExistsRow = RowDataPacket & {
  column_name: string | null;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@clouddevfusion.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'change-me';
const ADMIN_SESSION_COOKIE = 'cdf_admin_session';

function hashSession(email: string): string {
  return crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(email).digest('hex');
}

export function getAdminCredentials() {
  return {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  };
}

export function createAdminSessionToken(email: string): string {
  return `${email}.${hashSession(email)}`;
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [email, signature] = parts;
  return Boolean(email) && signature === hashSession(email) && email === ADMIN_EMAIL;
}

export function getAdminSessionCookieName(): string {
  return ADMIN_SESSION_COOKIE;
}

export async function ensureLeadSubmissionsSchema(): Promise<void> {
  await mysqlPool.execute(`
    CREATE TABLE IF NOT EXISTS lead_submissions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      nom VARCHAR(255) NOT NULL,
      prenom VARCHAR(255) NOT NULL,
      societe VARCHAR(255) NULL,
      role VARCHAR(255) NULL,
      telephone VARCHAR(50) NULL,
      submitted_at DATETIME NOT NULL,
      lead_json JSON NOT NULL,
      results_json JSON NOT NULL,
      pdf_sent TINYINT(1) NOT NULL DEFAULT 0,
      contacted TINYINT(1) NOT NULL DEFAULT 0,
      status_note TEXT NULL,
      last_contacted_at DATETIME NULL,
      last_pdf_sent_at DATETIME NULL,
      email_count INT UNSIGNED NOT NULL DEFAULT 0,
      last_email_at DATETIME NULL,
      pdf_download_count INT UNSIGNED NOT NULL DEFAULT 0,
      last_pdf_download_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_lead_submissions_email (email),
      KEY idx_lead_submissions_submitted_at (submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [columnRows] = await mysqlPool.execute<ColumnExistsRow[]>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'lead_submissions'
        AND column_name IN ('pdf_download_count', 'last_pdf_download_at')
    `
  );

  const existingColumns = new Set(columnRows.map((row) => row.column_name).filter(Boolean));
  if (!existingColumns.has('pdf_download_count')) {
    await mysqlPool.execute(`
      ALTER TABLE lead_submissions
      ADD COLUMN IF NOT EXISTS pdf_download_count INT UNSIGNED NOT NULL DEFAULT 0
      AFTER email_count
    `);
  }
  if (!existingColumns.has('last_pdf_download_at')) {
    await mysqlPool.execute(`
      ALTER TABLE lead_submissions
      ADD COLUMN IF NOT EXISTS last_pdf_download_at DATETIME NULL
      AFTER pdf_download_count
    `);
  }
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function formatDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapLeadRow(row: LeadRow): AdminLead {
  return {
    id: Number(row.id),
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    societe: row.societe,
    role: row.role,
    telephone: row.telephone,
    submittedAt: formatDate(row.submitted_at) || new Date().toISOString(),
    pdfSent: Boolean(row.pdf_sent),
    contacted: Boolean(row.contacted),
    statusNote: row.status_note,
    lastContactedAt: formatDate(row.last_contacted_at),
    lastPdfSentAt: formatDate(row.last_pdf_sent_at),
    emailCount: Number(row.email_count || 0),
    lastEmailAt: formatDate(row.last_email_at),
    pdfDownloadCount: Number(row.pdf_download_count || 0),
    lastPdfDownloadAt: formatDate(row.last_pdf_download_at),
    results: parseJson<Record<string, unknown>>(row.results_json),
    leadPayload: parseJson<Record<string, unknown>>(row.lead_json),
  };
}

function buildLeadWhereClause(filter: AdminLeadFilter) {
  const where: string[] = ['1=1'];
  const params: Array<string | number | boolean | null> = [];

  if (filter.search?.trim()) {
    const search = `%${filter.search.trim()}%`;
    where.push('(email LIKE ? OR nom LIKE ? OR prenom LIKE ? OR societe LIKE ? OR role LIKE ?)');
    params.push(search, search, search, search, search);
  }

  if (filter.status === 'new') {
    where.push('pdf_sent = 0 AND contacted = 0');
  } else if (filter.status === 'pdf_sent') {
    where.push('pdf_sent = 1');
  } else if (filter.status === 'contacted') {
    where.push('contacted = 1');
  }

  return {
    clause: where.join(' AND '),
    params,
  };
}

export async function listAdminLeads(filter: AdminLeadFilter): Promise<AdminLead[]> {
  await ensureLeadSubmissionsSchema();
  const { clause, params } = buildLeadWhereClause(filter);
  const [rows] = await mysqlPool.execute<LeadRow[]>(
    `
      SELECT
        id, email, nom, prenom, societe, role, telephone, submitted_at,
        lead_json, results_json, pdf_sent, contacted, status_note,
        last_contacted_at, last_pdf_sent_at, email_count, last_email_at,
        pdf_download_count, last_pdf_download_at
      FROM lead_submissions
      WHERE ${clause}
      ORDER BY submitted_at DESC, id DESC
    `,
    params
  );

  return rows.map(mapLeadRow);
}

export async function getAdminLeadById(leadId: number): Promise<AdminLead | null> {
  await ensureLeadSubmissionsSchema();
  const [rows] = await mysqlPool.execute<LeadRow[]>(
    `
      SELECT
        id, email, nom, prenom, societe, role, telephone, submitted_at,
        lead_json, results_json, pdf_sent, contacted, status_note,
        last_contacted_at, last_pdf_sent_at, email_count, last_email_at,
        pdf_download_count, last_pdf_download_at
      FROM lead_submissions
      WHERE id = ?
      LIMIT 1
    `,
    [leadId]
  );
  return rows[0] ? mapLeadRow(rows[0]) : null;
}

export async function updateAdminLead(
  leadId: number,
  payload: { pdfSent?: boolean; contacted?: boolean; statusNote?: string | null }
): Promise<void> {
  await ensureLeadSubmissionsSchema();
  const updates: string[] = [];
  const params: Array<boolean | string | number | null | Date> = [];

  if (typeof payload.pdfSent === 'boolean') {
    updates.push('pdf_sent = ?');
    params.push(payload.pdfSent);
    updates.push('last_pdf_sent_at = ?');
    params.push(payload.pdfSent ? new Date() : null);
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

  params.push(leadId);

  await mysqlPool.execute(
    `UPDATE lead_submissions SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
}

export async function registerAdminEmailSend(leadId: number): Promise<void> {
  await ensureLeadSubmissionsSchema();
  await mysqlPool.execute(
    `
      UPDATE lead_submissions
      SET email_count = email_count + 1,
          last_email_at = ?,
          contacted = 1,
          last_contacted_at = ?
      WHERE id = ?
    `,
    [new Date(), new Date(), leadId]
  );
}

export async function registerPdfDownloadAttempt(leadId: number): Promise<void> {
  await ensureLeadSubmissionsSchema();
  await mysqlPool.execute(
    `
      UPDATE lead_submissions
      SET pdf_download_count = pdf_download_count + 1,
          last_pdf_download_at = ?
      WHERE id = ?
    `,
    [new Date(), leadId]
  );
}

export async function sendAdminFollowUpEmail(payload: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP non configure (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const from = process.env.SMTP_FROM || user;
  if (!from) {
    throw new Error('Expediteur SMTP manquant (SMTP_FROM ou SMTP_USER)');
  }

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
  });
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    await ensureLeadSubmissionsSchema();

    const [rows] = await mysqlPool.execute<
      Array<
        AdminCountRow & {
          totalLeads: number;
          leadsThisWeek: number;
          leadsThisMonth: number;
          contactedCount: number;
          pdfSentCount: number;
          pdfDownloadAttemptCount: number;
          pdfDownloadAttemptTotal: number;
          emailsSentCount: number;
        }
      >
    >(
      `
        SELECT
          COUNT(*) AS totalLeads,
          SUM(CASE WHEN submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS leadsThisWeek,
          SUM(CASE WHEN submitted_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END) AS leadsThisMonth,
          SUM(CASE WHEN contacted = 1 THEN 1 ELSE 0 END) AS contactedCount,
          SUM(CASE WHEN pdf_sent = 1 THEN 1 ELSE 0 END) AS pdfSentCount,
          SUM(CASE WHEN pdf_download_count > 0 THEN 1 ELSE 0 END) AS pdfDownloadAttemptCount,
          COALESCE(SUM(pdf_download_count), 0) AS pdfDownloadAttemptTotal,
          SUM(CASE WHEN email_count > 0 THEN email_count ELSE 0 END) AS emailsSentCount
        FROM lead_submissions
      `
    );

    const stats = rows[0] || {
      totalLeads: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      contactedCount: 0,
      pdfSentCount: 0,
      pdfDownloadAttemptCount: 0,
      pdfDownloadAttemptTotal: 0,
      emailsSentCount: 0,
    };

    return {
      totalLeads: Number(stats.totalLeads || 0),
      leadsThisWeek: Number(stats.leadsThisWeek || 0),
      leadsThisMonth: Number(stats.leadsThisMonth || 0),
      contactedCount: Number(stats.contactedCount || 0),
      pdfSentCount: Number(stats.pdfSentCount || 0),
      pdfDownloadAttemptCount: Number(stats.pdfDownloadAttemptCount || 0),
      pdfDownloadAttemptTotal: Number(stats.pdfDownloadAttemptTotal || 0),
      simulationsThisWeek: Number(stats.leadsThisWeek || 0),
      visitsThisWeek: Number(stats.leadsThisWeek || 0),
      conversionRate:
        Number(stats.leadsThisWeek || 0) > 0
          ? Math.round((Number(stats.contactedCount || 0) / Number(stats.leadsThisWeek || 0)) * 100)
          : 0,
      emailsSentCount: Number(stats.emailsSentCount || 0),
    };
  } catch (error) {
    console.error('getAdminStats error', error);
    return {
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
    };
  }
}

export async function exportAdminLeadsCsv(filter: AdminLeadFilter): Promise<string> {
  const leads = await listAdminLeads(filter);
  const headers = [
    'id',
    'prenom',
    'nom',
    'email',
    'societe',
    'role',
    'telephone',
    'submittedAt',
    'pdfSent',
    'contacted',
    'emailCount',
    'pdfDownloadCount',
    'lastEmailAt',
    'lastPdfDownloadAt',
    'statusNote',
  ];
  const escapeCsv = (value: string | number | boolean | null | undefined) => {
    const text = value === null || typeof value === 'undefined' ? '' : String(value);
    if (/[",\n;]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [
    headers.join(','),
    ...leads.map((lead) =>
      [
        lead.id,
        lead.prenom,
        lead.nom,
        lead.email,
        lead.societe || '',
        lead.role || '',
        lead.telephone || '',
        lead.submittedAt,
        lead.pdfSent,
        lead.contacted,
        lead.emailCount,
        lead.pdfDownloadCount,
        lead.lastEmailAt || '',
        lead.lastPdfDownloadAt || '',
        lead.statusNote || '',
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  return lines.join('\n');
}
