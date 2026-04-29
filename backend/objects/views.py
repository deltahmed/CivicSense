from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified, IsAvance
from users.utils import add_points
from .models import ConnectedObject, HistoriqueConso
from .serializers import ConnectedObjectSerializer, HistoriqueConsoSerializer, CategorySerializer


class ObjectListView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAvance()]
        return [IsAuthenticated(), IsVerified()]

    def get(self, request):
        objects = ConnectedObject.objects.all()
        return Response({'success': True, 'data': ConnectedObjectSerializer(objects, many=True).data})

    def post(self, request):
        serializer = ConnectedObjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': serializer.data}, status=201)


class ObjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def _get_object(self, pk):
        try:
            return ConnectedObject.objects.get(pk=pk)
        except ConnectedObject.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get_object(pk)
        if obj is None:
            return Response({'success': False, 'message': 'Objet introuvable.'}, status=404)
        add_points(request.user, 0.50)
        return Response({'success': True, 'data': ConnectedObjectSerializer(obj).data})

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsAvance()]
        return [IsAuthenticated(), IsVerified()]

    def patch(self, request, pk):
        obj = self._get_object(pk)
        if obj is None:
            return Response({'success': False, 'message': 'Objet introuvable.'}, status=404)
        serializer = ConnectedObjectSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})


class ObjectHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, pk):
        period = request.query_params.get('period', '30d')
        days = 30
        if period == '7d':
            days = 7
        elif period == '90d':
            days = 90
            
        start_date = timezone.now() - timedelta(days=days)
        
        history = HistoriqueConso.objects.filter(objet_id=pk, date__gte=start_date).order_by('date')
        return Response({'success': True, 'data': HistoriqueConsoSerializer(history, many=True).data})


class ObjectAlertsView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        # Optimisation : On agrège les données côté base de données (1 seule requête O(1))
        qs = ConnectedObject.objects.annotate(
            interactions_30j=Count('historique_conso', filter=Q(historique_conso__date__gte=thirty_days_ago)),
            conso_30j=Sum('historique_conso__valeur', filter=Q(historique_conso__date__gte=thirty_days_ago))
        )
        
        seuil_bas = 0.1
        seuil_moyen = 0.5
        
        data = []
        for obj in qs:
            conso = obj.conso_30j or 0.0
            interactions = obj.interactions_30j
            
            # Calcul du score sécurisé (évite la division par zéro)
            score = 0.0
            if conso > 0:
                score = interactions / conso
                
            if score < seuil_bas:
                efficacite = "inefficace"
            elif score < seuil_moyen:
                efficacite = "à surveiller"
            else:
                efficacite = "efficace"
                
            maintenance = False
            if obj.derniere_interaction and obj.derniere_interaction < seven_days_ago:
                maintenance = True
                
            data.append({
                'id': obj.id,
                'unique_id': obj.unique_id,
                'nom': obj.nom,
                'zone': obj.zone,
                'interactions_30j': interactions,
                'conso_30j': conso,
                'score': score,
                'efficacite': efficacite,
                'maintenance_conseillee': maintenance
            })

        return Response({'success': True, 'data': data})


class ObjectConfigView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    _ALLOWED_KEYS = {
        'thermostat': {'temperature_cible', 'mode', 'plage_horaire'},
        'eclairage': {'luminosite', 'horaire_allumage', 'horaire_extinction'},
        'capteur': {'seuil_alerte_ppm'},
        'compteur': {'conso_max_autorisee_kwh'},
        'camera': set(),
        'prise': set(),
    }

    def patch(self, request, pk):
        try:
            obj = ConnectedObject.objects.get(pk=pk)
        except ConnectedObject.DoesNotExist:
            return Response({'success': False, 'message': 'Objet introuvable.'}, status=404)

        attrs = request.data.get('attributs_specifiques')
        if not isinstance(attrs, dict):
            return Response(
                {'success': False, 'message': 'attributs_specifiques doit être un objet JSON.'},
                status=400,
            )

        allowed = self._ALLOWED_KEYS.get(obj.type_objet, set())
        unknown = set(attrs.keys()) - allowed
        if unknown:
            return Response(
                {
                    'success': False,
                    'message': f"Clés non autorisées pour {obj.type_objet} : {', '.join(sorted(unknown))}",
                },
                status=400,
            )

        obj.attributs_specifiques = {**obj.attributs_specifiques, **attrs}
        obj.save()
        return Response({'success': True, 'data': ConnectedObjectSerializer(obj).data})
