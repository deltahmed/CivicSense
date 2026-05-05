from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0006_service_categories_and_seed_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='visible',
            field=models.BooleanField(default=True, help_text='Visible publiquement sur la page Services & informations'),
        ),
    ]
