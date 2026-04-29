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


# ── API — GET /api/objects/alerts/ ───────────────────────────────────────────

class ObjectAlertsViewTest(APITestCase):
    URL = '/api/objects/alerts/'

    @classmethod
    def setUpTestData(cls):
        ConnectedObject.objects.all().delete()
        HistoriqueConso.objects.all().delete()

        cls.verified = make_user(email='alert@x.com', verified=True)
        now = timezone.now()
        
        # Obj 1: Efficace (score = 1.0) & Récent
        cls.obj_efficace = make_object(unique_id='O1', nom='Efficace')
        ConnectedObject.objects.filter(pk=cls.obj_efficace.pk).update(derniere_interaction=now - datetime.timedelta(days=2))
        HistoriqueConso.objects.create(objet=cls.obj_efficace, date=now - datetime.timedelta(days=5), valeur=1.0)

        # Obj 2: A surveiller (score = 0.2)
        cls.obj_surveiller = make_object(unique_id='O2', nom='Surveiller')
        ConnectedObject.objects.filter(pk=cls.obj_surveiller.pk).update(derniere_interaction=now - datetime.timedelta(days=2))
        HistoriqueConso.objects.create(objet=cls.obj_surveiller, date=now - datetime.timedelta(days=5), valeur=5.0)

        # Obj 3: Inefficace (score = 0.05) & Maintenance (vieux)
        cls.obj_inefficace = make_object(unique_id='O3', nom='Inefficace')
        # QuerySet.update() bypasse auto_now=True pour simuler une ancienne interaction
        ConnectedObject.objects.filter(pk=cls.obj_inefficace.pk).update(derniere_interaction=now - datetime.timedelta(days=10))
        HistoriqueConso.objects.create(objet=cls.obj_inefficace, date=now - datetime.timedelta(days=5), valeur=20.0)

        # Obj 4: Zero conso (score = 0 -> inefficace)
        cls.obj_zero = make_object(unique_id='O4', nom='Zero')
        ConnectedObject.objects.filter(pk=cls.obj_zero.pk).update(derniere_interaction=now - datetime.timedelta(days=2))

    def test_get_alerts(self):
        self.client.force_authenticate(self.verified)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        
        data = {item['unique_id']: item for item in r.data['data']}
        
        self.assertEqual(data['O1']['efficacite'], 'efficace')
        self.assertFalse(data['O1']['maintenance_conseillee'])
        
        self.assertEqual(data['O2']['efficacite'], 'à surveiller')
        self.assertEqual(data['O3']['efficacite'], 'inefficace')
        self.assertTrue(data['O3']['maintenance_conseillee'])
        
        # Sécurité test "Division par zero"
        self.assertEqual(data['O4']['score'], 0.0)


# ── API — PATCH /api/objects/<pk>/ (zone) ────────────────────────────────────

class ObjectDetailZonePatchTest(APITestCase):

    @classmethod
    def setUpTestData(cls):
        cls.avance = make_user(
            email='avz@example.com', username='avancez', pseudo='AvanceZ',
            verified=True, level='avance',
        )
        cls.verified = make_user(
            email='vfz@example.com', username='verifiedz', pseudo='VerifiedZ',
            verified=True,
        )
        cls.obj = make_object(unique_id='ZN-001', zone='Cuisine')

    def url(self):
        return f'/api/objects/{self.obj.pk}/'

    def test_patch_zone_avance_returns_200_with_new_zone(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.url(), {'zone': 'Salon'})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        self.assertEqual(r.data['data']['zone'], 'Salon')

    def test_patch_zone_persists_in_db(self):
        self.client.force_authenticate(self.avance)
        self.client.patch(self.url(), {'zone': 'Bureau'})
        self.obj.refresh_from_db()
        self.assertEqual(self.obj.zone, 'Bureau')

    def test_patch_zone_verified_not_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.patch(self.url(), {'zone': 'Garage'})
        self.assertEqual(r.status_code, 403)

    def test_patch_zone_unauthenticated_returns_401(self):
        r = self.client.patch(self.url(), {'zone': 'Salon'})
        self.assertEqual(r.status_code, 401)

    def test_patch_zone_partial_ne_modifie_pas_les_autres_champs(self):
        self.client.force_authenticate(self.avance)
        nom_avant = self.obj.nom
        self.client.patch(self.url(), {'zone': 'Jardin'})
        self.obj.refresh_from_db()
        self.assertEqual(self.obj.nom, nom_avant)


# ── API — PATCH /api/objects/<pk>/config/ ────────────────────────────────────

