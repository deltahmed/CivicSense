from django.db import models
from django.core.cache import cache

SERVICE_CATEGORIES = [
    ('Sécurité & Accès', 'Sécurité & Accès'),
    ('Énergie & Environnement', 'Énergie & Environnement'),
    ('Eau & Sanitaire', 'Eau & Sanitaire'),
    ('Collecte & Déchets', 'Collecte & Déchets'),
    ('Numérique & Domotique', 'Numérique & Domotique'),
    ('Espaces & Vie commune', 'Espaces & Vie commune'),
    ('Autre', 'Autre'),
]

NIVEAU_CHOICES = [
    ('debutant', 'Débutant'),
    ('intermediaire', 'Intermédiaire'),
    ('avance', 'Avancé'),
    ('expert', 'Expert'),
]

PUBLIC_CONCERNE_CHOICES = [
    ('tout_le_monde', 'Tout le monde'),
    ('residents', 'Résidents'),
    ('visiteurs', 'Visiteurs'),
    ('syndic', 'Syndic / gestion'),
]


class Service(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=100, choices=SERVICE_CATEGORIES)
    niveau_requis = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='debutant')
    public_concerne = models.CharField(max_length=20, choices=PUBLIC_CONCERNE_CHOICES, default='tout_le_monde')
    visible = models.BooleanField(default=True, help_text='Visible publiquement sur la page Services & informations')
    objets_lies = models.ManyToManyField('objects.ConnectedObject', blank=True, related_name='services')

    class Meta:
        verbose_name = 'service'

    def __str__(self):
        return self.nom


class GlobalSettings(models.Model):
    nom_residence = models.CharField(max_length=100, default='SmartResi')
    banniere = models.ImageField(upload_to='settings/', blank=True, null=True)
    couleur_theme = models.CharField(max_length=7, default='#378ADD')
    message_inscription = models.TextField(blank=True)
    seuil_alerte_conso_kwh = models.FloatField(default=100.0, help_text="Seuil en kWh pour déclencher une alerte de consommation.")
    seuil_alerte_co2_ppm = models.IntegerField(default=1000, help_text="Seuil en PPM pour déclencher une alerte de qualité de l'air (CO2).")
    approbation_manuelle = models.BooleanField(default=True, help_text="Si coché, la suppression d'objet par un utilisateur standard requiert une approbation.")
    domaines_email_autorises = models.JSONField(default=list, blank=True, help_text="Laisse vide pour autoriser tous les domaines. Sinon, liste de domaines autorisés pour l'inscription, ex: ['@smartresi.com']")

    class Meta:
        verbose_name = 'paramètre global'
        verbose_name_plural = 'paramètres globaux'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        cache.delete('global_settings')

    def delete(self, *args, **kwargs):
        # This is a singleton, do not allow deletion.
        pass

    @classmethod
    def load(cls):
        settings = cache.get('global_settings')
        if settings is None:
            settings, created = cls.objects.get_or_create(pk=1)
            cache.set('global_settings', settings, timeout=None)  # Cache "forever"
        return settings


class CollecteDechet(models.Model):
    TYPE_CHOICES = [
        ('recyclage', 'Recyclage'),
        ('ordures', 'Ordures ménagères'),
        ('verre', 'Verre'),
    ]

    type_dechet = models.CharField(max_length=20, choices=TYPE_CHOICES)
    prochaine_collecte = models.DateField()
    heure = models.TimeField(default='07:00:00')
    active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['prochaine_collecte']
        verbose_name = 'collecte de déchet'
        verbose_name_plural = 'collectes de déchets'

    def __str__(self):
        return f'{self.get_type_dechet_display()} — {self.prochaine_collecte}'
