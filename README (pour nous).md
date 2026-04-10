# CivicSense

Plateforme web IoT pour une résidence intelligente — projet académique ING1.

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Cloner le projet](#2-cloner-le-projet)
3. [Configurer les variables d'environnement](#3-configurer-les-variables-denvironnement)
4. [Installer les dépendances](#4-installer-les-dépendances)
5. [Lancer le projet](#5-lancer-le-projet)
6. [Vérifier que tout fonctionne](#6-vérifier-que-tout-fonctionne)
7. [Stack technique](#7-stack-technique)
8. [Structure du projet](#8-structure-du-projet)
9. [Règles de développement](#9-règles-de-développement)
10. [Convention de commits](#10-convention-de-commits)
11. [Niveaux d'accès utilisateurs](#11-niveaux-daccès-utilisateurs)
12. [Système de points](#12-système-de-points)

---

## 1. Prérequis

Installe les outils suivants avant de commencer. Vérifie les versions avec les commandes indiquées.

| Outil | Version minimum | Vérification |
|-------|----------------|--------------|
| Node.js | 18.x | `node -v` |
| npm | 8.x | `npm -v` |
| MongoDB | 6.x (local) | `mongod --version` |
| Git | toute version récente | `git --version` |


## 2. Cloner le projet

```bash
git clone https://github.com/deltahmed/CivicSense.git
cd CivicSense
```
Pour les contributeur du projet :
```bash
git clone https://<Token github>@github.com/deltahmed/CivicSense.git
cd CivicSense
```

---

## 3. Configurer les variables d'environnement

Le projet utilise un fichier `.env` dans `/backend` pour stocker les secrets. Ce fichier n'est **jamais commité** (il est dans le `.gitignore`).

```bash
cp .env.example backend/.env
```

Ouvre ensuite `backend/.env` et remplis chaque valeur :

```env
# Port du serveur Express
PORT=5000

# Environnement (development ou production)
NODE_ENV=development

# URI de connexion MongoDB
# - Local    : mongodb://localhost:27017/civicsense
# - Atlas    : mongodb+srv://<user>:<password>@cluster.mongodb.net/civicsense
MONGODB_URI=mongodb://localhost:27017/civicsense

# Clé secrète JWT — chaîne longue et aléatoire (min. 32 caractères)
# Génère-en une avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=remplace_par_une_vraie_cle_secrete
JWT_EXPIRES_IN=7d

# SMTP pour l'envoi de mails (Gmail, Mailtrap, etc.)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=ton.adresse@gmail.com
MAIL_PASS=ton_mot_de_passe_application

# URL du frontend (pour le CORS) — ne pas changer en développement
FRONTEND_URL=http://localhost:5173
```

> **Astuce JWT_SECRET** : génère une clé sécurisée directement dans le terminal :
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> **Astuce SMTP** : pour les tests locaux, utilise [Mailtrap](https://mailtrap.io) (sandbox gratuit) ou Gmail avec un [mot de passe d'application](https://support.google.com/accounts/answer/185833).

---

## 4. Installer les dépendances

Les dépendances backend et frontend sont séparées. Il faut faire `npm install` dans chaque dossier.

```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

---

## 5. Lancer le projet

Il faut **deux terminaux** ouverts simultanément.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Le serveur Express démarre sur **http://localhost:5000** avec rechargement automatique (nodemon).

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

L'application React est disponible sur **http://localhost:5173**.

> Le frontend est configuré avec un proxy Vite : toutes les requêtes vers `/api/*` sont automatiquement redirigées vers `http://localhost:5000`. Tu n'as donc pas à gérer les URLs absolues dans le code frontend.

---

## 6. Vérifier que tout fonctionne

Une fois les deux serveurs lancés, teste ces points :

**Backend :**
```bash
curl http://localhost:5000/api/health
# Réponse attendue : {"success":true,"data":{"status":"ok"}}
```

**Frontend :**
Ouvre http://localhost:5173 dans ton navigateur. La page d'accueil doit s'afficher.

**MongoDB :**
Le terminal backend doit afficher `MongoDB connecté` au démarrage. Si tu vois une erreur de connexion, vérifie que MongoDB est bien lancé :
```bash
# Démarrer MongoDB en local (si non lancé en service)
mongod --dbpath /data/db
```

---

## 7. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite 4, React Router v6, Recharts, CSS vanilla |
| Backend | Node.js 18, Express.js |
| Base de données | MongoDB + Mongoose |
| Authentification | JWT dans httpOnly cookie, bcryptjs |
| Mails | Nodemailer |
| Sécurité | Helmet, express-validator, CORS restreint |

---

## 8. Structure du projet

```
CivicSense/
│
├── .env.example             ← Modèle des variables d'environnement
├── .gitignore
├── README.md
│
├── backend/
│   ├── server.js            ← Point d'entrée Express (config + démarrage)
│   ├── package.json
│   │
│   ├── controllers/         ← Logique métier (une fonction par action)
│   │   └── authController.js
│   │
│   ├── middleware/          ← Middlewares Express réutilisables
│   │   ├── authenticate.js  ← Vérifie le JWT dans le cookie
│   │   └── requireLevel.js  ← Contrôle d'accès par niveau utilisateur
│   │
│   ├── models/              ← Schémas Mongoose (structure des documents MongoDB)
│   │   └── User.js
│   │
│   ├── routes/              ← Définition des routes Express
│   │   └── auth.js
│   │
│   └── utils/               ← Fonctions utilitaires partagées
│       ├── mail.js          ← Envoi d'e-mails
│       └── points.js        ← Calcul de points et de niveau
│
├── frontend/
│   ├── vite.config.js       ← Config Vite + proxy /api
│   ├── index.html
│   │
│   └── src/
│       ├── main.jsx         ← Point d'entrée React
│       ├── App.jsx          ← React Router + PrivateRoute
│       │
│       ├── api/
│       │   └── index.js     ← Wrapper fetch vers le backend
│       │
│       ├── assets/          ← Images, icônes statiques
│       │
│       ├── components/      ← Composants réutilisables (boutons, cards, modales…)
│       │
│       ├── context/
│       │   └── AuthContext.jsx  ← État global de l'utilisateur connecté
│       │
│       └── pages/           ← Une page par route
│           ├── HomePage.jsx
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           ├── DashboardPage.jsx
│           ├── AdminPanel.jsx
│           └── NotFoundPage.jsx
│
└── database/
    ├── seeds/               ← Données initiales à insérer en BDD
    └── scripts/             ← Scripts de migration
```

---

## 9. Règles de développement

Ces règles sont **obligatoires** pour ce projet (cahier des charges académique).

### Sécurité

- Les mots de passe sont **toujours** hashés avec bcrypt (`saltRounds: 10`). Jamais en clair.
- Le JWT est stocké **uniquement** dans un cookie `httpOnly`. Jamais dans `localStorage`.
- Toutes les entrées utilisateur sont validées **côté serveur** avec `express-validator`. Ne jamais faire confiance au frontend.
- Ne jamais retourner le champ `password` dans une réponse API, même hashé.
- Toutes les clés secrètes sont dans `.env`. Jamais dans le code.

### Format des réponses API

Toujours retourner du JSON avec cette structure :

```json
// Succès
{ "success": true, "data": { ... } }

// Erreur
{ "success": false, "message": "Message lisible", "errors": [...] }
```

### Codes HTTP à utiliser

| Code | Signification |
|------|--------------|
| 200 | Requête réussie |
| 201 | Ressource créée |
| 400 | Données invalides ou manquantes |
| 401 | Non connecté |
| 403 | Connecté mais niveau insuffisant |
| 404 | Ressource inexistante |
| 500 | Erreur interne (sans détails exposés) |

### Accessibilité (WCAG AA obligatoire)

- Utiliser les balises sémantiques : `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Chaque `<input>` a un `<label>` associé via `for`/`id`
- Chaque `<img>` informative a un `alt` descriptif
- Les boutons interactifs sont des `<button>`, jamais des `<div onclick>`
- Ne jamais écrire `outline: none` sans indicateur de focus alternatif

### Responsive (mobile-first obligatoire)

- Écrire le CSS d'abord pour mobile (`min-width: 320px`)
- Breakpoints : `768px` (tablette), `1024px` (desktop)
- Pas de largeur fixe en `px` qui casserait le layout mobile

---

## 10. Convention de commits

Format : `<préfixe>: <description courte en français>`

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `style:` | Changements CSS/UI sans impact fonctionnel |
| `docs:` | Documentation uniquement |
| `refactor:` | Refactoring sans changement de comportement |
| `test:` | Ajout ou modification de tests |
| `chore:` | Maintenance (dépendances, config, scripts) |

**Exemples :**
```
feat: ajouter la page de connexion
fix: corriger la validation du formulaire d'inscription
style: adapter le dashboard en responsive mobile
chore: mettre à jour les dépendances Express
```

---

## 11. Niveaux d'accès utilisateurs

Les niveaux sont dans l'ordre croissant : `débutant` < `intermédiaire` < `avancé` < `expert`

| Niveau | Modules accessibles |
|--------|-------------------|
| débutant | Information, Visualisation |
| intermédiaire | Information, Visualisation |
| avancé | + Gestion |
| expert | + Administration (accès total) |

> La vérification du niveau se fait **toujours côté serveur** via le middleware `requireLevel`. Le frontend masque l'UI mais ne protège pas les données.

---

## 12. Système de points

Les points sont mis à jour en base de données à chaque action. Le niveau est recalculé automatiquement.

| Action | Points gagnés |
|--------|--------------|
| Connexion réussie | +0,25 pt |
| Consultation d'un objet connecté (`GET /api/objects/:id`) | +0,50 pt |
| Consultation d'un service | +0,50 pt |

Les compteurs `loginCount` et `actionCount` sont également incrémentés à chaque action correspondante.
