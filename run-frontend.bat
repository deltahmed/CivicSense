@echo off
REM run-frontend.bat - Lance le frontend React/Vite
REM Usage : run-frontend.bat

setlocal enabledelayedexpansion
cd /d "%~dp0frontend"

echo Lancement du frontend...
echo App : http://localhost:5173
echo.

call npm run dev
