const path = require('path');
const crypto = require('crypto');
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
const sessionSecret = process.env.ADMIN_SESSION_SECRET || '';

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

  // Autorise les ports locaux de dev (3000, 3001, 3002, 3003...).
  return /^http:\/\/localhost:\d+$/.test(origin);
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
app.use(express.json({ limit: '2mb' }));

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

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signValue(value) {
  return crypto.createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function createAdminSessionToken(payload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!sessionSecret) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, givenSignature] = parts;
  const expectedSignature = signValue(encodedPayload);

  const given = Buffer.from(givenSignature);
  const expected = Buffer.from(expectedSignature);
  if (given.length !== expected.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!isRecord(payload)) {
      return null;
    }

    if (
      typeof payload.userId !== 'number' ||
      typeof payload.email !== 'string' ||
      payload.role !== 'admin' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
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

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminCookie(res) {
  const parts = ['admin_session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
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
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

function generateReportHTML(data) {
  const { lead, resultats } = data;

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
      <strong>${lead.prenom || ''} ${lead.nom || ''}</strong><br/>
      ${lead.societe || '-'}<br/>
      ${lead.email || '-'}
    </div>

    <div class="hero">
      <div class="value">${formatEuros(resultats.economiesMensuelles)}</div>
      <div>Economies mensuelles estimees</div>
    </div>

    <h2>Comparatif des couts</h2>
    <table>
      <thead>
        <tr><th>Axe</th><th>Actuel</th><th>AKS</th><th>Economies</th></tr>
      </thead>
      <tbody>
        <tr><td>Infrastructure</td><td>${formatEuros(resultats.coutActuel.infrastructure)}</td><td>${formatEuros(resultats.coutAKS.infrastructure)}</td><td>${formatEuros(resultats.economiesParAxe.infrastructure)}</td></tr>
        <tr><td>Deploiements</td><td>${formatEuros(resultats.coutActuel.deploiements)}</td><td>${formatEuros(resultats.coutAKS.deploiements)}</td><td>${formatEuros(resultats.economiesParAxe.deploiements)}</td></tr>
        <tr><td>Incidents</td><td>${formatEuros(resultats.coutActuel.incidents)}</td><td>${formatEuros(resultats.coutAKS.incidents)}</td><td>${formatEuros(resultats.economiesParAxe.incidents)}</td></tr>
        <tr><td>Securite</td><td>${formatEuros(resultats.coutActuel.securite)}</td><td>${formatEuros(resultats.coutAKS.securite)}</td><td>${formatEuros(resultats.economiesParAxe.securite)}</td></tr>
        <tr><th>Total</th><th>${formatEuros(resultats.coutActuel.total)}</th><th>${formatEuros(resultats.coutAKS.total)}</th><th>${formatEuros(resultats.economiesMensuelles)}</th></tr>
      </tbody>
    </table>

    <h2>Indicateurs</h2>
    <div class="box">
      ROI 12 mois: <strong>${Number(resultats.roi12Mois).toFixed(1)}%</strong><br/>
      Payback: <strong>${Number(resultats.paybackMois).toFixed(1)} mois</strong>
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

async function sendLeadReportEmail({ lead, pdfBuffer }) {
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

  await transporter.sendMail({
    from: `${config.fromName} <${config.fromEmail}>`,
    to: lead.email,
    subject: 'Votre rapport d analyse ROI Azure AKS',
    html: `
      <p>Bonjour ${lead.prenom},</p>
      <p>Merci pour votre simulation ROI Azure AKS.</p>
      <p>Vous trouverez votre rapport detaille en piece jointe.</p>
      <p>Cordialement,<br/>CloudDev Fusion</p>
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

  await ensureDefaultAdminAccount();
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
  if (value === 'new' || value === 'pdf_sent' || value === 'contacted') {
    return value;
  }
  return 'all';
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
      await sendLeadReportEmail({ lead, pdfBuffer });
      emailSent = true;
    } catch (mailError) {
      emailError = mailError instanceof Error ? mailError.message : 'Envoi email impossible';
      console.error('Erreur envoi email lead:', mailError);
    }

    let legacyMirror = null;
    let legacyMirrorError = null;
    try {
      await ensureTables();
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
    if (!sessionSecret) {
      return res.status(500).json({ error: 'ADMIN_SESSION_SECRET manquant' });
    }

    await ensureTables();

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

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
        l.nom,
        l.prenom,
        l.email,
        l.societe,
        l.role_poste AS role,
        NULL AS telephone,
        l.date_soumission AS submitted_at,
        COALESCE(l.rapport_envoye, 0) AS pdf_sent,
        CASE WHEN UPPER(COALESCE(l.statut_crm, '')) = 'CONTACTE' THEN 1 ELSE 0 END AS contacted,
        NULL AS status_note,
        NULL AS last_contacted_at,
        NULL AS last_pdf_sent_at,
        COALESCE(mail.email_count, 0) AS email_count,
        mail.last_email_at,
        r.cout_actuel_infra,
        r.cout_actuel_deploy,
        r.cout_actuel_incidents,
        r.cout_actuel_securite,
        r.cout_actuel_total,
        r.cout_aks_infra,
        r.cout_aks_deploy,
        r.cout_aks_incidents,
        r.cout_aks_securite,
        r.cout_aks_total,
        r.economies_mensuelles,
        r.roi_12_mois,
        r.payback_mois,
        r.investissement_initial
      FROM \`lead\` l
      LEFT JOIN (
        SELECT s1.*
        FROM \`simulation\` s1
        INNER JOIN (
          SELECT Id_LEAD, MAX(Id_SIMULATION) AS max_simulation_id
          FROM \`simulation\`
          GROUP BY Id_LEAD
        ) latest ON latest.max_simulation_id = s1.Id_SIMULATION
      ) sim ON sim.Id_LEAD = l.Id_LEAD
      LEFT JOIN \`resultat\` r ON r.Id_SIMULATION = sim.Id_SIMULATION
      LEFT JOIN (
        SELECT Id_LEAD, COUNT(*) AS email_count, MAX(date_envoi) AS last_email_at
        FROM \`email_log\`
        GROUP BY Id_LEAD
      ) mail ON mail.Id_LEAD = l.Id_LEAD
      ${whereClause}
      ORDER BY l.date_soumission DESC
      LIMIT 300
      `,
      params
    );

    const leads = rows.map((row) => ({
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
      statusNote: row.status_note,
      lastContactedAt: toIso(row.last_contacted_at),
      lastPdfSentAt: toIso(row.last_pdf_sent_at),
      emailCount: Number(row.email_count || 0),
      lastEmailAt: toIso(row.last_email_at),
      results: {
        coutActuel: {
          infrastructure: toNumber(row.cout_actuel_infra),
          deploiements: toNumber(row.cout_actuel_deploy),
          incidents: toNumber(row.cout_actuel_incidents),
          securite: toNumber(row.cout_actuel_securite),
          total: toNumber(row.cout_actuel_total),
        },
        coutAKS: {
          infrastructure: toNumber(row.cout_aks_infra),
          deploiements: toNumber(row.cout_aks_deploy),
          incidents: toNumber(row.cout_aks_incidents),
          securite: toNumber(row.cout_aks_securite),
          total: toNumber(row.cout_aks_total),
        },
        economiesMensuelles: toNumber(row.economies_mensuelles),
        roi12Mois: toNumber(row.roi_12_mois),
        paybackMois: toNumber(row.payback_mois),
        investissementInitial: toNumber(row.investissement_initial),
      },
      leadPayload: {
        nom: row.nom,
        prenom: row.prenom,
        societe: row.societe,
        email: row.email,
        role: row.role,
      },
    }));

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

    const [leadTotalsRows] = await db.execute(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN date_soumission >= ? THEN 1 ELSE 0 END) AS leads_this_week,
        SUM(CASE WHEN date_soumission >= ? THEN 1 ELSE 0 END) AS leads_this_month,
        SUM(CASE WHEN UPPER(COALESCE(statut_crm, '')) = 'CONTACTE' THEN 1 ELSE 0 END) AS contacted_total,
        SUM(CASE WHEN COALESCE(rapport_envoye, 0) = 1 THEN 1 ELSE 0 END) AS pdf_sent_total
      FROM \`lead\`
      `,
      [weekStart, monthStart]
    );

    const [simulationRows] = await db.execute(
      `
      SELECT COUNT(*) AS simulations_this_week
      FROM \`simulation\` s
      INNER JOIN \`lead\` l ON l.Id_LEAD = s.Id_LEAD
      WHERE l.date_soumission >= ?
      `,
      [weekStart]
    );

    const totals = leadTotalsRows[0] || {};
    const simulationStats = simulationRows[0] || {};

    const leadsThisWeek = Number(totals.leads_this_week || 0);
    const visitsThisWeek = 0;

    const stats = {
      totalLeads: Number(totals.total || 0),
      leadsThisWeek,
      leadsThisMonth: Number(totals.leads_this_month || 0),
      contactedCount: Number(totals.contacted_total || 0),
      pdfSentCount: Number(totals.pdf_sent_total || 0),
      simulationsThisWeek: Number(simulationStats.simulations_this_week || 0),
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
      typeof payload.statusNote === 'string' ||
      payload.statusNote === null;

    if (!hasAny) {
      return res.status(400).json({ error: 'Aucune modification demandee' });
    }

    const [leadRows] = await db.execute('SELECT Id_LEAD FROM \`lead\` WHERE Id_LEAD = ? LIMIT 1', [leadId]);
    if (!leadRows.length) {
      return res.status(404).json({ error: 'Lead introuvable' });
    }

    const [currentRows] = await db.execute(
      'SELECT rapport_envoye, statut_crm FROM \`lead\` WHERE Id_LEAD = ? LIMIT 1',
      [leadId]
    );

    const current = currentRows[0];
    const nextPdfSent =
      typeof payload.pdfSent === 'boolean' ? toTinyInt(payload.pdfSent) : toTinyInt(asBoolean(current.rapport_envoye));

    let nextStatut = typeof current.statut_crm === 'string' && current.statut_crm ? current.statut_crm : 'NOUVEAU';
    if (typeof payload.contacted === 'boolean') {
      nextStatut = payload.contacted ? 'CONTACTE' : 'NOUVEAU';
    }

    await db.execute(
      'UPDATE \`lead\` SET rapport_envoye = ?, statut_crm = ? WHERE Id_LEAD = ?',
      [nextPdfSent, nextStatut, leadId]
    );

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

    const [rows] = await db.execute('SELECT email FROM \`lead\` WHERE Id_LEAD = ? LIMIT 1', [leadId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Lead introuvable' });
    }

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

    await db.execute('UPDATE \`lead\` SET statut_crm = ? WHERE Id_LEAD = ?', ['CONTACTE', leadId]);

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
