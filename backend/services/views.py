from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified
from users.utils import add_points
from .models import Service
from .serializers import ServiceSerializer, ServiceDetailSerializer

LEVEL_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']


class ServiceListView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        # Récupérer les filtres
        categorie = request.query_params.get('categorie', '').strip()
        niveau_requis = request.query_params.get('niveau_requis', '').strip()
        search = request.query_params.get('search', '').strip()
        
        # Déterminer l'index du niveau de l'utilisateur
        user_level_idx = LEVEL_ORDER.index(request.user.level)
        
        # Commencer avec les services accessibles pour le niveau de l'utilisateur
        queryset = Service.objects.all()
        services_accessible = [
            s for s in queryset
            if LEVEL_ORDER.index(s.niveau_requis) <= user_level_idx
        ]
        
        # Appliquer les filtres
        if categorie:
            services_accessible = [s for s in services_accessible if s.categorie == categorie]
        
        if niveau_requis:
            services_accessible = [s for s in services_accessible if s.niveau_requis == niveau_requis]
        
        if search:
            services_accessible = [
                s for s in services_accessible
                if search.lower() in s.nom.lower() or search.lower() in s.description.lower()
            ]
        
        return Response({
            'success': True,
            'count': len(services_accessible),
            'data': ServiceSerializer(services_accessible, many=True).data
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
