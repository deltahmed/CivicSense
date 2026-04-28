from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings

from users.permissions import IsExpert
from .models import Category, ConnectedObject, DeletionRequest
from .serializers import CategorySerializer, DeletionRequestSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for experts to manage object categories.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, IsExpert]


class AdminObjectDeleteView(APIView):
    """
    API endpoint for direct object deletion by an expert.
    """
    permission_classes = [IsAuthenticated, IsExpert]

    def delete(self, request, pk):
        try:
            obj = ConnectedObject.objects.get(pk=pk)
            obj.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ConnectedObject.DoesNotExist:
            return Response({'success': False, 'message': 'Objet introuvable.'}, status=status.HTTP_404_NOT_FOUND)


class DeletionRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for experts to list and process deletion requests.
    """
    serializer_class = DeletionRequestSerializer
    permission_classes = [IsAuthenticated, IsExpert]

    def get_queryset(self):
        queryset = DeletionRequest.objects.select_related('objet', 'demandeur').all()
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['put'], url_path='approve')
    def approve_request(self, request, pk=None):
        dr = self.get_object()
        if dr.statut != 'en_attente':
            return Response({'message': 'Cette demande a déjà été traitée.'}, status=status.HTTP_400_BAD_REQUEST)

        if dr.objet:
            # The deletion will cascade to HistoriqueConso
            dr.objet.delete()

        dr.statut = 'approuvee'
        dr.save(update_fields=['statut'])

        if dr.demandeur and dr.demandeur.email:
            send_mail(
                subject="CivicSense - Demande de suppression approuvée",
                message=f"Bonjour {dr.demandeur.pseudo},\n\nVotre demande de suppression a été approuvée. L'objet a été définitivement retiré du système.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[dr.demandeur.email],
            )

        return Response({'success': True, 'message': 'Demande approuvée et objet supprimé.'})

    @action(detail=True, methods=['put'], url_path='reject')
    def reject_request(self, request, pk=None):
        dr = self.get_object()
        if dr.statut != 'en_attente':
            return Response({'message': 'Cette demande a déjà été traitée.'}, status=status.HTTP_400_BAD_REQUEST)

        motif_rejet = request.data.get('motif', 'Aucun motif fourni.')
        dr.statut = 'refusee'
        dr.save(update_fields=['statut'])

        if dr.demandeur and dr.demandeur.email:
            send_mail(
                subject="CivicSense - Demande de suppression refusée",
                message=f"Bonjour {dr.demandeur.pseudo},\n\nVotre demande de suppression a été refusée pour le motif suivant :\n\n{motif_rejet}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[dr.demandeur.email],
            )

        return Response({
            'success': True,
            'message': 'Demande refusée.',
            'motif': motif_rejet
        })