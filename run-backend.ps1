# run-backend.ps1 - Lance le backend Django sans problème de venv
# Usage : powershell -ExecutionPolicy Bypass -File run-backend.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

Set-Location (Join-Path $PSScriptRoot "backend")

$pythonExe = Join-Path $PWD "venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "[ERREUR] venv introuvable. Exécute d'abord :" -ForegroundColor Red
    Write-Host "powershell -ExecutionPolicy Bypass -File setup.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Lancement du backend..." -ForegroundColor Green
Write-Host "API : http://localhost:8000" -ForegroundColor Cyan
Write-Host "Admin : http://localhost:8000/admin/" -ForegroundColor Cyan
Write-Host ""

& $pythonExe manage.py runserver
