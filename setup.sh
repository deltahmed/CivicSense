#!/usr/bin/env bash
# Script de setup DEV — local uniquement, ne jamais utiliser en production

set -e
cd "$(dirname "$0")"

DB_NAME="smartresi"
DB_USER="smartresi_user"
DB_PASS="smartresi_dev"   # mot de passe local dev uniquement

echo "==> Création de la base de données PostgreSQL..."
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL

# Droits sur le schéma public (nécessaire pour que Django crée ses tables)
sudo -u postgres psql -d "${DB_NAME}" <<SQL
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_USER};
GRANT USAGE, CREATE ON SCHEMA public TO ${DB_USER};
SQL

# Les droits sur les tables doivent être accordés après que Django crée le schéma
echo "    BDD prête."

echo "==> Création du venv Python..."
cd backend
python3 -m venv venv
source venv/bin/activate

echo "==> Installation des dépendances Python..."
pip install -r requirements.txt -q

echo "==> Création du fichier .env..."
if [ ! -f .env ]; then
  cp ../.env.example .env
fi

# Injecter une SECRET_KEY aléatoire si placeholder
if grep -q "your-secret-key-here" .env; then
  SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
  sed -i "s|your-secret-key-here|$SECRET|" .env
fi

# Mettre les identifiants BDD dev
sed -i "s|DB_USER=.*|DB_USER=${DB_USER}|" .env
sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env
sed -i "s|DB_NAME=.*|DB_NAME=${DB_NAME}|" .env

# Injecter un JWT_SIGNING_KEY aléatoire si placeholder
if grep -q "your-jwt-signing-key-here" .env; then
  JWT_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
  sed -i "s|your-jwt-signing-key-here|$JWT_KEY|" .env
fi

echo "==> Génération des migrations..."
python manage.py makemigrations users objects incidents announcements reports services

echo "==> Application des migrations..."
python manage.py migrate

# Appliquer les droits sur les tables créées par migrate
sudo -u postgres psql -d "${DB_NAME}" <<SQL
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ${DB_USER};
SQL

echo "==> Création du superuser Django..."
echo ""
echo "  Choisis un mot de passe admin solide (min 12 caractères) :"
python manage.py createsuperuser \
  --email admin@smartresi.local \
  --username admin

# Mettre le niveau expert et is_verified sur ce superuser
python manage.py shell -c "
from users.models import CustomUser
u = CustomUser.objects.get(email='admin@smartresi.local')
u.pseudo = 'Admin'
u.is_verified = True
u.level = 'expert'
u.save()
print('Compte admin configuré.')
"

echo ""
echo "==> Setup terminé !"
echo ""
echo "  Pour lancer le backend :"
echo "    cd backend && source venv/bin/activate && python manage.py runserver"
echo ""
echo "  Pour lancer le frontend (dans un autre terminal) :"
echo "    cd frontend && npm install && npm run dev"
echo ""
echo "  Admin Django : http://localhost:8000/admin/"
echo "  Frontend     : http://localhost:5173/"
echo ""
echo "  RAPPEL : ce script est pour le DEV local uniquement."
echo "  En production, utiliser des credentials différents dans .env"
