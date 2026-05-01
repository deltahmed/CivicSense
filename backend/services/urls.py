from django.urls import path

from .views import ServiceListView, ServiceDetailView
from .service_views import (
    AccesPortesView, AccesToggleView, AccesHistoriqueView,
    ConsoEnergieView,
    ConsoEauView,
    DechetCalendrierView, BacsView,
)

urlpatterns = [
    path('', ServiceListView.as_view(), name='service-list'),
    path('<int:pk>/', ServiceDetailView.as_view(), name='service-detail'),

    # Gestion d'accès
    path('acces/portes/', AccesPortesView.as_view(), name='acces-portes'),
    path('acces/toggle/<int:pk>/', AccesToggleView.as_view(), name='acces-toggle'),
    path('acces/historique/', AccesHistoriqueView.as_view(), name='acces-historique'),

    # Consommation d'énergie
    path('energie/conso/', ConsoEnergieView.as_view(), name='energie-conso'),

    # Consommation d'eau
    path('eau/conso/', ConsoEauView.as_view(), name='eau-conso'),

    # Gestion des déchets
    path('dechets/calendrier/', DechetCalendrierView.as_view(), name='dechets-calendrier'),
    path('dechets/bacs/', BacsView.as_view(), name='dechets-bacs'),
]
