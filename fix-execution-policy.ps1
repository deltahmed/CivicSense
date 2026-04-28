# fix-execution-policy.ps1 - Fix PowerShell execution policy pour venv
# À exécuter une seule fois avec : powershell -ExecutionPolicy Bypass -File fix-execution-policy.ps1

Write-Host "Configuration de la politique d'exécution PowerShell..." -ForegroundColor Cyan
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Write-Host "OK ! Tu peux maintenant utiliser .\venv\Scripts\Activate.ps1" -ForegroundColor Green
