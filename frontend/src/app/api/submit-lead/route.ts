import { NextResponse } from 'next/server';
import { ResultSetHeader } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';
import { calculerROI } from '@/utils/calculations';
import { CalculationResults, FormAnswers } from '@/types';
import { generateReportPdfBuffer } from '@/lib/reportPdf';
import { sendLeadReportEmail } from '@/lib/leadEmail';
import { registerPdfDownloadAttempt, updateAdminLead, ensureLeadSubmissionsSchema } from '@/lib/adminStore';

type LeadPayload = {
  email: string;
  nom: string;
  prenom: string;
  societe?: string;
  role?: string;
  telephone?: string;
  [key: string]: unknown;
};

type SubmitLeadPayload = {
  lead: LeadPayload;
  answers?: unknown;
  results?: Record<string, unknown>;
  downloadPdf?: boolean;
  timestamp?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasWizardSections(value: unknown): value is FormAnswers {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.infrastructure) &&
    isRecord(value.deploiements) &&
    isRecord(value.incidents) &&
    isRecord(value.securite)
  );
}

function asCalculationResults(value: unknown): CalculationResults | null {
  if (!isRecord(value)) {
    return null;
  }
  const hasFields =
    isRecord(value.coutActuel) &&
    isRecord(value.coutAKS) &&
    typeof value.economiesMensuelles === 'number' &&
    isRecord(value.economiesParAxe) &&
    typeof value.roi12Mois === 'number' &&
    typeof value.paybackMois === 'number' &&
    typeof value.investissementInitial === 'number';

  return hasFields ? (value as unknown as CalculationResults) : null;
}

export async function POST(request: Request) {
  try {
    const { lead, answers, results, downloadPdf, timestamp } = (await request.json()) as SubmitLeadPayload;

    if (!lead?.email || !lead?.nom || !lead?.prenom) {
      return NextResponse.json(
        { error: 'Donnees manquantes' },
        { status: 400 }
      );
    }

    const providedResults = asCalculationResults(results);
    let resultats: CalculationResults | null = providedResults;

    if (!resultats) {
      if (!hasWizardSections(answers)) {
        return NextResponse.json(
          { error: 'Resultats absents et reponses wizard invalides' },
          { status: 400 }
        );
      }
      resultats = calculerROI(answers);
    }

    const submittedAt = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(submittedAt.getTime())) {
      return NextResponse.json(
        { error: 'Timestamp invalide' },
        { status: 400 }
      );
    }

    let leadId = 0;
    let storageWarning: string | null = null;
    try {
      await ensureLeadSubmissionsSchema();

      const [insertResult] = await mysqlPool.execute<ResultSetHeader>(
        `
        INSERT INTO lead_submissions (
          email,
          nom,
          prenom,
          societe,
          role,
          telephone,
          submitted_at,
          lead_json,
          results_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          lead.email,
          lead.nom,
          lead.prenom,
          lead.societe || null,
          lead.role || null,
          lead.telephone || null,
          submittedAt,
          JSON.stringify(lead),
          JSON.stringify(resultats),
        ]
      );

      leadId = Number(insertResult.insertId);
    } catch (storageError) {
      storageWarning = storageError instanceof Error ? storageError.message : 'Stockage indisponible';
      console.error('Erreur stockage lead:', storageError);
    }

    const wantsPdfDownload = downloadPdf === true;

    if (leadId > 0 && wantsPdfDownload) {
      try {
        await registerPdfDownloadAttempt(leadId);
      } catch (attemptError) {
        console.error('Erreur enregistrement tentative PDF:', attemptError);
      }
    }

    let pdfBuffer: Buffer | null = null;
    let pdfError: string | null = null;
    try {
      pdfBuffer = await generateReportPdfBuffer({
        lead,
        resultats,
      });
    } catch (generationError) {
      pdfError = generationError instanceof Error ? generationError.message : 'Generation PDF impossible';
      console.error('Erreur generation PDF lead:', generationError);
    }

    let emailSent = false;
    let emailError: string | null = null;

    if (pdfBuffer) {
      try {
        await sendLeadReportEmail({
          lead: {
            nom: lead.nom,
            prenom: lead.prenom,
            societe: lead.societe || '',
            email: lead.email,
            role: lead.role || '',
            telephone: lead.telephone || '',
            consentementRGPD: true,
          },
          pdfBuffer,
        });
        emailSent = true;
      } catch (mailError) {
        emailError = mailError instanceof Error ? mailError.message : 'Envoi email impossible';
        console.error('Erreur envoi email lead:', mailError);
      }
    } else {
      emailError = pdfError || 'PDF indisponible, envoi email impossible';
    }

    if (leadId > 0 && emailSent) {
      try {
        await updateAdminLead(leadId, {
          pdfSent: true,
        });
      } catch (statusError) {
        console.error('Erreur updateLeadStatus:', statusError);
      }
    }

    console.log('Lead enregistre en base:', lead.email);

    const pdfFilename = `rapport-roi-aks-${Date.now()}.pdf`;

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'Lead enregistre avec succes et email envoye'
        : 'Lead enregistre avec succes mais email non envoye',
      emailSent,
      emailError,
      storageWarning,
      pdfError,
      resultats,
      pdfBase64: wantsPdfDownload && pdfBuffer ? pdfBuffer.toString('base64') : undefined,
      pdfFilename: wantsPdfDownload ? pdfFilename : undefined,
    });

  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
