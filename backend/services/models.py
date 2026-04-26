from django.db import models

NIVEAU_CHOICES = [
    ('debutant', 'Débutant'),
    ('intermediaire', 'Intermédiaire'),
    ('avance', 'Avancé'),
    ('expert', 'Expert'),
]


class Service(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=100)
    niveau_requis = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='debutant')
    objets_lies = models.ManyToManyField('objects.ConnectedObject', blank=True, related_name='services')

    class Meta:
        verbose_name = 'service'

    def __str__(self):
        return self.nom
