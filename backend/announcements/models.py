from django.db import models


class Announcement(models.Model):
    titre = models.CharField(max_length=200)
    contenu = models.TextField()
    auteur = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True, related_name='announcements')
    visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'annonce'

    def __str__(self):
        return self.titre


class DeletionRequest(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('approuvee', 'Approuvée'),
        ('refusee', 'Refusée'),
    ]
    demandeur = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='deletion_requests')
    objet = models.ForeignKey('objects.ConnectedObject', on_delete=models.CASCADE, related_name='deletion_requests')
    motif = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'demande de suppression'
