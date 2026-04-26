from django.db import models


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


class ConnectedObject(models.Model):
    unique_id = models.CharField(max_length=100, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    marque = models.CharField(max_length=100, blank=True)
    type_objet = models.CharField(max_length=100)
    zone = models.CharField(max_length=100)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')

    connectivite = models.CharField(max_length=20, choices=CONNECTIVITE_CHOICES, default='wifi')
    signal_force = models.SmallIntegerField(default=0, help_text='dBm')
    derniere_interaction = models.DateTimeField(null=True, blank=True)

    consommation_kwh = models.FloatField(default=0.0)
    batterie = models.SmallIntegerField(null=True, blank=True, help_text='%')

    valeur_actuelle = models.JSONField(default=dict)
    valeur_cible = models.JSONField(default=dict)
    mode = models.CharField(max_length=50, blank=True)
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
    date = models.DateField()
    valeur = models.FloatField()

    class Meta:
        unique_together = ('objet', 'date')
        ordering = ['-date']
        verbose_name = 'historique de consommation'


class DeletionRequest(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('approuvee', 'Approuvée'),
        ('refusee', 'Refusée'),
    ]
    demandeur = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='deletion_requests')
    objet = models.ForeignKey(ConnectedObject, on_delete=models.CASCADE, related_name='deletion_requests')
    motif = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "demande de suppression"
