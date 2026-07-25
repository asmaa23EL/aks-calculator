# Spécifications Techniques - Calculateur ROI AKS

## Architecture Technique

### Frontend (Next.js 14 + React 18)

#### Pages et Routing

| Route | Fichier | Description |
|-------|---------|-------------|
| `/` | `src/app/page.tsx` | Landing page avec présentation et CTA |
| `/wizard` | `src/app/wizard/page.tsx` | Formulaire multi-étapes |
| `/resultats` | `src/app/resultats/page.tsx` | Affichage des résultats avec graphiques |

#### Composants

| Composant | Fichier | Responsabilité |
|-----------|---------|----------------|
| `Question` | `src/components/Question.tsx` | Affichage d'une question (input, boolean, select) |
| `StepForm` | `src/components/StepForm.tsx` | Conteneur pour les questions d'une étape |
| `ProgressBar` | `src/components/ProgressBar.tsx` | Barre de progression du wizard |
| `LeadFormModal` | `src/components/LeadFormModal.tsx` | Modal de capture de leads |

#### State Management

- **Local State** (useState) : Gestion des réponses du wizard
- **LocalStorage** : Persistance temporaire des réponses entre wizard et résultats
- **No Redux** : Application simple sans besoin de state global complexe

### Types TypeScript

#### FormAnswers
```typescript
interface FormAnswers {
  infrastructure: {
    nombreServeurs: number;
    nombreApplications: number;
    nombreMicroservices: number;
    pourcentage24_7: number;
    pourcentageHeuresBureau: number;
  };
  deploiements: {
    deploiementsParMois: number;
    tempsMoyenDeploiement: number;
    personnesImpliquees: number;
    tauxSucces: number;
    gitOps: boolean;
    heuresGestionReleases: number;
  };
  incidents: {
    incidentsMajeursParAn: number;
    incidentsMineursMois: number;
    personnesMobiliseesIncidentMajeur: number;
    coutHeureIndisponibilite: number;
    planRepriseAutomatise: boolean;
    heuresGestionIncidents: number;
  };
  securite: {
    incidentSecurite12Mois: boolean;
    coutEstimeIncidentSecurite: number;
    scanImagesContainers: boolean;
    politiqueChiffrement: boolean;
    heuresSecuriteParMois: number;
  };
}
```

### Algorithmes de Calcul

#### 1. Infrastructure

**Coût Actuel:**
```
Coût_Actuel_Infra = Nb_Serveurs × Coût_Mensuel_Serveur
```

**Coût AKS:**
```
Coût_AKS_Infra = (Nb_Serveurs × Coût_Mensuel × %_24_7 × 0.75) 
               + (Nb_Serveurs × Coût_Mensuel × %_Heures_Bureau × 0.40)
```

**Hypothèses:**
- Applications 24/7 : 25% de réduction (autoscaling)
- Applications heures bureau : 60% de réduction (arrêt automatique)

#### 2. Déploiements

**Temps Actuel:**
```
Heures_Déploiements = (Nb_Déploiements × Durée × Nb_Personnes) + Heures_Gestion
Coût_Actuel = Heures_Déploiements × Taux_Horaire
```

**Temps AKS:**
```
Heures_AKS = Heures_Déploiements × 0.40  // 60% de réduction
Coût_AKS = Heures_AKS × Taux_Horaire
```

**Hypothèses:**
- GitOps réduit le temps de 60%
- CI/CD automatise les tâches manuelles

#### 3. Incidents

**Coût Actuel:**
```
Heures_Majeurs = (Incidents_Majeurs / 12) × 4h × Nb_Personnes
Heures_Mineurs = Incidents_Mineurs × 1h × 1 personne
Coût_Heures = (Heures_Majeurs + Heures_Mineurs + Heures_Gestion) × Taux_Horaire
Coût_Indispo = (Incidents_Majeurs / 12) × 2h × Coût_Heure_Indispo
Coût_Total = Coût_Heures + Coût_Indispo
```

**Coût AKS:**
```
Coût_AKS = Coût_Total × 0.50  // 50% de réduction
```

**Hypothèses:**
- Monitoring avancé détecte les problèmes plus tôt
- Auto-healing réduit la durée des incidents
- Observabilité centralisée accélère le diagnostic

#### 4. Sécurité

**Coût Actuel:**
```
Coût_Temps = Heures_Sécurité × Taux_Horaire
Probabilité_Incident = Has_Incident_12m ? 1.0 : 0.2
Coût_Risque = (Coût_Incident_Estimé × Probabilité) / 12
Coût_Total = Coût_Temps + Coût_Risque
```

**Coût AKS:**
```
Coût_Temps_AKS = Heures_Sécurité × Taux_Horaire × 0.70  // 30% réduction
Probabilité_Réduite = Probabilité_Incident × 0.70  // 30% réduction risque
Coût_Risque_AKS = (Coût_Incident_Estimé × Probabilité_Réduite) / 12
Coût_Total_AKS = Coût_Temps_AKS + Coût_Risque_AKS
```

