from django.urls import path
from .public_views import PublicSettingsView, PublicStatsView

urlpatterns = [
    path('settings/', PublicSettingsView.as_view(), name='public-settings'),
    path('stats/',    PublicStatsView.as_view(),    name='public-stats'),
]
