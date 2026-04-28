from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('objects', '0003_category_remove_connectedobject_type_objet_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='DeletionRequest',
        ),
    ]
