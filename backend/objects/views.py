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

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAvance()]
        return [IsAuthenticated(), IsVerified()]

    def get(self, request):
        objects = ConnectedObject.objects.all()
        return Response({"success": True, "data": ConnectedObjectSerializer(objects, many=True).data})

    def post(self, request):
        serializer = ConnectedObjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        serializer.save()
        return Response({"success": True, "data": serializer.data}, status=201)


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
            return Response({"success": False, "message": "Objet introuvable."}, status=404)
        add_points(request.user, 0.50)
        return Response({"success": True, "data": ConnectedObjectSerializer(obj).data})

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), IsAvance()]
        return [IsAuthenticated(), IsVerified()]

    def patch(self, request, pk):
        obj = self._get_object(pk)
        if obj is None:
            return Response({"success": False, "message": "Objet introuvable."}, status=404)
        serializer = ConnectedObjectSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        serializer.save()
        return Response({"success": True, "data": serializer.data})


class ObjectHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]

    def get(self, request, pk):
        history = HistoriqueConso.objects.filter(objet_id=pk)
        return Response({"success": True, "data": HistoriqueConsoSerializer(history, many=True).data})


class DeletionRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def post(self, request):
        serializer = DeletionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        serializer.save(demandeur=request.user)
        return Response({"success": True, "data": serializer.data}, status=201)


class DeletionRequestActionView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def patch(self, request, pk):
        try:
            dr = DeletionRequest.objects.get(pk=pk)
        except DeletionRequest.DoesNotExist:
            return Response({"success": False, "message": "Demande introuvable."}, status=404)
        action = request.data.get("action")
        if action == "approuver":
            dr.objet.delete()
            dr.statut = "approuvee"
        elif action == "refuser":
            dr.statut = "refusee"
        else:
            return Response({"success": False, "message": "Action invalide."}, status=400)
        dr.save(update_fields=["statut"])


class ObjectConfigView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def _get_object(self, pk):
        try:
            return ConnectedObject.objects.get(pk=pk)
        except ConnectedObject.DoesNotExist:
            return None

    def patch(self, request, pk):
        obj = self._get_object(pk)
        if obj is None:
            return Response({"success": False, "message": "Objet introuvable."}, status=404)

        # Validation des paramètres selon le type d"objet
        type_objet = obj.type_objet.lower()
        attributs = request.data.get("attributs_specifiques", {})

        # Définition des paramètres valides par type
        config_schema = {
            "thermostat": ["temperature_cible", "mode", "plage_horaire"],
            "éclairage": ["luminosite", "horaire_allumage", "horaire_extinction"],
            "capteur co₂": ["seuil_alerte_ppm"],
            "compteur": ["conso_max_autorisee_kwh"],
        }

        if type_objet in config_schema:
            valid_params = config_schema[type_objet]
            # Filtrer seulement les paramètres valides pour ce type
            filtered_attributs = {k: v for k, v in attributs.items() if k in valid_params}
        else:
            # Pour les types non définis, accepter tous les paramètres
            filtered_attributs = attributs

        # Validation des valeurs selon le paramètre
        for param, value in filtered_attributs.items():
            if param == "temperature_cible" and not (15 <= value <= 30):
                return Response({"success": False, "message": "Temperature cible doit etre entre 15°C et 30°C."}, status=400)
            elif param == "luminosite" and not (0 <= value <= 100):
                return Response({"success": False, "message": "Luminosite doit etre entre 0% et 100%."}, status=400)
            elif param == "seuil_alerte_ppm" and value < 0:
                return Response({"success": False, "message": "Seuil d\"alerte CO2 doit etre positif."}, status=400)
            elif param == "conso_max_autorisee_kwh" and value < 0:
                return Response({"success": False, "message": "Consommation max doit etre positive."}, status=400)

        # Mise à jour des attributs spécifiques
        obj.attributs_specifiques.update(filtered_attributs)
        obj.save(update_fields=["attributs_specifiques", "updated_at"])

        add_points(request.user, 1.0)  # Points pour configuration
        return Response({"success": True, "data": ConnectedObjectSerializer(obj).data})
        return Response({"success": True, "message": f"Demande {dr.statut}."})
