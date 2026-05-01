from rest_framework import serializers
from .models import ConnectedObject, HistoriqueConso, Category, Alert


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


class AlertSerializer(serializers.ModelSerializer):
    declenchee = serializers.SerializerMethodField()
    valeur_comparee = serializers.SerializerMethodField()
    objet_nom = serializers.CharField(source='objet_concerne.nom', read_only=True, default=None)
    objet_zone = serializers.CharField(source='objet_concerne.zone', read_only=True, default=None)
    created_by_pseudo = serializers.CharField(source='created_by.pseudo', read_only=True, default=None)

    class Meta:
        model = Alert
        fields = [
            'id', 'nom', 'description', 'type_alerte', 'seuil', 'operateur', 'valeur_cle',
            'objet_concerne', 'objet_nom', 'objet_zone', 'priorite', 'active',
            'declenchee', 'valeur_comparee',
            'created_by', 'created_by_pseudo', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_by', 'created_by_pseudo', 'created_at', 'updated_at',
            'declenchee', 'valeur_comparee', 'objet_nom', 'objet_zone',
        ]

    def get_declenchee(self, obj):
        return obj.declenchee

    def get_valeur_comparee(self, obj):
        return obj.valeur_comparee


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
