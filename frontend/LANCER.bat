@echo off
echo ========================================
echo  Calculateur ROI Azure AKS
echo  Lancement de l'application...
echo ========================================
echo.

REM Vérifier si node_modules existe
if not exist "node_modules\" (
    echo Installation des dependances...
    call npm install
    echo.
)

REM Lancer l'application
echo Demarrage du serveur de developpement...
echo.
echo L'application sera accessible sur:
echo http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter
echo.

call npm run dev

pause
