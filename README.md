# SmartResi

Plateforme web IoT pour la gestion d'une résidence intelligente — projet académique 2025/2026 ING1.

## Stack

- **Backend** : Django 5 + Django REST Framework + PostgreSQL
- **Auth** : djangorestframework-simplejwt (JWT en httpOnly cookie)
- **Frontend** : React 18 (Vite) + CSS vanilla
- **Graphiques** : recharts

---

## Architecture du projet

```
SmartResi/
├── backend/
│   ├── users/          # Auth, profils, permissions, gamification
│   ├── objects/        # Objets connectés, alertes, historique conso
│   ├── services/       # Services résidence, énergie, eau, déchets, paramètres
│   ├── incidents/      # Signalement et suivi d'incidents
│   ├── announcements/  # Annonces, demandes de suppression
│   ├── reports/        # Rapports d'utilisation et export
│   └── smartresi/     # Config Django (settings, urls, wsgi)
└── frontend/
    └── src/
        ├── pages/      # 27 pages React
        ├── components/ # Composants réutilisables (charts, layout, cards)
        ├── context/    # AuthContext (auth + autorisation)
        ├── api/        # Couche d'appels HTTP (index.js, admin.js)
        └── utils/      # Utilitaires (access.js)
```

---

## Niveaux d'accès

| Niveau | Description |
|--------|-------------|
| `debutant` | Résidents basiques, accès lecture |
| `intermediaire` | Résidents confirmés |
| `avance` | Référents, accès gestion objets et alertes |
| `expert` | Syndic / Admin, accès total |

L'authentification repose sur JWT en httpOnly cookie. Les emails doivent être vérifiés (`is_verified=True`) pour se connecter.

---

## Pages frontend

### Publiques (sans connexion)
| Route | Page |
|-------|------|
| `/` | Stats publiques de la résidence |
| `/public/stats` | Stats publiques de la résidence |
| `/login` | Connexion |
| `/register` | Inscription |

### Authentifiées (tous niveaux)
| Route | Page |
|-------|------|
| `/dashboard` | Tableau de bord personnel |
| `/profile` | Profil utilisateur |
| `/users` | Annuaire des membres |
| `/users/:id` | Profil public d'un membre |
| `/services` | Liste des services disponibles |
| `/services/:id` | Détail d'un service |
| `/services/acces` | Gestion d'accès aux portes |
| `/services/energie` | Consommation d'énergie |
| `/services/eau` | Consommation d'eau |
| `/services/dechets` | Calendrier de collecte des déchets |
| `/objects` | Liste des objets connectés |
| `/objects/:id` | Détail d'un objet connecté |
| `/search` | Recherche globale |

### Niveau avancé (`avance`)
| Route | Page |
|-------|------|
| `/objects/new` | Ajouter un objet connecté |
| `/gestion` | Gestion des objets (vue avancée) |
| `/alerts` | Tableau des alertes système |
| `/admin/maintenance` | Maintenance (backup, intégrité) |
| `/admin/reports` | Rapports d'utilisation |
| `/admin/settings` | Paramètres globaux de la résidence |
| `/admin/deletions` | Demandes de suppression d'objets |

### Niveau expert (`expert`)
| Route | Page |
|-------|------|
| `/admin/users` | Gestion des utilisateurs |
| `/admin/pending` | Approbation des nouvelles inscriptions |

---

## API Backend

### Auth — `/api/auth/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register/` | Inscription |
| POST | `/api/auth/login/` | Connexion (stocke JWT en cookie) |
| POST | `/api/auth/logout/` | Déconnexion (efface les cookies) |
| GET | `/api/auth/me/` | Profil de l'utilisateur connecté |
| POST | `/api/auth/me/change-password/` | Changer son mot de passe |
| GET | `/api/auth/verify/<token>/` | Vérification email |

### Utilisateurs publics — `/api/users/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users/` | Liste publique des membres |
| GET | `/api/users/<id>/` | Profil public d'un membre |

### Admin utilisateurs — `/api/admin/users/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/users/` | Liste complète avec filtres |
| GET | `/api/admin/users/<id>/` | Détail d'un utilisateur |
| POST | `/api/admin/users/<id>/set-level/` | Changer le niveau |
| POST | `/api/admin/users/<id>/set-points/` | Modifier les points |
| GET | `/api/admin/users/<id>/history/` | Historique de connexions |
| GET | `/api/admin/users/pending/` | Inscriptions en attente |
| POST | `/api/admin/users/<id>/approve/` | Approuver une inscription |
| POST | `/api/admin/users/<id>/reject/` | Rejeter une inscription |

