import datetime
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from users.models import CustomUser
from .models import (
    Category, ConnectedObject, HistoriqueConso,
    TYPE_OBJET_CHOICES, SIGNAL_FORCE_CHOICES, MODE_CHOICES,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

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


# ── ConnectedObject — modèle ──────────────────────────────────────────────────

class ConnectedObjectModelTest(TestCase):

    def test_defaults(self):
        obj = make_object(unique_id='D001')
        self.assertEqual(obj.statut, 'actif')
        self.assertEqual(obj.type_objet, 'capteur')
        self.assertEqual(obj.signal_force, 'moyen')
        self.assertEqual(obj.mode, 'automatique')
        self.assertEqual(obj.batterie, 100)
        self.assertAlmostEqual(obj.consommation_kwh, 0.0)
        self.assertEqual(obj.attributs_specifiques, {})
        self.assertIsNone(obj.valeur_cible)
        self.assertIsNone(obj.category)

    def test_type_objet_tous_les_choix(self):
        for code, _ in TYPE_OBJET_CHOICES:
            obj = make_object(unique_id=f'T-{code}', type_objet=code)
            self.assertEqual(obj.type_objet, code)

    def test_signal_force_tous_les_choix(self):
        for code, _ in SIGNAL_FORCE_CHOICES:
            obj = make_object(unique_id=f'S-{code}', signal_force=code)
            self.assertEqual(obj.signal_force, code)

    def test_mode_tous_les_choix(self):
        for code, _ in MODE_CHOICES:
            obj = make_object(unique_id=f'M-{code}', mode=code)
            self.assertEqual(obj.mode, code)

    def test_valeur_actuelle_stocke_type_quelconque(self):
        obj = make_object(unique_id='VA01', valeur_actuelle={'temp': 21.5, 'unit': '°C'})
        obj.refresh_from_db()
        self.assertEqual(obj.valeur_actuelle['temp'], 21.5)
        # Scalaire
        obj.valeur_actuelle = 42
        obj.save()
        obj.refresh_from_db()
        self.assertEqual(obj.valeur_actuelle, 42)

    def test_valeur_cible_nullable_et_modifiable(self):
        obj = make_object(unique_id='VC01')
        self.assertIsNone(obj.valeur_cible)
        obj.valeur_cible = {'consigne': 22}
        obj.save()
        obj.refresh_from_db()
        self.assertEqual(obj.valeur_cible['consigne'], 22)

    def test_attributs_specifiques_propres_au_type(self):
        data = {'plage_temp': [15, 30], 'precision': 0.1, 'protocole': 'modbus'}
        obj = make_object(unique_id='AS01', attributs_specifiques=data)
        obj.refresh_from_db()
        self.assertEqual(obj.attributs_specifiques['plage_temp'], [15, 30])
        self.assertAlmostEqual(obj.attributs_specifiques['precision'], 0.1)

    def test_unique_id_est_unique(self):
        make_object(unique_id='U001')
        with self.assertRaises(IntegrityError):
            make_object(unique_id='U001', nom='Doublon')

    def test_derniere_interaction_auto_now(self):
        obj = make_object(unique_id='AI01')
        t1 = obj.derniere_interaction
        obj.nom = 'Modifié'
        obj.save()
        obj.refresh_from_db()
        self.assertGreaterEqual(obj.derniere_interaction, t1)

    def test_batterie_non_nullable_defaut_100(self):
        obj = make_object(unique_id='B001')
        self.assertEqual(obj.batterie, 100)
        obj.batterie = 42
        obj.save()
        obj.refresh_from_db()
        self.assertEqual(obj.batterie, 42)

    def test_category_optionnelle(self):
        cat = Category.objects.create(nom='Chauffage')
        obj = make_object(unique_id='C001', category=cat)
        obj.refresh_from_db()
        self.assertEqual(obj.category, cat)
        # SET_NULL à la suppression de la catégorie
        cat.delete()
        obj.refresh_from_db()
        self.assertIsNone(obj.category)

    def test_str(self):
        obj = make_object(unique_id='STR1', nom='Thermostat', zone='Salon')
        self.assertIn('Thermostat', str(obj))
        self.assertIn('Salon', str(obj))


# ── HistoriqueConso — modèle ──────────────────────────────────────────────────

class HistoriqueConsoModelTest(TestCase):

    def setUp(self):
        # Nettoyer les données du seed global
        HistoriqueConso.objects.all().delete()
        self.obj = make_object(unique_id='H001')

    def test_create_avec_datetime(self):
        h = HistoriqueConso.objects.create(
            objet=self.obj, date=timezone.now(), valeur=5.2,
        )
        self.assertAlmostEqual(h.valeur, 5.2)
        self.assertIsInstance(h.date, datetime.datetime)

    def test_cascade_delete(self):
        HistoriqueConso.objects.create(objet=self.obj, date=timezone.now(), valeur=3.0)
        pk = self.obj.pk
        self.obj.delete()
        self.assertFalse(HistoriqueConso.objects.filter(objet_id=pk).exists())

    def test_ordering_plus_recent_en_premier(self):
        now = timezone.now()
        HistoriqueConso.objects.create(objet=self.obj, date=now - datetime.timedelta(hours=2), valeur=1.0)
        HistoriqueConso.objects.create(objet=self.obj, date=now, valeur=3.0)
        HistoriqueConso.objects.create(objet=self.obj, date=now - datetime.timedelta(hours=1), valeur=2.0)
        vals = list(HistoriqueConso.objects.values_list('valeur', flat=True))
        self.assertEqual(vals, [3.0, 2.0, 1.0])

    def test_plusieurs_entrees_meme_objet(self):
        now = timezone.now()
        for i in range(3):
            HistoriqueConso.objects.create(
                objet=self.obj,
                date=now + datetime.timedelta(hours=i),
                valeur=float(i),
            )
        self.assertEqual(HistoriqueConso.objects.filter(objet=self.obj).count(), 3)


# ── API — GET + POST /api/objects/ ────────────────────────────────────────────

class ObjectListViewTest(APITestCase):
    URL = '/api/objects/'

    @classmethod
    def setUpTestData(cls):
        # Nettoyer les données du seed global
        ConnectedObject.objects.all().delete()
        
        cls.verified = make_user(verified=True)
        cls.avance = make_user(
            email='av@example.com', username='avance', pseudo='Avance',
            verified=True, level='avance',
        )
        cls.unverified = make_user(
            email='nv@example.com', username='nvuser', pseudo='NvUser',
        )

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

    def test_post_avance_creates_object(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'unique_id': 'OBJ-002', 'nom': 'Capteur', 'zone': 'Hall'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(ConnectedObject.objects.filter(unique_id='OBJ-002').exists())

    def test_post_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.post(self.URL, {'unique_id': 'OBJ-003', 'nom': 'Capteur', 'zone': 'Hall'})
        self.assertEqual(r.status_code, 403)

    def test_post_duplicate_unique_id_returns_400(self):
        make_object(unique_id='OBJ-001')
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'unique_id': 'OBJ-001', 'nom': 'Autre', 'zone': 'Hall'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_post_missing_required_field_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.post(self.URL, {'nom': 'Capteur'})
        self.assertEqual(r.status_code, 400)


# ── API — GET + PATCH /api/objects/<pk>/ ─────────────────────────────────────

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


# ── API — GET /api/objects/<pk>/history/ ─────────────────────────────────────

class ObjectHistoryViewTest(APITestCase):

    @classmethod
    def setUpTestData(cls):
        cls.verified = make_user(verified=True)
        cls.obj = make_object()
        HistoriqueConso.objects.create(
            objet=cls.obj, date=timezone.now(), valeur=12.5,
        )

    def url(self):
        return f'/api/objects/{self.obj.pk}/history/'

    def test_returns_history(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data['data']), 1)
        self.assertAlmostEqual(r.data['data'][0]['valeur'], 12.5)

    def test_returns_history_with_period_filter(self):
        self.client.force_authenticate(self.verified)
        # Créer une entrée hors de la période de 7 jours
        HistoriqueConso.objects.create(
            objet=self.obj, date=timezone.now() - datetime.timedelta(days=10), valeur=20.0
        )
        # Test sans filtre (par défaut 30 jours, donc 2 entrées)
        r_30d = self.client.get(self.url())
        self.assertEqual(len(r_30d.data['data']), 2)
        
        # Test avec filtre 7 jours (1 seule entrée)
        r_7d = self.client.get(self.url() + '?period=7d')
        self.assertEqual(len(r_7d.data['data']), 1)
        self.assertAlmostEqual(r_7d.data['data'][0]['valeur'], 12.5)

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
