from django.contrib.auth.models import AbstractUser
from django.db import models

LEVEL_CHOICES = [
    ('debutant', 'Débutant'),
    ('intermediaire', 'Intermédiaire'),
    ('avance', 'Avancé'),
    ('expert', 'Expert'),
]

GENRE_CHOICES = [
    ('homme', 'Homme'),
    ('femme', 'Femme'),
    ('autre', 'Autre'),
    ('nr', 'Non renseigné'),
]

TYPE_MEMBRE_CHOICES = [
    ('resident', 'Résident'),
    ('referent', 'Référent'),
    ('syndic', 'Syndic'),
]


class CustomUser(AbstractUser):
    # Public profile
    pseudo = models.CharField(max_length=50, unique=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    genre = models.CharField(max_length=10, choices=GENRE_CHOICES, default='nr')
    date_naissance = models.DateField(null=True, blank=True)
    type_membre = models.CharField(max_length=20, choices=TYPE_MEMBRE_CHOICES, default='resident')
    photo = models.ImageField(upload_to='avatars/', null=True, blank=True)

    # Private / auth
    email = models.EmailField(unique=True)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True, default='')

    # Gamification
    points = models.FloatField(default=0.0)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='debutant')
    login_count = models.PositiveIntegerField(default=0)
    action_count = models.PositiveIntegerField(default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'pseudo']

    class Meta:
        verbose_name = 'utilisateur'
        verbose_name_plural = 'utilisateurs'

    def __str__(self):
        return self.pseudo
