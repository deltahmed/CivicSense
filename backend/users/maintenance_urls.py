from django.urls import path
from . import maintenance_views

urlpatterns = [
    path('change-password/', maintenance_views.AdminChangePasswordView.as_view(), name='admin-change-password'),
    path('backup/', maintenance_views.AdminBackupView.as_view(), name='admin-backup'),
    path('integrity-check/', maintenance_views.AdminIntegrityCheckView.as_view(), name='admin-integrity-check'),
    path('integrity-fix/', maintenance_views.AdminIntegrityFixView.as_view(), name='admin-integrity-fix'),
]
