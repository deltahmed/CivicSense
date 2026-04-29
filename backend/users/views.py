from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, LoginHistory
from .permissions import IsExpert
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    AdminSetLevelSerializer,
    AdminSetPointsSerializer,
    AdminRejectUserSerializer,
    PendingUserSerializer,
)
from django.urls import reverse
from utils.email_utils import send_verification_email, send_approval_email, send_rejection_email
from .utils import add_points, check_level_up
from services.models import GlobalSettings


def _set_auth_cookies(response, refresh):
    jwt_settings = settings.SIMPLE_JWT
    access = str(refresh.access_token)
    response.set_cookie(
        key=jwt_settings['AUTH_COOKIE'],
        value=access,
        httponly=jwt_settings['AUTH_COOKIE_HTTP_ONLY'],
        samesite=jwt_settings['AUTH_COOKIE_SAMESITE'],
        secure=jwt_settings['AUTH_COOKIE_SECURE'],
        max_age=int(jwt_settings['ACCESS_TOKEN_LIFETIME'].total_seconds()),
    )
    response.set_cookie(
        key=jwt_settings['AUTH_COOKIE_REFRESH'],
        value=str(refresh),
        httponly=jwt_settings['AUTH_COOKIE_HTTP_ONLY'],
        samesite=jwt_settings['AUTH_COOKIE_SAMESITE'],
        secure=jwt_settings['AUTH_COOKIE_SECURE'],
        max_age=int(jwt_settings['REFRESH_TOKEN_LIFETIME'].total_seconds()),
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        user = serializer.save()
        
        # Vérifier si le domaine email est autorisé pour approbation automatique
        settings_obj = GlobalSettings.load()
        email_allowed = self._check_email_domain(user.email, settings_obj)
        
        if email_allowed:
            user.is_verified = True
            user.save(update_fields=['is_verified'])
            send_approval_email(user.email, user.pseudo)
            return Response({
                'success': True,
                'message': 'Inscription approuvée automatiquement.'
            }, status=201)
        
        # Sinon, attendre approbation manuelle
        try:
            verify_path = reverse('verify-email', args=[user.verification_token])
            verification_url = request.build_absolute_uri(verify_path)
        except Exception:
            verification_url = None
        send_verification_email(user.email, user.verification_token, verification_url)
        return Response({
            'success': True,
            'message': 'Inscription réussie. En attente d\'approbation.'
        }, status=201)
    
    @staticmethod
    def _check_email_domain(email, settings_obj):
        """Vérifie si le domaine email est dans la liste autorisée"""
        # Si liste vide, tous les domaines sont autorisés
        if not settings_obj.domaines_email_autorises:
            return False
        
        # Extraire le domaine de l'email
        email_domain = email[email.index('@'):].lower()
        
        # Vérifier si le domaine est dans la liste
        for allowed_domain in settings_obj.domaines_email_autorises:
            if allowed_domain.lower() in email_domain:
                return True
        
        return False



class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({'success': False, 'message': 'Identifiants invalides.'}, status=401)
        if not user.is_verified:
            return Response({'success': False, 'message': 'Compte non vérifié.'}, status=403)

        user.last_login = timezone.now()
        user.login_count += 1
        user.save(update_fields=['last_login', 'login_count'])
        add_points(user, 0.25)
        LoginHistory.objects.create(user=user)

        refresh = RefreshToken.for_user(user)
        response = Response({'success': True, 'data': UserProfileSerializer(user).data})
        _set_auth_cookies(response, refresh)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        jwt_settings = settings.SIMPLE_JWT
        response = Response({'success': True, 'message': 'Déconnexion réussie.'})
        response.delete_cookie(jwt_settings['AUTH_COOKIE'])
        response.delete_cookie(jwt_settings['AUTH_COOKIE_REFRESH'])
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'success': True, 'data': UserProfileSerializer(request.user).data})

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            user = CustomUser.objects.get(verification_token=token)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Token invalide.'}, status=404)
        user.is_verified = True
        user.verification_token = ''
        user.save(update_fields=['is_verified', 'verification_token'])
        return Response({'success': True, 'message': 'Email vérifié.'})


# ── Admin views ────────────────────────────────────────────────────────────────

class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def get(self, request):
        users = CustomUser.objects.all().order_by('date_joined')
        return Response({'success': True, 'data': AdminUserSerializer(users, many=True).data})


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def _get_user(self, pk):
        try:
            return CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)
        return Response({'success': True, 'data': AdminUserSerializer(user).data})

    def put(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)
        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': AdminUserSerializer(user).data})

    def delete(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)
        if user.pk == request.user.pk:
            return Response(
                {'success': False, 'message': 'Impossible de supprimer votre propre compte.'},
                status=400,
            )
        user.delete()
        return Response({'success': True, 'message': 'Utilisateur supprimé définitivement.'})


class AdminSetLevelView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def put(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)
        serializer = AdminSetLevelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        user.level = serializer.validated_data['level']
        user.save(update_fields=['level'])
        return Response({'success': True, 'data': AdminUserSerializer(user).data})


class AdminSetPointsView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def put(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)
        serializer = AdminSetPointsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        user.points = serializer.validated_data['points']
        check_level_up(user)
        user.save(update_fields=['points', 'level'])
        return Response({'success': True, 'data': AdminUserSerializer(user).data})


class AdminUserHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def get(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)
        connexions = list(user.login_history.values_list('logged_at', flat=True)[:50])
        return Response({
            'success': True,
            'data': {
                'login_count': user.login_count,
                'action_count': user.action_count,
                'last_login': user.last_login,
                'connexions': connexions,
            },
        })


# ── Approbation utilisateurs ──────────────────────────────────────────────────

class PendingUsersView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def get(self, request):
        """Retourne tous les utilisateurs en attente de vérification"""
        pending_users = CustomUser.objects.filter(is_verified=False).order_by('date_joined')
        return Response({
            'success': True,
            'data': PendingUserSerializer(pending_users, many=True).data
        })


class ApproveUserView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def put(self, request, pk):
        """Approuve un utilisateur en attente"""
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)

        if user.is_verified:
            return Response({
                'success': False,
                'message': 'Cet utilisateur est déjà vérifié.'
            }, status=400)

        user.is_verified = True
        user.save(update_fields=['is_verified'])
        send_approval_email(user.email, user.pseudo)

        return Response({
            'success': True,
            'message': 'Utilisateur approuvé.',
            'data': AdminUserSerializer(user).data
        })


class RejectUserView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def put(self, request, pk):
        """Refuse un utilisateur en attente"""
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Utilisateur introuvable.'}, status=404)

        if user.is_verified:
            return Response({
                'success': False,
                'message': 'Impossible de refuser un utilisateur déjà vérifié.'
            }, status=400)

        serializer = AdminRejectUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)

        motif = serializer.validated_data['motif']
        send_rejection_email(user.email, user.pseudo, motif)
        user.delete()

        return Response({
            'success': True,
            'message': 'Utilisateur refusé et compte supprimé.'
        })
