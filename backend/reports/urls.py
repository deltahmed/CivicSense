from django.urls import path
from .views import UsageReportView

urlpatterns = [
    path('usage/', UsageReportView.as_view(), name='reports-usage'),
]