### Objets connectés — `/api/objects/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/objects/` | Liste avec filtres (zone, statut, type) |
| POST | `/api/objects/` | Créer un objet (avancé) |
| GET | `/api/objects/<id>/` | Détail d'un objet |
| PATCH | `/api/objects/<id>/` | Modifier un objet (expert) |
| GET | `/api/objects/<id>/history/` | Historique de consommation (7/30/90j) |
| GET | `/api/objects/<id>/config/` | Configuration de l'objet |
| GET | `/api/objects/zones/` | Zones disponibles |
| GET | `/api/objects/search/` | Recherche d'objets |
| GET | `/api/objects/alerts/` | Alertes des 30 derniers jours |
| GET | `/api/objects/alert-rules/` | Règles d'alerte configurées |
| GET | `/api/objects/alert-rules/<id>/` | Détail d'une règle |
| GET | `/api/objects/alert-rules/triggered/` | Alertes déclenchées |

### Admin objets — `/api/admin/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET/POST | `/api/admin/categories/` | Gestion des catégories |
| GET/PATCH/DELETE | `/api/admin/categories/<id>/` | Détail/modif/suppression catégorie |
| DELETE | `/api/admin/objects/<id>/` | Supprimer un objet |
| GET/POST | `/api/admin/deletion-requests/` | Demandes de suppression |
| GET | `/api/admin/deletion-requests/<id>/` | Détail d'une demande |

### Services — `/api/services/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/services/` | Liste des services |
| GET | `/api/services/<id>/` | Détail d'un service |
| GET | `/api/services/acces/portes/` | État des portes |
| POST | `/api/services/acces/toggle/<id>/` | Ouvrir/fermer une porte |
| GET | `/api/services/acces/historique/` | Historique des accès |
| GET | `/api/services/energie/conso/` | Consommation électrique |
| GET | `/api/services/eau/conso/` | Consommation d'eau |
| GET | `/api/services/dechets/calendrier/` | Calendrier de collecte |
| GET | `/api/services/dechets/bacs/` | État des bacs |

### Public — `/api/public/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/public/stats/` | Stats publiques de la résidence |
| GET | `/api/public/settings/` | Paramètres publics (nom, bannière, thème) |

### Admin paramètres — `/api/admin/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET/PATCH | `/api/admin/settings/` | Paramètres globaux de la résidence |
| POST | `/api/admin/change-password/` | Changer le mot de passe admin |
| POST | `/api/admin/backup/` | Lancer une sauvegarde |
| GET | `/api/admin/integrity-check/` | Vérifier l'intégrité des données |
| POST | `/api/admin/integrity-fix/` | Corriger les anomalies |

### Incidents — `/api/incidents/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/incidents/` | Liste des incidents |
| GET | `/api/incidents/<id>/` | Détail d'un incident |

### Annonces — `/api/announcements/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/announcements/` | Liste des annonces |
| GET | `/api/announcements/<id>/` | Détail d'une annonce |
| POST | `/api/announcements/deletion-requests/` | Demander la suppression d'un objet |

