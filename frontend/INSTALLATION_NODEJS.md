# 🚨 Installation Node.js Requise

## ❌ Problème Détecté

**npm** n'est pas reconnu par Windows. Node.js n'est pas installé sur votre système.

---

## ✅ Solution : Installer Node.js

### **Méthode 1 : Installation Officielle (Recommandée)**

#### **Étape 1 : Télécharger Node.js**
1. Visitez : **https://nodejs.org/**
2. Téléchargez la version **LTS (Long Term Support)** - actuellement **Node.js 20.x**
3. Choisissez **Windows Installer (.msi)** - 64-bit

#### **Étape 2 : Installer**
1. Double-cliquez sur le fichier téléchargé (`node-v20.x.x-x64.msi`)
2. Suivez l'assistant d'installation :
   - ✅ Acceptez les termes
   - ✅ Laissez le chemin par défaut : `C:\Program Files\nodejs\`
   - ✅ **Cochez "Automatically install necessary tools"**
   - ✅ Cliquez sur "Install"

#### **Étape 3 : Vérifier l'installation**
1. **Fermez** toutes les fenêtres PowerShell/CMD ouvertes
2. Ouvrez une **nouvelle** fenêtre PowerShell
3. Tapez :
```powershell
node --version
```
**Résultat attendu** : `v20.x.x`

4. Tapez :
```powershell
npm --version
```
**Résultat attendu** : `10.x.x`

---

### **Méthode 2 : Installation via Winget (Windows 11)**

```powershell
winget install OpenJS.NodeJS.LTS
```

Puis **redémarrer PowerShell**.

---

### **Méthode 3 : Installation via Chocolatey**

Si vous avez Chocolatey installé :
```powershell
choco install nodejs-lts
```

---

## 🚀 Après Installation

### **1. Vérifier que npm fonctionne**
```powershell
cd c:\calculateur
npm --version
```

### **2. Installer les dépendances du projet**
```powershell
npm install
```
**Durée : 2-3 minutes** ⏱️

### **3. Lancer le projet**
```powershell
npm run dev
```

### **4. Ouvrir le navigateur**
```
http://localhost:3000
```

---

## 🔍 Vérification Complète

### Commandes à exécuter après installation :

```powershell
# Vérifier Node.js
node --version
# Attendu : v20.x.x

# Vérifier npm
npm --version
# Attendu : 10.x.x

# Vérifier npx
npx --version
# Attendu : 10.x.x

# Aller dans le projet
cd c:\calculateur

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

---

## ⚠️ Problèmes Courants

### **1. "npm n'est toujours pas reconnu"**
**Solution** : 
- Fermez **toutes** les fenêtres PowerShell/CMD
- Redémarrez votre ordinateur
- Ouvrez une **nouvelle** fenêtre PowerShell

### **2. "Permission Denied"**
**Solution** :
- Lancez PowerShell **en tant qu'administrateur**
- Ou installez Node.js pour "Tous les utilisateurs"

### **3. "Erreur lors de npm install"**
**Solution** :
```powershell
# Nettoyer le cache npm
npm cache clean --force

# Supprimer node_modules si existe
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Réinstaller
npm install
```

### **4. Port 3000 déjà utilisé**
**Solution** :
```powershell
# Utiliser un autre port
npm run dev -- -p 3001
```

---

## 📋 Checklist d'Installation

- [ ] Node.js téléchargé depuis https://nodejs.org/
- [ ] Node.js installé (version LTS)
- [ ] PowerShell redémarré
- [ ] `node --version` affiche v20.x.x
- [ ] `npm --version` affiche 10.x.x
- [ ] `cd c:\calculateur` exécuté
- [ ] `npm install` exécuté avec succès
- [ ] `npm run dev` lancé sans erreur
- [ ] http://localhost:3000 accessible dans le navigateur

---

## 🎯 Versions Recommandées

| Outil | Version Minimale | Version Recommandée |
|-------|------------------|---------------------|
| Node.js | 18.17.0 | **20.x LTS** |
| npm | 9.0.0 | **10.x** |
| Windows | 10 | **11** |
| PowerShell | 5.1 | **7.x** |

---

## 📦 Après Installation Réussie

Une fois Node.js installé et `npm install` terminé, vous aurez :

```
c:\calculateur/
├── node_modules/        ← 400 MB (dépendances installées)
├── .next/              ← Créé lors du build
└── [autres fichiers]
```

### Taille finale :
- **Avant npm install** : ~610 KB
- **Après npm install** : ~450 MB

---

## 🆘 Besoin d'Aide ?

### **Option 1 : Installation Manuelle**
1. Téléchargez : https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi
2. Installez en suivant les instructions ci-dessus
3. Redémarrez PowerShell

### **Option 2 : Vérifier PATH**
```powershell
$env:Path -split ';' | Select-String -Pattern 'nodejs'
```
**Résultat attendu** : `C:\Program Files\nodejs\`

Si absent, ajoutez manuellement :
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs\", "User")
```

---

## ✅ Installation Réussie Quand...

Vous verrez ceci dans le terminal :
```
> calculateur-roi-aks@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.5s
```

Et dans le navigateur à http://localhost:3000 :
```
✅ Page d'accueil du calculateur ROI
✅ Bouton "Commencer l'évaluation"
✅ Design avec couleurs Azure (bleu)
```

---

## 🎉 Prochaines Étapes

Une fois Node.js installé et le projet lancé :

1. **Tester le wizard** : Cliquez sur "Commencer l'évaluation"
2. **Remplir les 4 étapes** avec les données de test
3. **Voir les résultats** avec graphiques
4. **Personnaliser** : Voir PERSONNALISATION.md
5. **Déployer** : Voir DEPLOIEMENT_AZURE.md

---

**📌 Téléchargement Node.js : https://nodejs.org/**

**Version recommandée : Node.js 20.x LTS (Long Term Support)**

---

*Ce document sera supprimé une fois Node.js correctement installé.*
