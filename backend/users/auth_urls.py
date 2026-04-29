from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, MeView, VerifyEmailView,
    ChangePasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('verify/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    # Routes /me/ — les plus spécifiques d'abord
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/', MeView.as_view(), name='me'),
]
