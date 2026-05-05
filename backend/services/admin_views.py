from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAvance
from .models import GlobalSettings, Service
from .serializers import GlobalSettingsSerializer, ServiceAdminSerializer


class ServiceAdminViewSet(viewsets.ModelViewSet):
    """CRUD admin pour le catalogue des services."""
    serializer_class = ServiceAdminSerializer
    permission_classes = [IsAuthenticated, IsAvance]

    def get_queryset(self):
        qs = Service.objects.all()
        search = self.request.query_params.get('search')
        categorie = self.request.query_params.get('categorie')
        public_concerne = self.request.query_params.get('public_concerne')
        if search:
            qs = qs.filter(nom__icontains=search)
        if categorie:
            qs = qs.filter(categorie__icontains=categorie)
        if public_concerne:
            qs = qs.filter(public_concerne=public_concerne)
        return qs.order_by('nom')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)


class GlobalSettingsView(APIView):
    """
    View and edit the application's global settings.
    Requires Expert permission.
    """
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        settings = GlobalSettings.load()
        serializer = GlobalSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        settings = GlobalSettings.load()
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)