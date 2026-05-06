from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.auth_urls')),
    path('api/users/', include('users.urls')),
    path('api/admin/users/', include('users.admin_urls')),
    path('api/admin/', include('objects.admin_urls')),
    path('api/admin/', include('services.admin_urls')),
    path('api/admin/', include('users.maintenance_urls')),
    path('api/admin/', include('reports.admin_urls')),
    path('api/deletion-requests/', include('announcements.deletion_urls')),
    path('api/objects/', include('objects.urls')),
    path('api/incidents/', include('incidents.urls')),
    path('api/announcements/', include('announcements.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/services/', include('services.urls')),
    path('api/public/', include('services.public_urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
