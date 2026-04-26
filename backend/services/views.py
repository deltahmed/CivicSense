from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified
from users.utils import add_points
from .models import Service
from .serializers import ServiceSerializer

LEVEL_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']


class ServiceListView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        user_level_idx = LEVEL_ORDER.index(request.user.level)
        services = [
            s for s in Service.objects.all()
            if LEVEL_ORDER.index(s.niveau_requis) <= user_level_idx
        ]
        return Response({'success': True, 'data': ServiceSerializer(services, many=True).data})


class ServiceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, pk):
        try:
            service = Service.objects.get(pk=pk)
        except Service.DoesNotExist:
            return Response({'success': False, 'message': 'Service introuvable.'}, status=404)
        user_level_idx = LEVEL_ORDER.index(request.user.level)
        if LEVEL_ORDER.index(service.niveau_requis) > user_level_idx:
            return Response({'success': False, 'message': 'Niveau insuffisant.'}, status=403)
        add_points(request.user, 0.50)
        return Response({'success': True, 'data': ServiceSerializer(service).data})
