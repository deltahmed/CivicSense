from datetime import timedelta
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsVerified, IsAvance
from users.utils import add_points
from .models import ConnectedObject, HistoriqueConso
from .serializers import ConnectedObjectSerializer, HistoriqueConsoSerializer


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
