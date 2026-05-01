import csv
import io
from datetime import timedelta

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncWeek
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from incidents.models import Incident
from objects.models import ConnectedObject, HistoriqueConso
from services.models import Service
from users.models import CustomUser, LoginHistory
from users.permissions import IsAvance, IsExpert, IsVerified


class _IgnoreFormatNegotiation(DefaultContentNegotiation):
    """Empêche DRF d'intercepter ?format= pour la négociation de contenu."""
    def select_renderer(self, request, renderers, format_suffix=None):
        return (renderers[0], renderers[0].media_type)


# ── Calcul centralisé ─────────────────────────────────────────────────────────

def _compute_stats(period='30d'):
    days = {'7d': 7, '90d': 90}.get(period, 30)
    start = timezone.now() - timedelta(days=days)

    total_connexions = LoginHistory.objects.filter(logged_at__gte=start).count()

    top_objets = list(
        HistoriqueConso.objects
        .filter(date__gte=start)
        .values('objet__id', 'objet__nom', 'objet__zone')
        .annotate(nb_entrees=Count('id'), total_conso=Sum('valeur'))
        .order_by('-nb_entrees')[:5]
    )

    top_services = list(
        Service.objects
        .annotate(nb_objets=Count('objets_lies'))
        .order_by('-nb_objets')
        .values('id', 'nom', 'categorie', 'nb_objets')[:5]
    )

    conso_totale = (
        HistoriqueConso.objects
        .filter(date__gte=start)
        .aggregate(total=Sum('valeur'))['total'] or 0.0
    )

    incidents_map = {
        item['statut']: item['count']
        for item in (
            Incident.objects
            .filter(created_at__gte=start)
            .values('statut')
            .annotate(count=Count('id'))
        )
    }

    niveaux = list(
        CustomUser.objects.values('level').annotate(count=Count('id')).order_by('level')
    )

    connexions_semaine = [
        {'semaine': item['semaine'].strftime('%Y-%m-%d'), 'connexions': item['connexions']}
        for item in (
            LoginHistory.objects
            .filter(logged_at__gte=start)
            .annotate(semaine=TruncWeek('logged_at'))
            .values('semaine')
            .annotate(connexions=Count('id'))
            .order_by('semaine')
        )
    ]

    conso_semaine = [
        {'semaine': item['semaine'].strftime('%Y-%m-%d'), 'conso': float(item['conso'] or 0)}
        for item in (
            HistoriqueConso.objects
            .filter(date__gte=start)
            .annotate(semaine=TruncWeek('date'))
            .values('semaine')
            .annotate(conso=Sum('valeur'))
            .order_by('semaine')
        )
    ]

    return {
        'period': period,
        'total_connexions': total_connexions,
        'top_objets': top_objets,
        'top_services': top_services,
        'conso_totale_kwh': conso_totale,
        'incidents': {
            'ouverts': sum(v for k, v in incidents_map.items() if k != 'resolu'),
            'resolus': incidents_map.get('resolu', 0),
        },
        'niveaux_utilisateurs': niveaux,
        'connexions_semaine': connexions_semaine,
        'conso_semaine': conso_semaine,
    }


# ── Vues ──────────────────────────────────────────────────────────────────────

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
            interactions=Count('incidents', distinct=True),
        )

        zones_data = {}
        objects_data = []
        total_residence = 0.0

        for obj in qs:
            conso = obj.total_conso or 0.0
            total_residence += conso
            zones_data[obj.zone] = zones_data.get(obj.zone, 0.0) + conso
            objects_data.append({
                'id': obj.id,
                'nom': obj.nom,
                'zone': obj.zone,
                'type_objet': obj.type_objet,
                'total_conso': conso,
                'avg_conso': obj.avg_conso or 0.0,
                'interactions': obj.interactions,
            })

        top_3 = sorted(objects_data, key=lambda x: x['total_conso'], reverse=True)[:3]

        types_distribution = {}
        for obj in objects_data:
            t = obj['type_objet']
            types_distribution[t] = types_distribution.get(t, 0) + 1

        return Response({
            'success': True,
            'period': period,
            'total_residence': total_residence,
            'zones_data': [{'zone': k, 'total': v} for k, v in zones_data.items()],
            'top_3_objects': top_3,
            'objects_data': objects_data,
            'types_distribution': [{'name': k, 'value': v} for k, v in types_distribution.items()],
        })


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        period = request.query_params.get('period', '30d')
        return Response({'success': True, **_compute_stats(period)})


class AdminStatsExportView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        fmt = request.query_params.get('fmt', 'csv')
        stats = _compute_stats(request.query_params.get('period', '30d'))
        return _pdf_response(stats) if fmt == 'pdf' else _csv_response(stats)


# ── Helpers export ────────────────────────────────────────────────────────────

