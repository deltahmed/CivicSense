# setup.ps1 - Setup DEV Windows uniquement, ne jamais utiliser en production
# Usage : powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"
# Forcer UTF-8 pour eviter les caracteres corrompus dans le terminal
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Set-Location $PSScriptRoot

$DB_NAME    = "civicsense"
$DB_USER    = "civicsense_user"
$DB_PASS    = "civicsense_dev"
$ADMIN_EMAIL = "admin@civicsense.local"
$ADMIN_PASS  = "admin1234"

# ── Couleurs helper ──────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "    $msg"   -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "    $msg"   -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "[ERREUR] $msg" -ForegroundColor Red; exit 1 }

# ── 0. Trouver psql ──────────────────────────────────────────────────────────
Write-Step "Recherche de psql..."

$psqlExe = $null
$candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\psql.exe",
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe"
)
foreach ($c in $candidates) {
    if (Test-Path $c) { $psqlExe = $c; break }
}
if (-not $psqlExe) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { $psqlExe = $cmd.Source }
}
if (-not $psqlExe) {
    Write-Fail "psql introuvable. Installe PostgreSQL (https://www.postgresql.org/download/windows/) et relance ce script."
}
Write-Ok "psql : $psqlExe"

# ── 1. Mot de passe du compte postgres ──────────────────────────────────────
Write-Step "Connexion à PostgreSQL"
$pgPass = Read-Host "Mot de passe du compte 'postgres'"
$env:PGPASSWORD = $pgPass

# Vérifier la connexion
$testConn = & $psqlExe -U postgres -h localhost -tAc "SELECT 1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Connexion impossible. Vérifie que PostgreSQL tourne et que le mot de passe est correct."
}
Write-Ok "Connexion PostgreSQL OK."

# ── 2. Créer l'utilisateur ───────────────────────────────────────────────────
Write-Step "Création de l'utilisateur PostgreSQL '$DB_USER'..."
$userExists = & $psqlExe -U postgres -h localhost -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'"
if ([string]$userExists -match '1') {
    Write-Warn "Utilisateur '$DB_USER' deja existant, ignore."
} else {
    & $psqlExe -U postgres -h localhost -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" | Out-Null
    Write-Ok "Utilisateur '$DB_USER' cree."
}

# ── 3. Créer la base de données ──────────────────────────────────────────────
Write-Step "Création de la base de données '$DB_NAME'..."
$dbExists = & $psqlExe -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'"
if ([string]$dbExists -match '1') {
    Write-Warn "Base '$DB_NAME' deja existante, ignoree."
} else {
    & $psqlExe -U postgres -h localhost -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" | Out-Null
    Write-Ok "Base '$DB_NAME' creee."
}

# Droits sur le schéma public
& $psqlExe -U postgres -h localhost -d $DB_NAME -c "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;" | Out-Null
& $psqlExe -U postgres -h localhost -d $DB_NAME -c "GRANT USAGE, CREATE ON SCHEMA public TO $DB_USER;" | Out-Null
Write-Ok "Permissions schéma accordées."

# ── 4. Venv Python ───────────────────────────────────────────────────────────
Write-Step "Création du venv Python..."
Set-Location backend

if (-not (Test-Path venv)) {
    python -m venv venv
    if ($LASTEXITCODE -ne 0) { Write-Fail "Échec de création du venv. Python 3.11+ est-il installé ?" }
    Write-Ok "venv créé."
} else {
    Write-Warn "venv déjà existant, conservé."
}

$pip    = ".\venv\Scripts\pip.exe"
$python = ".\venv\Scripts\python.exe"

Write-Step "Mise à jour de pip..."
& $python -m pip install --upgrade pip -q

Write-Step "Installation des dépendances Python..."
& $pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Write-Fail "pip install a échoué." }
Write-Ok "Dépendances installées."

