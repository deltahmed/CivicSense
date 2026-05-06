from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0002_globalsettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalsettings',
            name='nom_residence',
            field=models.CharField(default='SmartResi', max_length=100),
        ),
        migrations.AddField(
            model_name='globalsettings',
            name='banniere',
            field=models.ImageField(blank=True, null=True, upload_to='settings/'),
        ),
        migrations.AddField(
            model_name='globalsettings',
            name='couleur_theme',
            field=models.CharField(default='#378ADD', max_length=7),
        ),
        migrations.AddField(
            model_name='globalsettings',
            name='message_inscription',
            field=models.TextField(blank=True),
        ),
    ]
