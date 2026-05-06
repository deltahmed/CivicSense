import base64

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from users.models import CustomUser
from .models import GlobalSettings, Service

PNG_1x1 = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
)


def reset_global_settings():
    cache.delete('global_settings')
    s = GlobalSettings.load()
    if s.banniere:
        s.banniere.delete(save=False)
    s.nom_residence = 'Residence Publique'
    s.banniere = None
    s.couleur_theme = '#112233'
    s.approbation_manuelle = False
    s.domaines_email_autorises = ['@test.fr']
    s.message_inscription = 'Bienvenue'
    s.save()


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
        
        # Services avec différentes catégories pour les tests de filtrage
        cls.s_energie_1 = Service.objects.create(
            nom='Thermostat Intelligent', 
            description='Gérez la température facilement',
            categorie='energie', 
            niveau_requis='debutant'
        )
        cls.s_energie_2 = Service.objects.create(
            nom='Monitoring Consommation',
            description='Analysez votre consommation énergétique',
            categorie='energie',
            niveau_requis='intermediaire'
        )
        cls.s_securite = Service.objects.create(
            nom='Alarme Intégrée',
            description='Sécurité renforcée pour votre domicile',
            categorie='securite',
            niveau_requis='debutant'
        )
        cls.s_confort = Service.objects.create(
            nom='Domotique Complète',
            description='Contrôlez tout votre maison',
            categorie='confort',
            niveau_requis='avance'
        )

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

    def test_filter_by_categorie(self):
        """Test filtrage par catégorie"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(f'{self.URL}?categorie=energie')
        self.assertEqual(r.status_code, 200)
        noms = [s['nom'] for s in r.data['data']]
        self.assertIn('Thermostat Intelligent', noms)
        self.assertNotIn('Alarme Intégrée', noms)
        self.assertNotIn('Domotique Complète', noms)

    def test_filter_by_niveau_requis(self):
        """Test filtrage par niveau requis"""
        self.client.force_authenticate(self.avance)
        r = self.client.get(f'{self.URL}?niveau_requis=avance')
        self.assertEqual(r.status_code, 200)
        noms = [s['nom'] for s in r.data['data']]
        self.assertIn('Avancé', noms)
        self.assertIn('Domotique Complète', noms)

    def test_search_by_name(self):
        """Test recherche par nom"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(f'{self.URL}?search=Thermostat')
        self.assertEqual(r.status_code, 200)
        noms = [s['nom'] for s in r.data['data']]
        self.assertEqual(len(noms), 1)
        self.assertIn('Thermostat Intelligent', noms)

    def test_search_by_description(self):
        """Test recherche dans la description"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(f'{self.URL}?search=température')
        self.assertEqual(r.status_code, 200)
        noms = [s['nom'] for s in r.data['data']]
        self.assertIn('Thermostat Intelligent', noms)

    def test_combined_filters(self):
        """Test combinaison de filtres"""
        self.client.force_authenticate(self.avance)
        r = self.client.get(f'{self.URL}?categorie=energie&niveau_requis=intermediaire')
        self.assertEqual(r.status_code, 200)
        noms = [s['nom'] for s in r.data['data']]
        self.assertEqual(len(noms), 1)
        self.assertIn('Monitoring Consommation', noms)

    def test_returns_count_field(self):
        """Test que le nombre de services est retourné"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.URL)
        self.assertIn('count', r.data)


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

    def test_access_increments_action_count(self):
        """Test que action_count est incrémenté"""
        self.client.force_authenticate(self.debutant)
        initial_count = self.debutant.action_count
        self.client.get(self.url(self.s_debutant.pk))
        self.debutant.refresh_from_db()
        self.assertGreater(self.debutant.action_count, initial_count)

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


# ---------------------------------------------------------------------------
# GET /api/public/settings/
# ---------------------------------------------------------------------------

class PublicSettingsViewTest(APITestCase):
    URL = '/api/public/settings/'

    @classmethod
    def setUpTestData(cls):
        reset_global_settings()

    def test_returns_200_without_auth(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)

    def test_returns_only_public_fields(self):
        r = self.client.get(self.URL)
        self.assertEqual(set(r.data.keys()), {'nom_residence', 'banniere', 'couleur_theme'})

    def test_returns_correct_values(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.data['nom_residence'], 'Residence Publique')
        self.assertEqual(r.data['couleur_theme'], '#112233')
        self.assertIsNone(r.data['banniere'])


# ---------------------------------------------------------------------------
# GET /api/admin/settings/
# ---------------------------------------------------------------------------

