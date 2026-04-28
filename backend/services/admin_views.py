from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsExpert
from .models import GlobalSettings
from .serializers import GlobalSettingsSerializer


class GlobalSettingsView(APIView):
    """
    View and edit the application's global settings.
    Requires Expert permission.
    """
    permission_classes = [IsAuthenticated, IsExpert]

    def get(self, request):
        settings = GlobalSettings.load()
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = GlobalSettings.load()
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)