from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register('services', admin_views.ServiceAdminViewSet, basename='admin-service')

urlpatterns = [
    path('', include(router.urls)),
    path('settings/', admin_views.GlobalSettingsView.as_view(), name='global-settings'),
]
