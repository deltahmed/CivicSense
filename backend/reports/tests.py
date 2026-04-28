from rest_framework.test import APITestCase
from users.models import CustomUser
from objects.models import ConnectedObject


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
# GET /api/reports/objects/csv/
# ---------------------------------------------------------------------------

class ExportObjectsCSVTest(APITestCase):
    URL = '/api/reports/objects/csv/'

    def setUp(self):
        self.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        self.verified = make_user(verified=True)

    def test_avance_gets_csv_200(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)

    def test_response_content_type_csv(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertIn('text/csv', r['Content-Type'])

    def test_response_has_attachment_header(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertIn('attachment', r['Content-Disposition'])
        self.assertIn('objets.csv', r['Content-Disposition'])

    def test_csv_contains_header_row(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        content = r.content.decode('utf-8')
        self.assertIn('Nom', content)
        self.assertIn('Zone', content)

    def test_csv_contains_object_data(self):
        make_object(unique_id='OBJ-001', nom='Capteur CO2', zone='Hall')
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        content = r.content.decode('utf-8')
        self.assertIn('Capteur CO2', content)
        self.assertIn('Hall', content)

    def test_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    def test_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)


# ---------------------------------------------------------------------------
# GET /api/reports/objects/pdf/
# ---------------------------------------------------------------------------

class ExportObjectsPDFTest(APITestCase):
    URL = '/api/reports/objects/pdf/'

    def setUp(self):
        self.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        self.verified = make_user(verified=True)

    def test_avance_gets_pdf_200(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)

    def test_response_content_type_pdf(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertEqual(r['Content-Type'], 'application/pdf')

    def test_response_has_attachment_header(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertIn('attachment', r['Content-Disposition'])
        self.assertIn('objets.pdf', r['Content-Disposition'])

    def test_pdf_starts_with_magic_bytes(self):
        self.client.force_authenticate(self.avance)
        r = self.client.get(self.URL)
        self.assertTrue(r.content.startswith(b'%PDF'))

    def test_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    def test_unauthenticated_returns_401(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)
