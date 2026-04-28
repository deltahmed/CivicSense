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
