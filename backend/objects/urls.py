from django.urls import path
from .views import (
    ObjectListView, ObjectDetailView, ObjectHistoryView,
    DeletionRequestView, DeletionRequestActionView, ObjectConfigView,
)

urlpatterns = [
    path('', ObjectListView.as_view(), name='object-list'),
    path('<int:pk>/', ObjectDetailView.as_view(), name='object-detail'),
    path('<int:pk>/history/', ObjectHistoryView.as_view(), name='object-history'),
    path('<int:pk>/config/', ObjectConfigView.as_view(), name='object-config'),
    path('deletion-requests/', DeletionRequestView.as_view(), name='deletion-request-create'),
    path('deletion-requests/<int:pk>/', DeletionRequestActionView.as_view(), name='deletion-request-action'),
]