def _csv_response(stats):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="civicsense_stats.csv"'
    w = csv.writer(response)

    w.writerow(['CivicSense — Rapport Admin', f"Période : {stats['period']}"])
    w.writerow([])

    w.writerow(['Résumé'])
    w.writerow(['Total connexions', stats['total_connexions']])
    w.writerow(['Conso totale (kWh)', f"{stats['conso_totale_kwh']:.2f}"])
    w.writerow(['Incidents ouverts', stats['incidents']['ouverts']])
    w.writerow(['Incidents résolus', stats['incidents']['resolus']])
    w.writerow([])

    w.writerow(['Top 5 objets consultés'])
    w.writerow(['ID', 'Nom', 'Zone', 'Nb entrées', 'Conso (kWh)'])
    for o in stats['top_objets']:
        w.writerow([
            o['objet__id'], o['objet__nom'], o.get('objet__zone') or '-',
            o['nb_entrees'], f"{(o['total_conso'] or 0):.2f}",
        ])
    w.writerow([])

    w.writerow(['Top 5 services'])
    w.writerow(['ID', 'Nom', 'Catégorie', 'Nb objets liés'])
    for s in stats['top_services']:
        w.writerow([s['id'], s['nom'], s['categorie'], s['nb_objets']])
    w.writerow([])

    w.writerow(['Répartition niveaux'])
    w.writerow(['Niveau', 'Nb utilisateurs'])
    for n in stats['niveaux_utilisateurs']:
        w.writerow([n['level'], n['count']])
    w.writerow([])

    w.writerow(['Connexions par semaine'])
    w.writerow(['Semaine', 'Connexions'])
    for c in stats['connexions_semaine']:
        w.writerow([c['semaine'], c['connexions']])
    w.writerow([])

    w.writerow(['Conso par semaine (kWh)'])
    w.writerow(['Semaine', 'kWh'])
    for c in stats['conso_semaine']:
        w.writerow([c['semaine'], f"{c['conso']:.2f}"])

    return response


def _pdf_response(stats):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    elems = []

    elems.append(Paragraph('CivicSense — Rapport Administrateur', styles['Title']))
    elems.append(Paragraph(f"Période : {stats['period']}", styles['Normal']))
    elems.append(Spacer(1, 12))

    elems.append(Paragraph('Résumé', styles['Heading2']))
    elems.append(_table([
        ['Indicateur', 'Valeur'],
        ['Total connexions', str(stats['total_connexions'])],
        ['Conso totale (kWh)', f"{stats['conso_totale_kwh']:.2f}"],
        ['Incidents ouverts', str(stats['incidents']['ouverts'])],
        ['Incidents résolus', str(stats['incidents']['resolus'])],
    ]))
    elems.append(Spacer(1, 12))

    elems.append(Paragraph('Top 5 Objets Consultés', styles['Heading2']))
    obj_rows = [['Nom', 'Zone', 'Nb entrées', 'Conso (kWh)']] + [
        [o['objet__nom'], o.get('objet__zone') or '-', str(o['nb_entrees']), f"{(o['total_conso'] or 0):.2f}"]
        for o in stats['top_objets']
    ]
    elems.append(_table(obj_rows) if len(obj_rows) > 1 else Paragraph('Aucune donnée.', styles['Normal']))
    elems.append(Spacer(1, 12))

    elems.append(Paragraph('Top 5 Services', styles['Heading2']))
    svc_rows = [['Nom', 'Catégorie', 'Nb objets liés']] + [
        [s['nom'], s['categorie'], str(s['nb_objets'])]
        for s in stats['top_services']
    ]
    elems.append(_table(svc_rows) if len(svc_rows) > 1 else Paragraph('Aucune donnée.', styles['Normal']))
    elems.append(Spacer(1, 12))

    elems.append(Paragraph('Répartition Niveaux Utilisateurs', styles['Heading2']))
    niv_rows = [['Niveau', 'Nb utilisateurs']] + [
        [n['level'], str(n['count'])] for n in stats['niveaux_utilisateurs']
    ]
    elems.append(_table(niv_rows) if len(niv_rows) > 1 else Paragraph('Aucune donnée.', styles['Normal']))

    doc.build(elems)
    resp = HttpResponse(content_type='application/pdf')
    resp['Content-Disposition'] = 'attachment; filename="civicsense_stats.pdf"'
    resp.write(buf.getvalue())
    return resp


