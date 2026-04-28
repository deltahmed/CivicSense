import uuid
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
    URL = '/api/users/register/'

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
    URL = '/api/users/login/'

    def setUp(self):
        self.verified = make_user(
            email='ok@example.com', username='okuser', pseudo='OkPseudo',
            password='StrongPass1', verified=True,
        )
        self.unverified = make_user(
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

    def test_unverified_account_returns_403(self):
        r = self.login(email='nv@example.com')
        self.assertEqual(r.status_code, 403)
        self.assertFalse(r.data['success'])

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
    URL = '/api/users/logout/'

    def setUp(self):
        self.user = make_user(verified=True)

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
    URL = '/api/users/me/'

    def setUp(self):
        self.user = make_user(verified=True)

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
        original = self.user.level
        self.client.force_authenticate(user=self.user)
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
    def setUp(self):
        self.token = str(uuid.uuid4())
        self.user = make_user()
        self.user.verification_token = self.token
        self.user.save(update_fields=['verification_token'])

    def url(self, token=None):
        return f'/api/users/verify/{token or self.token}/'

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
    URL = '/api/users/admin/users/'

    def setUp(self):
        self.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        self.verified = make_user(verified=True)

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
    def setUp(self):
        self.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        self.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )
        self.verified = make_user(verified=True)

    def url(self, pk=None):
        return f'/api/users/admin/users/{pk or self.target.pk}/'

    def test_get_returns_user_data(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['data']['email'], 'target@example.com')

    def test_get_unknown_pk_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get('/api/users/admin/users/9999/')
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
        r = self.client.delete(f'/api/users/admin/users/{self.expert.pk}/')
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
    def setUp(self):
        self.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        self.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )

    def url(self):
        return f'/api/users/admin/users/{self.target.pk}/level/'

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
        r = self.client.put('/api/users/admin/users/9999/level/', {'level': 'avance'})
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
    def setUp(self):
        self.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        self.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )

    def url(self):
        return f'/api/users/admin/users/{self.target.pk}/points/'

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
        r = self.client.put('/api/users/admin/users/9999/points/', {'points': 1.0})
        self.assertEqual(r.status_code, 404)


# ---------------------------------------------------------------------------
# GET /api/users/admin/users/<pk>/history/
# ---------------------------------------------------------------------------

class AdminUserHistoryViewTest(APITestCase):
    def setUp(self):
        self.expert = make_user(
            email='ex@example.com', username='expert', pseudo='Expert',
            verified=True, level='expert',
        )
        self.target = make_user(
            email='target@example.com', username='target', pseudo='Target', verified=True,
        )
        LoginHistory.objects.create(user=self.target)
        LoginHistory.objects.create(user=self.target)

    def url(self):
        return f'/api/users/admin/users/{self.target.pk}/history/'

    def test_returns_login_count_and_connexions(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['data']['connexions']), 2)

    def test_unknown_user_returns_404(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get('/api/users/admin/users/9999/history/')
        self.assertEqual(r.status_code, 404)

    def test_non_expert_returns_403(self):
        non_expert = make_user(
            email='nex@example.com', username='nex', pseudo='Nex', verified=True,
        )
        self.client.force_authenticate(non_expert)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 403)
