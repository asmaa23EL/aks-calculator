# Guide de Démarrage Rapide 🚀

Ce guide vous aidera à mettre en place et lancer le calculateur ROI Azure AKS.

## 1. Installation des dépendances

```powershell
# Installer toutes les dépendances
npm install

# Installer la dépendance manquante pour les icônes
npm install lucide-react
```

## 2. Configuration de l'environnement

```powershell
# Copier le fichier d'environnement exemple
Copy-Item .env.example .env.local
```

Éditez `.env.local` et configurez vos clés API si nécessaire.

## 3. Lancer en mode développement

```powershell
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 4. Structure de navigation

- `/` - Page d'accueil avec présentation
- `/wizard` - Formulaire en 4 étapes
- `/resultats` - Affichage des résultats et graphiques

## 5. Test du parcours complet

1. **Page d'accueil** : Cliquez sur "Commencer l'évaluation"
2. **Étape 1 - Infrastructure** : Remplissez les informations sur vos serveurs
3. **Étape 2 - Déploiements** : Décrivez votre processus de déploiement
4. **Étape 3 - Incidents** : Informations sur la gestion des incidents
5. **Étape 4 - Sécurité** : Votre posture sécurité actuelle
6. **Résultats** : Visualisez vos économies et ROI
7. **Lead Form** : Remplissez pour "recevoir" le rapport

## 6. Personnalisation

### Modifier les coûts et réductions

Éditez `src/constants/index.ts` :

```typescript
export const CALCULATION_CONSTANTS = {
  coutMensuelServeur: 2000,        // Modifier ici
  tauxHoraireMoyen: 90,            // Modifier ici
  investissementKubeLaunch: 15000, // Modifier ici
  // ...
};
```

### Modifier les couleurs

Éditez `tailwind.config.js` dans la section `theme.extend.colors`.

### Modifier le logo et le nom

Dans `src/app/layout.tsx`, changez "CloudDev Fusion" par votre nom.

## 7. Déploiement en production

### Option 1 : Vercel (le plus simple)

```powershell
npm install -g vercel
vercel login
vercel
```

### Option 2 : Build manuel

```powershell
npm run build
npm start
```

## 8. Backend séparé (Node.js + MySQL)

Le projet inclut maintenant un backend séparé dans le dossier `backend/`.

### 1) Configurer les variables backend

```powershell
Copy-Item backend\.env.example backend\.env
```

Puis éditez `backend\.env` avec vos accès MySQL.

### 2) Installer les dépendances backend

```powershell
npm --prefix backend install
```

### 3) Lancer backend + frontend

Terminal 1 (backend) :
```powershell
npm run dev:backend
```

Terminal 2 (frontend) :
```powershell
npm run dev
```

Le frontend envoie les leads vers `NEXT_PUBLIC_API_BASE_URL/api/leads` (par défaut `http://localhost:3001/api/leads`).

## 9. Connexion administrateur (email + mot de passe)

1) Dans `.env.local`, définir :
- `ADMIN_SESSION_SECRET` (clé longue et unique)

2) Lancer le projet avec `npm run dev`.

3) Ouvrir `http://localhost:3000/admin/login`.
Le login admin utilise la table MySQL `admin` (email + password_hash + actif).

4) Une fois connecté, l'admin dispose de :
- tableau de bord KPI (leads semaine/mois, simulations, conversion)
- liste des leads avec recherche et filtres
- gestion statuts (PDF envoyé, prospect contacté, note commerciale)
- relance email manuelle (journalisée)
- export CSV filtré

## 9. Vérification

✅ L'application démarre sans erreur  
✅ Les 4 étapes du wizard fonctionnent  
✅ Les calculs s'affichent correctement  
✅ Le formulaire lead s'ouvre  
✅ Les graphiques Chart.js s'affichent  
✅ Le design est responsive (mobile/desktop)

## 10. Support

Pour toute question, consultez :
- `README.md` pour la documentation complète
- Les commentaires dans le code
- La documentation Next.js : https://nextjs.org/docs

## Problèmes courants

### Erreur "Cannot find module"
```powershell
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 déjà utilisé
```powershell
npm run dev -- -p 3001
```

### Erreurs TypeScript
Les erreurs actuelles sont normales avant l'installation des dépendances. Lancez `npm install` pour les résoudre.

---

**Bon développement ! 🎉**
