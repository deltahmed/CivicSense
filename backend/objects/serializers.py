from rest_framework import serializers
from .models import ConnectedObject, HistoriqueConso, DeletionRequest, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ConnectedObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectedObject
        exclude = ()


class HistoriqueConsoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueConso
        fields = '__all__'


class DeletionRequestSerializer(serializers.ModelSerializer):
    demandeur_pseudo = serializers.CharField(source='demandeur.pseudo', read_only=True)
    objet_nom = serializers.CharField(source='objet.nom', read_only=True)

    class Meta:
        model = DeletionRequest
        fields = ('id', 'objet', 'objet_nom', 'motif', 'statut', 'created_at', 'demandeur_pseudo')
        read_only_fields = ('statut', 'created_at', 'demandeur_pseudo', 'objet_nom')
