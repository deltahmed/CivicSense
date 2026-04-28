# CivicSense

Plateforme web IoT pour la gestion d'une résidence intelligente — projet académique ING1.

## Stack

- **Backend** : Django 5 + Django REST Framework + PostgreSQL
- **Auth** : djangorestframework-simplejwt (JWT en httpOnly cookie)
- **Frontend** : React 18 (Vite) + CSS vanilla
- **Graphiques** : recharts

---

## Lancer en local (Windows)

### Prérequis

- **Python 3.11+** — [python.org](https://www.python.org/downloads/) — cocher "Add Python to PATH" à l'installation
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **PostgreSQL 15+** — [postgresql.org](https://www.postgresql.org/download/windows/) — noter le mot de passe du compte `postgres`

---

### 1. Setup automatique (une seule fois)

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Le script fait tout : BDD, venv, dépendances, `.env`, migrations, compte admin.
Compte créé : `admin@civicsense.local` / `admin1234`

---

### Détail des étapes manuelles (si le script échoue)

#### 1. Créer la base de données PostgreSQL (une seule fois)

Ouvrir **SQL Shell (psql)** depuis le menu Démarrer et exécuter :

```sql
CREATE DATABASE civicsense;
\q
```

---

### 2. Configurer les variables d'environnement (une seule fois)

```powershell
cd backend
copy .env.example .env
```

Ouvrir `.env` et remplir au minimum :

```
SECRET_KEY=une-chaine-aleatoire-longue-ici
DB_PASSWORD=ton_mot_de_passe_postgres
```

> `SECRET_KEY` est obligatoire — Django refuse de démarrer sans elle.  
> Générer une clé : `python -c "import secrets; print(secrets.token_hex(50))"`

---

### 3. Créer le venv et installer les dépendances (une seule fois)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> Le venv est activé quand le prompt affiche `(venv)` en préfixe.

---

### 4. Appliquer les migrations (une seule fois, puis à chaque modif de modèle)

```powershell
python manage.py migrate
```

---

### 5. Créer un compte admin (une seule fois)

```powershell
python manage.py createsuperuser
```

Ou créer un utilisateur vérifié directement via le shell Django :

```powershell
python manage.py shell
```

```python
from users.models import CustomUser
u = CustomUser.objects.create_user(
    email='admin@civicsense.local',
    username='admin',
    pseudo='Admin',
    password='admin1234',
    is_verified=True,
)
u.level = 'expert'
u.save()
exit()
```

---

### 6. Lancer le backend

```powershell
cd backend
venv\Scripts\activate
python manage.py runserver
```

- API : `http://localhost:8000`
- Admin Django : `http://localhost:8000/admin/`
- API navigable DRF : `http://localhost:8000/api/users/`

---

### 7. Lancer le frontend (dans un autre terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend : `http://localhost:5173`

> Le proxy Vite redirige `/api` → `http://localhost:8000`. Les cookies httpOnly fonctionnent sans configuration CORS supplémentaire.

---

### Relancer après un redémarrage

```powershell
# Terminal 1 — backend
cd backend ; venv\Scripts\activate ; python manage.py runserver

# Terminal 2 — frontend
cd frontend ; npm run dev
```

---

### Tester les routes avec curl (PowerShell)

#### Inscription

```powershell
curl.exe -X POST http://localhost:8000/api/users/register/ `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","username":"testuser","pseudo":"TestUser","password":"StrongPass1","type_membre":"resident"}'
```

#### Connexion (stocke les cookies JWT)

```powershell
curl.exe -X POST http://localhost:8000/api/users/login/ `
  -H "Content-Type: application/json" `
  -c cookies.txt `
  -d '{"email":"admin@civicsense.local","password":"admin1234"}'
```

#### Profil connecté (utilise les cookies)

```powershell
curl.exe http://localhost:8000/api/users/me/ -b cookies.txt
```

#### Vérification email

```powershell
# Récupérer le token depuis le shell Django :
# CustomUser.objects.get(email='test@example.com').verification_token
curl.exe http://localhost:8000/api/users/verify/TON-TOKEN-ICI/
```

#### Déconnexion

```powershell
curl.exe -X POST http://localhost:8000/api/users/logout/ -b cookies.txt
```

> **Alternative** : utiliser [Postman](https://www.postman.com/) ou l'interface DRF navigable (`http://localhost:8000/api/`) qui gère les cookies automatiquement.

---

### Lancer les tests

```powershell
cd backend
venv\Scripts\activate
python manage.py test users --verbosity=2
```

---

### Commandes Django utiles

```powershell
# Après avoir modifié un modèle
python manage.py makemigrations
python manage.py migrate

# Shell interactif avec accès aux modèles
python manage.py shell

# Vérifier les migrations sans les appliquer
python manage.py migrate --check
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
