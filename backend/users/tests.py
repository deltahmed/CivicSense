import uuid
from django.test import TestCase
from django.core.management import call_command
from rest_framework.test import APITestCase
from .models import CustomUser, LoginHistory


def make_user(email='u@example.com', username='user1', pseudo='Pseudo1',
              password='StrongPass1', verified=False, **kwargs):
    user = CustomUser.objects.create_user(
        email=email, username=username, pseudo=pseudo, password=password, **kwargs
    )
    if verified:
        user.is_verified = True
        user.save(update_fields=['is_verified'])
    return user


# ---------------------------------------------------------------------------
# POST /api/users/register/
# ---------------------------------------------------------------------------

class RegisterViewTest(APITestCase):
    URL = '/api/auth/register/'

    VALID = {
        'email': 'new@example.com',
        'username': 'newuser',
        'pseudo': 'NewPseudo',
        'password': 'StrongPass1',
        'type_membre': 'resident',
    }

    def post(self, **overrides):
        return self.client.post(self.URL, {**self.VALID, **overrides})

    def test_success_returns_201(self):
        r = self.post()
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['success'])

    def test_user_created_in_db(self):
        self.post()
        self.assertTrue(CustomUser.objects.filter(email='new@example.com').exists())

    def test_verification_token_generated(self):
        self.post()
        user = CustomUser.objects.get(email='new@example.com')
        self.assertNotEqual(user.verification_token, '')
        uuid.UUID(user.verification_token)  # lève ValueError si format invalide

    def test_account_not_verified_by_default(self):
        self.post()
        self.assertFalse(CustomUser.objects.get(email='new@example.com').is_verified)

    def test_password_not_stored_in_clear(self):
        self.post()
        user = CustomUser.objects.get(email='new@example.com')
        self.assertNotEqual(user.password, 'StrongPass1')

    def test_password_absent_from_response(self):
        r = self.post()
        self.assertNotIn('password', str(r.data))

    def test_duplicate_email_returns_400(self):
        self.post()
        r = self.post(username='other', pseudo='OtherPseudo')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_duplicate_pseudo_returns_400(self):
        self.post()
        r = self.post(email='other@example.com', username='other2')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_short_password_returns_400(self):
        r = self.post(password='short')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_missing_email_returns_400(self):
        data = {**self.VALID}
        del data['email']
        r = self.client.post(self.URL, data)
        self.assertEqual(r.status_code, 400)

    def test_invalid_type_membre_returns_400(self):
        r = self.post(type_membre='inconnu')
        self.assertEqual(r.status_code, 400)


# ---------------------------------------------------------------------------
# POST /api/users/login/
# ---------------------------------------------------------------------------

class LoginViewTest(APITestCase):
    URL = '/api/auth/login/'

    @classmethod
    def setUpTestData(cls):
        cls.verified = make_user(
            email='ok@example.com', username='okuser', pseudo='OkPseudo',
            password='StrongPass1', verified=True,
        )
        cls.unverified = make_user(
            email='nv@example.com', username='nvuser', pseudo='NvPseudo',
            password='StrongPass1',
        )

    def login(self, email='ok@example.com', password='StrongPass1'):
        return self.client.post(self.URL, {'email': email, 'password': password})

    def test_success_returns_200(self):
        r = self.login()
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_jwt_cookie_set(self):
        r = self.login()
        self.assertIn('access_token', r.cookies)
        self.assertTrue(r.cookies['access_token']['httponly'])

    def test_login_count_incremented(self):
        self.login()
        self.verified.refresh_from_db()
        self.assertEqual(self.verified.login_count, 1)

    def test_points_added(self):
        self.login()
        self.verified.refresh_from_db()
        self.assertAlmostEqual(self.verified.points, 0.25)

    def test_password_absent_from_response(self):
        r = self.login()
        self.assertNotIn('password', str(r.data))

    def test_wrong_password_returns_401(self):
        r = self.login(password='WrongPass')
        self.assertEqual(r.status_code, 401)
        self.assertFalse(r.data['success'])
        self.assertEqual(r.data['message'], 'Identifiants incorrects.')

    def test_unverified_account_returns_403(self):
        r = self.login(email='nv@example.com')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(r.data['success'])
        self.assertEqual(r.data['message'], 'Email non vérifié.')

    def test_unknown_email_returns_401(self):
        r = self.login(email='nobody@example.com')
        self.assertEqual(r.status_code, 401)

    def test_multiple_logins_accumulate_count(self):
        self.login()
        self.login()
        self.verified.refresh_from_db()
        self.assertEqual(self.verified.login_count, 2)

    def test_login_creates_history_entry(self):
        self.login()
        self.assertEqual(LoginHistory.objects.filter(user=self.verified).count(), 1)

    def test_multiple_logins_create_multiple_history_entries(self):
        self.login()
        self.login()
        self.assertEqual(LoginHistory.objects.filter(user=self.verified).count(), 2)


