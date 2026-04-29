from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import GlobalSettings
from .serializers import PublicSettingsSerializer


class PublicSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        settings = GlobalSettings.load()
        serializer = PublicSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)
