from django.urls import path
from .views import (
    ObjectListView,
    ObjectDetailView,
    ObjectHistoryView,
    ObjectAlertsView,
    ObjectConfigView,
    PublicSearchObjectsView,
    AlertRuleListView,
    AlertRuleDetailView,
    AdminTriggeredAlertsView,
    ObjectZonesView,
)

urlpatterns = [
    path('', ObjectListView.as_view(), name='object-list'),
    path('zones/', ObjectZonesView.as_view(), name='object-zones'),
    path('search/', PublicSearchObjectsView.as_view(), name='public-search-objects'),
    path('alerts/', ObjectAlertsView.as_view(), name='object-alerts'),
    path('alert-rules/', AlertRuleListView.as_view(), name='alert-rule-list'),
    path('alert-rules/<int:pk>/', AlertRuleDetailView.as_view(), name='alert-rule-detail'),
    path('alert-rules/triggered/', AdminTriggeredAlertsView.as_view(), name='alert-triggered'),
    path('<int:pk>/', ObjectDetailView.as_view(), name='object-detail'),
    path('<int:pk>/history/', ObjectHistoryView.as_view(), name='object-history'),
    path('<int:pk>/config/', ObjectConfigView.as_view(), name='object-config'),
]
