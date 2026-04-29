from django.urls import path
from .views import (
    GetPublicUserView,
    ListPublicUsersView,
)

urlpatterns = [
    path('', ListPublicUsersView.as_view(), name='list-public-users'),
    path('<int:pk>/', GetPublicUserView.as_view(), name='public-user-detail'),
]



