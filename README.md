# CivicSense

Plateforme web IoT pour la gestion d'une résidence intelligente — projet académique ING1.

Stack : Django 5 + React 18 + Tailwind CSS + PostgreSQL

---

## � Installation de Docker

### Windows & Mac
1. Télécharge **Docker Desktop** → [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Installe et lance l'application
3. Vérifie l'installation :
```bash
docker --version
docker compose version
```

### Linux

**Si Docker est déjà installé** (via le dépôt officiel Docker — `docker-ce` + `containerd.io`) :
```bash
sudo apt install docker-compose-plugin
```

**Si Docker n'est pas encore installé** (installation complète depuis zéro) :
```bash
# Supprimer les anciens paquets si présents
sudo apt remove docker docker.io containerd runc

# Ajouter le dépôt officiel Docker
sudo apt update
sudo apt install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list

# Installer Docker CE + Compose plugin
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Dans les deux cas :
```bash
# Vérifier l'installation
docker --version
docker compose version

# (Optionnel) Utiliser Docker sans sudo
sudo usermod -aG docker $USER
# Redémarrer le terminal après cette commande
```

---

## Démarrage

### 1. Configure le `.env`

Backend :
```bash
cp backend/.env.example backend/.env
```

Frontend :
```bash
cp frontend/.env.example frontend/.env
```

### 2. Lance Docker

```bash
docker compose up
```

Au premier lancement :
- Crée la DB PostgreSQL
- Exécute les migrations Django
- Crée l'utilisateur admin (credentials du `.env`)
- Remplit la DB avec des données de test
- Démarre le backend et frontend

Accès :
- Frontend : http://localhost:5173
- Backend API : http://localhost:8000
- Admin Django : http://localhost:8000/admin

---

## Commandes utiles

```bash
# Arrêter
docker compose down

# Logs
docker compose logs -f

# Nettoyer (vider la DB)
docker compose down -v

# Shell Django
docker compose exec backend python manage.py shell

# PostgreSQL
docker compose exec db psql -U civicsense -d civicsense

# Reconstruire les images
docker compose build --no-cache
```

---

## Comptes par défaut (dev)

- Email : `admin@civicsense.local`
- Password : `admin1234`

---

## Structure

```
.
├── backend/               # Django
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/              # React
│   ├── package.json
│   ├── Dockerfile
│   └── .env
├── docker-compose.yml
└── README.md
```

---

## Développement

Les fichiers sont synchronisés en live :
- Backend : Django autoreload
- Frontend : Hot Module Reload (Vite)

Ajouter une dépendance :

Python :
```bash
docker compose exec backend pip install package-name
docker compose exec backend pip freeze > requirements.txt
```

npm :
```bash
docker compose exec frontend npm install package-name
```

---

## Docs

- API : [SEARCH_API.md](SEARCH_API.md)
- Dépendances : [DEPENDENCIES.md](DEPENDENCIES.md)

---

## Problèmes

**Frontend ne se connecte pas**
```bash
docker compose logs backend
```

**Database corrompue**
```bash
docker compose down -v
docker compose up
```

**Arrêt forcé**
```bash
docker compose kill
docker container prune -f
```

---

## Tests

Lancer les tests du backend :

```bash
docker compose exec backend python manage.py test users --verbosity=2

# Tous les tests
docker compose exec backend python manage.py test
```

---

## Commandes Django

Migrations :
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py migrate --check
```

Autres :
```bash
docker compose exec backend python manage.py shell
docker compose exec backend python manage.py createsuperuser
```

---

## Notes

- Aucun virtualenv Python requis
- Aucune installation Node.js requise
- Aucune configuration PostgreSQL requise

