// Types pour les questions et réponses
export interface Question {
  id: string;
  text: string;
  type: 'number' | 'percentage' | 'boolean' | 'select';
  unit?: string;
  options?: { value: string | boolean; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  helpText?: string;
}

export interface Step {
  id: number;
  title: string;
  description: string;
  questions: Question[];
}

// Réponses utilisateur
export interface InfrastructureAnswers {
  nombreServeurs: number;
  nombreApplications: number;
  nombreMicroservices: number;
  pourcentage24_7: number;
  pourcentageHeuresBureau: number;
}

export interface DeploiementsAnswers {
  deploiementsParMois: number;
  tempsMoyenDeploiement: number;
  personnesImpliquees: number;
  tauxSucces: number;
  gitOps: boolean;
  heuresGestionReleases: number;
}

export interface IncidentsAnswers {
  incidentsMajeursParAn: number;
  incidentsMineursMois: number;
  personnesMobiliseesIncidentMajeur: number;
  coutHeureIndisponibilite: number;
  planRepriseAutomatise: boolean;
  heuresGestionIncidents: number;
}

export interface SecuriteAnswers {
  incidentSecurite12Mois: boolean;
  coutEstimeIncidentSecurite: number;
  scanImagesContainers: boolean;
  politiqueChiffrement: boolean;
  heuresSecuriteParMois: number;
}

export interface FormAnswers {
  infrastructure: InfrastructureAnswers;
  deploiements: DeploiementsAnswers;
  incidents: IncidentsAnswers;
  securite: SecuriteAnswers;
}

// Résultats des calculs
export interface CoutDetails {
  infrastructure: number;
  deploiements: number;
  incidents: number;
  securite: number;
  total: number;
}

export interface CalculationResults {
  coutActuel: CoutDetails;
  coutAKS: CoutDetails;
  economiesMensuelles: number;
  economiesParAxe: {
    infrastructure: number;
    deploiements: number;
    incidents: number;
    securite: number;
  };
  roi12Mois: number;
  paybackMois: number;
  investissementInitial: number;
}

// Lead form
export interface LeadFormData {
  nom: string;
  prenom: string;
  societe: string;
  email: string;
  role: string;
  consentementRGPD: boolean;
  telephone?: string;
}

// Constantes de calcul
export interface CalculationConstants {
  coutMensuelServeur: number; // Coût moyen par serveur
  tauxHoraireMoyen: number; // Coût horaire d'un ingénieur
  investissementKubeLaunch: number; // Coût initial KubeLaunch
  reductionInfra24_7: number; // % réduction pour apps 24/7
  reductionInfraHeuresBureau: number; // % réduction pour apps heures bureau
  reductionDeploiementsGitOps: number; // % réduction temps déploiements
  reductionIncidents: number; // % réduction incidents avec AKS
  reductionSecurite: number; // % réduction temps sécurité
  reductionRisqueSecurite: number; // % réduction risque incident sécurité
  ratioSecuriteActuelle: number; // coefficient de charge sécurité actuelle
  probabiliteIncidentSecuriteSansHistorique: number; // probabilité par défaut sans incident récent
}
