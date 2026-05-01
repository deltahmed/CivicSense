from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0007_alert_operateur_alert_valeur_cle_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='connectedobject',
            name='type_objet',
            field=models.CharField(
                choices=[
                    ('thermostat', 'Thermostat'),
                    ('camera', 'Caméra'),
                    ('compteur', 'Compteur électrique'),
                    ('eclairage', 'Éclairage'),
                    ('capteur', 'Capteur'),
                    ('prise', 'Prise connectée'),
                    ('serrure', 'Serrure connectée'),
                    ('digicode', 'Digicode'),
                    ('capteur_porte', 'Capteur de porte'),
                    ('compteur_eau', "Compteur d'eau"),
                    ('capteur_fuite', 'Capteur de fuite'),
                    ('capteur_remplissage', 'Capteur de remplissage'),
                ],
                default='capteur',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='AccesLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('direction', models.CharField(
                    choices=[('entree', 'Entrée'), ('sortie', 'Sortie')],
                    default='entree',
                    max_length=10,
                )),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('acces_autorise', models.BooleanField(default=True)),
                ('utilisateur_pseudo', models.CharField(blank=True, max_length=100)),
                ('objet', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='acces_logs',
                    to='objects.connectedobject',
                )),
            ],
            options={
                'verbose_name': "historique d'accès",
                'verbose_name_plural': "historiques d'accès",
                'ordering': ['-timestamp'],
            },
        ),
    ]
