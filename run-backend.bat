@echo off
REM run-backend.bat - Lance le backend Django sans problème de venv
REM Usage : run-backend.bat

setlocal enabledelayedexpansion
cd /d "%~dp0backend"

set PYTHON="%cd%\venv\Scripts\python.exe"

if not exist !PYTHON! (
    echo [ERREUR] venv introuvable. Exécute d'abord :
    echo powershell -ExecutionPolicy Bypass -File setup.ps1
    exit /b 1
)

echo Lancement du backend...
echo API : http://localhost:8000
echo Admin : http://localhost:8000/admin/
echo.

!PYTHON! manage.py runserver
