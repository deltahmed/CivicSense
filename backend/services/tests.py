from rest_framework.test import APITestCase
from users.models import CustomUser
from .models import Service


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


def make_service(nom='Service A', categorie='Energie', niveau_requis='debutant'):
    return Service.objects.create(nom=nom, categorie=categorie, niveau_requis=niveau_requis)


# ---------------------------------------------------------------------------
# GET /api/services/
# ---------------------------------------------------------------------------

class ServiceListViewTest(APITestCase):
    URL = '/api/services/'

    @classmethod
    def setUpTestData(cls):
        cls.debutant = make_user(verified=True)
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.unverified = make_user(
            email='nv@example.com', username='nv', pseudo='NV',
        )
        cls.s_debutant = make_service(nom='Basique', niveau_requis='debutant')
        cls.s_intermediaire = make_service(nom='Intermédiaire', niveau_requis='intermediaire')
        cls.s_avance = make_service(nom='Avancé', niveau_requis='avance')
        cls.s_expert = make_service(nom='Expert', niveau_requis='expert')

    def test_debutant_sees_only_debutant_services(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        noms = [s['nom'] for s in r.data['data']]
        self.assertIn('Basique', noms)
        self.assertNotIn('Intermédiaire', noms)
        self.assertNotIn('Avancé', noms)
        self.assertNotIn('Expert', noms)

    def test_avance_sees_debutant_intermediaire_avance(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        noms = [s['nom'] for s in r.data['data']]
        self.assertIn('Basique', noms)
        self.assertIn('Intermédiaire', noms)
        self.assertIn('Avancé', noms)
        self.assertNotIn('Expert', noms)

    def test_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    def test_unverified_returns_403(self):
        self.client.force_authenticate(self.unverified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    def test_returns_success_true(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.URL)
        self.assertTrue(r.data['success'])


# ---------------------------------------------------------------------------
# GET /api/services/<pk>/
# ---------------------------------------------------------------------------

class ServiceDetailViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.debutant = make_user(verified=True)
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.s_debutant = make_service(nom='Basique', niveau_requis='debutant')
        cls.s_avance = make_service(nom='Avancé', niveau_requis='avance')

    def url(self, pk):
        return f'/api/services/{pk}/'

    def test_debutant_accesses_debutant_service(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.url(self.s_debutant.pk))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_debutant_blocked_on_avance_service(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.url(self.s_avance.pk))
        self.assertEqual(r.status_code, 403)
        self.assertFalse(r.data['success'])

    def test_avance_accesses_avance_service(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.url(self.s_avance.pk))
        self.assertEqual(r.status_code, 200)

    def test_access_adds_points(self):
        self.client.force_authenticate(self.debutant)
        self.client.get(self.url(self.s_debutant.pk))
        self.debutant.refresh_from_db()
        self.assertAlmostEqual(self.debutant.points, 0.50)

    def test_level_blocked_does_not_add_points(self):
        self.client.force_authenticate(self.debutant)
        self.client.get(self.url(self.s_avance.pk))
        self.debutant.refresh_from_db()
        self.assertAlmostEqual(self.debutant.points, 0.0)

    def test_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get('/api/services/9999/')
        self.assertEqual(r.status_code, 404)
        self.assertFalse(r.data['success'])

    def test_unauthenticated_returns_401(self):
        r = self.client.get(self.url(self.s_debutant.pk))
        self.assertEqual(r.status_code, 401)

    def test_unverified_returns_403(self):
        unverified = make_user(email='nv@x.com', username='nv', pseudo='NV')
        self.client.force_authenticate(unverified)
        r = self.client.get(self.url(self.s_debutant.pk))
        self.assertEqual(r.status_code, 403)