# ---------------------------------------------------------------------------
# POST /api/users/logout/
# ---------------------------------------------------------------------------

class LogoutViewTest(APITestCase):
    URL = '/api/auth/logout/'

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user(verified=True)

    def test_success_returns_200(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.post(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_cookies_cleared(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.post(self.URL)
        if 'access_token' in r.cookies:
            self.assertEqual(r.cookies['access_token'].value, '')

    def test_unauthenticated_returns_401(self):
        r = self.client.post(self.URL)
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# GET + PATCH /api/users/me/
# ---------------------------------------------------------------------------

class MeViewTest(APITestCase):
    URL = '/api/auth/me/'

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user(verified=True)

    # GET

    def test_get_authenticated_returns_200(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_get_returns_correct_email(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.get(self.URL)
        self.assertEqual(r.data['data']['email'], 'u@example.com')

    def test_get_no_password_in_response(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.get(self.URL)
        self.assertNotIn('password', r.data.get('data', {}))

    def test_get_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    # PATCH

    def test_patch_pseudo_success(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.patch(self.URL, {'pseudo': 'Updated'})
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.pseudo, 'Updated')

    def test_patch_readonly_level_ignored(self):
        self.client.force_authenticate(user=self.user)
        self.user.refresh_from_db()
        original = self.user.level
        self.client.patch(self.URL, {'level': 'expert'})
        self.user.refresh_from_db()
        self.assertEqual(self.user.level, original)

    def test_patch_readonly_points_ignored(self):
        self.client.force_authenticate(user=self.user)
        self.client.patch(self.URL, {'points': 999})
        self.user.refresh_from_db()
        self.assertEqual(self.user.points, 0.0)

    def test_patch_unauthenticated_returns_401(self):
        r = self.client.patch(self.URL, {'pseudo': 'Hacked'})
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# GET /api/users/verify/<token>/
# ---------------------------------------------------------------------------

class VerifyEmailViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.token = str(uuid.uuid4())
        cls.user = make_user()
        cls.user.verification_token = cls.token
        cls.user.save(update_fields=['verification_token'])

    def url(self, token=None):
        return f'/api/auth/verify/{token or self.token}/'

    def test_valid_token_returns_200(self):
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_valid_token_sets_is_verified(self):
        self.client.get(self.url())
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_valid_token_clears_token(self):
        self.client.get(self.url())
        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_token, '')

    def test_invalid_token_returns_404(self):
        r = self.client.get(self.url(str(uuid.uuid4())))
        self.assertEqual(r.status_code, 404)
        self.assertFalse(r.data['success'])

    def test_token_cannot_be_reused(self):
        self.client.get(self.url())
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 404)


# ---------------------------------------------------------------------------
# GET /api/users/admin/users/
# ---------------------------------------------------------------------------

class AdminUserListViewTest(APITestCase):
    URL = '/api/admin/users/'

    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.verified = make_user(verified=True)

    def test_expert_gets_all_users(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        self.assertGreaterEqual(len(r.data['data']), 2)

    def test_non_expert_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    def test_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# GET + PUT + DELETE /api/users/admin/users/<pk>/
# ---------------------------------------------------------------------------

class AdminUserDetailViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )
        cls.verified = make_user(verified=True)

    def url(self, pk=None):
        return f'/api/admin/users/{pk or self.target.pk}/'

    def test_get_returns_user_data(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['data']['email'], 'target@example.com')

    def test_get_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get('/api/admin/users/9999/')
        self.assertEqual(r.status_code, 404)

    def test_put_updates_is_active(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put(self.url(), {'is_active': False})
        self.assertEqual(r.status_code, 200)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_delete_removes_user(self):
        self.client.force_authenticate(self.expert)
        r = self.client.delete(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertFalse(CustomUser.objects.filter(pk=self.target.pk).exists())

    def test_delete_own_account_returns_400(self):
        self.client.force_authenticate(self.expert)
        r = self.client.delete(f'/api/admin/users/{self.expert.pk}/')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_non_expert_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 403)


# ---------------------------------------------------------------------------
# PUT /api/users/admin/users/<pk>/level/
# ---------------------------------------------------------------------------

class AdminSetLevelViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )

    def url(self):
        return f'/api/admin/users/{self.target.pk}/set-level/'

    def test_set_valid_level(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put(self.url(), {'level': 'avance'})
        self.assertEqual(r.status_code, 200)
        self.target.refresh_from_db()
        self.assertEqual(self.target.level, 'avance')

    def test_invalid_level_returns_400(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put(self.url(), {'level': 'dieu'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_unknown_user_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put('/api/admin/users/9999/set-level/', {'level': 'avance'})
        self.assertEqual(r.status_code, 404)

    def test_non_expert_returns_403(self):
        non_expert = make_user(
            email='nex@example.com', username='nex', pseudo='Nex', verified=True,
        )
        self.client.force_authenticate(non_expert)
        r = self.client.put(self.url(), {'level': 'avance'})
        self.assertEqual(r.status_code, 403)


# ---------------------------------------------------------------------------
# PUT /api/users/admin/users/<pk>/points/
# ---------------------------------------------------------------------------

class AdminSetPointsViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )

    def url(self):
        return f'/api/admin/users/{self.target.pk}/set-points/'

    def test_set_points_updates_value(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put(self.url(), {'points': 3.5})
        self.assertEqual(r.status_code, 200)
        self.target.refresh_from_db()
        self.assertAlmostEqual(self.target.points, 3.5)

    def test_set_points_triggers_level_update(self):
        self.client.force_authenticate(self.expert)
        self.client.put(self.url(), {'points': 5.0})
        self.target.refresh_from_db()
        self.assertEqual(self.target.level, 'expert')

    def test_negative_points_returns_400(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put(self.url(), {'points': -1})
        self.assertEqual(r.status_code, 400)

    def test_unknown_user_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.put('/api/admin/users/9999/set-points/', {'points': 1.0})
        self.assertEqual(r.status_code, 404)


# ---------------------------------------------------------------------------
# GET /api/users/admin/users/<pk>/history/
# ---------------------------------------------------------------------------

class AdminUserHistoryViewTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        cls.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )
        LoginHistory.objects.create(user=cls.target)
        LoginHistory.objects.create(user=cls.target)

    def url(self):
        return f'/api/admin/users/{self.target.pk}/history/'

    def test_returns_login_count_and_connexions(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['data']['connexions']), 2)

    def test_unknown_user_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get('/api/admin/users/9999/history/')
        self.assertEqual(r.status_code, 404)

    def test_non_expert_returns_403(self):
        non_expert = make_user(
            email='nex@example.com', username='nex', pseudo='Nex', verified=True,
        )
        self.client.force_authenticate(non_expert)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 403)


# ---------------------------------------------------------------------------
# python manage.py seed
# ---------------------------------------------------------------------------

from objects.models import ConnectedObject, HistoriqueConso, Category          # noqa: E402
from announcements.models import Announcement, DeletionRequest                 # noqa: E402
from incidents.models import Incident, HistoriqueStatutIncident                # noqa: E402


# ---------------------------------------------------------------------------
# CDC p.3 — Flux complet auth : login / me / logout
# ---------------------------------------------------------------------------

class AuthFlowTest(APITestCase):
    LOGIN_URL = '/api/auth/login/'
    ME_URL = '/api/auth/me/'
    LOGOUT_URL = '/api/auth/logout/'

    @classmethod
    def setUpTestData(cls):
        cls.debutant = make_user(
            email='deb@x.com', username='deb', pseudo='Debutant',
            password='StrongPass1', verified=True, level='debutant', points=0.0,
        )
        cls.intermediaire = make_user(
            email='inter@x.com', username='inter', pseudo='Inter',
            password='StrongPass1', verified=True, level='intermediaire', points=1.0,
        )
        cls.avance = make_user(
            email='ava@x.com', username='ava', pseudo='Avance',
            password='StrongPass1', verified=True, level='avance', points=3.0,
        )
        cls.expert = make_user(
            email='exp@x.com', username='exp', pseudo='Expert',
            password='StrongPass1', verified=True, level='expert', points=5.0,
        )
        cls.unverified = make_user(
            email='unv@x.com', username='unv', pseudo='Unverified',
            password='StrongPass1',
        )

    # ── Messages d'erreur CDC ────────────────────────────────────────────────

    def test_wrong_credentials_message(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'deb@x.com', 'password': 'WrongPass'})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['message'], 'Identifiants incorrects.')

    def test_unverified_email_message(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'unv@x.com', 'password': 'StrongPass1'})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data['message'], 'Email non vérifié.')

    def test_unknown_email_returns_401_not_404(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'nobody@x.com', 'password': 'x'})
        self.assertEqual(r.status_code, 401)

    # ── Level dans la réponse login (pour la redirection frontend) ───────────

    def test_login_response_contains_level_debutant(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'deb@x.com', 'password': 'StrongPass1'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['data']['level'], 'debutant')

    def test_login_response_contains_level_intermediaire(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'inter@x.com', 'password': 'StrongPass1'})
        self.assertEqual(r.data['data']['level'], 'intermediaire')

    def test_login_response_contains_level_avance(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'ava@x.com', 'password': 'StrongPass1'})
        self.assertEqual(r.data['data']['level'], 'avance')

    def test_login_response_contains_level_expert(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'exp@x.com', 'password': 'StrongPass1'})
        self.assertEqual(r.data['data']['level'], 'expert')

    # ── Restauration de session : GET /api/auth/me/ ──────────────────────────

    def test_me_authenticated_returns_user(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.ME_URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        self.assertEqual(r.data['data']['email'], 'deb@x.com')

    def test_me_returns_level_field(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.ME_URL)
        self.assertEqual(r.data['data']['level'], 'avance')

    def test_me_unauthenticated_returns_401(self):
        r = self.client.get(self.ME_URL)
        self.assertEqual(r.status_code, 401)

    def test_me_no_password_in_response(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.ME_URL)
        self.assertNotIn('password', str(r.data))

    # ── Déconnexion ──────────────────────────────────────────────────────────

    def test_logout_authenticated_returns_200(self):
        self.client.force_authenticate(self.debutant)
        r = self.client.post(self.LOGOUT_URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])

    def test_logout_unauthenticated_returns_401(self):
        r = self.client.post(self.LOGOUT_URL)
        self.assertEqual(r.status_code, 401)

    def test_login_sets_httponly_jwt_cookie(self):
        r = self.client.post(self.LOGIN_URL, {'email': 'deb@x.com', 'password': 'StrongPass1'})
        self.assertEqual(r.status_code, 200)
        self.assertIn('access_token', r.cookies)
        self.assertTrue(r.cookies['access_token']['httponly'])


