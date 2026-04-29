# Utilitaires de filtrage pour la recherche d'équipements

from django.db.models import Q
from .models import ConnectedObject


def filter_objects_by_criteria(
    type_objet=None,
    statut=None,
    zone=None,
    search_query=None
):
    """
    Filtre les objets connectés selon les critères fournis
    
    Args:
        type_objet (str): Type d'objet à filtrer ('thermostat', 'camera', etc.)
        statut (str): Statut de l'objet ('actif', 'inactif', 'maintenance')
        zone (str): Zone/location de l'objet
        search_query (str): Terme de recherche dans nom/description
        
    Returns:
        QuerySet: Objets filtrés
    """
    queryset = ConnectedObject.objects.all()
    
    if type_objet:
        queryset = queryset.filter(type_objet=type_objet)
    
    if statut:
        queryset = queryset.filter(statut=statut)
    
    if zone:
        queryset = queryset.filter(zone=zone)
    
    if search_query:
        queryset = queryset.filter(
            Q(nom__icontains=search_query) | 
            Q(description__icontains=search_query)
        )
    
    return queryset


def get_available_zones():
    """Récupère toutes les zones uniques des objets connectés"""
    return ConnectedObject.objects.values_list(
        'zone', flat=True
    ).distinct().order_by('zone')


def get_available_types():
    """Récupère tous les types d'objets disponibles"""
    return set(
        ConnectedObject.objects.values_list(
            'type_objet', flat=True
        ).distinct()
    )


def get_available_statuts():
    """Récupère tous les statuts disponibles"""
    return set(
        ConnectedObject.objects.values_list(
            'statut', flat=True
        ).distinct()
    )
