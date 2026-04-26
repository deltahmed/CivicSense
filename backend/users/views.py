from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser
from .serializers import RegisterSerializer, UserProfileSerializer
from .utils import add_points


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
        serializer.save()
        return Response({'success': True, 'message': 'Inscription réussie. Vérifiez votre email.'}, status=201)


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

        user.login_count += 1
        user.save(update_fields=['login_count'])
        add_points(user, 0.25)

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
        user.save(update_fields=['is_verified'])
        return Response({'success': True, 'message': 'Email vérifié.'})
