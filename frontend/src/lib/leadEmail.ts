import nodemailer from 'nodemailer';
import { LeadFormData } from '@/types';

type SendLeadReportEmailPayload = {
  lead: LeadFormData;
  pdfBuffer: Buffer;
};

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP non configure (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendLeadReportEmail(payload: SendLeadReportEmailPayload): Promise<void> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error('Expediteur SMTP manquant (SMTP_FROM ou SMTP_USER)');
  }

  await transporter.sendMail({
    from,
    to: payload.lead.email,
    subject: 'Votre rapport ROI AKS',
    text: `Bonjour ${payload.lead.prenom},\n\nVeuillez trouver votre rapport ROI AKS en piece jointe.`,
    attachments: [
      {
        filename: 'rapport-roi-aks.pdf',
        content: payload.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
