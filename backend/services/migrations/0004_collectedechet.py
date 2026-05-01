from django.db import migrations, models
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0003_globalsettings_appearance'),
    ]

    operations = [
        migrations.CreateModel(
            name='CollecteDechet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_dechet', models.CharField(
                    choices=[
                        ('recyclage', 'Recyclage'),
                        ('ordures', 'Ordures ménagères'),
                        ('verre', 'Verre'),
                    ],
                    max_length=20,
                )),
                ('prochaine_collecte', models.DateField()),
                ('heure', models.TimeField(default=datetime.time(7, 0))),
                ('active', models.BooleanField(default=True)),
                ('description', models.TextField(blank=True)),
            ],
            options={
                'verbose_name': 'collecte de déchet',
                'verbose_name_plural': 'collectes de déchets',
                'ordering': ['prochaine_collecte'],
            },
        ),
    ]
