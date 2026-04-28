from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsExpert
from .utils import LEVEL_THRESHOLDS


class AdminChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not request.user.check_password(old_password):
            return Response({'success': False, 'message': 'Ancien mot de passe incorrect.'}, status=400)

        if len(new_password) < 8:
            return Response(
                {'success': False, 'message': 'Le nouveau mot de passe doit faire au moins 8 caractères.'},
                status=400,
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])

        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
            for token in OutstandingToken.objects.filter(user=request.user):
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass

        jwt_settings = settings.SIMPLE_JWT
        response = Response({'success': True, 'message': 'Mot de passe mis à jour. Veuillez vous reconnecter.'})
        response.delete_cookie(jwt_settings['AUTH_COOKIE'])
        response.delete_cookie(jwt_settings['AUTH_COOKIE_REFRESH'])
        return response


class AdminBackupView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def get(self, request):
        out = StringIO()
        call_command('dumpdata', indent=2, stdout=out)
        data = out.getvalue()
        response = HttpResponse(data, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="backup.json"'
        return response


class AdminIntegrityCheckView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def get(self, request):
        from objects.models import ConnectedObject
        from .models import CustomUser

        objects_sans_zone = list(
            ConnectedObject.objects.filter(zone='').values('id', 'nom', 'unique_id')
        )

        users_sans_level = list(
            CustomUser.objects.filter(is_verified=True, level='').values('id', 'pseudo', 'email', 'points')
        )

        users_incoherents = []
        for user in CustomUser.objects.filter(is_verified=True).exclude(level=''):
            expected = 'debutant'
            for level, threshold in LEVEL_THRESHOLDS:
                if user.points >= threshold:
                    expected = level
                    break
            if user.level != expected:
                users_incoherents.append({
                    'id': user.id,
                    'pseudo': user.pseudo,
                    'email': user.email,
                    'points': user.points,
                    'level_actuel': user.level,
                    'level_attendu': expected,
                })

        objects_sans_conso = list(
            ConnectedObject.objects.filter(historiqueconso__isnull=True).values('id', 'nom', 'unique_id')
        )

        return Response({
            'success': True,
            'data': {
                'objects_sans_zone': objects_sans_zone,
                'users_sans_level': users_sans_level,
                'users_incoherents': users_incoherents,
                'objects_sans_conso': objects_sans_conso,
            },
        })


class AdminIntegrityFixView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def post(self, request):
        from objects.models import ConnectedObject
        from .models import CustomUser

        fixes = []

        count = ConnectedObject.objects.filter(zone='').update(zone='Non assignée')
        if count:
            fixes.append(f'{count} objet(s) sans zone → zone définie à "Non assignée"')

        count = CustomUser.objects.filter(is_verified=True, level='').update(level='debutant')
        if count:
            fixes.append(f'{count} utilisateur(s) vérifié(s) sans niveau → "débutant" attribué')

        fixed_count = 0
        for user in CustomUser.objects.filter(is_verified=True).exclude(level=''):
            expected = 'debutant'
            for level, threshold in LEVEL_THRESHOLDS:
                if user.points >= threshold:
                    expected = level
                    break
            if user.level != expected:
                user.level = expected
                user.save(update_fields=['level'])
                fixed_count += 1
        if fixed_count:
            fixes.append(f'{fixed_count} utilisateur(s) avec niveau incohérent corrigé(s)')

        return Response({
            'success': True,
            'message': f'{len(fixes)} correction(s) appliquée(s).' if fixes else 'Aucune correction nécessaire.',
            'fixes': fixes,
        })
