from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified, IsAvance
from .models import Incident, HistoriqueStatutIncident
from .serializers import IncidentSerializer, StatutUpdateSerializer


class IncidentListView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        incidents = Incident.objects.all()
        return Response({'success': True, 'data': IncidentSerializer(incidents, many=True).data})

    def post(self, request):
        serializer = IncidentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save(auteur=request.user)
        return Response({'success': True, 'data': serializer.data}, status=201)


class IncidentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def _get(self, pk):
        try:
            return Incident.objects.get(pk=pk)
        except Incident.DoesNotExist:
            return None

    def patch(self, request, pk):
        incident = self._get(pk)
        if incident is None:
            return Response({'success': False, 'message': 'Incident introuvable.'}, status=404)
        serializer = StatutUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        nouveau = serializer.validated_data['statut']
        incident.statut = nouveau
        incident.save(update_fields=['statut'])
        HistoriqueStatutIncident.objects.create(
            incident=incident,
            statut=nouveau,
            commentaire=serializer.validated_data.get('commentaire', ''),
        )
        return Response({'success': True, 'data': IncidentSerializer(incident).data})
