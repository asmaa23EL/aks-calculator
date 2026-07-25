import { CalculationResults } from '@/types';

type LeadPdfPayload = {
  lead: {
    email: string;
    nom: string;
    prenom: string;
    societe?: string;
    role?: string;
    telephone?: string;
  };
  resultats: CalculationResults;
};

export async function generateReportPdfBuffer(payload: LeadPdfPayload): Promise<Buffer> {
  const lines = [
    'Rapport ROI AKS',
    `Date: ${new Date().toISOString()}`,
    `Lead: ${payload.lead.prenom} ${payload.lead.nom}`,
    `Email: ${payload.lead.email}`,
    `Societe: ${payload.lead.societe || ''}`,
    '',
    JSON.stringify(payload.resultats, null, 2),
  ];

  return Buffer.from(lines.join('\n'), 'utf-8');
}
