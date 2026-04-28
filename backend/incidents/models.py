from django.db import models


class Incident(models.Model):
    TYPE_CHOICES = [
        ('panne', 'Panne'),
        ('fuite', 'Fuite'),
        ('securite', 'Sécurité'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('signale', 'Signalé'),
        ('pris_en_charge', 'Pris en charge'),
        ('en_cours', 'En cours'),
        ('resolu', 'Résolu'),
    ]

    auteur = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True, related_name='incidents')
    objet_lie = models.ForeignKey(
        'objects.ConnectedObject', on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents'
    )
    type_incident = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='signale')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'incident'

    def __str__(self):
        return f'{self.type_incident} — {self.statut}'


class HistoriqueStatutIncident(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='historique')
    statut = models.CharField(max_length=20)
    commentaire = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
