from django.urls import path
from .views import AnnouncementListView, AnnouncementDetailView, DeletionRequestView

urlpatterns = [
    path('', AnnouncementListView.as_view(), name='announcement-list'),
    path('<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),
    path('deletion-requests/', DeletionRequestView.as_view(), name='deletion-request-create'),
]
