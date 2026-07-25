# Guide de Personnalisation

Ce guide vous aide à personnaliser le calculateur pour votre entreprise.

## 🎨 1. Branding

### Logo et Nom d'Entreprise

**Fichier : `src/app/layout.tsx`**
```typescript
// Ligne 19-21 : Remplacer
<h1 className="text-2xl font-bold text-primary-600">
  Votre Entreprise
</h1>
```

**Ajouter votre logo :**
1. Placer le logo dans `public/logo.svg` ou `public/logo.png`
2. Dans `src/app/layout.tsx` :
```typescript
import Image from 'next/image';

// Remplacer le h1 par :
<Image 
  src="/logo.svg" 
  alt="Logo" 
  width={200} 
  height={50}
  priority
/>
```

### Couleurs de Marque

**Fichier : `tailwind.config.js`**
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eff6ff',   // Bleu très clair
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',  // Couleur principale
        600: '#2563eb',  // Hover
        700: '#1d4ed8',  // Active
        800: '#1e40af',
        900: '#1e3a8a',
      },
      // Ajouter vos couleurs secondaires
      secondary: {
        500: '#10b981',  // Vert par exemple
      },
    },
  },
}
```

**Palette de couleurs populaires :**

**Tech moderne (Bleu/Violet) :**
```javascript
primary: {
  500: '#6366f1', // Indigo
  600: '#4f46e5',
}
```

**Finance (Vert/Bleu foncé) :**
```javascript
primary: {
  500: '#059669', // Emerald
  600: '#047857',
}
```

**Énergie (Orange) :**
```javascript
primary: {
  500: '#f97316', // Orange
  600: '#ea580c',
}
```

### Polices Personnalisées

**Fichier : `src/app/layout.tsx`**
```typescript
import { Inter, Poppins, Montserrat } from 'next/font/google';

// Choisir une police
const montserrat = Montserrat({ subsets: ['latin'] });

// Utiliser dans le body
<body className={montserrat.className}>
```

## 📝 2. Contenu Marketing

### Page d'Accueil

**Fichier : `src/app/page.tsx`**

**Titre principal (ligne 12-14) :**
```typescript
<h1 className="text-5xl font-bold text-gray-900 mb-6">
  Votre Titre Accrocheur <br />
  <span className="text-primary-600">Sous-titre Impactant</span>
</h1>
```

**Description (ligne 16-19) :**
```typescript
<p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
  Votre proposition de valeur unique. Pourquoi choisir votre solution ?
  Quels bénéfices concrets ?
</p>
```

**Bénéfices (lignes 39-89) :**
Personnaliser les 4 cartes avec vos arguments de vente.

### Footer

**Fichier : `src/app/layout.tsx`** (ligne 35-41)
```typescript
<footer className="bg-gray-50 border-t mt-12">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <p className="text-center text-gray-500 text-sm">
      © 2025 Votre Entreprise. Tous droits réservés.
    </p>
    {/* Ajouter liens : CGU, Politique de confidentialité, etc. */}
  </div>
