from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeView, VerifyEmailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('verify/<uuid:token>/', VerifyEmailView.as_view(), name='verify-email'),
]