class ObjectConfigViewTest(APITestCase):
    BASE = '/api/objects/'

    @classmethod
    def setUpTestData(cls):
        cls.avance = make_user(
            email='avc@example.com', username='avancec', pseudo='AvanceC',
            verified=True, level='avance',
        )
        cls.verified = make_user(
            email='vfc@example.com', username='verifiedc', pseudo='VerifiedC',
            verified=True,
        )
        cls.thermostat = make_object(unique_id='CFG-THERM', type_objet='thermostat')
        cls.eclairage = make_object(unique_id='CFG-ECL', type_objet='eclairage')
        cls.capteur = make_object(unique_id='CFG-CAPT', type_objet='capteur')
        cls.compteur = make_object(unique_id='CFG-COMP', type_objet='compteur')
        cls.camera = make_object(unique_id='CFG-CAM', type_objet='camera')

    def config_url(self, obj):
        return f'{self.BASE}{obj.pk}/config/'

    # ── Succès par type ──

    def test_patch_thermostat_temperature_et_mode(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'temperature_cible': 21, 'mode': 'auto'}}
        r = self.client.patch(self.config_url(self.thermostat), payload, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        attrs = r.data['data']['attributs_specifiques']
        self.assertEqual(attrs['temperature_cible'], 21)
        self.assertEqual(attrs['mode'], 'auto')

    def test_patch_thermostat_plage_horaire(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'plage_horaire': '08:00-22:00'}}
        r = self.client.patch(self.config_url(self.thermostat), payload, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['data']['attributs_specifiques']['plage_horaire'], '08:00-22:00')

    def test_patch_eclairage_luminosite_et_horaires(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'luminosite': 80, 'horaire_allumage': '07:00', 'horaire_extinction': '23:00'}}
        r = self.client.patch(self.config_url(self.eclairage), payload, format='json')
        self.assertEqual(r.status_code, 200)
        attrs = r.data['data']['attributs_specifiques']
        self.assertEqual(attrs['luminosite'], 80)
        self.assertEqual(attrs['horaire_allumage'], '07:00')

    def test_patch_capteur_seuil_alerte_ppm(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'seuil_alerte_ppm': 1000}}
        r = self.client.patch(self.config_url(self.capteur), payload, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['data']['attributs_specifiques']['seuil_alerte_ppm'], 1000)

    def test_patch_compteur_conso_max(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'conso_max_autorisee_kwh': 50.0}}
        r = self.client.patch(self.config_url(self.compteur), payload, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertAlmostEqual(r.data['data']['attributs_specifiques']['conso_max_autorisee_kwh'], 50.0)

    def test_patch_attrs_vides_ok(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.config_url(self.thermostat), {'attributs_specifiques': {}}, format='json')
        self.assertEqual(r.status_code, 200)

    # ── Fusion (merge) ──

    def test_patch_merge_conserve_attrs_existants(self):
        obj = make_object(
            unique_id='CFG-MERGE', type_objet='thermostat',
            attributs_specifiques={'temperature_cible': 20},
        )
        self.client.force_authenticate(self.avance)
        r = self.client.patch(f'{self.BASE}{obj.pk}/config/', {'attributs_specifiques': {'mode': 'manuel'}}, format='json')
        self.assertEqual(r.status_code, 200)
        attrs = r.data['data']['attributs_specifiques']
        self.assertEqual(attrs['temperature_cible'], 20)
        self.assertEqual(attrs['mode'], 'manuel')

    def test_patch_merge_ecrase_valeur_existante(self):
        obj = make_object(
            unique_id='CFG-OVER', type_objet='capteur',
            attributs_specifiques={'seuil_alerte_ppm': 800},
        )
        self.client.force_authenticate(self.avance)
        r = self.client.patch(f'{self.BASE}{obj.pk}/config/', {'attributs_specifiques': {'seuil_alerte_ppm': 1200}}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['data']['attributs_specifiques']['seuil_alerte_ppm'], 1200)

    # ── Erreurs de validation ──

    def test_patch_cle_inconnue_returns_400(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'cle_inconnue': 'valeur'}}
        r = self.client.patch(self.config_url(self.thermostat), payload, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])
        self.assertIn('thermostat', r.data['message'])

    def test_patch_cle_mauvais_type_returns_400(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'luminosite': 80}}
        r = self.client.patch(self.config_url(self.thermostat), payload, format='json')
        self.assertEqual(r.status_code, 400)

    def test_patch_attributs_non_dict_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.config_url(self.thermostat), {'attributs_specifiques': 'mauvais'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])

    def test_patch_attributs_absents_returns_400(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(self.config_url(self.thermostat), {}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_patch_type_sans_cles_autorisees_returns_400_si_body_non_vide(self):
        self.client.force_authenticate(self.avance)
        payload = {'attributs_specifiques': {'quelque_chose': 'valeur'}}
        r = self.client.patch(self.config_url(self.camera), payload, format='json')
        self.assertEqual(r.status_code, 400)

    # ── Permissions ──

    def test_patch_inconnu_returns_404(self):
        self.client.force_authenticate(self.avance)
        r = self.client.patch(f'{self.BASE}9999/config/', {'attributs_specifiques': {}}, format='json')
        self.assertEqual(r.status_code, 404)

    def test_patch_non_authentifie_returns_401(self):
        r = self.client.patch(self.config_url(self.thermostat), {'attributs_specifiques': {}}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_patch_verified_non_avance_returns_403(self):
        self.client.force_authenticate(self.verified)
        r = self.client.patch(
            self.config_url(self.thermostat),
            {'attributs_specifiques': {'temperature_cible': 22}},
            format='json',
        )
        self.assertEqual(r.status_code, 403)


# ── API — Filtres GET /api/objects/ ──────────────────────────────────────────

class ObjectListFilterTest(APITestCase):
    URL = '/api/objects/'

    @classmethod
    def setUpTestData(cls):
        ConnectedObject.objects.all().delete()
        cls.user = make_user(email='filt@x.com', username='filtuser', pseudo='FiltUser', verified=True)

        cls.obj1 = make_object(
            unique_id='F001', nom='Lampadaire LED',
            description='Éclairage extérieur solaire', marque='Philips',
            type_objet='eclairage', statut='actif', zone='Salon',
        )
        cls.obj2 = make_object(
            unique_id='F002', nom='Thermostat Pro',
            description='Régulation thermique intelligente', marque='Nest',
            type_objet='thermostat', statut='inactif', zone='Cuisine',
        )
        cls.obj3 = make_object(
            unique_id='F003', nom='Capteur CO2',
            description='Mesure qualité air ambiant', marque='Philips',
            type_objet='capteur', statut='maintenance', zone='Salon',
        )

    def test_no_filter_returns_all(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        self.assertEqual(len(r.data['data']), 3)

    def test_search_by_nom(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'search': 'lampadaire'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertIn('F001', ids)
        self.assertNotIn('F002', ids)
        self.assertNotIn('F003', ids)

    def test_search_by_description(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'search': 'thermique'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertEqual(ids, ['F002'])

    def test_search_case_insensitive(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'search': 'LAMPADAIRE'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertIn('F001', ids)

    def test_search_matches_description_not_nom(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'search': 'solaire'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertIn('F001', ids)
        self.assertEqual(len(ids), 1)

    def test_filter_marque_exact(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'marque': 'Philips'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertIn('F001', ids)
        self.assertIn('F003', ids)
        self.assertNotIn('F002', ids)

    def test_filter_marque_no_partial_match(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'marque': 'Phil'})
        self.assertEqual(len(r.data['data']), 0)

    def test_filter_type_objet(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'type_objet': 'thermostat'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertEqual(ids, ['F002'])

    def test_filter_statut_actif(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'statut': 'actif'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertEqual(ids, ['F001'])

    def test_filter_statut_maintenance(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'statut': 'maintenance'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertEqual(ids, ['F003'])

    def test_filter_zone(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'zone': 'Salon'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertIn('F001', ids)
        self.assertIn('F003', ids)
        self.assertNotIn('F002', ids)

    def test_combined_search_and_statut(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'search': 'Capteur', 'statut': 'maintenance'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertEqual(ids, ['F003'])

    def test_combined_marque_and_zone(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'marque': 'Philips', 'zone': 'Salon'})
        ids = [o['unique_id'] for o in r.data['data']]
        self.assertIn('F001', ids)
        self.assertIn('F003', ids)
        self.assertEqual(len(ids), 2)

    def test_combined_type_and_zone_no_match(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'type_objet': 'thermostat', 'zone': 'Salon'})
        self.assertEqual(len(r.data['data']), 0)

    def test_no_match_returns_empty_list(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'marque': 'Marque_Inexistante'})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['success'])
        self.assertEqual(len(r.data['data']), 0)

    def test_empty_search_param_ignored(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.URL, {'search': '   '})
        self.assertEqual(len(r.data['data']), 3)

    def test_unauthenticated_with_filter_returns_401(self):
        r = self.client.get(self.URL, {'search': 'test'})
        self.assertEqual(r.status_code, 401)


# ── API — historique_recent dans GET /api/objects/<pk>/ ──────────────────────

class ObjectDetailHistoriqueTest(APITestCase):

    @classmethod
    def setUpTestData(cls):
        cls.user = make_user(email='hr@x.com', username='hruser', pseudo='HRUser', verified=True)
        cls.obj = make_object(unique_id='HR-001')
        now = timezone.now()
        for i in range(7):
            HistoriqueConso.objects.create(
                objet=cls.obj,
                date=now - datetime.timedelta(hours=i),
                valeur=float(i),
            )

    def url(self, pk=None):
        return f'/api/objects/{pk or self.obj.pk}/'

    def test_response_contains_historique_recent(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url())
        self.assertEqual(r.status_code, 200)
        self.assertIn('historique_recent', r.data['data'])

    def test_historique_recent_max_5_entries(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url())
        self.assertEqual(len(r.data['data']['historique_recent']), 5)

    def test_historique_recent_ordered_most_recent_first(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url())
        dates = [h['date'] for h in r.data['data']['historique_recent']]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_historique_recent_empty_when_no_history(self):
        obj2 = make_object(unique_id='HR-002')
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url(pk=obj2.pk))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(list(r.data['data']['historique_recent']), [])

    def test_historique_recent_has_required_fields(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url())
        entry = r.data['data']['historique_recent'][0]
        self.assertIn('id', entry)
        self.assertIn('date', entry)
        self.assertIn('valeur', entry)
        self.assertIn('objet', entry)

    def test_historique_recent_fewer_than_5_when_less_history(self):
        obj3 = make_object(unique_id='HR-003')
        HistoriqueConso.objects.create(objet=obj3, date=timezone.now(), valeur=1.0)
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url(pk=obj3.pk))
        self.assertEqual(len(r.data['data']['historique_recent']), 1)

    def test_object_attributes_still_present(self):
        self.client.force_authenticate(self.user)
        r = self.client.get(self.url())
        data = r.data['data']
        self.assertIn('nom', data)
        self.assertIn('zone', data)
        self.assertIn('statut', data)
        self.assertIn('type_objet', data)


class PublicSearchObjectsTestCase(APITestCase):
    """Tests pour la recherche publique des équipements"""

    def setUp(self):
        # Nettoyer la base de données pour éviter les doublons de tests précédents
        ConnectedObject.objects.all().delete()
        Category.objects.all().delete()
        
        self.list_url = '/api/objects/search/'
        
        # Créer une catégorie
        self.category = Category.objects.create(
            nom='Climat',
            description='Gestion climatique'
        )
        
        # Créer des objets de test
        self.obj_actif = ConnectedObject.objects.create(
            unique_id='thermo_01',
            nom='Thermostat Salon',
            description='Gestion température salon',
            type_objet='thermostat',
            zone='Salon',
            statut='actif',
            category=self.category
        )
        
        self.obj_inactif = ConnectedObject.objects.create(
            unique_id='cam_01',
            nom='Caméra Entrée',
            description='Surveillance entrée',
            type_objet='camera',
            zone='RDC',
            statut='inactif',
            category=self.category
        )

    def test_search_public_no_auth_required(self):
        """Vérifier que la recherche est publique"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

    def test_search_returns_all_objects_default(self):
        """Test recherche sans filtres"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 2)

    def test_filter_by_type_objet(self):
        """Test filtrage par type d'objet"""
        response = self.client.get(f'{self.list_url}?type_objet=thermostat')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['data'][0]['nom'], 'Thermostat Salon')

    def test_filter_by_statut(self):
        """Test filtrage par statut"""
        response = self.client.get(f'{self.list_url}?statut=actif')
        self.assertEqual(response.data['count'], 1)

    def test_filter_by_zone(self):
        """Test filtrage par zone"""
        response = self.client.get(f'{self.list_url}?zone=Salon')
        self.assertEqual(response.data['count'], 1)

    def test_search_by_name(self):
        """Test recherche par nom"""
        response = self.client.get(f'{self.list_url}?search=Thermostat')
        self.assertEqual(response.data['count'], 1)

    def test_search_by_description(self):
        """Test recherche dans description"""
        response = self.client.get(f'{self.list_url}?search=température')
        self.assertEqual(response.data['count'], 1)

    def test_combined_filters(self):
        """Test combinaison de plusieurs filtres"""
        response = self.client.get(f'{self.list_url}?type_objet=camera&statut=inactif')
        self.assertEqual(response.data['count'], 1)

    def test_no_sensitive_data_exposed(self):
        """Vérifier que les données sensibles ne sont pas exposées"""
        response = self.client.get(self.list_url)
        obj_data = response.data['data'][0]
        
        # Champs publics présents
        self.assertIn('nom', obj_data)
        self.assertIn('type_objet', obj_data)
        self.assertIn('zone', obj_data)
        
        # Données sensibles absentes
        self.assertNotIn('consommation_kwh', obj_data)
        self.assertNotIn('valeur_actuelle', obj_data)
        self.assertNotIn('valeur_cible', obj_data)





