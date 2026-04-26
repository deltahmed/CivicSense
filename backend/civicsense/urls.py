from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/objects/', include('objects.urls')),
    path('api/incidents/', include('incidents.urls')),
    path('api/announcements/', include('announcements.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/services/', include('services.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
