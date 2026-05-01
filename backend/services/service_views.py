from datetime import timedelta

from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from objects.models import AccesLog, ConnectedObject, HistoriqueConso
from objects.serializers import ConnectedObjectSerializer
from users.permissions import IsAvance, IsVerified
from .models import CollecteDechet, GlobalSettings
from .service_serializers import AccesLogSerializer, CollecteDechetSerializer

ACCES_TYPES = ['serrure', 'digicode', 'capteur_porte']
ENERGIE_TYPES = ['compteur', 'prise', 'eclairage', 'thermostat']
EAU_TYPES = ['compteur_eau', 'capteur_fuite']


def _period_to_days(period):
    return {'7d': 7, '30d': 30, '90d': 90}.get(period, 7)


# ── Gestion d'accès ───────────────────────────────────────────────────────────

class AccesPortesView(APIView):
    permission_classes = [IsVerified]

    def get(self, request):
        objets = ConnectedObject.objects.filter(type_objet__in=ACCES_TYPES).order_by('zone', 'nom')
        return Response({
            'success': True,
            'data': ConnectedObjectSerializer(objets, many=True).data,
        })


class AccesToggleView(APIView):
    permission_classes = [IsAvance]

    def patch(self, request, pk):
        try:
            objet = ConnectedObject.objects.get(pk=pk, type_objet__in=ACCES_TYPES)
        except ConnectedObject.DoesNotExist:
            return Response({'success': False, 'message': 'Accès introuvable.'}, status=404)

        objet.statut = 'inactif' if objet.statut == 'actif' else 'actif'
        objet.save(update_fields=['statut'])

        AccesLog.objects.create(
            objet=objet,
            direction='entree',
            acces_autorise=(objet.statut == 'actif'),
            utilisateur_pseudo=getattr(request.user, 'username', ''),
        )

        return Response({'success': True, 'data': {'id': objet.id, 'statut': objet.statut}})


class AccesHistoriqueView(APIView):
    permission_classes = [IsVerified]

    def get(self, request):
        period = request.query_params.get('period', '7d')
        objet_id = request.query_params.get('objet')
        direction = request.query_params.get('direction')

        since = timezone.now() - timedelta(hours=24 if period == '24h' else _period_to_days(period) * 24)
        qs = AccesLog.objects.filter(timestamp__gte=since)

        if objet_id:
            qs = qs.filter(objet_id=objet_id)
        if direction in ('entree', 'sortie'):
            qs = qs.filter(direction=direction)

        return Response({
            'success': True,
            'count': qs.count(),
            'data': AccesLogSerializer(qs, many=True).data,
        })


# ── Consommation d'énergie ────────────────────────────────────────────────────

class ConsoEnergieView(APIView):
    permission_classes = [IsVerified]

    def get(self, request):
        period = request.query_params.get('period', '7d')
        days = _period_to_days(period)
        now = timezone.now()
        since = now - timedelta(days=days)
        prev_since = since - timedelta(days=days)

        objets = ConnectedObject.objects.filter(type_objet__in=ENERGIE_TYPES)

        def _aggregate(qs_filter):
            rows = (
                HistoriqueConso.objects
                .filter(qs_filter)
                .annotate(jour=TruncDate('date'))
                .values('jour')
                .annotate(total=Sum('valeur'))
                .order_by('jour')
            )
            return [{'date': str(r['jour']), 'valeur': round(r['total'] or 0, 2)} for r in rows]

        from django.db.models import Q
        graphique = _aggregate(Q(objet__in=objets) & Q(date__gte=since))
        graphique_prev = _aggregate(Q(objet__in=objets) & Q(date__gte=prev_since) & Q(date__lt=since))

        total = sum(p['valeur'] for p in graphique)
        total_prev = sum(p['valeur'] for p in graphique_prev)
        nb_jours = max(len(graphique), 1)
        nb_jours_prev = max(len(graphique_prev), 1)
        moy = round(total / nb_jours, 2)
        moy_prev = round(total_prev / nb_jours_prev, 2)

        settings_obj = GlobalSettings.load()
        seuil = settings_obj.seuil_alerte_conso_kwh

        objets_data = list(objets.values('id', 'nom', 'type_objet', 'zone', 'statut', 'consommation_kwh'))

        return Response({
            'success': True,
            'data': {
                'periode': period,
                'total_kwh': round(total, 2),
                'total_precedent_kwh': round(total_prev, 2),
                'moy_journaliere_kwh': moy,
                'moy_precedente_kwh': moy_prev,
                'variation_pct': round((moy - moy_prev) / max(moy_prev, 0.01) * 100, 1),
                'seuil_alerte_kwh': seuil,
                'alerte_active': total > seuil,
                'graphique': graphique,
                'graphique_precedent': graphique_prev,
                'objets': objets_data,
            },
        })


