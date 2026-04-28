from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from objects.models import ConnectedObject

class UsageReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_verified:
            return Response({'success': False, 'message': 'Non vérifié'}, status=403)

        period = request.query_params.get('period', '30d')
        zone = request.query_params.get('zone', None)
        
        days = 30
        if period == '7d':
            days = 7
        elif period == '90d':
            days = 90
            
        start_date = timezone.now() - timedelta(days=days)
        
        qs = ConnectedObject.objects.all()
        if zone:
            qs = qs.filter(zone__icontains=zone)
            
        qs = qs.annotate(
            total_conso=Sum('historique_conso__valeur', filter=Q(historique_conso__date__gte=start_date)),
            avg_conso=Avg('historique_conso__valeur', filter=Q(historique_conso__date__gte=start_date)),
            interactions=Count('incidents', distinct=True)
        )
        
        zones_data = {}
        objects_data = []
        total_residence = 0.0
        
        for obj in qs:
            conso = obj.total_conso or 0.0
            total_residence += conso
            
            if obj.zone not in zones_data:
                zones_data[obj.zone] = 0.0
            zones_data[obj.zone] += conso
            
            objects_data.append({
                'id': obj.id,
                'nom': obj.nom,
                'zone': obj.zone,
                'type_objet': obj.type_objet,
                'total_conso': conso,
                'avg_conso': obj.avg_conso or 0.0,
                'interactions': obj.interactions
            })
            
        top_3 = sorted(objects_data, key=lambda x: x['total_conso'], reverse=True)[:3]
        
        types_distribution = {}
        for obj in objects_data:
            t = obj['type_objet']
            types_distribution[t] = types_distribution.get(t, 0) + 1
            
        types_chart_data = [{'name': k, 'value': v} for k, v in types_distribution.items()]
            
        return Response({
            'success': True,
            'period': period,
            'total_residence': total_residence,
            'zones_data': [{'zone': k, 'total': v} for k, v in zones_data.items()],
            'top_3_objects': top_3,
            'objects_data': objects_data,
            'types_distribution': types_chart_data
        })