**Hypothèses:**
- Scans automatiques des images
- Chiffrement natif
- Gestion des secrets avec Azure Key Vault

#### ROI et Payback

```
Économies_Mensuelles = Coût_Actuel_Total - Coût_AKS_Total
Économies_Annuelles = Économies_Mensuelles × 12
ROI_12_Mois = ((Économies_Annuelles - Investissement) / Investissement) × 100
Payback_Mois = Investissement / Économies_Mensuelles
```

### Constantes de Configuration

| Constante | Valeur par défaut | Description |
|-----------|-------------------|-------------|
| `coutMensuelServeur` | 2000€ | Coût moyen serveur Azure VM |
| `tauxHoraireMoyen` | 90€ | Coût horaire ingénieur DevOps |
| `investissementKubeLaunch` | 15000€ | Coût initial solution KubeLaunch |
| `reductionInfra24_7` | 0.25 | 25% de réduction apps 24/7 |
| `reductionInfraHeuresBureau` | 0.60 | 60% de réduction apps heures bureau |
| `reductionDeploiementsGitOps` | 0.60 | 60% de réduction temps déploiements |
| `reductionIncidents` | 0.50 | 50% de réduction incidents |
| `reductionSecurite` | 0.30 | 30% de réduction temps sécurité |
| `reductionRisqueSecurite` | 0.30 | 30% de réduction risque incident |

### Validation des Données

#### Validation Wizard

- **Champs obligatoires** : Tous les champs doivent être remplis
- **Types de données** : Number, Boolean selon le type de question
- **Limites** :
  - Pourcentages : 0-100%
  - Nombres : min=0 (sauf si spécifié)
  - Cohérence : %_24_7 + %_Heures_Bureau ≈ 100%

#### Validation Lead Form

- **Email** : Format RFC 5322
- **Champs requis** : Prénom, Nom, Société, Email, Rôle
- **RGPD** : Consentement obligatoire (checkbox)

### Performance

#### Objectifs

- **Calculs** : < 200ms
- **Lighthouse Score** : > 90
- **First Contentful Paint** : < 1.5s
- **Time to Interactive** : < 3s

#### Optimisations

- Code splitting automatique (Next.js)
- Lazy loading des composants Chart.js
- Images optimisées (next/image)
- CSS critique inliné
- Minification automatique

### Sécurité

#### Frontend

- Validation côté client (UX)
- Sanitization des inputs
- Protection XSS (React par défaut)
- HTTPS obligatoire en production

#### Backend (à implémenter)

- Rate limiting sur API `/api/submit-lead`
- Validation des données côté serveur
- Protection CSRF
- Stockage sécurisé des clés API (variables d'environnement)
- Logs des accès

### Accessibilité (WCAG 2.1)

- ✅ Semantic HTML
- ✅ Labels sur tous les inputs
- ✅ Contraste des couleurs > 4.5:1
- ✅ Navigation au clavier
- ⚠️ À améliorer : ARIA labels
- ⚠️ À améliorer : Screen reader support

### Internationalisation (Future)

```typescript
// Structure proposée
const translations = {
  fr: { ... },
  en: { ... },
};

// Utilisation de next-i18next ou next-intl
```

### Tests (à implémenter)

#### Tests Unitaires
- Jest pour les calculs (`calculations.ts`)
- Testing Library pour les composants

#### Tests E2E
- Playwright ou Cypress
- Scénarios : Parcours complet wizard → résultats → lead

#### Tests de Performance
- Lighthouse CI
- WebPageTest

### Monitoring (Production)

#### À implémenter

- **Analytics** : Google Analytics ou Plausible
- **Error Tracking** : Sentry
- **Performance** : Azure Application Insights
- **Uptime** : UptimeRobot

#### Métriques Clés

- Taux de conversion (page accueil → wizard démarré)
- Taux d'abandon par étape
- Taux de complétion wizard
- Taux de soumission lead form
- Temps moyen par étape

### Architecture Backend (Recommandée)

```
Azure Functions (Node.js)
├── submitLead (HTTP Trigger)
│   ├── Valider les données
│   ├── Stocker dans CRM
│   ├── Générer PDF
│   ├── Envoyer email
│   └── Notifier équipe
├── generatePDF (HTTP Trigger)
└── sendEmail (HTTP Trigger)

Azure Services
├── Storage Account (PDFs)
├── Communication Services (Emails)
├── Key Vault (Secrets)
└── Application Insights (Monitoring)
```

### Évolutions Futures

#### Phase 2
- [ ] Comparaison multi-cloud (AWS EKS, GCP GKE)
- [ ] Calculateur TCO détaillé
- [ ] Simulateur de sizing du cluster
- [ ] Recommandations personnalisées

#### Phase 3
- [ ] Mode SaaS avec authentification
- [ ] Dashboard pour suivre les leads
- [ ] A/B testing des questions
- [ ] Machine learning pour affiner les prédictions

---

**Document maintenu par : CloudDev Fusion**  
**Dernière mise à jour : Décembre 2025**
