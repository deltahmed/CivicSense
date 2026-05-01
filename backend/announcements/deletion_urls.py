from django.urls import path
from .views import DeletionRequestView, DeletionRequestDetailView

urlpatterns = [
    path('', DeletionRequestView.as_view(), name='deletion-request'),
    path('<int:pk>/', DeletionRequestDetailView.as_view(), name='deletion-request-detail'),
]
