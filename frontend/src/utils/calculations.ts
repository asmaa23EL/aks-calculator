import { FormAnswers, CalculationResults, CoutDetails } from '@/types';
import { CALCULATION_CONSTANTS } from '@/constants';

/**
 * Calcule le coût actuel de l'infrastructure
 */
function calculerCoutActuelInfrastructure(answers: FormAnswers): number {
  const { nombreServeurs } = answers.infrastructure;
  return nombreServeurs * CALCULATION_CONSTANTS.coutMensuelServeur;
}

/**
 * Calcule le coût AKS de l'infrastructure avec optimisations
 */
function calculerCoutAKSInfrastructure(answers: FormAnswers): number {
  const { nombreServeurs, pourcentage24_7, pourcentageHeuresBureau } = answers.infrastructure;
  
  const coutTotal = nombreServeurs * CALCULATION_CONSTANTS.coutMensuelServeur;
  const ratio24_7 = pourcentage24_7 / 100;
  const ratioHeuresBureau = pourcentageHeuresBureau / 100;
  
  // Applications 24/7 : réduction de 25%
  const cout24_7 = coutTotal * ratio24_7 * (1 - CALCULATION_CONSTANTS.reductionInfra24_7);
  
  // Applications heures bureau : réduction de 60%
  const coutHeuresBureau = coutTotal * ratioHeuresBureau * (1 - CALCULATION_CONSTANTS.reductionInfraHeuresBureau);
  
  return cout24_7 + coutHeuresBureau;
}

/**
 * Calcule le coût actuel des déploiements
 */
function calculerCoutActuelDeploiements(answers: FormAnswers): number {
  const { deploiementsParMois, tempsMoyenDeploiement, personnesImpliquees, heuresGestionReleases } = answers.deploiements;
  
  // Heures totales = (nb déploiements × durée × personnes) + heures de gestion
  const heuresDeploiements = deploiementsParMois * tempsMoyenDeploiement * personnesImpliquees;
  const heuresTotal = heuresDeploiements + heuresGestionReleases;
  
  return heuresTotal * CALCULATION_CONSTANTS.tauxHoraireMoyen;
}

/**
 * Calcule le coût AKS des déploiements avec GitOps
 */
function calculerCoutAKSDeploiements(answers: FormAnswers): number {
  const coutActuel = calculerCoutActuelDeploiements(answers);
  
  // Réduction de 60% du temps avec GitOps et automatisation
  return coutActuel * (1 - CALCULATION_CONSTANTS.reductionDeploiementsGitOps);
}

/**
 * Calcule le coût actuel des incidents
 */
function calculerCoutActuelIncidents(answers: FormAnswers): number {
  const { 
    incidentsMajeursParAn, 
    incidentsMineursMois, 
    personnesMobiliseesIncidentMajeur,
    coutHeureIndisponibilite,
    heuresGestionIncidents
  } = answers.incidents;
  
  // Incidents majeurs par mois
  const incidentsMajeursMois = incidentsMajeursParAn / 12;
  
  // Hypothèse : incident majeur = 4h, incident mineur = 1h
  const heuresIncidentsMajeurs = incidentsMajeursMois * 4 * personnesMobiliseesIncidentMajeur;
  const heuresIncidentsMineurs = incidentsMineursMois * 1 * 1; // 1 personne
  
  const heuresTotal = heuresIncidentsMajeurs + heuresIncidentsMineurs + heuresGestionIncidents;
  const coutHeures = heuresTotal * CALCULATION_CONSTANTS.tauxHoraireMoyen;
  
  // Coût d'indisponibilité (hypothèse : 2h par incident majeur)
  const coutIndisponibilite = incidentsMajeursMois * 2 * coutHeureIndisponibilite;
  
  return coutHeures + coutIndisponibilite;
}

/**
 * Calcule le coût AKS des incidents avec monitoring et auto-healing
 */
function calculerCoutAKSIncidents(answers: FormAnswers): number {
  const coutActuel = calculerCoutActuelIncidents(answers);
  
  // Réduction de 50% avec monitoring et auto-healing
  return coutActuel * (1 - CALCULATION_CONSTANTS.reductionIncidents);
}

/**
 * Calcule le coût actuel de la sécurité
 */
