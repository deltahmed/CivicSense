from django.db.models import Q
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified
from users.utils import add_points
from .models import Service
from .serializers import ServiceSerializer, ServiceDetailSerializer

LEVEL_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']


class ServiceListView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsVerified()]

    def get(self, request):
        categorie   = request.query_params.get('categorie', '').strip()
        search      = request.query_params.get('search', '').strip()

        # Public API only returns services explicitly marked visible
        queryset = Service.objects.filter(visible=True)
        if categorie:
            queryset = queryset.filter(categorie=categorie)
        if search:
            queryset = queryset.filter(
                Q(nom__icontains=search) | Q(description__icontains=search)
            )

        return Response({
            'success': True,
            'count': queryset.count(),
            'data': ServiceSerializer(queryset, many=True).data
        })


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
        
        # Ajouter des points et incrémenter action_count
        add_points(request.user, 0.50)
        request.user.action_count += 1
        request.user.save(update_fields=['action_count'])
        
        return Response({'success': True, 'data': ServiceDetailSerializer(service).data})
