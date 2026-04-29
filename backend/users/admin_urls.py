from django.urls import path
from .views import (
    AdminUserListView,
    AdminUserDetailView,
    AdminSetLevelView,
    AdminSetPointsView,
    AdminUserHistoryView,
    PendingUsersView,
    ApproveUserView,
    RejectUserView,
)

urlpatterns = [
    # Utilisateurs en attente d'approbation
    path('pending/', PendingUsersView.as_view(), name='admin-pending-users'),
    path('<int:pk>/approve/', ApproveUserView.as_view(), name='admin-approve-user'),
    path('<int:pk>/reject/', RejectUserView.as_view(), name='admin-reject-user'),
    # Gestion générale des utilisateurs
    path('', AdminUserListView.as_view(), name='admin-user-list'),
    path('<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('<int:pk>/set-level/', AdminSetLevelView.as_view(), name='admin-user-set-level'),
    path('<int:pk>/set-points/', AdminSetPointsView.as_view(), name='admin-user-set-points'),
    path('<int:pk>/history/', AdminUserHistoryView.as_view(), name='admin-user-history'),
]