function calculerCoutActuelSecurite(answers: FormAnswers): number {
  const { heuresSecuriteParMois, coutEstimeIncidentSecurite, incidentSecurite12Mois } = answers.securite;
  
  // Coût du temps passé sur la sécurité
  const coutTemps =
    heuresSecuriteParMois *
    CALCULATION_CONSTANTS.tauxHoraireMoyen *
    CALCULATION_CONSTANTS.ratioSecuriteActuelle;
  
  // Coût du risque d'incident (probabilité × coût)
  // Si incident dans les 12 derniers mois, probabilité = 100%, sinon probabilité par défaut
  const probabiliteIncident = incidentSecurite12Mois
    ? 1
    : CALCULATION_CONSTANTS.probabiliteIncidentSecuriteSansHistorique;
  const coutRisqueMensuel = (coutEstimeIncidentSecurite * probabiliteIncident) / 12;
  
  return coutTemps + coutRisqueMensuel;
}

/**
 * Calcule le coût AKS de la sécurité avec automatisation
 */
function calculerCoutAKSSecurite(answers: FormAnswers): number {
  const { heuresSecuriteParMois, coutEstimeIncidentSecurite, incidentSecurite12Mois } = answers.securite;

  const coutTempsActuel =
    heuresSecuriteParMois *
    CALCULATION_CONSTANTS.tauxHoraireMoyen *
    CALCULATION_CONSTANTS.ratioSecuriteActuelle;
  
  // Réduction de 30% du temps avec automatisation
  const coutTemps = coutTempsActuel * (1 - CALCULATION_CONSTANTS.reductionSecurite);
  
  // Réduction de 30% du risque d'incident
  const probabiliteIncident = incidentSecurite12Mois
    ? 1
    : CALCULATION_CONSTANTS.probabiliteIncidentSecuriteSansHistorique;
  const probabiliteReduite = probabiliteIncident * (1 - CALCULATION_CONSTANTS.reductionRisqueSecurite);
  const coutRisqueMensuel = (coutEstimeIncidentSecurite * probabiliteReduite) / 12;
  
  return coutTemps + coutRisqueMensuel;
}

/**
 * Fonction principale de calcul
 */
export function calculerROI(answers: FormAnswers): CalculationResults {
  // Calcul des coûts actuels
  const coutActuelInfra = calculerCoutActuelInfrastructure(answers);
  const coutActuelDeploi = calculerCoutActuelDeploiements(answers);
  const coutActuelIncidents = calculerCoutActuelIncidents(answers);
  const coutActuelSecu = calculerCoutActuelSecurite(answers);
  
  const coutActuel: CoutDetails = {
    infrastructure: coutActuelInfra,
    deploiements: coutActuelDeploi,
    incidents: coutActuelIncidents,
    securite: coutActuelSecu,
    total: coutActuelInfra + coutActuelDeploi + coutActuelIncidents + coutActuelSecu,
  };
  
  // Calcul des coûts AKS
  const coutAKSInfra = calculerCoutAKSInfrastructure(answers);
  const coutAKSDeploi = calculerCoutAKSDeploiements(answers);
  const coutAKSIncidents = calculerCoutAKSIncidents(answers);
  const coutAKSSecu = calculerCoutAKSSecurite(answers);
  
  const coutAKS: CoutDetails = {
    infrastructure: coutAKSInfra,
    deploiements: coutAKSDeploi,
    incidents: coutAKSIncidents,
    securite: coutAKSSecu,
    total: coutAKSInfra + coutAKSDeploi + coutAKSIncidents + coutAKSSecu,
  };
  
  // Économies
  const economiesMensuelles = coutActuel.total - coutAKS.total;
  
  const economiesParAxe = {
    infrastructure: coutActuel.infrastructure - coutAKS.infrastructure,
    deploiements: coutActuel.deploiements - coutAKS.deploiements,
    incidents: coutActuel.incidents - coutAKS.incidents,
    securite: coutActuel.securite - coutAKS.securite,
  };
  
  // ROI et payback
  const investissementInitial = CALCULATION_CONSTANTS.investissementKubeLaunch;
  const economiesAnnuelles = economiesMensuelles * 12;
  const roi12Mois = ((economiesAnnuelles - investissementInitial) / investissementInitial) * 100;
  const paybackMois = investissementInitial / economiesMensuelles;
  
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

/**
 * Formate un nombre en euros
 */
export function formatEuros(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

/**
 * Formate un pourcentage
 */
export function formatPourcentage(valeur: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valeur / 100);
}
