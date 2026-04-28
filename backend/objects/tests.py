import datetime
from rest_framework.test import APITestCase
from users.models import CustomUser
from .models import ConnectedObject, Category, HistoriqueConso


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


def make_object(unique_id='OBJ-001', nom='Lampadaire', zone='Rue A', **kwargs):
    return ConnectedObject.objects.create(unique_id=unique_id, nom=nom, zone=zone, **kwargs)


# ---------------------------------------------------------------------------
# GET + POST /api/objects/
# ---------------------------------------------------------------------------

class ObjectListViewTest(APITestCase):
    URL = '/api/objects/'

    @classmethod
    def setUpTestData(cls):
        cls.verified = make_user(verified=True)
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.unverified = make_user(
            email='nv@example.com', username='nvuser', pseudo='NvUser',
        )

    # GET

    def test_get_verified_returns_200(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_get_returns_list(self):
        make_object()
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(len(r.data['data']), 1)

    def test_get_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    def test_get_unverified_returns_403(self):
        self.client.force_authenticate(self.unverified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    # POST

    def test_post_avance_creates_object(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {
            'unique_id': 'OBJ-002', 'nom': 'Capteur', 'zone': 'Hall',
        })
        self.assertEqual(r.status_code, 201)
        self.assertTrue(ConnectedObject.objects.filter(unique_id='OBJ-002').exists())

    def test_post_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {
            'unique_id': 'OBJ-003', 'nom': 'Capteur', 'zone': 'Hall',
        })
        self.assertEqual(r.status_code, 403)

    def test_post_duplicate_unique_id_returns_400(self):
        make_object(unique_id='OBJ-001')
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {
            'unique_id': 'OBJ-001', 'nom': 'Autre', 'zone': 'Hall',
        })
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_post_missing_required_field_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'nom': 'Capteur'})
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# GET + PATCH /api/objects/<pk>/
# ---------------------------------------------------------------------------

class ObjectDetailViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.verified = make_user(verified=True)
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.obj = make_object()

    def url(self, pk=None):
        return f'/api/objects/{pk or self.obj.pk}/'

    # GET

    def test_get_verified_returns_200(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_get_adds_points(self):
        self.client.force_authenticate(self.verified)
        self.client.get(self.url())
        self.verified.refresh_from_db()
        self.assertAlmostEqual(self.verified.points, 0.50)

    def test_get_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get('/api/objects/9999/')
        self.assertEqual(r.status_code, 404)

    def test_get_unauthenticated_returns_401(self):
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 401)

    # PATCH

    def test_patch_avance_updates_nom(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.url(), {'nom': 'Nouveau nom'})
        self.assertEqual(r.status_code, 200)
        self.obj.refresh_from_db()
        self.assertEqual(self.obj.nom, 'Nouveau nom')

    def test_patch_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.patch(self.url(), {'nom': 'Hack'})
        self.assertEqual(r.status_code, 403)

    def test_patch_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch('/api/objects/9999/', {'nom': 'X'})
        self.assertEqual(r.status_code, 404)


# ---------------------------------------------------------------------------
# GET /api/objects/<pk>/history/
# ---------------------------------------------------------------------------

class ObjectHistoryViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.verified = make_user(verified=True)
        cls.obj = make_object()
        HistoriqueConso.objects.create(
            objet=cls.obj, date=datetime.date.today(), valeur=12.5
        )

    def url(self):
        return f'/api/objects/{self.obj.pk}/history/'

    def test_returns_history(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['data']), 1)
        self.assertAlmostEqual(r.data['data'][0]['valeur'], 12.5)

    def test_unauthenticated_returns_401(self):
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 401)

    def test_unverified_returns_403(self):
        unverified = make_user(email='nv@x.com', username='nv', pseudo='NV')
        self.client.force_authenticate(unverified)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 403)

    def test_empty_history_returns_empty_list(self):
        obj2 = make_object(unique_id='OBJ-002', nom='Autre', zone='Z')
        self.client.force_authenticate(self.verified)
        r = self.client.get(f'/api/objects/{obj2.pk}/history/')
        self.assertEqual(r.data['data'], [])