# ── 5. Fichier .env ──────────────────────────────────────────────────────────
Write-Step "Fichier .env..."
if (-not (Test-Path .env)) {
    $secretKey = & $python -c "import secrets; print(secrets.token_urlsafe(50))"
    $jwtKey    = & $python -c "import secrets; print(secrets.token_urlsafe(50))"

    $envContent = @"
SECRET_KEY=$secretKey
DEBUG=True
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_HOST=localhost
DB_PORT=5432
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@civicsense.local
JWT_SIGNING_KEY=$jwtKey
CORS_ORIGIN=http://localhost:5173
"@
    # Ecrire sans BOM — PowerShell 5.1 ajoute un BOM avec -Encoding utf8
    # ce qui corrompt la premiere cle lue par python-dotenv
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText(
        (Join-Path (Get-Location).Path ".env"),
        $envContent,
        $utf8NoBom
    )
    Write-Ok ".env cree sans BOM avec des cles aleatoires."
} else {
    Write-Warn ".env deja existant, conserve."
    Write-Warn "S il contient des erreurs, supprime-le et relance le script."
}

# ── 6. Migrations ─────────────────────────────────────────────────────────────
Write-Step "Génération des migrations..."
& $python manage.py makemigrations users objects incidents announcements reports services

Write-Step "Application des migrations..."
& $python manage.py migrate
if ($LASTEXITCODE -ne 0) { Write-Fail "migrate a échoué. Vérifie la connexion PostgreSQL dans .env." }
Write-Ok "Migrations appliquées."

# Droits sur les tables créées par migrate
& $psqlExe -U postgres -h localhost -d $DB_NAME `
    -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $DB_USER;" | Out-Null
& $psqlExe -U postgres -h localhost -d $DB_NAME `
    -c "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" | Out-Null
& $psqlExe -U postgres -h localhost -d $DB_NAME `
    -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;" | Out-Null
& $psqlExe -U postgres -h localhost -d $DB_NAME `
    -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;" | Out-Null
Write-Ok "Permissions tables accordées."

# ── 7. Compte admin Django ────────────────────────────────────────────────────
Write-Step "Création du compte admin Django..."
$env:DJANGO_SUPERUSER_PASSWORD = $ADMIN_PASS
& $python manage.py createsuperuser --no-input --email $ADMIN_EMAIL --username admin
if ($LASTEXITCODE -ne 0) {
    Write-Warn "createsuperuser a retourné une erreur (compte existe peut-être déjà)."
}

# Passer le compte en expert + vérifié
& $python manage.py shell -c "from users.models import CustomUser; u = CustomUser.objects.get(email='$ADMIN_EMAIL'); u.pseudo = 'Admin'; u.is_verified = True; u.level = 'expert'; u.save(); print('Compte admin : expert + verifie')"
Write-Ok "Compte admin configuré."

# ── 8. Résumé final ───────────────────────────────────────────────────────────
Set-Location ..

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Setup termine avec succes !" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Lancer le backend (Terminal 1) :" -ForegroundColor White
Write-Host "    cd backend" -ForegroundColor Yellow
Write-Host "    .\venv\Scripts\activate" -ForegroundColor Yellow
Write-Host "    python manage.py runserver" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Lancer les tests unitaires :" -ForegroundColor White
Write-Host "    python manage.py test users --verbosity=2" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Lancer le frontend (Terminal 2) :" -ForegroundColor White
Write-Host "    cd frontend" -ForegroundColor Yellow
Write-Host "    npm install" -ForegroundColor Yellow
Write-Host "    npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  URLs :" -ForegroundColor White
Write-Host "    API      : http://localhost:8000/api/" -ForegroundColor Cyan
Write-Host "    Admin    : http://localhost:8000/admin/" -ForegroundColor Cyan
Write-Host "    Frontend : http://localhost:5173/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Compte admin : $ADMIN_EMAIL / $ADMIN_PASS" -ForegroundColor Magenta
Write-Host ""
Write-Host "  RAPPEL : ce script est pour le DEV local uniquement." -ForegroundColor DarkYellow
Write-Host "  En production, utilise des credentials differents dans .env" -ForegroundColor DarkYellow
Write-Host ""
