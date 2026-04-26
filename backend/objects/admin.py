from django.contrib import admin
from .models import ConnectedObject, HistoriqueConso, DeletionRequest

admin.site.register(ConnectedObject)
admin.site.register(HistoriqueConso)
admin.site.register(DeletionRequest)
