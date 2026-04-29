# Configuration - Recherche et filtrage des équipements

# Permissions des endpoints de recherche
PUBLIC_SEARCH_PERMISSIONS = []  # Aucune authentification requise

# Filtres disponibles pour la recherche publique
PUBLIC_SEARCH_FILTERS = {
    'type_objet': {
        'label': 'Type d\'équipement',
        'choices': [
            ('thermostat', 'Thermostat'),
            ('camera', 'Caméra'),
            ('compteur', 'Compteur'),
            ('eclairage', 'Éclairage'),
            ('capteur', 'Capteur'),
            ('prise', 'Prise'),
        ]
    },
    'statut': {
        'label': 'État',
        'choices': [
            ('actif', 'Actif'),
            ('inactif', 'Inactif'),
            ('maintenance', 'En maintenance'),
        ]
    },
    'zone': {
        'label': 'Zone',
        'choices': [
            ('RDC', 'Rez-de-chaussée'),
            ('Cave', 'Cave'),
            ('Extérieur', 'Extérieur'),
            ('Chambre', 'Chambre'),
            ('Cuisine', 'Cuisine'),
            ('Salon', 'Salon'),
            ('Salle de bain', 'Salle de bain'),
        ]
    }
}

# Champs exposés au public (sérialiseur public)
PUBLIC_OBJECT_FIELDS = [
    'id',
    'unique_id',
    'nom',
    'description',
    'marque',
    'type_objet',
    'category_nom',
    'zone',
    'statut',
    'connectivite',
    'signal_force',
    'derniere_interaction',
]

# Champs JAMAIS exposés au public (données sensibles)
PRIVATE_OBJECT_FIELDS = [
    'consommation_kwh',
    'batterie',
    'valeur_actuelle',
    'valeur_cible',
    'mode',
    'attributs_specifiques',
]

# Configuration de limite de résultats
MAX_SEARCH_RESULTS = 1000  # Limite maximale de résultats retournés

# Délai de cache pour la recherche (en secondes)
SEARCH_CACHE_TIMEOUT = 300  # 5 minutes

# Termes de recherche minimums
MIN_SEARCH_LENGTH = 1  # Minimum 1 caractère pour la recherche
