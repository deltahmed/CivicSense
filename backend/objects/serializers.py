from rest_framework import serializers
from .models import ConnectedObject, HistoriqueConso, Category


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


class PublicObjectSerializer(serializers.ModelSerializer):
    """Serializer pour objets connectés publics - sans données sensibles de conso"""
    category_nom = serializers.CharField(source='category.nom', read_only=True)
    
    class Meta:
        model = ConnectedObject
        fields = [
            'id',
            'unique_id',
            'nom',
            'description',
            'marque',
            'type_objet',
            'category_nom',
            'zone',
            'statut',
            'connectivite',
            'signal_force',
            'derniere_interaction',
        ]
        read_only_fields = fields
