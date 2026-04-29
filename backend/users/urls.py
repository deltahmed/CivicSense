from django.urls import path
from .views import (
    GetPublicUserView,
)

urlpatterns = [
    path('<int:pk>/', GetPublicUserView.as_view(), name='public-user-detail'),
]


