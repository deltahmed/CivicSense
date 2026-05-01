from django.utils import timezone
from rest_framework import serializers

from objects.models import AccesLog
from .models import CollecteDechet


class AccesLogSerializer(serializers.ModelSerializer):
    objet_nom = serializers.CharField(source='objet.nom', read_only=True)
    objet_zone = serializers.CharField(source='objet.zone', read_only=True)
    objet_type = serializers.CharField(source='objet.type_objet', read_only=True)

    class Meta:
        model = AccesLog
        fields = [
            'id', 'objet', 'objet_nom', 'objet_zone', 'objet_type',
            'direction', 'timestamp', 'acces_autorise', 'utilisateur_pseudo',
        ]


class CollecteDechetSerializer(serializers.ModelSerializer):
    type_dechet_display = serializers.CharField(source='get_type_dechet_display', read_only=True)
    jours_restants = serializers.SerializerMethodField()

    class Meta:
        model = CollecteDechet
        fields = [
            'id', 'type_dechet', 'type_dechet_display',
            'prochaine_collecte', 'heure', 'active', 'description', 'jours_restants',
        ]

    def get_jours_restants(self, obj):
        return (obj.prochaine_collecte - timezone.now().date()).days
