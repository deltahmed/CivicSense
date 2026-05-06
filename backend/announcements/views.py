from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from django.conf import settings

from users.permissions import IsVerified, IsExpert, IsAvance
from users.models import CustomUser
from .models import Announcement, DeletionRequest
from .serializers import AnnouncementSerializer, DeletionRequestSerializer


@method_decorator(cache_page(60 * 5), name='get')
class AnnouncementListView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsExpert()]
        return []  # Lecture publique : les annonces sont des informations résidence

    def get(self, request):
        announcements = Announcement.objects.filter(visible=True)
        return Response({'success': True, 'data': AnnouncementSerializer(announcements, many=True).data})

    def post(self, request):
        serializer = AnnouncementSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save(auteur=request.user)
        return Response({'success': True, 'data': serializer.data}, status=201)


class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated, IsExpert]

    def patch(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Annonce introuvable.'}, status=404)
        serializer = AnnouncementSerializer(ann, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})

    def delete(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Annonce introuvable.'}, status=404)
        ann.delete()
        return Response({'success': True, 'message': 'Annonce supprimée.'})


class DeletionRequestDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAvance]

    def patch(self, request, pk):
        try:
            dr = DeletionRequest.objects.select_related('objet', 'demandeur').get(pk=pk)
        except DeletionRequest.DoesNotExist:
            return Response({'success': False, 'message': 'Demande introuvable.'}, status=404)

        if dr.statut != 'en_attente':
            return Response({'success': False, 'message': 'Cette demande a déjà été traitée.'}, status=400)

        action = request.data.get('action')
        if action not in ('approuver', 'refuser'):
            return Response({'success': False, 'message': 'Action invalide.'}, status=400)

        if action == 'approuver':
            nom = dr.objet.nom
            dr.objet.delete()
            return Response({'success': True, 'message': f'Objet « {nom} » supprimé.'})

        dr.statut = 'refusee'
        dr.save()
        return Response({'success': True, 'message': 'Demande refusée.', 'data': DeletionRequestSerializer(dr).data})


class DeletionRequestView(APIView):

    def get_permissions(self):
        return [IsAuthenticated(), IsAvance()]

    def get(self, request):
        if request.user.level == 'expert':
            # L'admin voit toutes les demandes en attente
            queryset = (
                DeletionRequest.objects
                .select_related('objet', 'demandeur')
                .filter(statut='en_attente')
                .order_by('-created_at')
            )
        else:
            # L'avancé voit uniquement ses propres demandes
            queryset = (
                DeletionRequest.objects
                .select_related('objet', 'demandeur')
                .filter(demandeur=request.user)
                .order_by('-created_at')
            )
        return Response({'success': True, 'data': DeletionRequestSerializer(queryset, many=True).data})

    def post(self, request):
        objet_id = request.data.get('objet')
        if objet_id and DeletionRequest.objects.filter(objet_id=objet_id, statut='en_attente').exists():
            return Response(
                {'success': False, 'message': 'Une demande de suppression est déjà en attente pour cet objet.'},
                status=409,
            )

        serializer = DeletionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        dr = serializer.save(demandeur=request.user)

        admin_emails = list(CustomUser.objects.filter(level='expert').values_list('email', flat=True))
        if admin_emails:
            try:
                send_mail(
                    subject='SmartResi — Nouvelle demande de suppression',
                    message=(
                        f'Bonjour,\n\n'
                        f'{request.user.pseudo} a soumis une demande de suppression '
                        f'pour l\'objet « {dr.objet.nom} ».\n\n'
                        f'Motif : {dr.motif}\n\n'
                        f'Connectez-vous à l\'interface admin pour traiter cette demande.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                )
            except Exception:
                pass

        return Response({'success': True, 'data': serializer.data}, status=201)
