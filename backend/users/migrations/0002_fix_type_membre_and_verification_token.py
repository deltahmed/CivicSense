from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Choix mis à jour : référent et syndic (remplacent gardien et gestionnaire)
        migrations.AlterField(
            model_name='customuser',
            name='type_membre',
            field=models.CharField(
                choices=[
                    ('resident', 'Résident'),
                    ('referent', 'Référent'),
                    ('syndic', 'Syndic'),
                ],
                default='resident',
                max_length=20,
            ),
        ),
        # UUIDField → CharField pour pouvoir vider le token après vérification
        migrations.AlterField(
            model_name='customuser',
            name='verification_token',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
    ]
