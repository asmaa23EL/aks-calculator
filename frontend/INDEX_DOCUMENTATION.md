# 📚 Index de la Documentation

Guide complet pour naviguer dans la documentation du Calculateur ROI Azure AKS.

---

## 🚀 Démarrage

| Fichier | Description | Pour Qui | Temps |
|---------|-------------|----------|-------|
| **[COMMENCEZ_ICI.md](COMMENCEZ_ICI.md)** | 🎯 Point d'entrée principal | Tous | 5 min |
| **[QUICKSTART.md](QUICKSTART.md)** | ⚡ Guide rapide de démarrage | Développeurs | 5 min |
| **[LIVRAISON.md](LIVRAISON.md)** | 📦 Récapitulatif complet du projet | Tous | 10 min |

**👉 Commencez par : [COMMENCEZ_ICI.md](COMMENCEZ_ICI.md)**

---

## 📖 Documentation Principale

| Fichier | Description | Pour Qui | Temps |
|---------|-------------|----------|-------|
| **[README.md](README.md)** | Documentation technique complète | Développeurs | 15 min |
| **[SPECIFICATIONS.md](SPECIFICATIONS.md)** | Architecture et algorithmes détaillés | Développeurs/Architectes | 20 min |
| **[MODELISATION_DONNEES.md](MODELISATION_DONNEES.md)** | MCD, MLD, SQL et dictionnaire de données | Développeurs/Architectes | 15 min |

---

## 🎨 Personnalisation

| Fichier | Description | Pour Qui | Temps |
|---------|-------------|----------|-------|
| **[PERSONNALISATION.md](PERSONNALISATION.md)** | Guide de personnalisation complet | Tous | 10 min |

**Contenu :**
- Branding (logo, couleurs, polices)
- Contenu marketing
- Paramètres de calcul
- Questions du wizard
- Formulaire de lead
- SEO et métadonnées

---

## 🚢 Déploiement

| Fichier | Description | Pour Qui | Temps |
|---------|-------------|----------|-------|
| **[DEPLOIEMENT_AZURE.md](DEPLOIEMENT_AZURE.md)** | Guide de déploiement sur Azure | DevOps/Développeurs | 10 min |

**Options couvertes :**
- Azure Static Web Apps (recommandé)
- Vercel
- Azure App Service
- Azure Functions
- Configuration DNS
- CI/CD avec GitHub Actions

---

## 🧪 Tests

| Fichier | Description | Pour Qui | Temps |
|---------|-------------|----------|-------|
| **[TESTS.md](TESTS.md)** | Configuration des tests | Développeurs | 5 min |
| **[__tests__/calculations.test.ts](__tests__/calculations.test.ts)** | Tests unitaires des calculs | Développeurs | - |

---

## 🔧 Configuration

| Fichier | Description | Type |
|---------|-------------|------|
| **[.env.example](.env.example)** | Variables d'environnement exemple | Config |
| **[package.json](package.json)** | Dépendances et scripts | Config |
| **[tsconfig.json](tsconfig.json)** | Configuration TypeScript | Config |
| **[tailwind.config.js](tailwind.config.js)** | Configuration Tailwind CSS | Config |
| **[next.config.js](next.config.js)** | Configuration Next.js | Config |

---

## 📂 Structure du Code Source

```
src/
├── app/                          # Pages Next.js
│   ├── page.tsx                 # 🏠 Page d'accueil
│   ├── layout.tsx               # Layout principal
│   ├── globals.css              # Styles globaux
│   ├── wizard/
│   │   └── page.tsx            # 🧙‍♂️ Wizard 4 étapes
│   ├── resultats/
│   │   └── page.tsx            # 📊 Page résultats
│   └── api/
│       └── submit-lead/
│           └── route.ts        # API soumission leads
│
├── components/                   # Composants réutilisables
│   ├── Question.tsx             # Composant question
│   ├── StepForm.tsx             # Formulaire par étape
│   ├── ProgressBar.tsx          # Barre de progression
│   └── LeadFormModal.tsx        # Modal formulaire lead
│
├── types/
│   └── index.ts                 # 📐 Types TypeScript
│
├── constants/
│   └── index.ts                 # 💰 Constantes de calcul
│
├── utils/
│   └── calculations.ts          # 🧮 Logique de calcul ROI
│
└── data/
    ├── questions.ts             # ❓ Questions du wizard
    └── testData.ts              # 🧪 Données de test
```

---

## 🎯 Par Rôle

### 👨‍💼 Chef de Projet / Manager
1. [COMMENCEZ_ICI.md](COMMENCEZ_ICI.md) - Vue d'ensemble
2. [LIVRAISON.md](LIVRAISON.md) - Ce qui a été livré
3. [README.md](README.md) - Fonctionnalités complètes

### 👨‍💻 Développeur
1. [QUICKSTART.md](QUICKSTART.md) - Installation rapide
2. [SPECIFICATIONS.md](SPECIFICATIONS.md) - Architecture
3. [README.md](README.md) - Documentation technique
4. [TESTS.md](TESTS.md) - Tests unitaires

### 🎨 Designer / Marketing
1. [COMMENCEZ_ICI.md](COMMENCEZ_ICI.md) - Démarrage
2. [PERSONNALISATION.md](PERSONNALISATION.md) - Branding et contenu
3. Fichiers à modifier :
   - `src/app/page.tsx` - Page d'accueil
   - `tailwind.config.js` - Couleurs
   - `public/` - Assets (logo, images)

