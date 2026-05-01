from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified, IsAvance, IsExpert
from users.utils import add_points
from .models import ConnectedObject, HistoriqueConso, Alert
from .serializers import ConnectedObjectSerializer, HistoriqueConsoSerializer, CategorySerializer, AlertSerializer


class ObjectListView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAvance()]
        return [IsAuthenticated(), IsVerified()]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        marque = request.query_params.get('marque', '').strip()
        type_objet = request.query_params.get('type_objet', '').strip()
        statut = request.query_params.get('statut', '').strip()
        zone = request.query_params.get('zone', '').strip()

        queryset = ConnectedObject.objects.all()
        if search:
            queryset = queryset.filter(
                Q(nom__icontains=search) | Q(description__icontains=search)
            )
        if marque:
            queryset = queryset.filter(marque=marque)
        if type_objet:
            queryset = queryset.filter(type_objet=type_objet)
        if statut:
            queryset = queryset.filter(statut=statut)
        if zone:
            queryset = queryset.filter(zone=zone)

        return Response({'success': True, 'data': ConnectedObjectSerializer(queryset, many=True).data})

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
        data = dict(ConnectedObjectSerializer(obj).data)
        historique = HistoriqueConso.objects.filter(objet=obj).order_by('-date')[:5]
        data['historique_recent'] = HistoriqueConsoSerializer(historique, many=True).data
        return Response({'success': True, 'data': data})

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsExpert()]
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
        # Seuil attendu : 6 lectures/jour × 30 jours = 180 entrées max
        INTERACTIONS_ESPEREES = 180

        qs = ConnectedObject.objects.annotate(
            interactions_30j=Count(
                'historique_conso',
                filter=Q(historique_conso__date__gte=thirty_days_ago),
            ),
            conso_30j=Sum(
                'historique_conso__valeur',
                filter=Q(historique_conso__date__gte=thirty_days_ago),
            ),
        )

        data = []
        for obj in qs:
            interactions = obj.interactions_30j or 0
            conso = float(obj.conso_30j or 0.0)
            score = round(interactions / INTERACTIONS_ESPEREES, 3)

            if obj.statut == 'maintenance':
                efficacite = 'inefficace'
            elif obj.statut == 'inactif':
                efficacite = 'à surveiller'
            elif interactions >= 100:
                efficacite = 'efficace'
            elif interactions >= 20:
                efficacite = 'à surveiller'
            else:
                efficacite = 'inefficace'

            maintenance = obj.statut == 'maintenance' or interactions < 5

            data.append({
                'id':                   obj.id,
                'unique_id':            obj.unique_id,
                'nom':                  obj.nom,
                'zone':                 obj.zone,
                'statut':               obj.statut,
                'interactions_30j':     interactions,
                'conso_30j':            conso,
                'score':                score,
                'efficacite':           efficacite,
                'maintenance_conseillee': maintenance,
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


class AlertRuleListView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        qs = Alert.objects.select_related('objet_concerne', 'created_by').all()
        objet_id = request.query_params.get('objet_id')
        if objet_id:
            qs = qs.filter(objet_concerne_id=objet_id)
        return Response({'success': True, 'data': AlertSerializer(qs, many=True).data})

    def post(self, request):
        serializer = AlertSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save(created_by=request.user)
        return Response({'success': True, 'data': serializer.data}, status=201)


class AlertRuleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def _get(self, pk):
        try:
            return Alert.objects.select_related('objet_concerne', 'created_by').get(pk=pk)
        except Alert.DoesNotExist:
            return None

    def get(self, request, pk):
        alert = self._get(pk)
        if alert is None:
            return Response({'success': False, 'message': 'Alerte introuvable.'}, status=404)
        return Response({'success': True, 'data': AlertSerializer(alert).data})

    def patch(self, request, pk):
        alert = self._get(pk)
        if alert is None:
            return Response({'success': False, 'message': 'Alerte introuvable.'}, status=404)
        serializer = AlertSerializer(alert, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})

    def delete(self, request, pk):
        alert = self._get(pk)
        if alert is None:
            return Response({'success': False, 'message': 'Alerte introuvable.'}, status=404)
        alert.delete()
        return Response({'success': True, 'message': 'Alerte supprimée.'})


class AdminTriggeredAlertsView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        alerts = Alert.objects.filter(active=True).select_related('objet_concerne', 'created_by')
        triggered = []
        for a in alerts:
            if a.declenchee:
                triggered.append({
                    'id':             a.id,
                    'nom':            a.nom,
                    'description':    a.description,
                    'type_alerte':    a.type_alerte,
                    'priorite':       a.priorite,
                    'seuil':          a.seuil,
                    'operateur':      a.operateur,
                    'valeur_cle':     a.valeur_cle,
                    'valeur_comparee': a.valeur_comparee,
                    'objet_id':       a.objet_concerne_id,
                    'objet_nom':      a.objet_concerne.nom if a.objet_concerne else None,
                    'objet_zone':     a.objet_concerne.zone if a.objet_concerne else None,
                    'created_at':     a.created_at,
                })
        triggered.sort(key=lambda x: ['critique', 'moyen', 'faible'].index(x['priorite']))
        return Response({'success': True, 'count': len(triggered), 'data': triggered})


class ObjectZonesView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        zones = (
            ConnectedObject.objects
            .values_list('zone', flat=True)
            .distinct()
            .order_by('zone')
        )
        return Response({'success': True, 'data': list(zones)})


class PublicSearchObjectsView(APIView):
    """Vue publique pour rechercher des objets connectés sans connexion"""
    permission_classes = []

    def get(self, request):
        # Filtres avec valeurs par défaut
        type_objet = request.query_params.get('type_objet', '').strip()
        statut = request.query_params.get('statut', '').strip()
        zone = request.query_params.get('zone', '').strip()
        search = request.query_params.get('search', '').strip()

        # Commencer avec tous les objets
        queryset = ConnectedObject.objects.all()

        # Appliquer les filtres
        if type_objet:
            queryset = queryset.filter(type_objet=type_objet)

        if statut:
            queryset = queryset.filter(statut=statut)

        if zone:
            queryset = queryset.filter(zone=zone)

        if search:
            queryset = queryset.filter(
                Q(nom__icontains=search) | Q(description__icontains=search)
            )

        # Retourner les résultats avec le sérialiseur public
        from .serializers import PublicObjectSerializer
        serializer = PublicObjectSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
