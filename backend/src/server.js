const path = require('path');
const { createAdminSessionToken, verifyAdminSessionToken } = require('./adminSession');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.local'),
  override: true,
});

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const allowedOrigins = frontendOrigin
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb', strict: false }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = pool.promise();

const CALCULATION_CONSTANTS = {
  coutMensuelServeur: 2000,
  tauxHoraireMoyen: 90,
  investissementKubeLaunch: 15000,
  reductionInfra24_7: 0.25,
  reductionInfraHeuresBureau: 0.6,
  reductionDeploiementsGitOps: 0.6,
  reductionIncidents: 0.5,
  reductionSecurite: 0.3,
  reductionRisqueSecurite: 0.3,
  ratioSecuriteActuelle: 1.2,
  probabiliteIncidentSecuriteSansHistorique: 0.2,
};

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseCookies(req) {
  const source = req.headers.cookie || '';
  const entries = source
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf('=');
      if (index === -1) {
        return null;
      }
      return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
    })
    .filter(Boolean);
  return Object.fromEntries(entries);
}

function setAdminCookie(res, token) {
  const maxAgeSeconds = 60 * 60 * 12;
  const parts = [
    `admin_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];

  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminCookie(res) {
  const parts = ['admin_session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  res.setHeader('Set-Cookie', parts.join('; '));
}

function requireAdminSession(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Non autorise' });
  }

  const session = verifyAdminSessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session invalide' });
  }

  req.adminSession = session;
  next();
}

function validateLeadPayload(body) {
  if (!isRecord(body)) {
    return 'Payload invalide';
  }

  const lead = body.lead;
  if (!isRecord(lead)) {
    return 'Lead manquant';
  }

  const requiredFields = ['prenom', 'nom', 'societe', 'email', 'role'];
  for (const field of requiredFields) {
    if (typeof lead[field] !== 'string' || !lead[field].trim()) {
      return `Champ invalide: ${field}`;
    }
  }

  if (typeof lead.consentementRGPD !== 'boolean' || !lead.consentementRGPD) {
    return 'Consentement RGPD requis';
  }

  return null;
}

function hasWizardSections(value) {
  return (
    isRecord(value) &&
    isRecord(value.infrastructure) &&
    isRecord(value.deploiements) &&
    isRecord(value.incidents) &&
    isRecord(value.securite)
  );
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTinyInt(value) {
  return value ? 1 : 0;
}

async function ensureLeadActivityTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activite_lead (
      Id_ACTIVITE BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      Id_LEAD BIGINT UNSIGNED NOT NULL,
      Id_ADMIN BIGINT UNSIGNED NOT NULL,
      type_activite VARCHAR(50) NOT NULL,
      contenu TEXT NULL,
      ancien_statut VARCHAR(50) NULL,
      nouveau_statut VARCHAR(50) NULL,
      date_activite DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      prochaine_action_at DATETIME NULL,
      PRIMARY KEY (Id_ACTIVITE),
      INDEX idx_activite_lead (Id_LEAD),
      INDEX idx_activite_admin (Id_ADMIN),
      INDEX idx_prochaine_action (prochaine_action_at),
      CONSTRAINT fk_activite_lead FOREIGN KEY (Id_LEAD) REFERENCES lead(Id_LEAD) ON DELETE CASCADE,
      CONSTRAINT fk_activite_admin FOREIGN KEY (Id_ADMIN) REFERENCES admin(Id_ADMIN) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function recordLeadActivity({ leadId, adminId, type, content, oldStatus, newStatus, nextActionAt = null }) {
  if (!leadId || !adminId) {
    return;
  }

  try {
    await ensureLeadActivityTable();
    await db.execute(
      `
      INSERT INTO activite_lead (
        Id_LEAD, Id_ADMIN, type_activite, contenu, ancien_statut, nouveau_statut, prochaine_action_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [leadId, adminId, type, content ?? null, oldStatus ?? null, newStatus ?? null, nextActionAt]
    );
  } catch (error) {
    console.warn('Impossible d enregistrer l activite du lead:', error);
  }
}

