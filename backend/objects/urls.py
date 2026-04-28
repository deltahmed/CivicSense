from django.urls import path
from .views import ObjectListView, ObjectDetailView, ObjectHistoryView

urlpatterns = [
    path('', ObjectListView.as_view(), name='object-list'),
    path('<int:pk>/', ObjectDetailView.as_view(), name='object-detail'),
    path('<int:pk>/history/', ObjectHistoryView.as_view(), name='object-history'),
]
