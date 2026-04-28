import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('announcements', '0002_initial'),
        ('objects', '0004_remove_deletionrequest'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DeletionRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('motif', models.TextField()),
                ('statut', models.CharField(
                    choices=[('en_attente', 'En attente'), ('approuvee', 'Approuvée'), ('refusee', 'Refusée')],
                    default='en_attente',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('demandeur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='deletion_requests',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('objet', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='deletion_requests',
                    to='objects.connectedobject',
                )),
            ],
            options={
                'verbose_name': 'demande de suppression',
            },
        ),
    ]
