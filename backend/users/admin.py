from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'pseudo', 'level', 'points', 'is_verified', 'is_staff')
    list_filter = ('level', 'is_verified', 'type_membre')
    fieldsets = UserAdmin.fieldsets + (
        ('Profil', {'fields': ('pseudo', 'age', 'genre', 'date_naissance', 'type_membre', 'photo')}),
        ('Gamification', {'fields': ('points', 'level', 'login_count', 'action_count')}),
        ('Vérification', {'fields': ('is_verified', 'verification_token')}),
    )