### 🚀 DevOps / Admin
1. [DEPLOIEMENT_AZURE.md](DEPLOIEMENT_AZURE.md) - Déploiement
2. [.env.example](.env.example) - Variables d'environnement
3. [README.md](README.md) - Architecture et stack

---

## 🔍 Par Tâche

### Lancer l'Application
📖 [QUICKSTART.md](QUICKSTART.md) → Section "Installation"
```powershell
npm install
npm run dev
```

### Modifier le Branding
📖 [PERSONNALISATION.md](PERSONNALISATION.md) → Section "Branding"
- Logo : `public/logo.svg`
- Couleurs : `tailwind.config.js`
- Nom : `src/app/layout.tsx`

### Ajuster les Calculs
📖 [PERSONNALISATION.md](PERSONNALISATION.md) → Section "Paramètres de Calcul"
- Fichier : `src/constants/index.ts`
- Constantes : coûts, réductions, investissement

### Modifier les Questions
📖 [PERSONNALISATION.md](PERSONNALISATION.md) → Section "Questions du Wizard"
- Fichier : `src/data/questions.ts`
- Types : `src/types/index.ts`

### Déployer sur Azure
📖 [DEPLOIEMENT_AZURE.md](DEPLOIEMENT_AZURE.md) → Section "Azure Static Web Apps"
```powershell
# Via Azure Portal ou Azure CLI
az staticwebapp create ...
```

### Configurer le Backend
📖 [README.md](README.md) → Section "Intégration Backend"
- API : `src/app/api/submit-lead/route.ts`
- CRM : HubSpot, Airtable, Salesforce
- Email : SendGrid, Azure Communication Services

### Ajouter des Tests
📖 [TESTS.md](TESTS.md) → Configuration Jest
```powershell
npm install --save-dev jest @types/jest
npm test
```

---

## 📊 Diagrammes et Schémas

### Flux Utilisateur
```
Accueil → Wizard (4 étapes) → Résultats → Lead Form → Confirmation
```

### Architecture Technique
```
Frontend (Next.js + React)
    ↓
LocalStorage (réponses temporaires)
    ↓
Calculations (logique ROI)
    ↓
API Backend (à implémenter)
    ├→ CRM (stockage leads)
    ├→ PDF Generator
    └→ Email Service
```

### Flux de Données
```
User Input → Validation → Storage → Calculations → Results Display
```

---

## 🔗 Liens Utiles

### Documentation Externe
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Chart.js](https://www.chartjs.org/docs)
- [TypeScript](https://www.typescriptlang.org/docs)

### Azure
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps)
- [Azure Functions](https://docs.microsoft.com/azure/azure-functions)
- [Azure Portal](https://portal.azure.com)

### Outils
- [GitHub](https://github.com)
- [VS Code](https://code.visualstudio.com)
- [Node.js](https://nodejs.org)

---

## 📝 Checklist de Lecture

Parcours recommandé pour bien démarrer :

- [ ] **COMMENCEZ_ICI.md** - Vue d'ensemble (5 min)
- [ ] **QUICKSTART.md** - Installation et lancement (5 min)
- [ ] **LIVRAISON.md** - Ce qui a été livré (10 min)
- [ ] **PERSONNALISATION.md** - Adapter à votre marque (10 min)
- [ ] **DEPLOIEMENT_AZURE.md** - Mettre en production (10 min)
- [ ] **README.md** - Documentation technique (15 min)
- [ ] **SPECIFICATIONS.md** - Architecture détaillée (20 min)

**Total : ~1h15 de lecture pour tout comprendre**

---

## 🎓 Glossaire

| Terme | Définition |
|-------|------------|
| **AKS** | Azure Kubernetes Service - Service managé Kubernetes sur Azure |
| **ROI** | Return On Investment - Retour sur investissement |
| **Wizard** | Formulaire multi-étapes guidant l'utilisateur |
| **Lead** | Contact commercial qualifié ayant manifesté un intérêt |
| **GitOps** | Approche de déploiement continue via Git |
| **Autoscaling** | Ajustement automatique des ressources selon la charge |
| **TCO** | Total Cost of Ownership - Coût total de possession |

---

## ❓ FAQ Documentation

**Q: Par où commencer ?**  
A: [COMMENCEZ_ICI.md](COMMENCEZ_ICI.md) → Section "Démarrage Ultra-Rapide"

**Q: Comment personnaliser les couleurs ?**  
A: [PERSONNALISATION.md](PERSONNALISATION.md) → Section "Branding"

**Q: Comment déployer en production ?**  
A: [DEPLOIEMENT_AZURE.md](DEPLOIEMENT_AZURE.md) → Section "Azure Static Web Apps"

**Q: Où sont les calculs ?**  
A: `src/utils/calculations.ts` + [SPECIFICATIONS.md](SPECIFICATIONS.md)

**Q: Comment ajouter une question ?**  
A: [PERSONNALISATION.md](PERSONNALISATION.md) → Section "Questions du Wizard"

---

## 📞 Support

Si vous ne trouvez pas ce que vous cherchez dans la documentation :

1. **Cherchez dans les fichiers** : `Ctrl+F` dans l'éditeur
2. **Consultez le code** : Commentaires détaillés dans les sources
3. **Testez** : `npm run dev` et explorez l'application
4. **Lisez les specs** : [SPECIFICATIONS.md](SPECIFICATIONS.md)

---

## 🎉 Bon Développement !

Toute la documentation est à votre disposition. Commencez par [COMMENCEZ_ICI.md](COMMENCEZ_ICI.md) et explorez selon vos besoins !

**Version du projet : 1.0.0**  
**Dernière mise à jour : Décembre 2025**
