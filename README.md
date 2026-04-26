# CivicSense

Plateforme web IoT pour la gestion d'une résidence intelligente — projet académique ING1.

## Stack

- **Backend** : Django 5 + Django REST Framework + PostgreSQL
- **Auth** : djangorestframework-simplejwt (JWT en httpOnly cookie)
- **Frontend** : React 18 (Vite) + CSS vanilla
- **Graphiques** : recharts

---

## Lancer en local

### Prérequis

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (doit tourner en arrière-plan)

---

### 1. Setup initial (une seule fois)

Ce script crée la BDD, le venv, installe les dépendances, lance les migrations et crée un compte admin :

```bash
bash setup.sh
```

> Le script demande le mot de passe sudo pour créer la BDD PostgreSQL.
> Compte admin créé : `admin@civicsense.local` / `admin1234`

---

### 2. Lancer le backend

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```


API disponible sur : `http://localhost:8000`  
Interface admin : `http://localhost:8000/admin/`

---

### 3. Lancer le frontend (dans un autre terminal)

```bash
cd frontend
npm install   # une seule fois
npm run dev
```

Frontend disponible sur : `http://localhost:5173`

> Le proxy Vite redirige automatiquement `/api` → `http://localhost:8000`.
> Les cookies httpOnly passent sans problème CORS.

---

### Relancer après un redémarrage

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate && python manage.py runserver

# Terminal 2 — frontend
cd frontend && npm run dev
```

---

### Commandes Django utiles

```bash
# Après avoir modifié un model (models.py)
python manage.py makemigrations
python manage.py migrate

# Console Python interactive avec accès aux modèles
python manage.py shell

# Créer un autre superuser
python manage.py createsuperuser
```

---

## Convention de commits

| Préfixe | Usage |
|---|---|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `style:` | CSS / formatage (sans logique) |
| `docs:` | Documentation uniquement |
| `chore:` | Config, dépendances, tooling |
| `refactor:` | Refactoring sans changement de comportement |

Exemple : `feat: add JWT login endpoint`
