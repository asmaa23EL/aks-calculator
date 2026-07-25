# Guide de Déploiement Azure

## Option 1 : Azure Static Web Apps (Recommandé)

### Avantages
- ✅ Déploiement automatique depuis GitHub
- ✅ SSL gratuit
- ✅ CDN global
- ✅ Preview environments pour les PRs
- ✅ Azure Functions intégrées

### Étapes

#### 1. Préparer le repository GitHub
```powershell
cd c:\calculateur
git init
git add .
git commit -m "Initial commit - Calculateur ROI AKS"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/calculateur-aks.git
git push -u origin main
```

#### 2. Créer la ressource Azure Static Web App

**Via Azure Portal :**
1. Aller sur [portal.azure.com](https://portal.azure.com)
2. Créer une ressource → Static Web App
3. Configuration :
   - **Nom** : calculateur-roi-aks
   - **Plan** : Free (ou Standard pour production)
   - **Région** : West Europe (ou la plus proche)
   - **Source** : GitHub
   - **Repository** : Sélectionner votre repo
   - **Branche** : main
   - **Build Presets** : Next.js
   - **App location** : /
   - **Api location** : (laisser vide pour l'instant)
   - **Output location** : .next

4. Cliquer sur "Review + Create" puis "Create"

#### 3. Configuration automatique

Azure va :
- Créer un workflow GitHub Actions dans `.github/workflows/`
- Déployer automatiquement à chaque push
- Fournir une URL : `https://XXXXX.azurestaticapps.net`

#### 4. Configuration des variables d'environnement

Dans Azure Portal → votre Static Web App → Configuration :
```
NEXT_PUBLIC_APP_URL=https://votre-app.azurestaticapps.net
HUBSPOT_API_KEY=votre_clé (si applicable)
SENDGRID_API_KEY=votre_clé (si applicable)
```

## Option 2 : Vercel (Alternative Simple)

### Étapes
```powershell
# Installer Vercel CLI
npm install -g vercel

# Login
vercel login

# Déployer
vercel
```

Suivre les prompts pour configurer le projet.

## Option 3 : Azure App Service

### Dockerfile
Créer `Dockerfile` à la racine :
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Déployer sur Azure Container Apps
```powershell
# Login Azure CLI
az login

# Créer un resource group
az group create --name rg-calculateur-aks --location westeurope

# Créer un container registry
az acr create --resource-group rg-calculateur-aks --name calculateuraks --sku Basic

# Build et push l'image
az acr build --registry calculateuraks --image calculateur:latest .

# Créer Container App
az containerapp create `
  --name calculateur-roi `
  --resource-group rg-calculateur-aks `
  --image calculateuraks.azurecr.io/calculateur:latest `
  --target-port 3000 `
  --ingress external `
  --registry-server calculateuraks.azurecr.io
```

## Option 4 : Azure Functions (Backend seulement)

### Structure pour Azure Functions
```
azure-functions/
├── host.json
├── local.settings.json
├── package.json
└── submit-lead/
    ├── function.json
    └── index.ts
```

### function.json
```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "submit-lead"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

### Déploiement
```powershell
# Créer Function App
az functionapp create `
  --resource-group rg-calculateur-aks `
  --consumption-plan-location westeurope `
  --runtime node `
  --runtime-version 18 `
  --functions-version 4 `
  --name func-calculateur-leads `
  --storage-account stcalculateur

# Déployer
func azure functionapp publish func-calculateur-leads
```

## Configuration DNS Personnalisé

### Pour Azure Static Web Apps
1. Dans votre registrar DNS, ajouter :
   ```
   CNAME calculateur votre-app.azurestaticapps.net
   ```
2. Dans Azure Portal → Static Web App → Custom domains
3. Ajouter le domaine et valider

### SSL
- SSL automatique avec Azure
- Renouvellement automatique

## CI/CD GitHub Actions

Fichier `.github/workflows/azure-deploy.yml` :
```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Azure Static Web Apps
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "/"
        output_location: ".next"
```

## Monitoring & Analytics

### Application Insights
```powershell
# Créer App Insights
az monitor app-insights component create `
  --app calculateur-insights `
  --location westeurope `
  --resource-group rg-calculateur-aks

# Obtenir la clé
az monitor app-insights component show `
  --app calculateur-insights `
  --resource-group rg-calculateur-aks `
  --query instrumentationKey
```

### Configuration dans Next.js
Installer :
```powershell
npm install @microsoft/applicationinsights-web
```

Ajouter dans `src/app/layout.tsx` :
```typescript
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: process.env.NEXT_PUBLIC_APP_INSIGHTS_KEY
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView();
```

## Checklist de Déploiement

- [ ] Code testé localement
- [ ] Variables d'environnement configurées
- [ ] Repository GitHub créé
- [ ] Azure Static Web App créée
- [ ] Déploiement réussi
- [ ] SSL actif
- [ ] DNS configuré (si domaine custom)
- [ ] Monitoring configuré
- [ ] Tests de charge effectués
- [ ] Documentation à jour

## Coûts Estimés

### Configuration Minimale (Free Tier)
- Static Web Apps : **Gratuit** (100 GB bandwidth/mois)
- Azure Functions : **Gratuit** (1M requests/mois)
- **Total : 0€/mois**

### Configuration Production
- Static Web Apps Standard : **~8€/mois**
- Azure Functions Consumption : **~5€/mois** (selon usage)
- Application Insights : **~5€/mois**
- Azure SQL / Cosmos DB : **~25€/mois** (si base de données)
- **Total : ~45€/mois**

## Support

Pour toute question sur le déploiement :
- Documentation Azure : https://docs.microsoft.com/azure
- Support Azure : https://azure.microsoft.com/support
- Community : https://stackoverflow.com/questions/tagged/azure

---

**Bon déploiement ! 🚀**
