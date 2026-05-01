from unittest.mock import patch
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


# ---------------------------------------------------------------------------
# Nouvelles règles : doublon, email, GET admin (/api/deletion-requests/)
# ---------------------------------------------------------------------------

class DeletionRequestEnhancedTest(APITestCase):
    URL = '/api/deletion-requests/'

    @classmethod
    def setUpTestData(cls):
        cls.avance = make_user(
            email='av2@example.com', username='avance2', pseudo='Avance2',
            verified=True, level='avance',
        )
        cls.avance2 = make_user(
            email='av3@example.com', username='avance3', pseudo='Avance3',
            verified=True, level='avance',
        )
        cls.expert = make_user(
            email='ex2@example.com', username='expert2', pseudo='Expert2',
            verified=True, level='expert',
        )
        cls.verified = make_user(
            email='vf2@example.com', username='verified2', pseudo='Verified2',
            verified=True,
        )
        cls.obj_a = make_object(unique_id='ENH-001')
        cls.obj_b = make_object(unique_id='ENH-002')
        cls.obj_c = make_object(unique_id='ENH-003')

    # ── Doublon ─────────────────────────────────────────────────────────────

    def test_duplicate_en_attente_returns_409(self):
        self.client.force_authenticate(self.avance)
        self.client.post(self.URL, {'objet': self.obj_a.pk, 'motif': 'Première demande'})
        r = self.client.post(self.URL, {'objet': self.obj_a.pk, 'motif': 'Deuxième tentative'})
        self.assertEqual(r.status_code, 409)
        self.assertFalse(r.data['success'])

    def test_duplicate_check_global_not_per_user(self):
        # Un autre utilisateur avancé ne peut pas non plus soumettre pour le même objet en_attente
        self.client.force_authenticate(self.avance)
        self.client.post(self.URL, {'objet': self.obj_b.pk, 'motif': 'Premier'})
        self.client.force_authenticate(self.avance2)
        r = self.client.post(self.URL, {'objet': self.obj_b.pk, 'motif': 'Doublon autre user'})
        self.assertEqual(r.status_code, 409)

    def test_different_objets_both_allowed(self):
        self.client.force_authenticate(self.avance)
        r1 = self.client.post(self.URL, {'objet': self.obj_a.pk, 'motif': 'Motif A'})
        r2 = self.client.post(self.URL, {'objet': self.obj_b.pk, 'motif': 'Motif B'})
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)

    # ── Email ────────────────────────────────────────────────────────────────

    @patch('announcements.views.send_mail')
    def test_post_sends_email_to_expert_admins(self, mock_send):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'objet': self.obj_c.pk, 'motif': 'Email test'})
        self.assertEqual(r.status_code, 201)
        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args[1]
        self.assertIn(self.expert.email, call_kwargs['recipient_list'])

    @patch('announcements.views.send_mail', side_effect=Exception('SMTP down'))
    def test_email_failure_does_not_block_creation(self, mock_send):
        obj_d = make_object(unique_id='ENH-004')
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'objet': obj_d.pk, 'motif': 'Motif malgré email KO'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(DeletionRequest.objects.filter(objet=obj_d).exists())

    # ── GET admin ────────────────────────────────────────────────────────────

    def test_get_expert_returns_pending_only(self):
        DeletionRequest.objects.create(demandeur=self.avance, objet=self.obj_a, motif='Test', statut='en_attente')
        DeletionRequest.objects.create(demandeur=self.avance, objet=self.obj_b, motif='Déjà traitée', statut='approuvee')
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        for entry in r.data['data']:
            self.assertEqual(entry['statut'], 'en_attente')

    def test_get_includes_objet_nom_and_demandeur_pseudo(self):
        DeletionRequest.objects.create(demandeur=self.avance, objet=self.obj_a, motif='Champs', statut='en_attente')
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        entry = r.data['data'][0]
        self.assertIn('objet_nom', entry)
        self.assertIn('demandeur_pseudo', entry)

    def test_get_avance_returns_200(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)

    def test_get_verified_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    def test_get_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    # ── Permissions POST ─────────────────────────────────────────────────────

    def test_post_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'objet': self.obj_a.pk, 'motif': 'Non autorisé'})
        self.assertEqual(r.status_code, 403)

    def test_post_unauthenticated_returns_401(self):
        r = self.client.post(self.URL, {'objet': self.obj_a.pk, 'motif': 'Non auth'})
        self.assertEqual(r.status_code, 401)
