<h1 align="center">
  🔲 SmartResi 🔳
</h1>

<p align="center">
  <a href="<URL_DU_REPO>">
    <img src="https://img.shields.io/badge/Setup-1%20script-05122A?style=for-the-badge" alt="Setup" />
  </a>
  <a href="<URL_DU_REPO>">
    <img alt="Issues" src="https://img.shields.io/badge/Issues-Project%20local-05122A?style=for-the-badge">
  </a>
  <a href="<URL_DU_REPO>">
    <img alt="Stars" src="https://img.shields.io/badge/Stack-Django%20%2B%20React-05122A?style=for-the-badge">
  </a>
  <a href="<URL_DU_REPO>">
    <img alt="Forks" src="https://img.shields.io/badge/Frontend-Vite-05122A?style=for-the-badge">
  </a>
</p>

## Table des matières

* [A propos du projet](#a-propos-du-projet)
  * [Construit avec](#construit-avec)
* [Installation et utilisation](#installation-et-utilisation)
  * [Prérequis](#prérequis)
  * [Installation](#installation)
  * [Utilisation](#utilisation)
  * [Mailtrap](#mailtrap)
* [Contributeurs](#contributeurs)
* [Licence](#licence)

## A propos du projet

**SmartResi** est une plateforme web locale pour gérer une résidence connectée. Elle permet de lancer un backend Django, un frontend React, de gérer les utilisateurs, les objets connectés, les incidents, les annonces, les services et les rapports.

Le projet est pensé pour être lancé rapidement sur une machine locale avec un minimum d’actions. Toute l’installation est centralisée dans un seul script: `python setup.py`.

### Construit avec

![Python](https://img.shields.io/badge/-Python-05122A?style=for-the-badge&logo=python)
![Django](https://img.shields.io/badge/-Django-05122A?style=for-the-badge&logo=django)
![Django REST Framework](https://img.shields.io/badge/-DRF-05122A?style=for-the-badge&logo=django)
![React](https://img.shields.io/badge/-React-05122A?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/-Vite-05122A?style=for-the-badge&logo=vite)
![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-05122A?style=for-the-badge&logo=postgresql)

## Installation et utilisation

### Prérequis

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

Le compte PostgreSQL utilisé par le script doit pouvoir créer la base `smartresi`.
Ce compte doit exister dans PostgreSQL (exemple le plus courant: `postgres`).

### Configurer PostgreSQL localement

Si aucun utilisateur PostgreSQL adapté n'existe, exécuter les commandes ci‑dessous pour créer un rôle et, si nécessaire, la base `smartresi`.

- Linux (systemd / Ubuntu/Debian):

```bash
# démarrer le service (si nécessaire)
sudo systemctl start postgresql

# ouvrir psql en superuser système
sudo -u postgres psql

# créer un rôle avec droit de création de base (remplace le mot de passe)
CREATE ROLE smartresi_user WITH LOGIN PASSWORD 'TonMotDePasseFort' CREATEDB;

# (optionnel) créer la base et en donner la propriété
CREATE DATABASE smartresi OWNER smartresi_user;

# quitter
\q
```

- Windows (PowerShell) — en supposant que `psql` est dans le PATH:

```powershell
# ouvrir psql en tant qu'administrateur PostgreSQL (utilise le compte postgres)
psql -U postgres

# dans psql, créer le rôle:
CREATE ROLE smartresi_user WITH LOGIN PASSWORD 'TonMotDePasseFort' CREATEDB;
CREATE DATABASE smartresi OWNER smartresi_user;
\q
```

- Remarques de sécurité

- Évite d'utiliser `SUPERUSER` pour une application locale — `CREATEDB` suffit.
- Choisis un mot de passe fort et évite de le committer.



### Installation

1. **Récupérer le projet**
   + Clone le dépôt sur ta machine.
   + Ouvre ensuite le dossier du projet.

2. **Lancer le script unique**
   ```bash
   python setup.py
   ```

  Le script effectue toutes les opérations suivantes: création du venv backend, installation des dépendances Python, génération de `backend/.env`, exécution de `seed_all` pour créer la base et les données, puis installation des dépendances frontend.

  Par défaut, le script demande l’utilisateur PostgreSQL et son mot de passe. Pour éviter la saisie interactive, exporter les variables d'environnement avant le lancement:
   ```bash
   export POSTGRES_USER=postgres
   export POSTGRES_PASSWORD=mon_mot_de_passe
   ```

### Utilisation

1. **Démarrer le backend**
   + Linux/macOS:
     ```bash
     cd backend
     source .venv/bin/activate
     python manage.py runserver
     ```
   + Windows (CMD):
     ```bat
     cd backend
     .venv\Scripts\activate
     python manage.py runserver
     ```

2. **Démarrer le frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Ouvrir l’application**
  + Frontend: http://localhost:5173
  + API: http://localhost:8000/api/
  + Admin: http://localhost:8000/admin/

### Comptes de test

Pour faciliter les essais locaux, le script `python setup.py` crée des comptes de démonstration. Voici les identifiants fournis après un seed réussi :

- **Admin** : **admin@smartresi.fr** / **SmartResi2025!** (rôle : expert / accès admin)
- **Demo**  : **demo@smartresi.fr**  / **SmartResi2025!** (rôle : avancé)
- **Resident** : **resident@smartresi.fr** / **SmartResi2025!** (rôle : intermédiaire)

Utilise ces comptes pour te connecter à l'interface admin (`/admin/`) ou à l'API.

### Mailtrap

Par défaut, les emails sont affichés dans la console quand `DEBUG=True`. Le projet peut être utilisé localement sans service externe.

Pour tester un envoi d’email réel, ouvrir `backend/.env` et remplacer la section email par les valeurs Mailtrap du compte:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_HOST_USER=ton_user_mailtrap
EMAIL_HOST_PASSWORD=ton_password_mailtrap
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@smartresi.local
```

## Contributeurs

Projet maintenu pour un usage local et pour faciliter le setup rapide.

## Licence

Aucun fichier de licence n’est présent dans ce dépôt. Ajoute-en un si tu veux distribuer le projet publiquement.
