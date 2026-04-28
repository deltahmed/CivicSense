from rest_framework import serializers
from .models import Incident, HistoriqueStatutIncident


class HistoriqueStatutIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueStatutIncident
        fields = '__all__'


class IncidentSerializer(serializers.ModelSerializer):
    historique = HistoriqueStatutIncidentSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ('auteur', 'created_at')


class StatutUpdateSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=Incident.STATUT_CHOICES)
    commentaire = serializers.CharField(required=False, allow_blank=True, default='')
