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


class PublicStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from objects.models import ConnectedObject, Alert

        objs = ConnectedObject.objects.all()
        actifs      = objs.filter(statut='actif').count()
        maintenance = objs.filter(statut='maintenance').count()
        inactifs    = objs.filter(statut='inactif').count()

        triggered  = [a for a in Alert.objects.filter(active=True) if a.declenchee]
        critiques  = sum(1 for a in triggered if a.priorite == 'critique')
        autres     = len(triggered) - critiques

        score = max(0, 100 - 5 * critiques - 3 * autres - 2 * inactifs - maintenance)

        return Response({
            'success': True,
            'data': {
                'nom_residence':    'Résidence Les Lilas',
                'score_sante':      score,
                'objets_actifs':    actifs,
                'incidents_en_cours': len(triggered),
                'total_objets':     objs.count(),
                'en_maintenance':   maintenance,
            },
        })