# ── GET /api/users/ - Liste publique des utilisateurs ────────────────────────

class ListPublicUsersTest(APITestCase):
    """Tests pour la liste des profils publics des utilisateurs"""
    
    LIST_URL = '/api/users/'
    
    @classmethod
    def setUpTestData(cls):
        # Nettoyer la base de données pour éviter les doublons de tests précédents
        CustomUser.objects.all().delete()
        
        # Créer des utilisateurs vérifiés
        cls.debutant1 = make_user(
            email='deb1@example.com', username='deb1', pseudo='Débutant1',
            verified=True, type_membre='resident', level='debutant'
        )
        cls.debutant2 = make_user(
            email='deb2@example.com', username='deb2', pseudo='Débutant2',
            verified=True, type_membre='resident', level='debutant'
        )
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avancé',
            verified=True, type_membre='gestionnaire', level='avance'
        )
        # Créer un utilisateur non-vérifié (ne doit pas apparaître)
        cls.unverified = make_user(
            email='unv@example.com', username='unverified', pseudo='NonVérifié',
            verified=False, type_membre='resident'
        )
    
    def test_list_requires_authentication(self):
        """Test que la liste requiert l'authentification"""
        r = self.client.get(self.LIST_URL)
        self.assertEqual(r.status_code, 401)
    
    def test_list_requires_verification(self):
        """Test que l'utilisateur doit être vérifié"""
        self.client.force_authenticate(self.unverified)
        r = self.client.get(self.LIST_URL)
        self.assertEqual(r.status_code, 403)
    
    def test_list_returns_verified_users_only(self):
        """Test que seuls les utilisateurs vérifiés sont retournés"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(self.LIST_URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 3)  # debutant1, debutant2, avance
        self.assertEqual(len(r.data['data']), 3)
    
    def test_list_returns_count_field(self):
        """Test que le nombre d'utilisateurs est retourné"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(self.LIST_URL)
        self.assertIn('count', r.data)
    
    def test_list_sorted_by_pseudo(self):
        """Test que la liste est triée par pseudo"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(self.LIST_URL)
        pseudos = [u['pseudo'] for u in r.data['data']]
        self.assertEqual(pseudos, sorted(pseudos))
    
    def test_filter_by_type_membre(self):
        """Test le filtrage par type de membre"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(f'{self.LIST_URL}?type_membre=gestionnaire')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['data'][0]['pseudo'], 'Avancé')
    
    def test_filter_by_level(self):
        """Test le filtrage par niveau"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(f'{self.LIST_URL}?level=debutant')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 2)
    
    def test_filter_by_type_membre_and_level(self):
        """Test le filtrage par type de membre ET niveau"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(f'{self.LIST_URL}?type_membre=resident&level=debutant')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 2)
    
    def test_filter_returns_empty_if_no_match(self):
        """Test qu'un filtre sans correspondance retourne 0 résultats"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(f'{self.LIST_URL}?level=expert')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 0)
    
    def test_response_contains_public_fields_only(self):
        """Test que seuls les champs publics sont retournés"""
        self.client.force_authenticate(self.debutant1)
        r = self.client.get(self.LIST_URL)
        user_data = r.data['data'][0]
        # Vérifier que les champs publics sont présents
        self.assertIn('id', user_data)
        self.assertIn('pseudo', user_data)
        self.assertIn('level', user_data)
        self.assertIn('type_membre', user_data)
        self.assertIn('photo', user_data)
        # Vérifier que les champs privés ne sont pas présents
        self.assertNotIn('email', user_data)
        self.assertNotIn('password', user_data)


# ── GET /api/users/{id}/ - Profil d'un utilisateur ─────────────────────────

class GetUserDetailTest(APITestCase):
    """Tests pour récupérer le profil d'un utilisateur"""
    
    @classmethod
    def setUpTestData(cls):
        # Nettoyer la base de données pour éviter les doublons de tests précédents
        CustomUser.objects.all().delete()
        
        cls.debutant = make_user(
            email='deb@example.com', username='debutant', pseudo='Débutant',
            verified=True, type_membre='resident', level='debutant'
        )
        cls.other_user = make_user(
            email='other@example.com', username='other', pseudo='Autre',
            verified=True, type_membre='resident', level='debutant'
        )
    
    def get_url(self, pk=None):
        return f'/api/users/{pk or self.debutant.pk}/'
    
    def test_requires_authentication(self):
        """Test que l'accès requiert l'authentification"""
        r = self.client.get(self.get_url())
        self.assertEqual(r.status_code, 401)
    
    def test_returns_404_for_nonexistent_user(self):
        """Test que les utilisateurs inexistants retournent 404"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.get_url(999))
        self.assertEqual(r.status_code, 404)
        self.assertFalse(r.data['success'])
    
    def test_returns_private_profile_for_own_user(self):
        """Test que le profil privé est retourné pour l'utilisateur lui-même"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.get_url(self.debutant.pk))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        # Vérifier les champs privés
        self.assertIn('email', r.data['data'])
        self.assertIn('username', r.data['data'])
        self.assertIn('first_name', r.data['data'])
    
    def test_returns_public_profile_for_other_user(self):
        """Test que le profil public est retourné pour les autres utilisateurs"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.get_url(self.other_user.pk))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        # Vérifier que les champs privés ne sont pas présents
        self.assertNotIn('email', r.data['data'])
        self.assertNotIn('username', r.data['data'])
        # Vérifier que les champs publics sont présents
        self.assertIn('pseudo', r.data['data'])
        self.assertIn('level', r.data['data'])
    
    def test_public_profile_contains_required_fields(self):
        """Test que le profil public contient tous les champs requis"""
        self.client.force_authenticate(self.debutant)
        r = self.client.get(self.get_url(self.other_user.pk))
        user_data = r.data['data']
        required_fields = ['id', 'pseudo', 'level', 'type_membre', 'photo', 'age', 'genre']
        for field in required_fields:
            self.assertIn(field, user_data, f"Champ manquant: {field}")





OBJECTS_COUNT = 11
READINGS_PER_DAY = 4
DAYS = 30
HISTORIQUE_TOTAL = OBJECTS_COUNT * READINGS_PER_DAY * DAYS   # 1 320


class SeedCommandTest(TestCase):
    """Vérifie que `python manage.py seed` peuple correctement la base."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        call_command('seed', '--clear', verbosity=0)

    # ── Utilisateurs ─────────────────────────────────────────────────────────

    def test_admin_is_superuser(self):
        self.assertTrue(CustomUser.objects.get(email='admin@smartresi.fr').is_superuser)

    def test_admin_is_staff(self):
        self.assertTrue(CustomUser.objects.get(email='admin@smartresi.fr').is_staff)

    def test_admin_is_verified(self):
        self.assertTrue(CustomUser.objects.get(email='admin@smartresi.fr').is_verified)

    def test_admin_level_is_expert(self):
        self.assertEqual(CustomUser.objects.get(email='admin@smartresi.fr').level, 'expert')

    def test_two_avance_users(self):
        self.assertEqual(CustomUser.objects.filter(level='avance').count(), 2)

    def test_three_intermediaire_users(self):
        self.assertEqual(CustomUser.objects.filter(level='intermediaire').count(), 3)

    def test_three_debutant_users(self):
        # 2 vérifiés + 1 non vérifié
        self.assertEqual(CustomUser.objects.filter(level='debutant').count(), 3)

    def test_one_unverified_user(self):
        self.assertEqual(CustomUser.objects.filter(is_verified=False).count(), 1)

    def test_unverified_user_is_debutant(self):
        self.assertEqual(CustomUser.objects.get(is_verified=False).level, 'debutant')

    def test_total_user_count(self):
        self.assertEqual(CustomUser.objects.count(), 9)

    # ── Objets connectés ──────────────────────────────────────────────────────

    def test_eleven_connected_objects(self):
        self.assertEqual(ConnectedObject.objects.count(), OBJECTS_COUNT)

    def test_two_thermostats(self):
        self.assertEqual(ConnectedObject.objects.filter(type_objet='thermostat').count(), 2)

    def test_three_compteurs(self):
        self.assertEqual(ConnectedObject.objects.filter(type_objet='compteur').count(), 3)

    def test_two_cameras(self):
        self.assertEqual(ConnectedObject.objects.filter(type_objet='camera').count(), 2)

    def test_one_eclairage(self):
        self.assertEqual(ConnectedObject.objects.filter(type_objet='eclairage').count(), 1)

    def test_two_capteurs(self):
        self.assertEqual(ConnectedObject.objects.filter(type_objet='capteur').count(), 2)

    def test_one_prise(self):
        self.assertEqual(ConnectedObject.objects.filter(type_objet='prise').count(), 1)

    def test_each_object_has_at_least_30_historique_entries(self):
        for obj in ConnectedObject.objects.all():
            count = HistoriqueConso.objects.filter(objet=obj).count()
            self.assertGreaterEqual(
                count, 30,
                msg=f'{obj.nom} : seulement {count} entrées historique (min 30 requises)',
            )

    def test_historique_total_count(self):
        self.assertEqual(HistoriqueConso.objects.count(), HISTORIQUE_TOTAL)

    def test_historique_values_are_non_negative(self):
        self.assertEqual(HistoriqueConso.objects.filter(valeur__lt=0).count(), 0)

    def test_all_objects_have_unique_id(self):
        ids = list(ConnectedObject.objects.values_list('unique_id', flat=True))
        self.assertEqual(len(ids), len(set(ids)))

    def test_objects_linked_to_categories(self):
        without_cat = ConnectedObject.objects.filter(category__isnull=True).count()
        self.assertEqual(without_cat, 0)

    # ── Catégories ────────────────────────────────────────────────────────────

    def test_five_categories(self):
        self.assertEqual(Category.objects.count(), 5)

    # ── Annonces ──────────────────────────────────────────────────────────────

    def test_five_announcements(self):
        self.assertEqual(Announcement.objects.count(), 5)

    def test_two_public_announcements(self):
        self.assertEqual(Announcement.objects.filter(visible=True).count(), 2)

    def test_three_private_announcements(self):
        self.assertEqual(Announcement.objects.filter(visible=False).count(), 3)

    def test_announcements_have_author(self):
        self.assertEqual(Announcement.objects.filter(auteur__isnull=True).count(), 0)

    # ── Incidents ─────────────────────────────────────────────────────────────

    def test_three_incidents(self):
        self.assertEqual(Incident.objects.count(), 3)

    def test_incident_statut_signale_exists(self):
        self.assertTrue(Incident.objects.filter(statut='signale').exists())

    def test_incident_statut_pris_en_charge_exists(self):
        self.assertTrue(Incident.objects.filter(statut='pris_en_charge').exists())

    def test_incident_statut_resolu_exists(self):
        self.assertTrue(Incident.objects.filter(statut='resolu').exists())

    def test_three_historique_statut_incidents(self):
        self.assertEqual(HistoriqueStatutIncident.objects.count(), 3)

    def test_each_incident_has_one_historique_entry(self):
        for incident in Incident.objects.all():
            count = HistoriqueStatutIncident.objects.filter(incident=incident).count()
            self.assertEqual(count, 1, msg=f'Incident {incident.pk} : {count} entrée(s) statut')

    # ── DeletionRequest ───────────────────────────────────────────────────────

    def test_one_pending_deletion_request(self):
        self.assertEqual(DeletionRequest.objects.filter(statut='en_attente').count(), 1)

    # ── Idempotence (get_or_create guards) ───────────────────────────────────

    def test_second_seed_does_not_duplicate_admin(self):
        call_command('seed', verbosity=0)
        self.assertEqual(CustomUser.objects.filter(email='admin@smartresi.fr').count(), 1)

    def test_second_seed_does_not_duplicate_categories(self):
        call_command('seed', verbosity=0)
        self.assertEqual(Category.objects.count(), 5)

    def test_second_seed_does_not_duplicate_announcements(self):
        call_command('seed', verbosity=0)
        self.assertEqual(Announcement.objects.count(), 5)


