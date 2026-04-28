from django.urls import path
from .views import ObjectListView, ObjectDetailView, ObjectHistoryView, ObjectAlertsView

urlpatterns = [
    path('', ObjectListView.as_view(), name='object-list'),
    path('alerts/', ObjectAlertsView.as_view(), name='object-alerts'),
    path('<int:pk>/', ObjectDetailView.as_view(), name='object-detail'),
    path('<int:pk>/history/', ObjectHistoryView.as_view(), name='object-history'),
]
