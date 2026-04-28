from rest_framework import serializers
from .models import Announcement, DeletionRequest


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ('auteur', 'created_at')


class DeletionRequestSerializer(serializers.ModelSerializer):
    demandeur_pseudo = serializers.CharField(source='demandeur.pseudo', read_only=True)
    objet_nom = serializers.CharField(source='objet.nom', read_only=True)

    class Meta:
        model = DeletionRequest
        fields = ('id', 'objet', 'objet_nom', 'motif', 'statut', 'created_at', 'demandeur_pseudo')
        read_only_fields = ('statut', 'created_at', 'demandeur_pseudo', 'objet_nom')
