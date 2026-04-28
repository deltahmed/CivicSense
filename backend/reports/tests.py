from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from users.models import CustomUser
from objects.models import ConnectedObject, HistoriqueConso
from incidents.models import Incident

def make_user(email='test@example.com', verified=True):
    user = CustomUser.objects.create_user(email=email, username=email.split('@')[0], password='pwd')
    if verified:
        user.is_verified = True
        user.save()
    return user

class UsageReportViewTest(APITestCase):
    URL = '/api/reports/usage/'

    @classmethod
    def setUpTestData(cls):
        # Nettoyage des données du seed global pour éviter les conflits de calcul
        ConnectedObject.objects.all().delete()

        cls.user = make_user()
        cls.obj1 = ConnectedObject.objects.create(unique_id='O1', nom='Obj 1', zone='Salon', type_objet='capteur')
        cls.obj2 = ConnectedObject.objects.create(unique_id='O2', nom='Obj 2', zone='Cuisine', type_objet='thermostat')
        
        now = timezone.now()
        HistoriqueConso.objects.create(objet=cls.obj1, date=now - timedelta(days=5), valeur=10)
        HistoriqueConso.objects.create(objet=cls.obj1, date=now - timedelta(days=10), valeur=15)
        HistoriqueConso.objects.create(objet=cls.obj1, date=now - timedelta(days=40), valeur=100)
        HistoriqueConso.objects.create(objet=cls.obj2, date=now - timedelta(days=1), valeur=50)

        Incident.objects.create(auteur=cls.user, objet_lie=cls.obj1, type_incident='panne', description='Test')

    def test_get_unauthenticated(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 401)

    def test_get_usage_report(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        
        data = r.data
        self.assertTrue(data['success'])
        self.assertEqual(data['period'], '30d')
        self.assertAlmostEqual(data['total_residence'], 75)
        
        objs = {o['id']: o for o in data['objects_data']}
        self.assertAlmostEqual(objs[self.obj1.id]['total_conso'], 25)
        self.assertEqual(objs[self.obj1.id]['interactions'], 1)
        self.assertAlmostEqual(objs[self.obj2.id]['total_conso'], 50)

    def test_get_usage_report_with_period_7d(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?period=7d')
        self.assertAlmostEqual(r.data['total_residence'], 60)

    def test_get_usage_report_with_zone_filter(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?zone=Salon')
        self.assertAlmostEqual(r.data['total_residence'], 25)
        self.assertEqual(len(r.data['objects_data']), 1)