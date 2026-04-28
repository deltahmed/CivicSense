from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from users.permissions import IsVerified, IsExpert, IsAvance
from .models import Announcement, DeletionRequest
from .serializers import AnnouncementSerializer, DeletionRequestSerializer


@method_decorator(cache_page(60 * 15), name='get')
class AnnouncementListView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsExpert()]
        return [IsAuthenticated(), IsVerified()]

    def get(self, request):
        announcements = Announcement.objects.filter(visible=True)
        return Response({'success': True, 'data': AnnouncementSerializer(announcements, many=True).data})

    def post(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save(auteur=request.user)
        return Response({'success': True, 'data': serializer.data}, status=201)


class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def patch(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Annonce introuvable.'}, status=404)
        serializer = AnnouncementSerializer(ann, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})

    def delete(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Annonce introuvable.'}, status=404)
        ann.delete()
        return Response({'success': True, 'message': 'Annonce supprimée.'})


class DeletionRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def post(self, request):
        serializer = DeletionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save(demandeur=request.user)
        return Response({'success': True, 'data': serializer.data}, status=201)
