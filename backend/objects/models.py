from django.db import models


class Category(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icone = models.CharField(max_length=50, blank=True, help_text="Nom d'icône (ex: 'lightbulb')")

    class Meta:
        verbose_name = 'catégorie'
        verbose_name_plural = 'catégories'
        ordering = ['nom']

    def __str__(self):
        return self.nom


TYPE_OBJET_CHOICES = [
    ('thermostat', 'Thermostat'),
    ('camera', 'Caméra'),
    ('compteur', 'Compteur'),
    ('eclairage', 'Éclairage'),
    ('capteur', 'Capteur'),
    ('prise', 'Prise'),
]

STATUT_CHOICES = [
    ('actif', 'Actif'),
    ('inactif', 'Inactif'),
    ('maintenance', 'En maintenance'),
]

CONNECTIVITE_CHOICES = [
    ('wifi', 'Wi-Fi'),
    ('bluetooth', 'Bluetooth'),
    ('zigbee', 'Zigbee'),
    ('zwave', 'Z-Wave'),
    ('ethernet', 'Ethernet'),
]

SIGNAL_FORCE_CHOICES = [
    ('fort', 'Fort'),
    ('moyen', 'Moyen'),
    ('faible', 'Faible'),
]

MODE_CHOICES = [
    ('automatique', 'Automatique'),
    ('manuel', 'Manuel'),
]


class ConnectedObject(models.Model):
    unique_id = models.CharField(max_length=100, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    marque = models.CharField(max_length=100, blank=True)
    type_objet = models.CharField(max_length=20, choices=TYPE_OBJET_CHOICES, default='capteur')
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name='connected_objects',
        null=True,
        blank=True,
        verbose_name='catégorie',
    )
    zone = models.CharField(max_length=100)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')

    connectivite = models.CharField(max_length=20, choices=CONNECTIVITE_CHOICES, default='wifi')
    signal_force = models.CharField(max_length=10, choices=SIGNAL_FORCE_CHOICES, default='moyen')
    derniere_interaction = models.DateTimeField(auto_now=True)

    consommation_kwh = models.FloatField(default=0.0)
    batterie = models.IntegerField(default=100)

    valeur_actuelle = models.JSONField(default=dict)
    valeur_cible = models.JSONField(null=True, blank=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='automatique')
    attributs_specifiques = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'objet connecté'
        verbose_name_plural = 'objets connectés'

    def __str__(self):
        return f'{self.nom} ({self.zone})'


class HistoriqueConso(models.Model):
    objet = models.ForeignKey(ConnectedObject, on_delete=models.CASCADE, related_name='historique_conso')
    date = models.DateTimeField()
    valeur = models.FloatField()

    class Meta:
        ordering = ['-date']
        verbose_name = 'historique de consommation'
        verbose_name_plural = 'historiques de consommation'
