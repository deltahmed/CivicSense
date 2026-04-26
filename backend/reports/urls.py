from django.urls import path
from .views import ExportObjectsCSV, ExportObjectsPDF

urlpatterns = [
    path('objects/csv/', ExportObjectsCSV.as_view(), name='export-objects-csv'),
    path('objects/pdf/', ExportObjectsPDF.as_view(), name='export-objects-pdf'),
]