### Rapports — `/api/reports/`
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/reports/usage/` | Rapport d'utilisation |
| GET | `/api/reports/export/` | Exporter les données |
| GET | `/api/admin/stats/` | Statistiques admin |
| GET | `/api/admin/stats/export/` | Exporter les stats admin |

---

## Modèles de données principaux

### CustomUser
`pseudo`, `email`, `age`, `genre`, `date_naissance`, `type_membre` (resident/referent/syndic), `photo`, `is_verified`, `points`, `level` (debutant/intermediaire/avance/expert), `login_count`, `action_count`

### ConnectedObject
`unique_id`, `nom`, `type_objet` (thermostat/camera/compteur/serrure/…), `category`, `zone`, `statut` (actif/inactif/maintenance), `connectivite`, `signal_force`, `consommation_kwh`, `batterie`, `valeur_actuelle` (JSON), `valeur_cible` (JSON), `mode` (automatique/manuel), `attributs_specifiques` (JSON)

### Alert (règle d'alerte)
`nom`, `type_alerte`, `seuil`, `operateur` (gt/lt/gte/lte), `valeur_cle`, `objet_concerne`, `priorite` (faible/moyen/critique), `active`

### GlobalSettings *(singleton)*
`nom_residence`, `banniere`, `couleur_theme`, `message_inscription`, `seuil_alerte_conso_kwh`, `approbation_manuelle`, `domaines_email_autorises`

---

## Lancer en local (Windows)

### Prérequis

- **Python 3.11+** — [python.org](https://www.python.org/downloads/) — cocher "Add Python to PATH" à l'installation
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **PostgreSQL 15+** — [postgresql.org](https://www.postgresql.org/download/windows/) — noter le mot de passe du compte `postgres`

### 1. Setup automatique (une seule fois)

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Le script fait tout : BDD, venv, dépendances, `.env`, migrations, compte admin.  
Compte créé : `admin@smartresi.local` / `admin1234`

### 2. Configuration manuelle (si le script échoue)

#### Créer la base de données PostgreSQL

```sql
CREATE DATABASE smartresi;
\q
```

#### Configurer les variables d'environnement

```powershell
cd backend
copy .env.example .env
```

Remplir `.env` au minimum :

```
SECRET_KEY=une-chaine-aleatoire-longue-ici
DB_PASSWORD=ton_mot_de_passe_postgres
JWT_SIGNING_KEY=une-autre-chaine-aleatoire
```

> Générer une clé : `python -c "import secrets; print(secrets.token_hex(50))"`

#### Installer les dépendances backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

#### Créer un compte admin

```powershell
python manage.py shell
```

```python
from users.models import CustomUser
u = CustomUser.objects.create_user(
    email='admin@smartresi.local',
    username='admin',
    pseudo='Admin',
    password='admin1234',
    is_verified=True,
)
u.level = 'expert'
u.save()
exit()
```

### 3. Lancer l'application

```powershell
# Terminal 1 — backend
cd backend
venv\Scripts\activate
python manage.py runserver

# Terminal 2 — frontend
cd frontend
npm install   # seulement la première fois
npm run dev
```

- Frontend : `http://localhost:5173`
- API : `http://localhost:8000`
- Admin Django : `http://localhost:8000/admin/`

> Le proxy Vite redirige `/api` → `http://localhost:8000`. Les cookies httpOnly fonctionnent sans configuration CORS supplémentaire.

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `SECRET_KEY` | Oui | Clé secrète Django |
| `JWT_SIGNING_KEY` | Oui | Clé de signature JWT |
| `DB_PASSWORD` | Oui | Mot de passe PostgreSQL |
| `DEBUG` | Non | `True` en local, `False` en prod |
| `ALLOWED_HOSTS` | Non | Hôtes autorisés (défaut : localhost) |
| `DATABASE_URL` | Non | URL complète PostgreSQL (alternative à DB_PASSWORD) |
| `CORS_ORIGIN` | Non | Origine frontend (défaut : `http://localhost:5173`) |
| `EMAIL_HOST` | Non | SMTP pour la vérification email (ex: Mailtrap) |
| `EMAIL_HOST_USER` | Non | Identifiant SMTP |
| `EMAIL_HOST_PASSWORD` | Non | Mot de passe SMTP |

---

## Tests

Les tests automatisés couvrent uniquement le backend Django (6 fichiers, ~3 100 lignes). Le frontend React est testé manuellement.

```powershell
cd backend
venv\Scripts\activate

# Tous les tests
python manage.py test --verbosity=2

# Par app
python manage.py test users --verbosity=2
python manage.py test objects --verbosity=2
python manage.py test services --verbosity=2
python manage.py test incidents --verbosity=2
python manage.py test announcements --verbosity=2
python manage.py test reports --verbosity=2
```

---

## Commandes Django utiles

```powershell
# Après avoir modifié un modèle
python manage.py makemigrations
python manage.py migrate

# Shell interactif avec accès aux modèles
python manage.py shell

# Vérifier les migrations sans les appliquer
python manage.py migrate --check

# Vider et repeupler les données de test
python manage.py flush
python manage.py loaddata fixtures/
```

---

## Convention de commits

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `style:` | CSS / formatage (sans logique) |
| `docs:` | Documentation uniquement |
| `chore:` | Config, dépendances, tooling |
| `refactor:` | Refactoring sans changement de comportement |
| `test:` | Ajout ou modification de tests |

Exemple : `feat: add JWT login endpoint`
