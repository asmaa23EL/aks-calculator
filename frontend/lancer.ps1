# Script PowerShell pour lancer l'application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Calculateur ROI Azure AKS" -ForegroundColor Green
Write-Host " Lancement de l'application..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dependances..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Lancer l'application
Write-Host "Demarrage du serveur de developpement..." -ForegroundColor Green
Write-Host ""
Write-Host "L'application sera accessible sur:" -ForegroundColor Cyan
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Yellow
Write-Host ""

npm run dev