class AdminSettingsGetTest(APITestCase):
    URL = '/api/admin/settings/'

    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='expert@gs.com', username='gs_expert', pseudo='GsExpert',
            verified=True, level='expert',
        )
        cls.avance = make_user(
            email='avance@gs.com', username='gs_avance', pseudo='GsAvance',
            verified=True, level='avance',
        )
        cls.debutant = make_user(
            email='debutant@gs.com', username='gs_debutant', pseudo='GsDebutant',
            verified=True,
        )

    def test_returns_401_without_auth(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    def test_returns_403_for_non_expert(self):
        for user in (self.avance, self.debutant):
            with self.subTest(level=user.level):
                self.client.force_authenticate(user)
                r = self.client.get(self.URL)
                self.assertEqual(r.status_code, 403)

    def test_returns_200_for_expert(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)

    def test_response_shape(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        expected = {'nom_residence', 'banniere', 'couleur_theme',
                    'approbation_manuelle', 'domaines_email_autorises',
                    'message_inscription'}
        self.assertTrue(expected.issubset(r.data.keys()))
        self.assertNotIn('id', r.data)


# ---------------------------------------------------------------------------
# PUT /api/admin/settings/
# ---------------------------------------------------------------------------

class AdminSettingsPutTest(APITestCase):
    URL = '/api/admin/settings/'

    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='expert@put.com', username='put_expert', pseudo='PutExpert',
            verified=True, level='expert',
        )
        cls.avance = make_user(
            email='avance@put.com', username='put_avance', pseudo='PutAvance',
            verified=True, level='avance',
        )

    def setUp(self):
        cache.delete('global_settings')
        s = GlobalSettings.load()
        if s.banniere:
            s.banniere.delete(save=False)
        s.nom_residence = 'SmartResi'
        s.couleur_theme = '#378ADD'
        s.approbation_manuelle = True
        s.domaines_email_autorises = []
        s.message_inscription = ''
        s.banniere = None
        s.save()
        self.client.force_authenticate(self.expert)

    def tearDown(self):
        cache.delete('global_settings')

    def _put(self, payload, **kwargs):
        return self.client.put(self.URL, payload, **kwargs)

    def test_returns_401_without_auth(self):
        self.client.logout()
        r = self.client.put(self.URL, {'nom_residence': 'X'}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_returns_403_for_non_expert(self):
        self.client.force_authenticate(self.avance)
        r = self.client.put(self.URL, {'nom_residence': 'X'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_updates_text_fields(self):
        for field, value in [
            ('nom_residence', 'Nouveau Nom'),
            ('couleur_theme', '#ff0000'),
            ('message_inscription', 'Bienvenue !'),
        ]:
            with self.subTest(field=field):
                r = self._put({field: value}, format='json')
                self.assertEqual(r.status_code, 200)
                self.assertEqual(r.data[field], value)

    def test_updates_approbation_manuelle(self):
        r = self._put({'approbation_manuelle': False}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data['approbation_manuelle'])

    def test_updates_domaines_email_autorises(self):
        r = self._put(
            {'domaines_email_autorises': ['@cy-tech.fr', '@example.com']},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['domaines_email_autorises'], ['@cy-tech.fr', '@example.com'])

    def test_domaines_vides_autorise_tous(self):
        r = self._put({'domaines_email_autorises': []}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['domaines_email_autorises'], [])

    def test_partial_update_preserves_other_fields(self):
        r = self._put({'nom_residence': 'Modifie'}, format='json')
        self.assertEqual(r.data['nom_residence'], 'Modifie')
        self.assertEqual(r.data['couleur_theme'], '#378ADD')

    def test_update_persists_in_db(self):
        self._put({'nom_residence': 'Persiste'}, format='json')
        cache.delete('global_settings')
        self.assertEqual(GlobalSettings.load().nom_residence, 'Persiste')

    def test_banner_upload(self):
        banner = SimpleUploadedFile('banner_test.png', PNG_1x1, content_type='image/png')
        r = self._put({'banniere': banner}, format='multipart')
        self.assertEqual(r.status_code, 200)
        self.assertIsNotNone(r.data['banniere'])
        self.assertIn('.png', r.data['banniere'])
        GlobalSettings.objects.get(pk=1).banniere.delete(save=False)

    def test_invalid_image_returns_400(self):
        fake = SimpleUploadedFile('notanimage.png', b'not image data', content_type='image/png')
        r = self._put({'banniere': fake}, format='multipart')
        self.assertEqual(r.status_code, 400)

    def test_public_endpoint_reflects_update(self):
        self._put(
            {'nom_residence': 'Visible Public', 'couleur_theme': '#abcdef'},
            format='json',
        )
        r = self.client.get('/api/public/settings/')
        self.assertEqual(r.data['nom_residence'], 'Visible Public')
        self.assertEqual(r.data['couleur_theme'], '#abcdef')
