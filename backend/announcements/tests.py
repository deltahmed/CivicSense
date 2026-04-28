from django.core.cache import cache
from rest_framework.test import APITestCase
from users.models import CustomUser
from objects.models import ConnectedObject
from .models import Announcement, DeletionRequest


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


def make_announcement(auteur, titre='Info', contenu='Contenu', visible=True):
    return Announcement.objects.create(
        auteur=auteur, titre=titre, contenu=contenu, visible=visible
    )


def make_object(unique_id='OBJ-001', nom='Lampadaire', zone='Rue A', **kwargs):
    return ConnectedObject.objects.create(unique_id=unique_id, nom=nom, zone=zone, **kwargs)


# ---------------------------------------------------------------------------
# GET + POST /api/announcements/
# ---------------------------------------------------------------------------

class AnnouncementListViewTest(APITestCase):
    URL = '/api/announcements/'

    @classmethod
    def setUpTestData(cls):
        # Nettoyer les données du seed global
        Announcement.objects.all().delete()
        
        cls.verified = make_user(verified=True)
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.unverified = make_user(
            email='nv@example.com', username='nv', pseudo='NV',
        )

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    # GET

    def test_get_verified_returns_200(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_get_returns_only_visible(self):
        make_announcement(self.expert, titre='Visible')
        make_announcement(self.expert, titre='Caché', visible=False)
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(len(r.data['data']), 1)
        self.assertEqual(r.data['data'][0]['titre'], 'Visible')

    def test_get_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    def test_get_unverified_returns_403(self):
        self.client.force_authenticate(self.unverified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    # POST

    def test_post_expert_creates_announcement(self):
        self.client.force_authenticate(self.expert)
        r = self.client.post(self.URL, {'titre': 'Nouveau', 'contenu': 'Texte'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['success'])
        self.assertTrue(Announcement.objects.filter(titre='Nouveau').exists())

    def test_post_sets_auteur_from_request(self):
        self.client.force_authenticate(self.expert)
        self.client.post(self.URL, {'titre': 'Test', 'contenu': 'Texte'})
        ann = Announcement.objects.get(titre='Test')
        self.assertEqual(ann.auteur, self.expert)

    def test_post_verified_not_expert_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'titre': 'Interdit', 'contenu': 'X'})
        self.assertEqual(r.status_code, 403)

    def test_post_missing_titre_returns_400(self):
        self.client.force_authenticate(self.expert)
        r = self.client.post(self.URL, {'contenu': 'Sans titre'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_post_missing_contenu_returns_400(self):
        self.client.force_authenticate(self.expert)
        r = self.client.post(self.URL, {'titre': 'Sans contenu'})
        self.assertEqual(r.status_code, 400)

    def test_post_unauthenticated_returns_401(self):
        r = self.client.post(self.URL, {'titre': 'X', 'contenu': 'Y'})
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# PATCH + DELETE /api/announcements/<pk>/
# ---------------------------------------------------------------------------

class AnnouncementDetailViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.verified = make_user(verified=True)
        cls.ann = make_announcement(cls.expert)

    def url(self, pk=None):
        return f'/api/announcements/{pk or self.ann.pk}/'

    # PATCH

    def test_patch_expert_updates_titre(self):
        self.client.force_authenticate(self.expert)
        r = self.client.patch(self.url(), {'titre': 'Nouveau titre'})
        self.assertEqual(r.status_code, 200)
        self.ann.refresh_from_db()
        self.assertEqual(self.ann.titre, 'Nouveau titre')

    def test_patch_can_hide_announcement(self):
        self.client.force_authenticate(self.expert)
        self.client.patch(self.url(), {'visible': False})
        self.ann.refresh_from_db()
        self.assertFalse(self.ann.visible)

    def test_patch_verified_not_expert_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.patch(self.url(), {'titre': 'Hack'})
        self.assertEqual(r.status_code, 403)

    def test_patch_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.patch('/api/announcements/9999/', {'titre': 'X'})
        self.assertEqual(r.status_code, 404)
        self.assertFalse(r.data['success'])

    def test_patch_unauthenticated_returns_401(self):
        r = self.client.patch(self.url(), {'titre': 'X'})
        self.assertEqual(r.status_code, 401)

    # DELETE

    def test_delete_expert_removes_announcement(self):
        self.client.force_authenticate(self.expert)
        r = self.client.delete(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Announcement.objects.filter(pk=self.ann.pk).exists())

    def test_delete_verified_not_expert_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.delete(self.url())
        self.assertEqual(r.status_code, 403)

    def test_delete_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.delete('/api/announcements/9999/')
        self.assertEqual(r.status_code, 404)

    def test_delete_unauthenticated_returns_401(self):
        r = self.client.delete(self.url())
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# POST /api/announcements/deletion-requests/
# ---------------------------------------------------------------------------

class DeletionRequestViewTest(APITestCase):
    URL = '/api/announcements/deletion-requests/'

    @classmethod
    def setUpTestData(cls):
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.verified = make_user(verified=True)
        cls.obj = make_object()

    def test_avance_creates_request(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'objet': self.obj.pk, 'motif': 'Obsolète'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['success'])
        self.assertTrue(DeletionRequest.objects.filter(demandeur=self.avance).exists())

    def test_statut_defaults_to_en_attente(self):
        self.client.force_authenticate(self.avance)
        self.client.post(self.URL, {'objet': self.obj.pk, 'motif': 'Obsolète'})
        dr = DeletionRequest.objects.get(demandeur=self.avance)
        self.assertEqual(dr.statut, 'en_attente')

    def test_response_contains_objet_nom(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'objet': self.obj.pk, 'motif': 'X'})
        self.assertEqual(r.data['data']['objet_nom'], self.obj.nom)

    def test_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'objet': self.obj.pk, 'motif': 'X'})
        self.assertEqual(r.status_code, 403)

    def test_missing_motif_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'objet': self.obj.pk})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_invalid_objet_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'objet': 9999, 'motif': 'X'})
        self.assertEqual(r.status_code, 400)

    def test_unauthenticated_returns_401(self):
        r = self.client.post(self.URL, {'objet': self.obj.pk, 'motif': 'X'})
        self.assertEqual(r.status_code, 401)