def _table(data):
    t = Table(data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3A7BD5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    return t


# ── Export rapport utilisateur ─────────────────────────────────────────────────

class ExportReportView(APIView):
    permission_classes = [IsAuthenticated, IsVerified]
    content_negotiation_class = _IgnoreFormatNegotiation

    def get(self, request):
        fmt = request.query_params.get('format', 'csv')
        period = request.query_params.get('period', '30d')

        days = {'7d': 7, '90d': 90}.get(period, 30)
        start = timezone.now() - timedelta(days=days)
        seven_days_ago = timezone.now() - timedelta(days=7)

        qs = ConnectedObject.objects.annotate(
            total_conso=Sum('historique_conso__valeur', filter=Q(historique_conso__date__gte=start)),
            interactions_count=Count('historique_conso', filter=Q(historique_conso__date__gte=start)),
        )

        objects_data = []
        total_residence = 0.0
        alerts = []

        for obj in qs:
            conso = obj.total_conso or 0.0
            total_residence += conso
            interactions = obj.interactions_count
            score = interactions / conso if conso > 0 else 0.0
            is_alerte = score < 0.1 or (obj.derniere_interaction and obj.derniere_interaction < seven_days_ago)

            row = {
                'nom': obj.nom,
                'zone': obj.zone or '-',
                'type_objet': obj.type_objet,
                'total_conso': conso,
                'interactions': interactions,
            }
            objects_data.append(row)
            if is_alerte:
                alerts.append({'nom': obj.nom, 'zone': obj.zone or '-'})

        incidents_map = {
            item['statut']: item['count']
            for item in Incident.objects.filter(created_at__gte=start).values('statut').annotate(count=Count('id'))
        }
        incidents_ouverts = sum(v for k, v in incidents_map.items() if k != 'resolu')
        incidents_resolus = incidents_map.get('resolu', 0)

        payload = {
            'period': period,
            'generated_at': timezone.now().strftime('%d/%m/%Y %H:%M'),
            'total_residence': total_residence,
            'objects_data': objects_data,
            'incidents_ouverts': incidents_ouverts,
            'incidents_resolus': incidents_resolus,
            'alerts': alerts,
        }

        return _export_pdf(payload) if fmt == 'pdf' else _export_csv(payload)


def _export_csv(payload):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="rapport.csv"'
    w = csv.writer(response)

    w.writerow(['CivicSense — Rapport Consommation'])
    w.writerow([f"Période : {payload['period']}", f"Généré le : {payload['generated_at']}"])
    w.writerow([])

    w.writerow(['Résumé'])
    w.writerow(['Conso totale résidence (kWh)', f"{payload['total_residence']:.2f}"])
    w.writerow(['Incidents ouverts', payload['incidents_ouverts']])
    w.writerow(['Incidents résolus', payload['incidents_resolus']])
    w.writerow([])

    w.writerow(['Tableau des objets'])
    w.writerow(['Nom', 'Zone', 'Type', 'Conso (kWh)', 'Interactions'])
    for o in payload['objects_data']:
        w.writerow([o['nom'], o['zone'], o['type_objet'], f"{o['total_conso']:.2f}", o['interactions']])
    w.writerow([])

    w.writerow(['Objets en alerte'])
    w.writerow(['Nom', 'Zone'])
    for a in payload['alerts']:
        w.writerow([a['nom'], a['zone']])

    return response


def _export_pdf(payload):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # Titre
    c.setFont('Helvetica-Bold', 16)
    c.drawString(50, h - 50, 'CivicSense — Rapport Consommation')

    # Sous-titre
    c.setFont('Helvetica', 10)
    c.drawString(50, h - 70, f"Période : {payload['period']}   |   Généré le : {payload['generated_at']}")

    # Résumé
    y = h - 110
    c.setFont('Helvetica-Bold', 11)
    c.drawString(50, y, 'Résumé')
    y -= 18
    c.setFont('Helvetica', 10)
    c.drawString(50, y, f"Consommation totale résidence : {payload['total_residence']:.2f} kWh")
    y -= 15
    c.drawString(50, y, f"Incidents ouverts : {payload['incidents_ouverts']}   |   Résolus : {payload['incidents_resolus']}")

    # Tableau des objets
    y -= 30
    c.setFont('Helvetica-Bold', 11)
    c.drawString(50, y, 'Tableau des objets')
    y -= 18

    headers = [('Nom', 50), ('Zone', 180), ('Type', 280), ('Conso (kWh)', 360), ('Interactions', 450)]
    c.setFont('Helvetica-Bold', 9)
    for label, x in headers:
        c.drawString(x, y, label)
    y -= 3
    c.line(50, y, 540, y)
    y -= 12

    c.setFont('Helvetica', 9)
    for obj in payload['objects_data']:
        if y < 60:
            c.showPage()
            y = h - 50
        c.drawString(50, y, obj['nom'][:22])
        c.drawString(180, y, obj['zone'][:15])
        c.drawString(280, y, obj['type_objet'])
        c.drawString(360, y, f"{obj['total_conso']:.2f}")
        c.drawString(450, y, str(obj['interactions']))
        y -= 14

    # Objets en alerte
    y -= 20
    if y < 100:
        c.showPage()
        y = h - 50
    c.setFont('Helvetica-Bold', 11)
    c.drawString(50, y, f"Objets en alerte ({len(payload['alerts'])})")
    y -= 18
    c.setFont('Helvetica', 10)
    for a in payload['alerts']:
        if y < 60:
            c.showPage()
            y = h - 50
        c.drawString(50, y, f"- {a['nom']} ({a['zone']})")
        y -= 14

    c.save()
    resp = HttpResponse(content_type='application/pdf')
    resp['Content-Disposition'] = 'attachment; filename="rapport.pdf"'
    resp.write(buf.getvalue())
    return resp
