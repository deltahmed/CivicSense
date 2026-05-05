from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0007_add_visible_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='public_concerne',
            field=models.CharField(choices=[('tout_le_monde', 'Tout le monde'), ('residents', 'Résidents'), ('visiteurs', 'Visiteurs'), ('syndic', 'Syndic / gestion')], default='tout_le_monde', max_length=20),
        ),
    ]