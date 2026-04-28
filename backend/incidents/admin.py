from django.contrib import admin
from .models import Incident, HistoriqueStatutIncident

admin.site.register(Incident)
admin.site.register(HistoriqueStatutIncident)
