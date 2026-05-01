from django.conf import settings
from django.db import models
from django.utils import timezone


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


class Alert(models.Model):
    TYPE_ALERTE_CHOICES = [
        ('surconsommation_energie', 'Surconsommation énergie'),
        ('batterie_faible',         'Batterie faible'),
        ('maintenance_requise',     'Maintenance requise'),
        ('valeur_capteur',          'Valeur capteur (JSON)'),
        ('autre',                   'Autre'),
    ]
    PRIORITE_CHOICES = [
        ('faible',   'Faible'),
        ('moyen',    'Moyen'),
        ('critique', 'Critique'),
    ]
    OPERATEUR_CHOICES = [
        ('gt',  'supérieur à (>)'),
        ('lt',  'inférieur à (<)'),
        ('gte', 'supérieur ou égal à (≥)'),
        ('lte', 'inférieur ou égal à (≤)'),
    ]

    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_alerte = models.CharField(max_length=50, choices=TYPE_ALERTE_CHOICES, default='autre')
    seuil = models.FloatField(null=True, blank=True)
    operateur = models.CharField(max_length=10, choices=OPERATEUR_CHOICES, default='gt')
    valeur_cle = models.CharField(max_length=100, blank=True, help_text="Clé JSON dans valeur_actuelle (type valeur_capteur)")
    objet_concerne = models.ForeignKey(
        ConnectedObject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
    )
    priorite = models.CharField(max_length=20, choices=PRIORITE_CHOICES, default='moyen')
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes_creees',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _compare(self, valeur, seuil):
        op = self.operateur
        if op == 'gt':  return valeur > seuil
        if op == 'lt':  return valeur < seuil
        if op == 'gte': return valeur >= seuil
        if op == 'lte': return valeur <= seuil
        return False

    @property
    def valeur_comparee(self):
        """Retourne la valeur actuelle comparée au seuil (None si non applicable)."""
        if not self.objet_concerne or self.seuil is None:
            return None
        obj = self.objet_concerne
        if self.type_alerte == 'surconsommation_energie':
            return obj.consommation_kwh
        if self.type_alerte == 'batterie_faible':
            return float(obj.batterie)
        if self.type_alerte == 'maintenance_requise':
            delta = timezone.now() - obj.derniere_interaction
            return float(delta.days)
        if self.type_alerte == 'valeur_capteur' and self.valeur_cle:
            val = obj.valeur_actuelle.get(self.valeur_cle)
            try:
                return float(val)
            except (TypeError, ValueError):
                return None
        return None

    @property
    def declenchee(self):
        if not self.active or not self.objet_concerne or self.seuil is None:
            return False
        valeur = self.valeur_comparee
        if valeur is None:
            return False
        return self._compare(valeur, self.seuil)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'alerte'
        verbose_name_plural = 'alertes'

    def __str__(self):
        return f'{self.nom} ({self.get_priorite_display()})'
