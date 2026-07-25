import { CalculationConstants } from '@/types';

export const CALCULATION_CONSTANTS: CalculationConstants = {
  coutMensuelServeur: 2000, // 2000€ par serveur/mois (moyenne Azure VM)
  tauxHoraireMoyen: 90, // 90€/heure pour un ingénieur DevOps
  investissementKubeLaunch: 15000, // Coût initial KubeLaunch
  reductionInfra24_7: 0.25, // 25% de réduction pour apps 24/7
  reductionInfraHeuresBureau: 0.60, // 60% de réduction pour apps heures bureau
  reductionDeploiementsGitOps: 0.60, // 60% de réduction du temps
  reductionIncidents: 0.50, // 50% de réduction
  reductionSecurite: 0.30, // 30% de réduction du temps
  reductionRisqueSecurite: 0.30, // 30% de réduction du risque
  ratioSecuriteActuelle: 1.2, // Ratio metier securite actuelle
  probabiliteIncidentSecuriteSansHistorique: 0.2, // Probabilite par defaut
};

// Durées moyennes pour les calculs
export const DUREES_MOYENNES = {
  heuresMoisTravail: 160, // Heures de travail par mois
  joursAnnee: 365,
  joursMois: 30,
  heuresJournee: 24,
  heuresHeuresBureau: 9, // 9h-18h = 9 heures
  joursHeuresBureau: 5, // 5 jours par semaine
};

// Options pour les questions de type select
export const OPTIONS_ROLE = [
  { value: 'CTO', label: 'CTO / VP Engineering' },
  { value: 'DEVOPS', label: 'Responsable DevOps' },
  { value: 'CLOUDARCH', label: 'Architecte Cloud' },
  { value: 'IT', label: 'Directeur IT' },
  { value: 'CEO', label: 'CEO / Fondateur' },
  { value: 'AUTRE', label: 'Autre' },
];

export const OPTIONS_OUI_NON = [
  { value: true, label: 'Oui' },
  { value: false, label: 'Non' },
];
