from rest_framework import serializers
from .models import ConnectedObject, HistoriqueConso, DeletionRequest


class ConnectedObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectedObject
        exclude = ()


class HistoriqueConsoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueConso
        fields = '__all__'


class DeletionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeletionRequest
        fields = ('id', 'objet', 'motif', 'statut', 'created_at')
        read_only_fields = ('statut', 'created_at')
