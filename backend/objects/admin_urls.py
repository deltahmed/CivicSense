from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views

router = DefaultRouter()
router.register('categories', admin_views.CategoryViewSet, basename='category')
router.register('deletion-requests', admin_views.DeletionRequestViewSet, basename='deletion-request')

urlpatterns = [
    path('', include(router.urls)),
    path('objects/<int:pk>/', admin_views.AdminObjectDeleteView.as_view(), name='admin-object-delete'),
]