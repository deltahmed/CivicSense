from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0004_remove_deletionrequest'),
    ]

    operations = [
        # ── type_objet : nouveau champ ──────────────────────────────────────
        migrations.AddField(
            model_name='connectedobject',
            name='type_objet',
            field=models.CharField(
                choices=[
                    ('thermostat', 'Thermostat'),
                    ('camera', 'Caméra'),
                    ('compteur', 'Compteur'),
                    ('eclairage', 'Éclairage'),
                    ('capteur', 'Capteur'),
                    ('prise', 'Prise'),
                ],
                default='capteur',
                max_length=20,
            ),
        ),

        # ── signal_force : SmallIntegerField → CharField ────────────────────
        # PostgreSQL nécessite un USING explicite pour le changement de type.
        migrations.RunSQL(
            sql=(
                "ALTER TABLE objects_connectedobject "
                "ALTER COLUMN signal_force TYPE varchar(10) USING 'moyen'"
            ),
            reverse_sql=(
                "ALTER TABLE objects_connectedobject "
                "ALTER COLUMN signal_force TYPE smallint USING 0"
            ),
        ),
        migrations.AlterField(
            model_name='connectedobject',
            name='signal_force',
            field=models.CharField(
                choices=[
                    ('fort', 'Fort'),
                    ('moyen', 'Moyen'),
                    ('faible', 'Faible'),
                ],
                default='moyen',
                max_length=10,
            ),
        ),

        # ── batterie : SmallIntegerField nullable → IntegerField default=100 ─
        migrations.RunSQL(
            sql="UPDATE objects_connectedobject SET batterie = 100 WHERE batterie IS NULL",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name='connectedobject',
            name='batterie',
            field=models.IntegerField(default=100),
        ),

        # ── valeur_cible : JSONField(default=dict) → JSONField nullable ──────
        migrations.AlterField(
            model_name='connectedobject',
            name='valeur_cible',
            field=models.JSONField(blank=True, null=True),
        ),

        # ── mode : ajout des choices, réduction max_length 50 → 20 ──────────
        migrations.AlterField(
            model_name='connectedobject',
            name='mode',
            field=models.CharField(
                choices=[
                    ('automatique', 'Automatique'),
                    ('manuel', 'Manuel'),
                ],
                default='automatique',
                max_length=20,
            ),
        ),

        # ── derniere_interaction : nullable → auto_now ───────────────────────
        migrations.RunSQL(
            sql=(
                "UPDATE objects_connectedobject "
                "SET derniere_interaction = NOW() "
                "WHERE derniere_interaction IS NULL"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name='connectedobject',
            name='derniere_interaction',
            field=models.DateTimeField(auto_now=True),
        ),

        # ── HistoriqueConso.date : DateField → DateTimeField ─────────────────
        migrations.AlterUniqueTogether(
            name='historiqueconso',
            unique_together=set(),
        ),
        migrations.RunSQL(
            sql=(
                "ALTER TABLE objects_historiqueconso "
                "ALTER COLUMN date TYPE timestamp with time zone "
                "USING date::timestamp with time zone"
            ),
            reverse_sql=(
                "ALTER TABLE objects_historiqueconso "
                "ALTER COLUMN date TYPE date USING date::date"
            ),
        ),
        migrations.AlterField(
            model_name='historiqueconso',
            name='date',
            field=models.DateTimeField(),
        ),
    ]
