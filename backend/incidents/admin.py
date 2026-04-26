from django.contrib import admin
from .models import Incident, HistoriqueStatut

admin.site.register(Incident)
admin.site.register(HistoriqueStatut)
