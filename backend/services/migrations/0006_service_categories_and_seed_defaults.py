from django.db import migrations, models


DEFAULT_SERVICES = [
    {
        'nom': 'Nettoyage et maintenance',
        'description': 'Espaces communs et entretien',
        'categorie': 'Espaces & Vie commune',
        'niveau_requis': 'debutant',
    },
    {
        'nom': 'Stationnement et mobilité',
        'description': 'Gestion parking et vélos',
        'categorie': 'Espaces & Vie commune',
        'niveau_requis': 'debutant',
    },
    {
        'nom': 'Espaces verts et jardinage',
        'description': 'Jardins et espaces paysagers',
        'categorie': 'Espaces & Vie commune',
        'niveau_requis': 'debutant',
    },
    {
        'nom': 'Sécurité et surveillance',
        'description': 'Vidéosurveillance et patrouille',
        'categorie': 'Sécurité & Accès',
        'niveau_requis': 'intermediaire',
    },
    {
        'nom': 'Accueil et conciergerie',
        'description': 'Service d\'accueil et assistance',
        'categorie': 'Espaces & Vie commune',
        'niveau_requis': 'debutant',
    },
    {
        'nom': 'Bibliothèque et ressources',
        'description': 'Livres et documentation',
        'categorie': 'Numérique & Domotique',
        'niveau_requis': 'debutant',
    },
    {
        'nom': 'Santé et bien-être',
        'description': 'Services de santé et loisirs',
        'categorie': 'Autre',
        'niveau_requis': 'debutant',
    },
    {
        'nom': 'Événements et animations',
        'description': 'Activités résidentielles',
        'categorie': 'Espaces & Vie commune',
        'niveau_requis': 'debutant',
    },
]


def seed_default_services(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for service_data in DEFAULT_SERVICES:
        Service.objects.get_or_create(
            nom=service_data['nom'],
            defaults=service_data,
        )


def unseed_default_services(apps, schema_editor):
    Service = apps.get_model('services', 'Service')
    for service_data in DEFAULT_SERVICES:
        Service.objects.filter(nom=service_data['nom']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0005_alter_collectedechet_heure'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='categorie',
            field=models.CharField(choices=[('Sécurité & Accès', 'Sécurité & Accès'), ('Énergie & Environnement', 'Énergie & Environnement'), ('Eau & Sanitaire', 'Eau & Sanitaire'), ('Collecte & Déchets', 'Collecte & Déchets'), ('Numérique & Domotique', 'Numérique & Domotique'), ('Espaces & Vie commune', 'Espaces & Vie commune'), ('Autre', 'Autre')], max_length=100),
        ),
        migrations.RunPython(seed_default_services, unseed_default_services),
    ]
