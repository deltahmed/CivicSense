from django.urls import path
from .views import UsageReportView, ExportReportView

urlpatterns = [
    path('usage/', UsageReportView.as_view(), name='reports-usage'),
    path('export/', ExportReportView.as_view(), name='reports-export'),
]