</footer>
```

## 💰 3. Paramètres de Calcul

### Constantes Financières

**Fichier : `src/constants/index.ts`**
```typescript
export const CALCULATION_CONSTANTS: CalculationConstants = {
  // MODIFIER CES VALEURS selon votre contexte
  
  coutMensuelServeur: 2000,        // Coût moyen serveur dans votre région
  tauxHoraireMoyen: 90,             // Coût horaire de vos ingénieurs
  investissementKubeLaunch: 15000,  // Votre coût initial (ou remplacer par votre produit)
  
  // Pourcentages de réduction (ajuster selon vos benchmarks)
  reductionInfra24_7: 0.25,         // 25% = conservateur, 0.40 = optimiste
  reductionInfraHeuresBureau: 0.60, // 60% standard
  reductionDeploiementsGitOps: 0.60,
  reductionIncidents: 0.50,
  reductionSecurite: 0.30,
  reductionRisqueSecurite: 0.30,
};
```

**Scénarios recommandés :**

**Conservateur (pour prospects sceptiques) :**
```typescript
{
  reductionInfra24_7: 0.20,
  reductionInfraHeuresBureau: 0.50,
  reductionDeploiementsGitOps: 0.50,
  reductionIncidents: 0.40,
  reductionSecurite: 0.25,
}
```

**Optimiste (pour early adopters) :**
```typescript
{
  reductionInfra24_7: 0.35,
  reductionInfraHeuresBureau: 0.70,
  reductionDeploiementsGitOps: 0.70,
  reductionIncidents: 0.60,
  reductionSecurite: 0.40,
}
```

### Remplacer "KubeLaunch" par Votre Produit

**Rechercher et remplacer dans tous les fichiers :**
- `KubeLaunch` → `Votre Produit`
- `investissementKubeLaunch` → `investissementVotreProduit`

**Ou offrir une alternative :**
```typescript
// Proposer plusieurs options
export const PRODUITS = {
  starter: {
    nom: 'Starter',
    investissement: 5000,
  },
  pro: {
    nom: 'Pro',
    investissement: 15000,
  },
  enterprise: {
    nom: 'Enterprise',
    investissement: 50000,
  },
};
```

## ❓ 4. Questions du Wizard

### Modifier les Questions Existantes

**Fichier : `src/data/questions.ts`**

**Exemple : Changer une question**
```typescript
{
  id: 'nombreServeurs',
  text: 'Combien de serveurs physiques ou VM possédez-vous ?',
  type: 'number',
  placeholder: 'Ex: 10',
  min: 1,
  helpText: 'Incluez tous les serveurs de production',
},
```

### Ajouter une Nouvelle Question

**Étape 1 : Ajouter dans les types** (`src/types/index.ts`)
```typescript
export interface InfrastructureAnswers {
  // ... existants
  nouvelleQuestion: number; // ou string, boolean
}
```

**Étape 2 : Ajouter dans les questions** (`src/data/questions.ts`)
```typescript
{
  id: 'nouvelleQuestion',
  text: 'Votre nouvelle question ?',
  type: 'number',
  placeholder: 'Ex: 5',
  min: 0,
},
```

**Étape 3 : Utiliser dans les calculs** (`src/utils/calculations.ts`)
```typescript
function votreCalcul(answers: FormAnswers): number {
  const { nouvelleQuestion } = answers.infrastructure;
  // Votre logique
  return result;
}
```

### Ajouter une 5ème Étape

**Fichier : `src/data/questions.ts`**
```typescript
export const WIZARD_STEPS: Step[] = [
  // ... étapes 1-4 existantes
  {
    id: 5,
    title: 'Nouvelle Étape',
    description: 'Description de votre nouvelle étape',
    questions: [
      {
        id: 'question1',
        text: 'Question 1',
        type: 'number',
      },
      // ...
    ],
  },
];
```

**Fichier : `src/types/index.ts`**
```typescript
export interface NouvelleEtapeAnswers {
  question1: number;
  // ...
}

export interface FormAnswers {
  // ... existants
  nouvelleEtape: NouvelleEtapeAnswers;
}
```

**Fichier : `src/app/wizard/page.tsx`** (ligne 44)
```typescript
const getStepKey = (step: number): keyof FormAnswers => {
  switch (step) {
    case 1: return 'infrastructure';
    case 2: return 'deploiements';
    case 3: return 'incidents';
    case 4: return 'securite';
    case 5: return 'nouvelleEtape'; // Ajouter
    default: return 'infrastructure';
  }
};
```

## 📊 5. Graphiques et Visualisations

### Changer le Type de Graphique

**Fichier : `src/app/resultats/page.tsx`**

**Graphique en barres horizontales :**
```typescript
import { Bar } from 'react-chartjs-2';