async function mirrorLeadToLegacyTables({ lead, answers, resultats, submittedAt, emailSent, emailError }) {
  if (!hasWizardSections(answers) || !isRecord(resultats)) {
    return null;
  }

  const infra = answers.infrastructure;
  const deploiements = answers.deploiements;
  const incidents = answers.incidents;
  const securite = answers.securite;

  const email = String(lead.email || '').trim().toLowerCase();
  const [existingLeadRows] = await db.execute('SELECT Id_LEAD FROM \`lead\` WHERE email = ? LIMIT 1', [email]);

  let legacyLeadId;
  if (existingLeadRows.length > 0) {
    legacyLeadId = Number(existingLeadRows[0].Id_LEAD);
    await db.execute(
      `
      UPDATE \`lead\`
      SET
        nom = ?,
        prenom = ?,
        societe = ?,
        role_poste = ?,
        consentement_rgpd = ?,
        date_soumission = ?,
        rapport_envoye = ?,
        telephone = ?,
        source = ?
      WHERE Id_LEAD = ?
      `,
      [
        String(lead.nom || ''),
        String(lead.prenom || ''),
        lead.societe ? String(lead.societe) : null,
        lead.role ? String(lead.role) : null,
        toTinyInt(Boolean(lead.consentementRGPD)),
        submittedAt,
        toTinyInt(Boolean(emailSent)),
        String(lead.telephone || '').trim() || null,
        'SITE_WEB',
        legacyLeadId,
      ]
    );
  } else {
    const [insertLeadResult] = await db.execute(
      `
      INSERT INTO \`lead\` (
        nom,
        prenom,
        email,
        societe,
        role_poste,
        consentement_rgpd,
        statut_crm,
        crm_id,
        date_soumission,
        rapport_envoye,
        telephone,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(lead.nom || ''),
        String(lead.prenom || ''),
        email,
        lead.societe ? String(lead.societe) : null,
        lead.role ? String(lead.role) : null,
        toTinyInt(Boolean(lead.consentementRGPD)),
        'NOUVEAU',
        null,
        submittedAt,
        toTinyInt(Boolean(emailSent)),
        String(lead.telephone || '').trim() || null,
        'SITE_WEB',
      ]
    );
    legacyLeadId = Number(insertLeadResult.insertId);
  }

  const [insertSimulationResult] = await db.execute(
    `
    INSERT INTO \`simulation\` (
      Id_LEAD,
      nb_serveurs,
      nb_applications,
      nb_microservices,
      pct_24_7,
      pct_bureau,
      nb_deploiements_mois,
      duree_deploiement_h,
      nb_personnes_deploy,
      taux_succes_deploy,
      gitops_actif,
      heures_deploy_mois,
      nb_incidents_majeurs,
      nb_incidents_mineurs,
      nb_personnes_incident,
      cout_heure_indisp,
      auto_healing,
      heures_incidents_mois,
      incident_securite_12m,
      cout_incident_securite,
      scan_images,
      chiffrement_actif,
      heures_securite_mois,
      taux_horaire,
      token_historique
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      legacyLeadId,
      toNumber(infra.nombreServeurs),
      toNumber(infra.nombreApplications),
      toNumber(infra.nombreMicroservices),
      toNumber(infra.pourcentage24_7),
      toNumber(infra.pourcentageHeuresBureau),
      toNumber(deploiements.deploiementsParMois),
      toNumber(deploiements.tempsMoyenDeploiement),
      toNumber(deploiements.personnesImpliquees),
      toNumber(deploiements.tauxSucces),
      toTinyInt(Boolean(deploiements.gitOps)),
      toNumber(deploiements.heuresGestionReleases),
      toNumber(incidents.incidentsMajeursParAn),
      toNumber(incidents.incidentsMineursMois),
      toNumber(incidents.personnesMobiliseesIncidentMajeur),
      toNumber(incidents.coutHeureIndisponibilite),
      toTinyInt(Boolean(incidents.planRepriseAutomatise)),
      toNumber(incidents.heuresGestionIncidents),
      toTinyInt(Boolean(securite.incidentSecurite12Mois)),
      toNumber(securite.coutEstimeIncidentSecurite),
      toTinyInt(Boolean(securite.scanImagesContainers)),
      toTinyInt(Boolean(securite.politiqueChiffrement)),
      toNumber(securite.heuresSecuriteParMois),
      CALCULATION_CONSTANTS.tauxHoraireMoyen,
      null,
    ]
  );
  const simulationId = Number(insertSimulationResult.insertId);

  const payback = Number(resultats.paybackMois);
  const [insertResultatResult] = await db.execute(
    `
    INSERT INTO \`resultat\` (
      Id_SIMULATION,
      cout_actuel_infra,
      cout_actuel_deploy,
      cout_actuel_incidents,
      cout_actuel_securite,
      cout_actuel_total,
      cout_aks_infra,
      cout_aks_deploy,
      cout_aks_incidents,
      cout_aks_securite,
      cout_aks_total,
      economies_mensuelles,
      roi_12_mois,
      payback_mois,
      investissement_initial
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      simulationId,
      toNumber(resultats.coutActuel?.infrastructure),
      toNumber(resultats.coutActuel?.deploiements),
      toNumber(resultats.coutActuel?.incidents),
      toNumber(resultats.coutActuel?.securite),
      toNumber(resultats.coutActuel?.total),
      toNumber(resultats.coutAKS?.infrastructure),
      toNumber(resultats.coutAKS?.deploiements),
      toNumber(resultats.coutAKS?.incidents),
      toNumber(resultats.coutAKS?.securite),
      toNumber(resultats.coutAKS?.total),
      toNumber(resultats.economiesMensuelles),
      toNumber(resultats.roi12Mois),
      Number.isFinite(payback) ? payback : null,
      toNumber(resultats.investissementInitial),
    ]
  );
  const resultatId = Number(insertResultatResult.insertId);

  await db.execute(
    `
    INSERT INTO \`email_log\` (
      Id_LEAD,
      type_email,
      statut,
      date_envoi,
      pdf_url,
      tentatives,
      message_erreur
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      legacyLeadId,
      'rapport_roi',
      emailSent ? 'envoye' : 'erreur',
      submittedAt,
      null,
      1,
      emailSent ? null : String(emailError || 'Configuration SMTP manquante'),
    ]
  );

  return {
    legacyLeadId,
    simulationId,
    resultatId,
  };
}

function calculerCoutActuelInfrastructure(answers) {
  return Number(answers.infrastructure.nombreServeurs) * CALCULATION_CONSTANTS.coutMensuelServeur;
}

function calculerCoutAKSInfrastructure(answers) {
  const nombreServeurs = Number(answers.infrastructure.nombreServeurs);
  const ratio247 = Number(answers.infrastructure.pourcentage24_7) / 100;
  const ratioHeuresBureau = Number(answers.infrastructure.pourcentageHeuresBureau) / 100;

  const coutTotal = nombreServeurs * CALCULATION_CONSTANTS.coutMensuelServeur;
  const cout247 = coutTotal * ratio247 * (1 - CALCULATION_CONSTANTS.reductionInfra24_7);
  const coutHeuresBureau =
    coutTotal * ratioHeuresBureau * (1 - CALCULATION_CONSTANTS.reductionInfraHeuresBureau);

  return cout247 + coutHeuresBureau;
}

function calculerCoutActuelDeploiements(answers) {
  const deploiementsParMois = Number(answers.deploiements.deploiementsParMois);
  const tempsMoyenDeploiement = Number(answers.deploiements.tempsMoyenDeploiement);
  const personnesImpliquees = Number(answers.deploiements.personnesImpliquees);
  const heuresGestionReleases = Number(answers.deploiements.heuresGestionReleases);

  const heuresDeploiements = deploiementsParMois * tempsMoyenDeploiement * personnesImpliquees;
  const heuresTotal = heuresDeploiements + heuresGestionReleases;
  return heuresTotal * CALCULATION_CONSTANTS.tauxHoraireMoyen;
}

function calculerCoutAKSDeploiements(answers) {
  const actuel = calculerCoutActuelDeploiements(answers);
  return actuel * (1 - CALCULATION_CONSTANTS.reductionDeploiementsGitOps);
}

function calculerCoutActuelIncidents(answers) {
  const incidentsMajeursParAn = Number(answers.incidents.incidentsMajeursParAn);
  const incidentsMineursMois = Number(answers.incidents.incidentsMineursMois);
  const personnesMobiliseesIncidentMajeur = Number(answers.incidents.personnesMobiliseesIncidentMajeur);
  const coutHeureIndisponibilite = Number(answers.incidents.coutHeureIndisponibilite);
  const heuresGestionIncidents = Number(answers.incidents.heuresGestionIncidents);

  const incidentsMajeursMois = incidentsMajeursParAn / 12;
  const heuresIncidentsMajeurs = incidentsMajeursMois * 4 * personnesMobiliseesIncidentMajeur;
  const heuresIncidentsMineurs = incidentsMineursMois;
  const heuresTotal = heuresIncidentsMajeurs + heuresIncidentsMineurs + heuresGestionIncidents;
  const coutHeures = heuresTotal * CALCULATION_CONSTANTS.tauxHoraireMoyen;
  const coutIndisponibilite = incidentsMajeursMois * 2 * coutHeureIndisponibilite;

  return coutHeures + coutIndisponibilite;
}

function calculerCoutAKSIncidents(answers) {
  const actuel = calculerCoutActuelIncidents(answers);
  return actuel * (1 - CALCULATION_CONSTANTS.reductionIncidents);
}

function calculerCoutActuelSecurite(answers) {
  const heuresSecuriteParMois = Number(answers.securite.heuresSecuriteParMois);
  const coutEstimeIncidentSecurite = Number(answers.securite.coutEstimeIncidentSecurite);
  const incidentSecurite12Mois = Boolean(answers.securite.incidentSecurite12Mois);

  const coutTemps =
    heuresSecuriteParMois *
    CALCULATION_CONSTANTS.tauxHoraireMoyen *
    CALCULATION_CONSTANTS.ratioSecuriteActuelle;

  const probabilite = incidentSecurite12Mois
    ? 1
    : CALCULATION_CONSTANTS.probabiliteIncidentSecuriteSansHistorique;
  const coutRisqueMensuel = (coutEstimeIncidentSecurite * probabilite) / 12;
  return coutTemps + coutRisqueMensuel;
}

function calculerCoutAKSSecurite(answers) {
  const heuresSecuriteParMois = Number(answers.securite.heuresSecuriteParMois);
  const coutEstimeIncidentSecurite = Number(answers.securite.coutEstimeIncidentSecurite);
  const incidentSecurite12Mois = Boolean(answers.securite.incidentSecurite12Mois);

  const coutTempsActuel =
    heuresSecuriteParMois *
    CALCULATION_CONSTANTS.tauxHoraireMoyen *
    CALCULATION_CONSTANTS.ratioSecuriteActuelle;

  const coutTemps =
    coutTempsActuel * (1 - CALCULATION_CONSTANTS.reductionSecurite);

  const probabilite = incidentSecurite12Mois
    ? 1
    : CALCULATION_CONSTANTS.probabiliteIncidentSecuriteSansHistorique;
  const probabiliteReduite = probabilite * (1 - CALCULATION_CONSTANTS.reductionRisqueSecurite);
  const coutRisqueMensuel = (coutEstimeIncidentSecurite * probabiliteReduite) / 12;

  return coutTemps + coutRisqueMensuel;
}

function calculerROI(answers) {
  const coutActuel = {
    infrastructure: calculerCoutActuelInfrastructure(answers),
    deploiements: calculerCoutActuelDeploiements(answers),
    incidents: calculerCoutActuelIncidents(answers),
    securite: calculerCoutActuelSecurite(answers),
  };
  coutActuel.total =
    coutActuel.infrastructure + coutActuel.deploiements + coutActuel.incidents + coutActuel.securite;

  const coutAKS = {
    infrastructure: calculerCoutAKSInfrastructure(answers),
    deploiements: calculerCoutAKSDeploiements(answers),
    incidents: calculerCoutAKSIncidents(answers),
    securite: calculerCoutAKSSecurite(answers),
  };
  coutAKS.total = coutAKS.infrastructure + coutAKS.deploiements + coutAKS.incidents + coutAKS.securite;

  const economiesMensuelles = coutActuel.total - coutAKS.total;
  const economiesParAxe = {
    infrastructure: coutActuel.infrastructure - coutAKS.infrastructure,
    deploiements: coutActuel.deploiements - coutAKS.deploiements,
    incidents: coutActuel.incidents - coutAKS.incidents,
    securite: coutActuel.securite - coutAKS.securite,
  };

  const investissementInitial = CALCULATION_CONSTANTS.investissementKubeLaunch;
  const economiesAnnuelles = economiesMensuelles * 12;
  const roi12Mois = ((economiesAnnuelles - investissementInitial) / investissementInitial) * 100;
  const paybackMois = economiesMensuelles <= 0 ? Number.POSITIVE_INFINITY : investissementInitial / economiesMensuelles;

  return {
    coutActuel,
    coutAKS,
    economiesMensuelles,
    economiesParAxe,
    roi12Mois,
    paybackMois,
    investissementInitial,
  };
}

function formatEuros(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

function buildLeadReportSummary(resultats) {
  const economiesMensuelles = Number(resultats?.economiesMensuelles || 0);
  const roi12Mois = Number(resultats?.roi12Mois || 0);
  const paybackMois = Number(resultats?.paybackMois || 0);

  const paybackText = Number.isFinite(paybackMois) ? `${paybackMois.toFixed(1)} mois` : 'à confirmer';

  return [
    `Économies mensuelles estimées : ${formatEuros(economiesMensuelles)}`,
    `ROI sur 12 mois : ${roi12Mois.toFixed(1)} %`,
    `Délai de retour sur investissement : ${paybackText}`,
  ].join('<br/>');
}

function generateReportHTML(data) {
  const { lead, resultats } = data || {};
  const safeResultats = isRecord(resultats) ? resultats : {};
  const safeLead = isRecord(lead) ? lead : {};

  const economiesMensuelles = Number(safeResultats.economiesMensuelles || 0);
  const coutActuel = isRecord(safeResultats.coutActuel) ? safeResultats.coutActuel : {};
  const coutAKS = isRecord(safeResultats.coutAKS) ? safeResultats.coutAKS : {};
  const economiesParAxe = isRecord(safeResultats.economiesParAxe) ? safeResultats.economiesParAxe : {};
  const roi12Mois = Number(safeResultats.roi12Mois || 0);
  const paybackMois = Number(safeResultats.paybackMois || 0);
  const getValue = (source, key, fallback = 0) => Number(source?.[key] ?? fallback);

  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; color: #1e293b; line-height: 1.5; padding: 28px; }
      h1 { color: #0078d4; margin-bottom: 8px; }
      h2 { color: #0f172a; margin-top: 24px; margin-bottom: 10px; }
      .small { color: #64748b; font-size: 12px; }
      .box { background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px; }
      th { background: #f1f5f9; }
      .hero { background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%); color: white; padding: 20px; border-radius: 10px; margin: 16px 0; }
      .value { font-size: 34px; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Rapport ROI Azure AKS</h1>
    <p class="small">Genere le ${new Date().toLocaleDateString('fr-FR')}</p>

    <h2>Client</h2>
    <div class="box">
      <strong>${String(safeLead.prenom || '')} ${String(safeLead.nom || '')}</strong><br/>
      ${String(safeLead.societe || '-')}<br/>
      ${String(safeLead.email || '-')}
    </div>

    <div class="hero">
      <div class="value">${formatEuros(economiesMensuelles)}</div>
      <div>Economies mensuelles estimees</div>
    </div>

    <h2>Comparatif des couts</h2>
    <table>
      <thead>
        <tr><th>Axe</th><th>Actuel</th><th>AKS</th><th>Economies</th></tr>
      </thead>
      <tbody>
        <tr><td>Infrastructure</td><td>${formatEuros(getValue(coutActuel, 'infrastructure'))}</td><td>${formatEuros(getValue(coutAKS, 'infrastructure'))}</td><td>${formatEuros(getValue(economiesParAxe, 'infrastructure'))}</td></tr>
        <tr><td>Deploiements</td><td>${formatEuros(getValue(coutActuel, 'deploiements'))}</td><td>${formatEuros(getValue(coutAKS, 'deploiements'))}</td><td>${formatEuros(getValue(economiesParAxe, 'deploiements'))}</td></tr>
        <tr><td>Incidents</td><td>${formatEuros(getValue(coutActuel, 'incidents'))}</td><td>${formatEuros(getValue(coutAKS, 'incidents'))}</td><td>${formatEuros(getValue(economiesParAxe, 'incidents'))}</td></tr>
        <tr><td>Securite</td><td>${formatEuros(getValue(coutActuel, 'securite'))}</td><td>${formatEuros(getValue(coutAKS, 'securite'))}</td><td>${formatEuros(getValue(economiesParAxe, 'securite'))}</td></tr>
        <tr><th>Total</th><th>${formatEuros(getValue(coutActuel, 'total'))}</th><th>${formatEuros(getValue(coutAKS, 'total'))}</th><th>${formatEuros(economiesMensuelles)}</th></tr>
      </tbody>
    </table>

    <h2>Indicateurs</h2>
    <div class="box">
      ROI 12 mois: <strong>${Number(roi12Mois).toFixed(1)}%</strong><br/>
      Payback: <strong>${Number(paybackMois).toFixed(1)} mois</strong>
    </div>
  </body>
  </html>
  `;
}

async function generateReportPdfBuffer(data) {
  const html = generateReportHTML(data);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || 'CloudDev Fusion';

  if (!host || !user || !pass || !fromEmail) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    fromEmail,
    fromName,
  };
}

async function sendLeadReportEmail({ lead, pdfBuffer, resultats }) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('Configuration SMTP manquante');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const firstName = String(lead.prenom || '').trim() || 'cher prospect';
  const reportSummary = buildLeadReportSummary(resultats);

  const recipientEmail = process.env.RECIPIENT_EMAIL || 'asmaa.eljraoui@clouddevfusion.com';

  await transporter.sendMail({
    from: `${config.fromName} <${config.fromEmail}>`,
    to: recipientEmail,
    subject: 'Votre rapport ROI Azure AKS est prêt',
    html: `
      <p>Bonjour ${firstName},</p>
      <p>Merci pour votre simulation ROI Azure AKS. Nous vous remercions pour votre confiance et votre temps.</p>
      <p>Voici un résumé de votre rapport :</p>
      <p>${reportSummary}</p>
      <p>Vous trouverez votre rapport complet en pièce jointe au format PDF.</p>
      <p>Cordialement,<br/>L'équipe CloudDev Fusion</p>
    `,
    attachments: [
      {
        filename: 'rapport-roi-aks.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

async function ensureDefaultAdminAccount() {
  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@clouddevfusion.com').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || 'admin123');

  if (!adminEmail || !adminPassword) {
    return;
  }

  const [existingRows] = await db.execute('SELECT Id_ADMIN, password_hash FROM admin WHERE email = ? LIMIT 1', [adminEmail]);
  const existingAdmin = existingRows[0];

  if (existingAdmin) {
    if (!existingAdmin.password_hash) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await db.execute('UPDATE admin SET password_hash = ? WHERE Id_ADMIN = ?', [passwordHash, existingAdmin.Id_ADMIN]);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await db.execute(
    `INSERT INTO admin (nom, email, password_hash, role, actif) VALUES (?, ?, ?, 'ADMIN', 1)`,
    ['Administrateur', adminEmail, passwordHash]
  );
}

async function syncLegacyLeadRowsToAdminStore() {
  const [legacyRows] = await db.execute(`
    SELECT
      Id_LEAD,
      nom,
      prenom,
      email,
      societe,
      role_poste,
      consentement_rgpd,
      statut_crm,
      date_soumission,
      rapport_envoye
    FROM \`lead\`
    ORDER BY date_soumission DESC, Id_LEAD DESC
  `);

  for (const row of legacyRows) {
    const email = String(row.email || '').trim();
    const submittedAt = row.date_soumission
      ? new Date(row.date_soumission)
      : new Date();

    if (!email) {
      continue;
    }

    const [existingRows] = await db.execute(
      `SELECT id FROM lead_submissions WHERE email = ? LIMIT 1`,
      [email]
    );

    if (existingRows.length > 0) {
      continue;
    }

    const payload = {
      nom: row.nom,
      prenom: row.prenom,
      societe: row.societe,
      email,
      role: row.role_poste,
      telephone: null,
      consentementRGPD: Boolean(row.consentement_rgpd),
    };

    const resultsPayload = {};

    await db.execute(
      `
      INSERT INTO lead_submissions (
        email, nom, prenom, societe, role, telephone, submitted_at, lead_json, results_json, pdf_sent, contacted, email_count, last_email_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        email,
        String(row.nom || '').trim(),
        String(row.prenom || '').trim(),
        String(row.societe || '').trim() || null,
        String(row.role_poste || '').trim() || null,
        null,
        submittedAt.toISOString().slice(0, 19).replace('T', ' '),
        JSON.stringify(payload),
        JSON.stringify(resultsPayload),
        Boolean(row.rapport_envoye) ? 1 : 0,
        String(row.statut_crm || '').trim().toUpperCase() === 'CONTACTE' ? 1 : 0,
        0,
        null,
      ]
    );
  }
}

async function ensureColumnExists(tableName, columnName, definitionSql) {
  const [rows] = await db.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [tableName, columnName]);
  if (rows.length > 0) {
    return;
  }

  await db.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definitionSql}`);
}

async function ensureTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin (
      Id_ADMIN BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      nom VARCHAR(255) NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
      actif TINYINT(1) NOT NULL DEFAULT 1,
      derniere_cnx DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (Id_ADMIN),
      UNIQUE KEY uniq_admin_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.execute(`
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
      status VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
      note TEXT NULL,
      next_action_date DATE NULL,
      next_action VARCHAR(255) NULL,
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

  // Older installations may already have an admin table without the newer
  // session-tracking fields. CREATE TABLE IF NOT EXISTS does not add them.
  await ensureColumnExists('admin', 'actif', 'actif TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumnExists('admin', 'derniere_cnx', 'derniere_cnx DATETIME NULL');

  await ensureColumnExists('lead_submissions', 'status', "status VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU'");
  await ensureColumnExists('lead_submissions', 'note', 'note TEXT NULL');
  await ensureColumnExists('lead_submissions', 'next_action_date', 'next_action_date DATE NULL');
  await ensureColumnExists('lead_submissions', 'next_action', 'next_action VARCHAR(255) NULL');

  await ensureDefaultAdminAccount();
  await syncLegacyLeadRowsToAdminStore();
}

async function syncLeadToAdminStore({ lead, resultats, submittedAt, emailSent }) {
  await ensureTables();

  const payload = {
    nom: lead.nom,
    prenom: lead.prenom,
    societe: lead.societe,
    email: lead.email,
    role: lead.role,
    telephone: lead.telephone || null,
    consentementRGPD: Boolean(lead.consentementRGPD),
  };

  const resultsPayload = {
    coutActuel: resultats?.coutActuel || {},
    coutAKS: resultats?.coutAKS || {},
    economiesMensuelles: Number(resultats?.economiesMensuelles || 0),
    roi12Mois: Number(resultats?.roi12Mois || 0),
    paybackMois: Number(resultats?.paybackMois || 0),
    investissementInitial: Number(resultats?.investissementInitial || 0),
  };

  await db.execute(
    `
    INSERT INTO lead_submissions (
      email, nom, prenom, societe, role, telephone, submitted_at, lead_json, results_json, pdf_sent, contacted, email_count, last_email_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nom = VALUES(nom),
      prenom = VALUES(prenom),
      societe = VALUES(societe),
      role = VALUES(role),
      telephone = VALUES(telephone),
      submitted_at = VALUES(submitted_at),
      lead_json = VALUES(lead_json),
      results_json = VALUES(results_json),
      pdf_sent = VALUES(pdf_sent),
      contacted = VALUES(contacted),
      email_count = VALUES(email_count),
      last_email_at = VALUES(last_email_at)
    `,
    [
      String(lead.email || '').trim(),
      String(lead.nom || '').trim(),
      String(lead.prenom || '').trim(),
      String(lead.societe || '').trim() || null,
      String(lead.role || '').trim() || null,
      String(lead.telephone || '').trim() || null,
      submittedAt instanceof Date ? submittedAt.toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
      JSON.stringify(payload),
      JSON.stringify(resultsPayload),
      emailSent ? 1 : 0,
      0,
      emailSent ? 1 : 0,
      emailSent ? submittedAt instanceof Date ? submittedAt.toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    ]
  );
}

function asBoolean(value) {
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return false;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseStatusFilter(value) {
  if (['new', 'pdf_sent', 'contacted', 'relance', 'rdv', 'interested', 'not_interested', 'client', 'lost'].includes(value)) {
    return value;
  }
  return 'all';
}

function normalizeLeadStatus(value) {
  const normalized = String(value || 'NOUVEAU').trim().toUpperCase();
  const aliases = {
    'A RELANCER': 'A_RELANCER',
    CONTACTER: 'A_CONTACTER',
    'A CONTACTER': 'A_CONTACTER',
    'RENDEZ-VOUS': 'RDV_PLANIFIE',
    RDV: 'RDV_PLANIFIE',
  };
  const resolved = aliases[normalized] || normalized;
  const allowed = ['NOUVEAU', 'A_CONTACTER', 'CONTACTE', 'A_RELANCER', 'RDV_PLANIFIE', 'INTERESSE', 'NON_INTERESSE', 'CLIENT', 'PERDU'];
  if (allowed.includes(resolved)) return resolved;
  return 'NOUVEAU';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS server_time');
    res.json({ status: 'connected', dbTime: rows[0].server_time });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/calculate-roi', async (req, res) => {
  if (!hasWizardSections(req.body?.answers)) {
    return res.status(400).json({ error: 'Payload answers invalide' });
  }

  try {
    const resultats = calculerROI(req.body.answers);
    return res.json({ resultats });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors du calcul ROI' });
  }
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { lead, resultats } = req.body || {};
    if (!isRecord(lead) || !isRecord(resultats)) {
      return res.status(400).json({ error: 'Payload invalide' });
    }

    const pdf = await generateReportPdfBuffer({ lead, resultats });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-roi-aks-${Date.now()}.pdf"`);
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('Erreur generation PDF:', error);
    return res.status(500).json({ error: 'Erreur lors de la generation du PDF' });
  }
});

app.post('/api/leads', async (req, res) => {
  const validationError = validateLeadPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    await ensureTables();

    const { lead, answers, results, timestamp, downloadPdf } = req.body;

    let resultats = results;
    if (!isRecord(resultats)) {
      if (!hasWizardSections(answers)) {
        return res.status(400).json({ error: 'Resultats absents et reponses wizard invalides' });
      }
      resultats = calculerROI(answers);
    }

    const submittedAt = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(submittedAt.getTime())) {
      return res.status(400).json({ error: 'Timestamp invalide' });
    }

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateReportPdfBuffer({ lead, resultats });
    } catch (pdfError) {
      console.error('Erreur generation PDF lead:', pdfError);
      return res.status(500).json({ error: 'Erreur lors de la generation du PDF' });
    }

    let emailSent = false;
    let emailError = null;
    try {
      await sendLeadReportEmail({ lead, pdfBuffer, resultats });
      emailSent = true;
    } catch (mailError) {
      emailError = mailError instanceof Error ? mailError.message : 'Envoi email impossible';
      console.error('Erreur envoi email lead:', mailError);
    }

    let legacyMirror = null;
    let legacyMirrorError = null;
    try {
      await ensureTables();
      await syncLeadToAdminStore({
        lead,
        resultats,
        submittedAt,
        emailSent,
      });
      legacyMirror = await mirrorLeadToLegacyTables({
        lead,
        answers,
        resultats,
        submittedAt,
        emailSent,
        emailError,
      });
    } catch (legacyError) {
      console.error('Erreur sync tables legacy:', legacyError);
      legacyMirrorError = legacyError instanceof Error ? legacyError.message : 'Erreur inconnue';
    }

    if (legacyMirrorError) {
      console.warn('Mirror legacy non bloquant:', legacyMirrorError);
    }

    const wantsPdfDownload = downloadPdf === true;
    const pdfFilename = `rapport-roi-aks-${Date.now()}.pdf`;

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Lead enregistre avec succes et email envoye'
        : 'Lead enregistre avec succes mais email non envoye',
      emailSent,
      emailError,
      resultats,
      legacyMirror,
      legacyMirrorError,
      pdfBase64: wantsPdfDownload && pdfBuffer ? pdfBuffer.toString('base64') : undefined,
      pdfFilename: wantsPdfDownload ? pdfFilename : undefined,
    });
  } catch (error) {
    console.error('Erreur /api/leads:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'aks-calculator-admin-secret';
    if (!sessionSecret) {
      return res.status(500).json({ error: 'ADMIN_SESSION_SECRET manquant' });
    }

    await ensureTables();

    const body = isRecord(req.body) ? req.body : {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const [rows] = await db.execute(
      `SELECT Id_ADMIN, email, password_hash, actif FROM admin WHERE email = ? LIMIT 1`,
      [email]
    );

    const user = rows[0];
    if (!user || !asBoolean(user.actif)) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const stored = String(user.password_hash || '');
    let isValidPassword = false;

    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      isValidPassword = await bcrypt.compare(password, stored);
    } else {
      isValidPassword = stored === password;
      if (isValidPassword) {
        const hash = await bcrypt.hash(password, 12);
        await db.execute('UPDATE admin SET password_hash = ? WHERE Id_ADMIN = ?', [hash, user.Id_ADMIN]);
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    await db.execute('UPDATE admin SET derniere_cnx = NOW() WHERE Id_ADMIN = ?', [user.Id_ADMIN]);

    const token = createAdminSessionToken({
      userId: user.Id_ADMIN,
      email: user.email,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    });

    setAdminCookie(res, token);
    return res.json({ success: true, user: { id: user.Id_ADMIN, email: user.email, role: 'admin' } });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Erreur serveur connexion admin' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  clearAdminCookie(res);
  return res.json({ success: true });
});

app.get('/api/admin/me', requireAdminSession, (req, res) => {
  return res.json({
    authenticated: true,
    user: {
      id: req.adminSession.userId,
      email: req.adminSession.email,
      role: req.adminSession.role,
    },
  });
});

app.post('/api/admin/leads', requireAdminSession, async (req, res) => {
  try {
    await ensureTables();

    const body = isRecord(req.body) ? req.body : {};
    const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : '';
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const societe = typeof body.societe === 'string' ? body.societe.trim() : '';
    const role = typeof body.role === 'string' ? body.role.trim() : '';
    const telephone = typeof body.telephone === 'string' ? body.telephone.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const status = typeof body.status === 'string' ? normalizeLeadStatus(body.status) : 'NOUVEAU';
    const contacted = body.contacted === true || status === 'CONTACTE' || status === 'CLIENT';
    const pdfSent = body.pdfSent === true || status === 'CLIENT' || status === 'CONTACTE';

    if (!prenom || !nom || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email sont requis' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    const [existingRows] = await db.execute('SELECT id FROM `lead_submissions` WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
      return res.status(409).json({ error: 'Un lead avec cet email existe déjà' });
    }

    const submittedAt = new Date();
    const leadPayload = {
      nom,
      prenom,
      societe: societe || null,
      email,
      role: role || null,
      telephone: telephone || null,
      consentementRGPD: true,
    };

    const resultsPayload = {};

    await db.execute(
      `
      INSERT INTO lead_submissions (
        email, nom, prenom, societe, role, telephone, submitted_at, lead_json, results_json, pdf_sent, contacted, status, note, status_note, next_action_date, next_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        email,
        nom,
        prenom,
        societe || null,
        role || null,
        telephone || null,
        submittedAt.toISOString().slice(0, 19).replace('T', ' '),
        JSON.stringify(leadPayload),
        JSON.stringify(resultsPayload),
        pdfSent ? 1 : 0,
        contacted ? 1 : 0,
        status,
        note || null,
        note || null,
        null,
        null,
      ]
    );

    const [createdRows] = await db.execute('SELECT id FROM `lead_submissions` WHERE email = ? ORDER BY id DESC LIMIT 1', [email]);
    const createdLead = createdRows[0];

    return res.status(201).json({
      success: true,
      lead: {
        id: createdLead?.id || null,
        nom,
        prenom,
        email,
        societe: societe || null,
        role: role || null,
        telephone: telephone || null,
        note: note || null,
        status,
      },
    });
  } catch (error) {
    console.error('Admin lead create error:', error);
    return res.status(500).json({ error: 'Impossible d’ajouter le lead' });
  }
});

app.get('/api/admin/leads', requireAdminSession, async (req, res) => {
  try {
    await ensureTables();

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = parseStatusFilter(typeof req.query.status === 'string' ? req.query.status : null);

    const whereParts = [];
    const params = [];

    if (search) {
      whereParts.push('(l.nom LIKE ? OR l.prenom LIKE ? OR l.email LIKE ? OR COALESCE(l.societe, "") LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    if (status === 'new') {
      whereParts.push('COALESCE(l.pdf_sent, 0) = 0 AND COALESCE(l.contacted, 0) = 0');
    } else if (status === 'pdf_sent') {
      whereParts.push('COALESCE(l.pdf_sent, 0) = 1');
    } else if (status === 'contacted') {
      whereParts.push('COALESCE(l.contacted, 0) = 1');
    } else {
      const statusMap = {
        relance: 'A_RELANCER',
        rdv: 'RDV_PLANIFIE',
        interested: 'INTERESSE',
        not_interested: 'NON_INTERESSE',
        client: 'CLIENT',
        lost: 'PERDU',
      };
      if (statusMap[status]) {
        whereParts.push('l.status = ?');
        params.push(statusMap[status]);
      }
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `
      SELECT
        l.id,
        l.nom,
        l.prenom,
        l.email,
        l.societe,
        l.role,
        l.telephone,
        l.submitted_at,
        l.pdf_sent,
        l.contacted,
        l.status_note,
        l.status,
        l.note,
        l.next_action_date,
        l.next_action,
        l.last_contacted_at,
        l.last_pdf_sent_at,
        l.email_count,
        l.last_email_at,
        l.pdf_download_count,
        l.last_pdf_download_at,
        l.lead_json,
        l.results_json
      FROM \`lead_submissions\` AS l
      ${whereClause}
      ORDER BY l.submitted_at DESC
      LIMIT 300
      `,
      params
    );

    const leads = rows.map((row) => {
      const leadPayload = (() => {
        const value = row.lead_json;
        if (isRecord(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        }
        return {};
      })();

      const resultsPayload = (() => {
        const value = row.results_json;
        if (isRecord(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        }
        return {};
      })();

      return {
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        email: row.email,
        societe: row.societe,
        role: row.role,
        telephone: row.telephone,
        submittedAt: toIso(row.submitted_at),
        pdfSent: asBoolean(row.pdf_sent),
        contacted: asBoolean(row.contacted),
        statusNote: row.note ?? row.status_note,
        status: normalizeLeadStatus(row.status || row.status_note),
        note: row.note ?? row.status_note,
        nextActionDate: row.next_action_date ? String(row.next_action_date) : null,
        nextAction: row.next_action || null,
        lastContactedAt: toIso(row.last_contacted_at),
        lastPdfSentAt: toIso(row.last_pdf_sent_at),
        emailCount: Number(row.email_count || 0),
        lastEmailAt: toIso(row.last_email_at),
        pdfDownloadCount: Number(row.pdf_download_count || 0),
        lastPdfDownloadAt: toIso(row.last_pdf_download_at),
        results: {
          coutActuel: {
            infrastructure: toNumber(resultsPayload?.coutActuel?.infrastructure),
            deploiements: toNumber(resultsPayload?.coutActuel?.deploiements),
            incidents: toNumber(resultsPayload?.coutActuel?.incidents),
            securite: toNumber(resultsPayload?.coutActuel?.securite),
            total: toNumber(resultsPayload?.coutActuel?.total),
          },
          coutAKS: {
            infrastructure: toNumber(resultsPayload?.coutAKS?.infrastructure),
            deploiements: toNumber(resultsPayload?.coutAKS?.deploiements),
            incidents: toNumber(resultsPayload?.coutAKS?.incidents),
            securite: toNumber(resultsPayload?.coutAKS?.securite),
            total: toNumber(resultsPayload?.coutAKS?.total),
          },
          economiesMensuelles: toNumber(resultsPayload?.economiesMensuelles),
          roi12Mois: toNumber(resultsPayload?.roi12Mois),
          paybackMois: toNumber(resultsPayload?.paybackMois),
          investissementInitial: toNumber(resultsPayload?.investissementInitial),
        },
        leadPayload: {
          nom: leadPayload.nom ?? row.nom,
          prenom: leadPayload.prenom ?? row.prenom,
          societe: leadPayload.societe ?? row.societe,
          email: leadPayload.email ?? row.email,
          role: leadPayload.role ?? row.role,
        },
      };
    });

    return res.json({ leads });
  } catch (error) {
    console.error('Admin leads error:', error);
    return res.status(500).json({ error: 'Impossible de charger les leads' });
  }
});

app.get('/api/admin/stats', requireAdminSession, async (req, res) => {
  try {
    await ensureTables();

    const now = new Date();
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [leadRows] = await db.execute(
      `
      SELECT COUNT(*) AS total_leads,
             SUM(CASE WHEN submitted_at >= ? THEN 1 ELSE 0 END) AS leads_this_week,
             SUM(CASE WHEN submitted_at >= ? THEN 1 ELSE 0 END) AS leads_this_month,
             SUM(CASE WHEN contacted = 1 THEN 1 ELSE 0 END) AS contacted_total,
             SUM(CASE WHEN pdf_sent = 1 THEN 1 ELSE 0 END) AS pdf_sent_total
      FROM \`lead_submissions\`
      `,
      [weekStart, monthStart]
    );

    const totals = leadRows[0] || {};
    const leadsThisWeek = Number(totals.leads_this_week || 0);
    const visitsThisWeek = 0;

    const stats = {
      totalLeads: Number(totals.total_leads || 0),
      leadsThisWeek,
      leadsThisMonth: Number(totals.leads_this_month || 0),
      contactedCount: Number(totals.contacted_total || 0),
      pdfSentCount: Number(totals.pdf_sent_total || 0),
      simulationsThisWeek: 0,
      visitsThisWeek,
      conversionRate: visitsThisWeek > 0 ? Number(((leadsThisWeek / visitsThisWeek) * 100).toFixed(1)) : null,
    };

    return res.json({ stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Impossible de charger les statistiques' });
  }
});

app.patch('/api/admin/leads/:id', requireAdminSession, async (req, res) => {
  try {
    await ensureTables();

    const leadId = Number(req.params.id);
    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({ error: 'Identifiant lead invalide' });
    }

    const payload = req.body || {};
    const hasAny =
      typeof payload.pdfSent === 'boolean' ||
      typeof payload.contacted === 'boolean' ||
      typeof payload.status === 'string' ||
      typeof payload.note === 'string' ||
      payload.note === null ||
      typeof payload.nextActionDate === 'string' ||
      payload.nextActionDate === null ||
      typeof payload.nextAction === 'string' ||
      payload.nextAction === null ||
      typeof payload.statusNote === 'string' ||
      payload.statusNote === null;

    if (!hasAny) {
      return res.status(400).json({ error: 'Aucune modification demandee' });
    }

    const [submissionRows] = await db.execute(
      'SELECT id, email, status_note, status, note, next_action_date, next_action, pdf_sent, contacted FROM \`lead_submissions\` WHERE id = ? LIMIT 1',
      [leadId]
    );
    if (!submissionRows.length) {
      return res.status(404).json({ error: 'Lead introuvable' });
    }

    const current = submissionRows[0];
    const nextStatus = typeof payload.status === 'string' ? normalizeLeadStatus(payload.status) : normalizeLeadStatus(current.status || current.status_note);
    const nextPdfSent = typeof payload.pdfSent === 'boolean'
      ? toTinyInt(payload.pdfSent)
      : nextStatus === 'CLIENT' || nextStatus === 'CONTACTE' || nextStatus === 'A_RELANCER'
        ? 1
        : toTinyInt(asBoolean(current.pdf_sent));
    const nextContacted = typeof payload.contacted === 'boolean'
      ? toTinyInt(payload.contacted)
      : nextStatus === 'CLIENT' || nextStatus === 'CONTACTE'
        ? 1
        : toTinyInt(asBoolean(current.contacted));
    const nextNote = typeof payload.note !== 'undefined'
      ? payload.note
      : (typeof payload.statusNote !== 'undefined' ? payload.statusNote : (current.note ?? current.status_note));
    const nextActionDate = typeof payload.nextActionDate !== 'undefined' ? payload.nextActionDate : current.next_action_date;
    const nextAction = typeof payload.nextAction !== 'undefined' ? payload.nextAction : current.next_action;
    const nextStatut = nextStatus === 'CLIENT' ? 'CLIENT' : nextContacted ? 'CONTACTE' : 'NOUVEAU';

    await db.execute(
      'UPDATE \`lead_submissions\` SET pdf_sent = ?, contacted = ?, status = ?, note = ?, next_action_date = ?, next_action = ?, status_note = ?, last_pdf_sent_at = ?, last_contacted_at = ? WHERE id = ?',
      [nextPdfSent, nextContacted, nextStatus, nextNote, nextActionDate || null, nextAction || null, nextNote, nextPdfSent ? new Date() : null, nextContacted ? new Date() : null, leadId]
    );

    const [legacyRows] = await db.execute('SELECT Id_LEAD FROM \`lead\` WHERE email = ? LIMIT 1', [current.email]);
    if (legacyRows.length) {
      await db.execute(
        'UPDATE \`lead\` SET rapport_envoye = ?, statut_crm = ?, date_modification = CURRENT_TIMESTAMP WHERE Id_LEAD = ?',
        [nextPdfSent, nextStatut, legacyRows[0].Id_LEAD]
      );
    }

    if (typeof payload.statusNote !== 'undefined' && payload.statusNote !== current.status_note) {
      const legacyId = legacyRows[0]?.Id_LEAD;
      if (legacyId) {
        await recordLeadActivity({
          leadId: legacyId,
          adminId: req.adminSession?.userId || 1,
          type: 'note_ajoutee',
          content: payload.statusNote ?? null,
          oldStatus: current.status_note || null,
          newStatus: nextStatut,
        });
      }
    }

    if (typeof payload.contacted === 'boolean' && payload.contacted !== asBoolean(current.contacted)) {
      const legacyId = legacyRows[0]?.Id_LEAD;
      if (legacyId) {
        await recordLeadActivity({
          leadId: legacyId,
          adminId: req.adminSession?.userId || 1,
          type: 'statut_modifie',
          content: payload.contacted ? 'Lead marque comme contacte' : 'Lead retire du statut contacte',
          oldStatus: asBoolean(current.contacted) ? 'CONTACTE' : 'NOUVEAU',
          newStatus: nextStatut,
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Admin lead update error:', error);
    return res.status(500).json({ error: 'Impossible de mettre a jour le lead' });
  }
});

app.post('/api/admin/leads/:id/email', requireAdminSession, async (req, res) => {
  try {
    await ensureTables();

    const leadId = Number(req.params.id);
    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({ error: 'Identifiant lead invalide' });
    }

    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!subject || !body) {
      return res.status(400).json({ error: 'Sujet et contenu requis' });
    }

    const [rows] = await db.execute('SELECT id, email FROM \`lead_submissions\` WHERE id = ? LIMIT 1', [leadId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Lead introuvable' });
    }

    const submission = rows[0];

    await db.execute(
      `
      INSERT INTO \`email_log\` (Id_LEAD, type_email, statut, date_envoi, pdf_url, tentatives, message_erreur)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        leadId,
        'relance_admin',
        'en_attente',
        new Date(),
        null,
        1,
        `Sujet: ${subject}\n${body}`,
      ]
    );

    await db.execute(
      'UPDATE \`lead_submissions\` SET contacted = 1, last_contacted_at = ?, email_count = email_count + 1, last_email_at = ? WHERE id = ?',
      [new Date(), new Date(), leadId]
    );

    const [legacyRows] = await db.execute('SELECT Id_LEAD FROM \`lead\` WHERE email = ? LIMIT 1', [submission.email]);
    if (legacyRows.length) {
      await db.execute('UPDATE \`lead\` SET statut_crm = ?, rapport_envoye = 1, date_modification = CURRENT_TIMESTAMP WHERE Id_LEAD = ?', ['CONTACTE', legacyRows[0].Id_LEAD]);
      await recordLeadActivity({
        leadId: legacyRows[0].Id_LEAD,
        adminId: req.adminSession?.userId || 1,
        type: 'email_envoye',
        content: subject,
        oldStatus: 'NOUVEAU',
        newStatus: 'CONTACTE',
      });
    }

    return res.json({ success: true, message: 'Relance enregistree' });
  } catch (error) {
    console.error('Admin manual email error:', error);
    return res.status(500).json({ error: 'Impossible d enregistrer la relance' });
  }
});

function getLeadStatusText(pdfSent, contacted) {
  if (contacted) return 'Contacte';
  if (pdfSent) return 'PDF envoye';
  return 'Nouveau';
}

function escapeCsv(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

app.get('/api/admin/leads/export', requireAdminSession, async (req, res) => {
  try {
    const status = parseStatusFilter(typeof req.query.status === 'string' ? req.query.status : null);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const whereParts = [];
    const params = [];

    if (search) {
      whereParts.push('(l.nom LIKE ? OR l.prenom LIKE ? OR l.email LIKE ? OR COALESCE(l.societe, "") LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    if (status === 'new') {
      whereParts.push('COALESCE(l.rapport_envoye, 0) = 0 AND UPPER(COALESCE(l.statut_crm, "")) <> "CONTACTE"');
    } else if (status === 'pdf_sent') {
      whereParts.push('COALESCE(l.rapport_envoye, 0) = 1');
    } else if (status === 'contacted') {
      whereParts.push('UPPER(COALESCE(l.statut_crm, "")) = "CONTACTE"');
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const [rows] = await db.execute(
      `
      SELECT
        l.Id_LEAD AS id,
        l.prenom,
        l.nom,
        l.email,
        l.societe,
        l.role_poste AS role,
        NULL AS telephone,
        l.date_soumission AS submitted_at,
        COALESCE(l.rapport_envoye, 0) AS pdf_sent,
        CASE WHEN UPPER(COALESCE(l.statut_crm, '')) = 'CONTACTE' THEN 1 ELSE 0 END AS contacted,
        COALESCE(mail.email_count, 0) AS email_count,
        mail.last_email_at,
        '' AS status_note
      FROM \`lead\` l
      LEFT JOIN (
        SELECT Id_LEAD, COUNT(*) AS email_count, MAX(date_envoi) AS last_email_at
        FROM \`email_log\`
        GROUP BY Id_LEAD
      ) mail ON mail.Id_LEAD = l.Id_LEAD
      ${whereClause}
      ORDER BY l.date_soumission DESC
      LIMIT 1000
      `,
      params
    );

    const header = [
      'id',
      'prenom',
      'nom',
      'email',
      'societe',
      'role',
      'telephone',
      'date_soumission',
      'statut',
      'pdf_envoye',
      'contacte',
      'emails_envoyes',
      'derniere_relance',
      'note',
    ];

    const lines = rows.map((row) => [
      row.id,
      row.prenom,
      row.nom,
      row.email,
      row.societe || '',
      row.role || '',
      row.telephone || '',
      toIso(row.submitted_at) || '',
      getLeadStatusText(asBoolean(row.pdf_sent), asBoolean(row.contacted)),
      asBoolean(row.pdf_sent) ? 'oui' : 'non',
      asBoolean(row.contacted) ? 'oui' : 'non',
      Number(row.email_count || 0),
      toIso(row.last_email_at) || '',
      row.status_note || '',
    ]);

    const csv = [header, ...lines]
      .map((line) => line.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    console.error('Admin export error:', error);
    return res.status(500).json({ error: 'Impossible d exporter les leads' });
  }
});

app.post('/api/analytics/track', async (req, res) => {
  try {
    const eventType = req.body?.eventType;
    const pathValue = req.body?.path;
    const sessionId = req.body?.sessionId;

    if ((eventType !== 'visit' && eventType !== 'simulation') || typeof pathValue !== 'string' || !pathValue) {
      return res.status(400).json({ error: 'Payload analytics invalide' });
    }

    // Choix A: pas de persistance analytics hors schema MCD.

    return res.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return res.status(500).json({ error: 'Impossible d enregistrer l evenement' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

async function start() {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    if (rows[0]?.ok !== 1) {
      throw new Error('Test DB invalide');
    }

    await ensureTables();

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
      console.log('MySQL connected');
      console.log(`CORS origin: ${frontendOrigin}`);
    });
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

start();
