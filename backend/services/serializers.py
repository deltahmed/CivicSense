from rest_framework import serializers
from .models import Service, GlobalSettings


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'


class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        exclude = ('id',)


class PublicSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = ('nom_residence', 'banniere', 'couleur_theme')