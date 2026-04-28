import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('incidents', '0002_initial'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='HistoriqueStatut',
            new_name='HistoriqueStatutIncident',
        ),
        migrations.RemoveField(
            model_name='historiquestatutincident',
            name='ancien_statut',
        ),
        migrations.RemoveField(
            model_name='historiquestatutincident',
            name='nouveau_statut',
        ),
        migrations.RemoveField(
            model_name='historiquestatutincident',
            name='modifie_par',
        ),
        migrations.AddField(
            model_name='historiquestatutincident',
            name='statut',
            field=models.CharField(default='signale', max_length=20),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='historiquestatutincident',
            name='commentaire',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='historiquestatutincident',
            name='incident',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='historique',
                to='incidents.incident',
            ),
        ),
    ]
