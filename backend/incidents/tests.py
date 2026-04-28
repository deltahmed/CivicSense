from rest_framework.test import APITestCase
from users.models import CustomUser
from .models import Incident, HistoriqueStatutIncident


def make_user(email='u@example.com', username='user1', pseudo='Pseudo1',
              password='Pass1234', verified=False, level='debutant', **kwargs):
    user = CustomUser.objects.create_user(
        email=email, username=username, pseudo=pseudo, password=password,
        level=level, **kwargs,
    )
    if verified:
        user.is_verified = True
        user.save(update_fields=['is_verified'])
    return user


def make_incident(auteur, type_incident='panne', description='Desc', **kwargs):
    return Incident.objects.create(
        auteur=auteur, type_incident=type_incident, description=description, **kwargs
    )


# ---------------------------------------------------------------------------
# GET + POST /api/incidents/
# ---------------------------------------------------------------------------

class IncidentListViewTest(APITestCase):
    URL = '/api/incidents/'

    @classmethod
    def setUpTestData(cls):
        # Nettoyer les données du seed global
        Incident.objects.all().delete()
        
        cls.verified = make_user(verified=True)
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.unverified = make_user(
            email='nv@example.com', username='nv', pseudo='NV',
        )

    # GET

    def test_get_verified_returns_200(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_get_returns_all_incidents(self):
        make_incident(self.verified)
        make_incident(self.verified, type_incident='fuite')
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(len(r.data['data']), 2)

    def test_get_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    def test_get_unverified_returns_403(self):
        self.client.force_authenticate(self.unverified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    # POST

    def test_post_verified_creates_incident(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'type_incident': 'panne', 'description': 'Lampe éteinte'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['success'])
        self.assertTrue(Incident.objects.filter(auteur=self.verified).exists())

    def test_post_sets_auteur_from_request(self):
        self.client.force_authenticate(self.verified)
        self.client.post(self.URL, {'type_incident': 'panne', 'description': 'X'})
        incident = Incident.objects.get(auteur=self.verified)
        self.assertEqual(incident.auteur, self.verified)

    def test_post_default_statut_signale(self):
        self.client.force_authenticate(self.verified)
        self.client.post(self.URL, {'type_incident': 'panne', 'description': 'X'})
        incident = Incident.objects.get(auteur=self.verified)
        self.assertEqual(incident.statut, 'signale')

    def test_post_type_fuite_accepted(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'type_incident': 'fuite', 'description': 'Fuite eau'})
        self.assertEqual(r.status_code, 201)

    def test_post_invalid_type_returns_400(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'type_incident': 'inconnu', 'description': 'X'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_post_missing_description_returns_400(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'type_incident': 'panne'})
        self.assertEqual(r.status_code, 400)

    def test_post_unverified_returns_403(self):
        self.client.force_authenticate(self.unverified)
        r = self.client.post(self.URL, {'type_incident': 'panne', 'description': 'X'})
        self.assertEqual(r.status_code, 403)

    def test_post_unauthenticated_returns_401(self):
        r = self.client.post(self.URL, {'type_incident': 'panne', 'description': 'X'})
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# PATCH /api/incidents/<pk>/
# ---------------------------------------------------------------------------

class IncidentDetailViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.verified = make_user(verified=True)
        cls.incident = make_incident(cls.verified)

    def url(self, pk=None):
        return f'/api/incidents/{pk or self.incident.pk}/'

    def test_patch_avance_updates_statut(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.url(), {'statut': 'en_cours'})
        self.assertEqual(r.status_code, 200)
        self.incident.refresh_from_db()
        self.assertEqual(self.incident.statut, 'en_cours')

    def test_patch_creates_historique_entry(self):
        self.client.force_authenticate(self.avance)
        self.client.patch(self.url(), {'statut': 'resolu'})
        histo = HistoriqueStatutIncident.objects.filter(incident=self.incident).first()
        self.assertIsNotNone(histo)
        self.assertEqual(histo.statut, 'resolu')

    def test_patch_with_commentaire_saves_it(self):
        self.client.force_authenticate(self.avance)
        self.client.patch(self.url(), {'statut': 'pris_en_charge', 'commentaire': 'Pris en compte'})
        histo = HistoriqueStatutIncident.objects.filter(incident=self.incident).first()
        self.assertEqual(histo.commentaire, 'Pris en compte')

    def test_patch_without_commentaire_stores_empty(self):
        self.client.force_authenticate(self.avance)
        self.client.patch(self.url(), {'statut': 'en_cours'})
        histo = HistoriqueStatutIncident.objects.filter(incident=self.incident).first()
        self.assertEqual(histo.commentaire, '')

    def test_patch_invalid_statut_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.url(), {'statut': 'inconnu'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_patch_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch('/api/incidents/9999/', {'statut': 'resolu'})
        self.assertEqual(r.status_code, 404)
        self.assertFalse(r.data['success'])

    def test_patch_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.patch(self.url(), {'statut': 'resolu'})
        self.assertEqual(r.status_code, 403)

    def test_patch_unauthenticated_returns_401(self):
        r = self.client.patch(self.url(), {'statut': 'resolu'})
        self.assertEqual(r.status_code, 401)

    def test_multiple_patches_create_multiple_historique_entries(self):
        self.client.force_authenticate(self.avance)
        self.client.patch(self.url(), {'statut': 'pris_en_charge'})
        self.client.patch(self.url(), {'statut': 'resolu'})
        count = HistoriqueStatutIncident.objects.filter(incident=self.incident).count()
        self.assertEqual(count, 2)
