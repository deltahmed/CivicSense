from rest_framework import serializers
from .models import Service, GlobalSettings
from objects.serializers import ConnectedObjectSerializer


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer basique pour les services"""
    class Meta:
        model = Service
        fields = ['id', 'nom', 'description', 'categorie', 'niveau_requis']
        read_only_fields = fields


class ServiceDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé avec les objets connectés"""
    objets_lies = ConnectedObjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Service
        fields = ['id', 'nom', 'description', 'categorie', 'niveau_requis', 'objets_lies']
        read_only_fields = fields


class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        exclude = ('id',)


class PublicSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = ('nom_residence', 'banniere', 'couleur_theme')