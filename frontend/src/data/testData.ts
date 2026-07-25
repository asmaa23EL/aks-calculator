// Données de test pour le calculateur ROI AKS

export const TEST_SCENARIOS = {
  // Scénario 1 : Petite entreprise
  petiteEntreprise: {
    infrastructure: {
      nombreServeurs: 5,
      nombreApplications: 8,
      nombreMicroservices: 12,
      pourcentage24_7: 40,
      pourcentageHeuresBureau: 60,
    },
    deploiements: {
      deploiementsParMois: 8,
      tempsMoyenDeploiement: 3,
      personnesImpliquees: 2,
      tauxSucces: 75,
      gitOps: false,
      heuresGestionReleases: 40,
    },
    incidents: {
      incidentsMajeursParAn: 2,
      incidentsMineursMois: 5,
      personnesMobiliseesIncidentMajeur: 2,
      coutHeureIndisponibilite: 2000,
      planRepriseAutomatise: false,
      heuresGestionIncidents: 20,
    },
    securite: {
      incidentSecurite12Mois: false,
      coutEstimeIncidentSecurite: 25000,
      scanImagesContainers: false,
      politiqueChiffrement: true,
      heuresSecuriteParMois: 20,
    },
  },

  // Scénario 2 : Entreprise moyenne
  entrepriseMoyenne: {
    infrastructure: {
      nombreServeurs: 15,
      nombreApplications: 25,
      nombreMicroservices: 40,
      pourcentage24_7: 60,
      pourcentageHeuresBureau: 40,
    },
    deploiements: {
      deploiementsParMois: 20,
      tempsMoyenDeploiement: 2,
      personnesImpliquees: 3,
      tauxSucces: 85,
      gitOps: true,
      heuresGestionReleases: 80,
    },
    incidents: {
      incidentsMajeursParAn: 4,
      incidentsMineursMois: 10,
      personnesMobiliseesIncidentMajeur: 3,
      coutHeureIndisponibilite: 5000,
      planRepriseAutomatise: true,
      heuresGestionIncidents: 40,
    },
    securite: {
      incidentSecurite12Mois: false,
      coutEstimeIncidentSecurite: 50000,
      scanImagesContainers: true,
      politiqueChiffrement: true,
      heuresSecuriteParMois: 40,
    },
  },

  // Scénario 3 : Grande entreprise
  grandeEntreprise: {
    infrastructure: {
      nombreServeurs: 50,
      nombreApplications: 100,
      nombreMicroservices: 200,
      pourcentage24_7: 75,
      pourcentageHeuresBureau: 25,
    },
    deploiements: {
      deploiementsParMois: 50,
      tempsMoyenDeploiement: 1.5,
      personnesImpliquees: 4,
      tauxSucces: 90,
      gitOps: true,
      heuresGestionReleases: 160,
    },
    incidents: {
      incidentsMajeursParAn: 6,
      incidentsMineursMois: 20,
      personnesMobiliseesIncidentMajeur: 5,
      coutHeureIndisponibilite: 10000,
      planRepriseAutomatise: true,
      heuresGestionIncidents: 80,
    },
    securite: {
      incidentSecurite12Mois: true,
      coutEstimeIncidentSecurite: 100000,
      scanImagesContainers: true,
      politiqueChiffrement: true,
      heuresSecuriteParMois: 80,
    },
  },

  // Scénario 4 : Startup tech
  startup: {
    infrastructure: {
      nombreServeurs: 3,
      nombreApplications: 5,
      nombreMicroservices: 8,
      pourcentage24_7: 80,
      pourcentageHeuresBureau: 20,
    },
    deploiements: {
      deploiementsParMois: 30,
      tempsMoyenDeploiement: 0.5,
      personnesImpliquees: 1,
      tauxSucces: 95,
      gitOps: true,
      heuresGestionReleases: 20,
    },
    incidents: {
      incidentsMajeursParAn: 1,
      incidentsMineursMois: 3,
      personnesMobiliseesIncidentMajeur: 2,
      coutHeureIndisponibilite: 1000,
      planRepriseAutomatise: true,
      heuresGestionIncidents: 10,
    },
    securite: {
      incidentSecurite12Mois: false,
      coutEstimeIncidentSecurite: 15000,
      scanImagesContainers: true,
      politiqueChiffrement: true,
      heuresSecuriteParMois: 15,
    },
  },
};

// Résultats attendus approximatifs pour validation
export const EXPECTED_RESULTS = {
  petiteEntreprise: {
    coutActuelApprox: 15000, // €/mois
    economiesApprox: 5000, // €/mois
    roiApprox: 300, // %
    paybackApprox: 3, // mois
  },
  entrepriseMoyenne: {
    coutActuelApprox: 45000,
    economiesApprox: 18000,
    roiApprox: 1300,
    paybackApprox: 1,
  },
  grandeEntreprise: {
    coutActuelApprox: 150000,
    economiesApprox: 65000,
    roiApprox: 5000,
    paybackApprox: 0.3,
  },
  startup: {
    coutActuelApprox: 10000,
    economiesApprox: 3500,
    roiApprox: 180,
    paybackApprox: 4.3,
  },
};

// Fonction utilitaire pour charger un scénario de test
export function loadTestScenario(scenario: keyof typeof TEST_SCENARIOS) {
  const data = TEST_SCENARIOS[scenario];
  
  // Stocker dans localStorage pour simulation
  if (typeof window !== 'undefined') {
    localStorage.setItem('wizardAnswers', JSON.stringify(data));
  }
  
  return data;
}

// Données pour les tests unitaires des calculs
export const CALCULATION_TEST_CASES = [
  {
    description: 'Infrastructure 100% 24/7',
    input: {
      nombreServeurs: 10,
      pourcentage24_7: 100,
      pourcentageHeuresBureau: 0,
      coutMensuelServeur: 2000,
    },
    expectedReduction: 0.25, // 25%
  },
  {
    description: 'Infrastructure 100% heures bureau',
    input: {
      nombreServeurs: 10,
      pourcentage24_7: 0,
      pourcentageHeuresBureau: 100,
      coutMensuelServeur: 2000,
    },
    expectedReduction: 0.60, // 60%
  },
  {
    description: 'Infrastructure mixte 50/50',
    input: {
      nombreServeurs: 10,
      pourcentage24_7: 50,
      pourcentageHeuresBureau: 50,
      coutMensuelServeur: 2000,
    },
    expectedReduction: 0.425, // (25% + 60%) / 2
  },
];