class SeedCommandClearTest(TestCase):
    """Vérifie que `python manage.py seed --clear` remet la base à zéro puis re-seède."""

    def setUp(self):
        # Nettoyer la base avant chaque test (données du SeedCommandTest)
        call_command('seed', '--clear', verbosity=0)

    def test_clear_and_reseed_correct_user_count(self):
        call_command('seed', verbosity=0)
        call_command('seed', '--clear', verbosity=0)
        self.assertEqual(CustomUser.objects.count(), 9)

    def test_clear_and_reseed_correct_object_count(self):
        call_command('seed', verbosity=0)
        call_command('seed', '--clear', verbosity=0)
        self.assertEqual(ConnectedObject.objects.count(), OBJECTS_COUNT)

    def test_clear_and_reseed_correct_historique_count(self):
        call_command('seed', verbosity=0)
        call_command('seed', '--clear', verbosity=0)
        self.assertEqual(HistoriqueConso.objects.count(), HISTORIQUE_TOTAL)

    def test_clear_and_reseed_correct_announcement_count(self):
        call_command('seed', verbosity=0)
        call_command('seed', '--clear', verbosity=0)
        self.assertEqual(Announcement.objects.count(), 5)

    def test_clear_and_reseed_correct_incident_count(self):
        call_command('seed', verbosity=0)
        call_command('seed', '--clear', verbosity=0)
        self.assertEqual(Incident.objects.count(), 3)

    def test_clear_removes_old_objects_before_reseed(self):
        from objects.models import ConnectedObject
        # Nettoyer toutes les données avant de commencer
        ConnectedObject.objects.all().delete()
        
        call_command('seed', verbosity=0)
        first_ids = set(ConnectedObject.objects.values_list('unique_id', flat=True))
        call_command('seed', '--clear', verbosity=0)
        second_ids = set(ConnectedObject.objects.values_list('unique_id', flat=True))
        # Après clear, exactement 11 objets — pas d'accumulation
        self.assertEqual(len(second_ids), OBJECTS_COUNT)
        self.assertEqual(len(first_ids), OBJECTS_COUNT)
