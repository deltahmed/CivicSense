from django.urls import path
from .views import DeletionRequestView

urlpatterns = [
    path('', DeletionRequestView.as_view(), name='deletion-request'),
]
