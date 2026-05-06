# API Recherche Publique - Documentation (dev)

## Endpoints

### GET /api/objects/search/

Recherche publique des équipements connectés. **Aucune authentification requise.**

#### Paramètres de requête

| Paramètre | Type | Description | Obligatoire |
|-----------|------|-------------|-------------|
| `type_objet` | string | Type d'équipement (thermostat, camera, compteur, eclairage, capteur, prise) | Non |
| `statut` | string | État de l'équipement (actif, inactif, maintenance) | Non |
| `zone` | string | Zone/localisation (RDC, Cave, Chambre, etc.) | Non |
| `search` | string | Recherche textuelle dans nom/description | Non |

#### Réponse réussie (200)

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "unique_id": "thermo_01",
      "nom": "Thermostat Salon",
      "description": "Gestion température salon",
      "marque": "Hager",
      "type_objet": "thermostat",
      "category_nom": "Climat",
      "zone": "Salon",
      "statut": "actif",
      "connectivite": "wifi",
      "signal_force": "fort",
      "derniere_interaction": "2024-04-29T15:30:00Z"
    },
    {
      "id": 2,
      "unique_id": "cam_01",
      "nom": "Caméra Entrée",
      "description": "Surveillance entrée principale",
      "marque": "Reolink",
      "type_objet": "camera",
      "category_nom": "Sécurité",
      "zone": "RDC",
      "statut": "actif",
      "connectivite": "ethernet",
      "signal_force": "fort",
      "derniere_interaction": "2024-04-29T14:20:00Z"
    }
  ]
}
```

#### Exemples de requêtes

**1. Tous les équipements actifs**
```
GET /api/objects/search/?statut=actif
```

**2. Caméras de la zone RDC**
```
GET /api/objects/search/?type_objet=camera&zone=RDC
```

**3. Recherche par mot-clé**
```
GET /api/objects/search/?search=thermosta
```

**4. Combinaison de filtres**
```
GET /api/objects/search/?type_objet=compteur&statut=actif&zone=Cave
```

## Champs retournés (sérialiseur public)

- `id`: Identifiant unique interne
- `unique_id`: Identifiant unique de l'équipement
- `nom`: Nom de l'équipement
- `description`: Description/détails
- `marque`: Fabricant
- `type_objet`: Type d'équipement
- `category_nom`: Catégorie
- `zone`: Localisation
- `statut`: État actuel
- `connectivite`: Type de connexion (WiFi, Ethernet, etc.)
- `signal_force`: Force du signal
- `derniere_interaction`: Dernière communication

## Données NON exposées (sécurité)

Les données suivantes ne sont **jamais** retournées au public:
- `consommation_kwh`: Consommation énergétique
- `batterie`: Niveau de batterie
- `valeur_actuelle`: Valeur actuelle du capteur
- `valeur_cible`: Valeur cible
- `attributs_specifiques`: Configuration spécifique
- `mode`: Mode de fonctionnement

## Cas d'usage

### Pour les visiteurs/utilisateurs non authentifiés
- Découvrir les équipements disponibles
- Filtrer par type, zone ou statut
- Rechercher par mot-clé
- Décider s'il faut se connecter pour plus d'informations

### Message système

**Sans connexion**: "📌 Connectez-vous pour voir plus de détails"

Le frontend affiche ce message pour inciter les visiteurs à créer un compte.

## Restrictions et permissions

| Action | Authentification | Permission | Notes |
|--------|-----------------|-----------|-------|
| Rechercher/Lister | ✗ (Non requise) | Publique | Données anonymisées |
| Consulter détails | ✓ (Requise) | IsVerified | Accès complet aux données |
| Configurer | ✓ (Requise) | IsAvance | Modification des paramètres |
s
