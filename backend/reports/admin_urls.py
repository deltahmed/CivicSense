from django.urls import path
from .views import AdminStatsView, AdminStatsExportView

urlpatterns = [
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('stats/export/', AdminStatsExportView.as_view(), name='admin-stats-export'),
]
