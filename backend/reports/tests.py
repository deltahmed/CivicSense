from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from incidents.models import Incident
from objects.models import ConnectedObject, HistoriqueConso
from services.models import Service
from users.models import CustomUser, LoginHistory


def make_user(email='test@example.com', verified=True, level='debutant', **kwargs):
    pseudo = kwargs.pop('pseudo', email.split('@')[0])
    u = CustomUser.objects.create_user(
        email=email, username=email.split('@')[0], password='pwd',
        pseudo=pseudo, level=level, **kwargs,
    )
    if verified:
        u.is_verified = True
        u.save(update_fields=['is_verified'])
    return u


# ── UsageReportView ───────────────────────────────────────────────────────────

class UsageReportViewTest(APITestCase):
    URL = '/api/reports/usage/'

    @classmethod
    def setUpTestData(cls):
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
        self.assertEqual(self.client.get(self.URL).status_code, 401)

    def test_get_usage_report(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        self.assertEqual(r.data['period'], '30d')
        self.assertAlmostEqual(r.data['total_residence'], 75)
        objs = {o['id']: o for o in r.data['objects_data']}
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


# ── AdminStatsView ─────────────────────────────────────────────────────────────

class AdminStatsTest(APITestCase):
    URL = '/api/admin/stats/'

    @classmethod
    def setUpTestData(cls):
        # Nettoyage pour des comptes exacts et reproductibles
        CustomUser.objects.all().delete()   # cascade → LoginHistory
        ConnectedObject.objects.all().delete()  # cascade → HistoriqueConso
        Incident.objects.all().delete()

        cls.expert = make_user('exp@x.com', level='expert', pseudo='ExpertU')
        cls.deb = make_user('deb@x.com', pseudo='DebU')

        LoginHistory.objects.create(user=cls.expert)
        LoginHistory.objects.create(user=cls.deb)

        now = timezone.now()
        obj = ConnectedObject.objects.create(unique_id='ADM1', nom='AdminObj', type_objet='capteur')
        HistoriqueConso.objects.create(objet=obj, date=now - timedelta(days=3), valeur=15.0)
        HistoriqueConso.objects.create(objet=obj, date=now - timedelta(days=2), valeur=10.0)

        svc = Service.objects.create(nom='SvcAdm', categorie='Energie', niveau_requis='debutant')
        svc.objets_lies.set([obj])

        Incident.objects.create(auteur=cls.expert, type_incident='panne', description='open', statut='signale')
        Incident.objects.create(auteur=cls.deb, type_incident='autre', description='done', statut='resolu')

    def test_401_unauthenticated(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)

    def test_403_non_expert(self):
        self.client.force_authenticate(self.deb)
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_200_structure(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        for key in ('total_connexions', 'conso_totale_kwh', 'incidents',
                    'niveaux_utilisateurs', 'top_objets', 'top_services',
                    'connexions_semaine', 'conso_semaine'):
            self.assertIn(key, r.data)

    def test_aggregations(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        self.assertEqual(r.data['total_connexions'], 2)
        self.assertAlmostEqual(r.data['conso_totale_kwh'], 25.0)
        self.assertEqual(r.data['incidents']['ouverts'], 1)
        self.assertEqual(r.data['incidents']['resolus'], 1)

    def test_top_objets_shape(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        obj = r.data['top_objets'][0]
        self.assertIn('objet__nom', obj)
        self.assertIn('nb_entrees', obj)
        self.assertIn('total_conso', obj)

    def test_niveaux_utilisateurs(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        niveaux = {n['level']: n['count'] for n in r.data['niveaux_utilisateurs']}
        self.assertEqual(niveaux.get('expert'), 1)
        self.assertEqual(niveaux.get('debutant'), 1)

    def test_period_param(self):
        self.client.force_authenticate(self.expert)
        self.assertEqual(self.client.get(self.URL + '?period=7d').data['period'], '7d')
        self.assertEqual(self.client.get(self.URL + '?period=90d').data['period'], '90d')

    def test_period_7d_exclut_donnees_anciennes(self):
        """Une entrée dans la fenêtre 30j mais hors 7j ne doit pas être comptée en 7d."""
        self.client.force_authenticate(self.expert)
        obj = ConnectedObject.objects.get(unique_id='ADM1')
        # Créer une entrée, puis la dater à 15j (dans 30j, hors 7j)
        extra = HistoriqueConso.objects.create(objet=obj, date=timezone.now(), valeur=100.0)
        HistoriqueConso.objects.filter(pk=extra.pk).update(date=timezone.now() - timedelta(days=15))

        r7 = self.client.get(self.URL + '?period=7d')
        r30 = self.client.get(self.URL + '?period=30d')
        self.assertLess(r7.data['conso_totale_kwh'], r30.data['conso_totale_kwh'])


# ── AdminStatsExportView ───────────────────────────────────────────────────────

class AdminStatsExportTest(APITestCase):
    URL = '/api/admin/stats/export/'

    @classmethod
    def setUpTestData(cls):
        cls.expert = make_user('expx@x.com', level='expert', pseudo='ExpX')
        cls.deb = make_user('debx@x.com', pseudo='DebX')

    def test_csv_default_format(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertIn('text/csv', r['Content-Type'])
        self.assertIn(b'CivicSense', r.content)

    def test_csv_contient_sections(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL + '?fmt=csv')
        for section in (b'Total connexions', b'Top 5 objets', b'Top 5 services', b'Connexions par semaine'):
            self.assertIn(section, r.content)

    def test_pdf_export(self):
        self.client.force_authenticate(self.expert)
        r = self.client.get(self.URL + '?fmt=pdf')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertTrue(r.content.startswith(b'%PDF'))

    def test_403_non_expert(self):
        self.client.force_authenticate(self.deb)
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_401_unauthenticated(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)


# ── ExportReportView ───────────────────────────────────────────────────────────

class ExportReportViewTest(APITestCase):
    URL = '/api/reports/export/'

    @classmethod
    def setUpTestData(cls):
        ConnectedObject.objects.all().delete()
        Incident.objects.all().delete()

        cls.user = make_user('export@x.com', pseudo='ExportU')
        cls.unverified = make_user('unverif@x.com', verified=False, pseudo='Unverif')

        now = timezone.now()
        cls.obj = ConnectedObject.objects.create(unique_id='EXP1', nom='ExportObj', zone='Salon', type_objet='capteur')
        HistoriqueConso.objects.create(objet=cls.obj, date=now - timedelta(days=3), valeur=12.0)
        HistoriqueConso.objects.create(objet=cls.obj, date=now - timedelta(days=5), valeur=8.0)

        Incident.objects.create(auteur=cls.user, type_incident='panne', description='test', statut='signale')
        Incident.objects.create(auteur=cls.user, type_incident='autre', description='test', statut='resolu')

    def test_401_unauthenticated(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)

    def test_403_non_verified(self):
        self.client.force_authenticate(self.unverified)
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_csv_default(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertIn('text/csv', r['Content-Type'])
        self.assertIn(b'rapport.csv', r['Content-Disposition'].encode())

    def test_csv_format_param(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?format=csv')
        self.assertEqual(r.status_code, 200)
        self.assertIn('text/csv', r['Content-Type'])

    def test_csv_contenu(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?format=csv')
        for fragment in (b'CivicSense', b'Tableau des objets', b'Incidents', b'Objets en alerte'):
            self.assertIn(fragment, r.content)

    def test_csv_conso_totale(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?format=csv&period=30d')
        self.assertIn(b'20.00', r.content)

    def test_pdf_format_param(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?format=pdf')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertTrue(r.content.startswith(b'%PDF'))

    def test_pdf_attachment_header(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?format=pdf')
        self.assertIn('rapport.pdf', r['Content-Disposition'])

    def test_period_filter(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL + '?format=csv&period=7d')
        self.assertEqual(r.status_code, 200)
        self.assertIn(b'7d', r.content)
