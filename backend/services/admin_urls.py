from django.urls import path
from . import admin_views

urlpatterns = [
    path('settings/', admin_views.GlobalSettingsView.as_view(), name='global-settings'),
]