// Dans les options :
indexAxis: 'y' as const,
```

**Graphique en ligne :**
```typescript
import { Line } from 'react-chartjs-2';
// Remplacer <Bar ... /> par <Line ... />
```

**Graphique camembert (Pie) :**
```typescript
import { Pie } from 'react-chartjs-2';
import { ArcElement } from 'chart.js';

ChartJS.register(ArcElement);

// Remplacer <Bar ... /> par <Pie ... />
```

### Ajouter un Nouveau Graphique

**Exemple : Évolution sur 12 mois**
```typescript
const evolutionData = {
  labels: ['Mois 1', 'Mois 2', '...', 'Mois 12'],
  datasets: [{
    label: 'Économies cumulées',
    data: [
      results.economiesMensuelles * 1,
      results.economiesMensuelles * 2,
      // ... jusqu'à 12
    ],
    borderColor: 'rgb(59, 130, 246)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  }],
};

// Ajouter dans le JSX
<Line data={evolutionData} />
```

## 📧 6. Formulaire Lead

### Ajouter des Champs

**Fichier : `src/types/index.ts`**
```typescript
export interface LeadFormData {
  // ... existants
  tailleEntreprise: string;
  secteurActivite: string;
}
```

**Fichier : `src/components/LeadFormModal.tsx`**
```typescript
// Ajouter dans l'état initial
const [formData, setFormData] = useState<LeadFormData>({
  // ... existants
  tailleEntreprise: '',
  secteurActivite: '',
});

// Ajouter dans le JSX
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Taille de l'entreprise
  </label>
  <select
    name="tailleEntreprise"
    value={formData.tailleEntreprise}
    onChange={handleChange}
    className="input-field"
  >
    <option value="">Sélectionnez</option>
    <option value="1-10">1-10 employés</option>
    <option value="11-50">11-50 employés</option>
    <option value="51-200">51-200 employés</option>
    <option value="201+">201+ employés</option>
  </select>
</div>
```

### Modifier le Message de Confirmation

**Fichier : `src/components/LeadFormModal.tsx`** (ligne 120)
```typescript
<h3 className="text-2xl font-bold text-gray-900 mb-2">
  Votre message personnalisé !
</h3>
<p className="text-gray-600">
  Vous recevrez votre analyse dans les 5 prochaines minutes.
</p>
```

## 🌐 7. SEO et Métadonnées

### Titre et Description

**Fichier : `src/app/layout.tsx`**
```typescript
export const metadata: Metadata = {
  title: 'Votre Titre SEO - Mots-clés importants',
  description: 'Description optimisée pour les moteurs de recherche (155-160 caractères)',
  keywords: 'Azure, AKS, Kubernetes, ROI, calculateur',
  openGraph: {
    title: 'Titre pour partage social',
    description: 'Description pour réseaux sociaux',
    images: ['/og-image.jpg'],
  },
};
```

### Ajouter Google Analytics

**Fichier : `src/app/layout.tsx`**
```typescript
// Ajouter dans le <head>
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

## 🚀 8. Optimisations

### Lazy Loading des Composants Lourds

**Fichier : `src/app/resultats/page.tsx`**
```typescript
import dynamic from 'next/dynamic';

// Charger Chart.js seulement quand nécessaire
const ChartComponent = dynamic(() => import('@/components/Chart'), {
  loading: () => <p>Chargement du graphique...</p>,
  ssr: false,
});
```

### Préchargement des Données

```typescript
// Ajouter dans une page
export async function generateMetadata() {
  // Fetch data pour SEO
}
```

## ✅ Checklist de Personnalisation

- [ ] Logo et nom d'entreprise modifiés
- [ ] Couleurs de marque appliquées
- [ ] Contenu marketing personnalisé
- [ ] Constantes de calcul ajustées
- [ ] Questions adaptées à votre contexte
- [ ] Formulaire lead configuré
- [ ] Métadonnées SEO optimisées
- [ ] Analytics configuré
- [ ] Testé sur différents appareils
- [ ] Validé par l'équipe marketing

---

**Besoin d'aide ?** Consultez le code source avec les commentaires détaillés !