# ── Consommation d'eau ────────────────────────────────────────────────────────

class ConsoEauView(APIView):
    permission_classes = [IsVerified]

    def get(self, request):
        period = request.query_params.get('period', '7d')
        days = _period_to_days(period)
        now = timezone.now()
        since = now - timedelta(days=days)
        prev_since = since - timedelta(days=days)

        compteurs = ConnectedObject.objects.filter(type_objet='compteur_eau')
        capteurs_fuite = ConnectedObject.objects.filter(type_objet='capteur_fuite')

        from django.db.models import Q

        def _aggregate(qs_filter):
            rows = (
                HistoriqueConso.objects
                .filter(qs_filter)
                .annotate(jour=TruncDate('date'))
                .values('jour')
                .annotate(total=Sum('valeur'))
                .order_by('jour')
            )
            return [{'date': str(r['jour']), 'valeur': round(r['total'] or 0, 2)} for r in rows]

        graphique = _aggregate(Q(objet__in=compteurs) & Q(date__gte=since))
        graphique_prev = _aggregate(Q(objet__in=compteurs) & Q(date__gte=prev_since) & Q(date__lt=since))

        total = sum(p['valeur'] for p in graphique)
        total_prev = sum(p['valeur'] for p in graphique_prev)
        nb_jours = max(len(graphique), 1)
        nb_jours_prev = max(len(graphique_prev), 1)
        moy = round(total / nb_jours, 2)
        moy_prev = round(total_prev / nb_jours_prev, 2)

        fuites = [
            {
                'id': o.id,
                'nom': o.nom,
                'zone': o.zone,
                'statut': o.statut,
                'fuite_detectee': bool(o.valeur_actuelle.get('fuite', False)),
                'humidite_pct': o.valeur_actuelle.get('humidite_pct', 0),
            }
            for o in capteurs_fuite
        ]
        has_fuite = any(f['fuite_detectee'] for f in fuites)

        return Response({
            'success': True,
            'data': {
                'periode': period,
                'total_litres': round(total, 2),
                'total_precedent_litres': round(total_prev, 2),
                'moy_journaliere_litres': moy,
                'moy_precedente_litres': moy_prev,
                'variation_pct': round((moy - moy_prev) / max(moy_prev, 0.01) * 100, 1),
                'alerte_fuite': has_fuite,
                'capteurs_fuite': fuites,
                'graphique': graphique,
                'graphique_precedent': graphique_prev,
                'compteurs': list(compteurs.values('id', 'nom', 'zone', 'statut')),
            },
        })


# ── Gestion des déchets ───────────────────────────────────────────────────────

class DechetCalendrierView(APIView):
    permission_classes = [IsVerified]

    def get(self, request):
        collectes = CollecteDechet.objects.filter(active=True)
        threshold = timezone.now().date() + timedelta(days=2)
        rappels = collectes.filter(prochaine_collecte__lte=threshold)

        return Response({
            'success': True,
            'data': CollecteDechetSerializer(collectes, many=True).data,
            'rappels': CollecteDechetSerializer(rappels, many=True).data,
        })


class BacsView(APIView):
    permission_classes = [IsVerified]

    def get(self, request):
        bacs = ConnectedObject.objects.filter(type_objet='capteur_remplissage')

        bacs_data = []
        for bac in bacs:
            taux = bac.valeur_actuelle.get('taux_remplissage', 0)
            type_dechet = bac.attributs_specifiques.get('type_dechet', 'inconnu')
            bacs_data.append({
                'id': bac.id,
                'nom': bac.nom,
                'zone': bac.zone,
                'statut': bac.statut,
                'type_dechet': type_dechet,
                'taux_remplissage': taux,
                'alerte': taux >= 80,
            })

        recyclables = [b['taux_remplissage'] for b in bacs_data if b['type_dechet'] in ('recyclage', 'verre')]
        ordures = [b['taux_remplissage'] for b in bacs_data if b['type_dechet'] == 'ordures']
        total_recyclage = sum(recyclables)
        total_all = sum(b['taux_remplissage'] for b in bacs_data)
        taux_tri = round(total_recyclage / max(total_all, 1) * 100, 1)

        return Response({
            'success': True,
            'data': bacs_data,
            'taux_tri_global': taux_tri,
            'bacs_en_alerte': [b for b in bacs_data if b['alerte']],
        })
