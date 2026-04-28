from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, MeView, VerifyEmailView,
    AdminUserListView, AdminUserDetailView,
    AdminSetLevelView, AdminSetPointsView, AdminUserHistoryView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('verify/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    # Admin
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/level/', AdminSetLevelView.as_view(), name='admin-set-level'),
    path('admin/users/<int:pk>/points/', AdminSetPointsView.as_view(), name='admin-set-points'),
    path('admin/users/<int:pk>/history/', AdminUserHistoryView.as_view(), name='admin-user-history'),
]
