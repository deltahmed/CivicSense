from rest_framework import serializers
from .models import Incident, HistoriqueStatut


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ('auteur', 'created_at')


class StatutUpdateSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=Incident.STATUT_CHOICES)
