from django.contrib import admin
from .models import Announcement, DeletionRequest

admin.site.register(Announcement)
admin.site.register(DeletionRequest)
