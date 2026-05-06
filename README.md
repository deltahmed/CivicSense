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

### Installation

1. **Récupérer le projet**
   + Clone le dépôt sur ta machine.
   + Ouvre ensuite le dossier du projet.

2. **Lancer le script unique**
   ```bash
   python setup.py
   ```

   Le script fait tout: il crée le venv backend, installe les dépendances Python, génère `backend/.env`, lance `seed_all` pour créer la base et les données, puis installe les dépendances frontend.

   Par défaut, le script demande l’utilisateur PostgreSQL et son mot de passe. Si tu veux éviter la saisie, exporte avant le lancement:
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

### Mailtrap

Par défaut, les emails sont affichés dans la console quand `DEBUG=True`. Tu peux donc utiliser le projet localement sans service externe.

Si tu veux tester un vrai envoi d’email, ouvre `backend/.env` et remplace la section email par les valeurs Mailtrap de ton compte:

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
