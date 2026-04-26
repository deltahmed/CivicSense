from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from users.permissions import IsVerified, IsAvance, IsExpert
from users.utils import add_points
from .models import ConnectedObject, HistoriqueConso, DeletionRequest
from .serializers import ConnectedObjectSerializer, HistoriqueConsoSerializer, DeletionRequestSerializer


class ObjectListView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request):
        objects = ConnectedObject.objects.all()
        return Response({'success': True, 'data': ConnectedObjectSerializer(objects, many=True).data})

    def post(self, request):
        self.permission_classes = [IsAuthenticated, IsAvance]
        self.check_permissions(request)
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

    def patch(self, request, pk):
        if request.user.level not in ('avance', 'expert'):
            return Response({'success': False, 'message': 'Accès refusé.'}, status=403)
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
        history = HistoriqueConso.objects.filter(objet_id=pk)
        return Response({'success': True, 'data': HistoriqueConsoSerializer(history, many=True).data})


class DeletionRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def post(self, request):
        serializer = DeletionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save(demandeur=request.user)
        return Response({'success': True, 'data': serializer.data}, status=201)


class DeletionRequestActionView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def patch(self, request, pk):
        try:
            dr = DeletionRequest.objects.get(pk=pk)
        except DeletionRequest.DoesNotExist:
            return Response({'success': False, 'message': 'Demande introuvable.'}, status=404)
        action = request.data.get('action')
        if action == 'approuver':
            dr.objet.delete()
            dr.statut = 'approuvee'
        elif action == 'refuser':
            dr.statut = 'refusee'
        else:
            return Response({'success': False, 'message': 'Action invalide.'}, status=400)
        dr.save(update_fields=['statut'])
        return Response({'success': True, 'message': f'Demande {dr.statut}.'})
