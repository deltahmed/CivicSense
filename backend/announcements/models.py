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
