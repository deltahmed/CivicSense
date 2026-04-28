import csv
from io import BytesIO

from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from users.permissions import IsAvance
from objects.models import ConnectedObject, HistoriqueConso


class ExportObjectsCSV(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="objets.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Nom', 'Zone', 'Type', 'Statut', 'Consommation (kWh)'])
        for obj in ConnectedObject.objects.all():
            category = obj.category.nom if obj.category else 'N/A'
            writer.writerow([obj.unique_id, obj.nom, obj.zone, category, obj.statut, obj.consommation_kwh])
        return response


class ExportObjectsPDF(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def get(self, request):
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        p.setTitle('Rapport objets connectés — CivicSense')
        p.setFont('Helvetica-Bold', 16)
        p.drawString(50, height - 60, 'Objets connectés — CivicSense')
        p.setFont('Helvetica', 10)
        y = height - 100
        headers = ['Nom', 'Zone', 'Type', 'Statut', 'kWh']
        x_positions = [50, 180, 280, 380, 470]
        for i, h in enumerate(headers):
            p.drawString(x_positions[i], y, h)
        y -= 20
        for obj in ConnectedObject.objects.all():
            if y < 60:
                p.showPage()
                y = height - 60
            category = obj.category.nom if obj.category else 'N/A'
            row = [obj.nom, obj.zone, category, obj.statut, str(obj.consommation_kwh)]
            for i, cell in enumerate(row):
                p.drawString(x_positions[i], y, cell[:20])
            y -= 16
        p.save()
        buffer.seek(0)
        return HttpResponse(buffer, content_type='application/pdf',
                            headers={'Content-Disposition': 'attachment; filename="objets.pdf"'})
