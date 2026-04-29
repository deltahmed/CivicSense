import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

User = get_user_model()
fake = Faker('fr_FR')

SEED_PASSWORD = 'CivicSense2024!'


class Command(BaseCommand):
    help = 'Seed the database with realistic test data (users, objets, incidents, annonces).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Supprime toutes les données seedées avant de re-seeder.',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self._clear()

        categories = self._seed_categories()
        users = self._seed_users()
        objects = self._seed_objects(categories)
        self._seed_historique(objects)
        self._seed_announcements(users)
        self._seed_incidents(users, objects)
        self._seed_deletion_request(users, objects)

        self.stdout.write(self.style.SUCCESS('Base de données seedée avec succès.'))

    # ── Clear ────────────────────────────────────────────────────────────────

    def _clear(self):
        from announcements.models import Announcement, DeletionRequest
        from incidents.models import HistoriqueStatutIncident, Incident
        from objects.models import Category, ConnectedObject, HistoriqueConso

        DeletionRequest.objects.all().delete()
        HistoriqueStatutIncident.objects.all().delete()
        Incident.objects.all().delete()
        Announcement.objects.all().delete()
        HistoriqueConso.objects.all().delete()
        ConnectedObject.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()
        self.stdout.write('  Données précédentes supprimées.')

    # ── Seeders ──────────────────────────────────────────────────────────────

    def _seed_categories(self):
        from objects.models import Category

        specs = [
            ('Énergie', "Gestion de l'énergie et des compteurs", 'bolt'),
            ('Sécurité', "Surveillance et contrôle d'accès", 'shield'),
            ('Confort', 'Éclairage et ambiance', 'lightbulb'),
            ("Qualité de l'air", 'Capteurs environnementaux', 'air'),
            ('Mobilité', 'Bornes de recharge électrique', 'ev_station'),
        ]
        result = {}
        for nom, desc, icone in specs:
            cat, _ = Category.objects.get_or_create(
                nom=nom, defaults={'description': desc, 'icone': icone},
            )
            result[nom] = cat
        self.stdout.write(f'  {len(result)} catégories seedées.')
        return result

    def _seed_users(self):
        users = []

        admin, created = User.objects.get_or_create(
            email='admin@civicsense.fr',
            defaults={
                'username': 'admin',
                'pseudo': 'Admin',
                'is_superuser': True,
                'is_staff': True,
                'is_verified': True,
                'level': 'expert',
                'type_membre': 'syndic',
                'points': 5000.0,
                'login_count': 150,
                'action_count': 500,
            },
        )
        if created:
            admin.set_password(SEED_PASSWORD)
            admin.save()
        users.append(admin)

        for _ in range(2):
            users.append(self._make_user('avance', random.uniform(500, 1000)))
        for _ in range(3):
            users.append(self._make_user('intermediaire', random.uniform(100, 500)))
        for _ in range(2):
            users.append(self._make_user('debutant', random.uniform(0, 100)))
        # 1 non vérifié (pour tester la validation)
        users.append(self._make_user('debutant', 0.0, is_verified=False))

        self.stdout.write(f'  {len(users)} utilisateurs seedés.')
        return users

    def _make_user(self, level, points=0.0, is_verified=True):
        u = User(
            email=fake.unique.email(),
            username=fake.unique.user_name()[:30],
            pseudo=f"{fake.name()} {random.randint(1000, 99999)}"[:50],
            level=level,
            is_verified=is_verified,
            type_membre=random.choice(['resident', 'referent']),
            genre=random.choice(['homme', 'femme', 'autre', 'nr']),
            points=points,
            login_count=random.randint(0, 50),
            action_count=random.randint(0, 100),
        )
        u.set_password(SEED_PASSWORD)
        u.save()
        return u

    def _seed_objects(self, categories):
        from objects.models import ConnectedObject

        # (nom, type_objet, zone, cat_key, connectivite, valeur_actuelle, attributs_specifiques)
        specs = [
            (
                'Thermostat Salon', 'thermostat', 'Salon', 'Énergie', 'wifi',
                {'temperature': 21.5, 'humidite': 45},
                {'consigne': 22},
            ),
            (
                'Thermostat Chambre', 'thermostat', 'Chambre principale', 'Énergie', 'wifi',
                {'temperature': 19.0, 'humidite': 50},
                {'consigne': 20},
            ),
            (
                'Compteur Électrique Principal', 'compteur', 'Local technique', 'Énergie', 'ethernet',
                {'kwh': 1240.5},
                {'tarif': 'heures_creuses'},
            ),
            (
                'Compteur Électrique Commun', 'compteur', 'Couloir RDC', 'Énergie', 'ethernet',
                {'kwh': 340.2},
                {'tarif': 'base'},
            ),
            (
                'Compteur Eau', 'compteur', 'Cave', 'Énergie', 'zigbee',
                {'litres': 5820.0},
                {'diametre': '15mm'},
            ),
            (
                'Caméra Entrée', 'camera', 'Entrée principale', 'Sécurité', 'wifi',
                {'motion_detected': False, 'recording': True},
                {'resolution': '1080p', 'angle': 120},
            ),
            (
                'Caméra Parking', 'camera', 'Parking souterrain', 'Sécurité', 'ethernet',
                {'motion_detected': False, 'recording': True},
                {'resolution': '4K', 'angle': 180},
            ),
            (
                'Éclairage Couloir', 'eclairage', 'Couloir 1er étage', 'Confort', 'zigbee',
                {'allume': True, 'luminosite': 80},
                {'couleur': 'blanc_chaud'},
            ),
            (
                'Digicode Entrée', 'capteur', 'Entrée principale', 'Sécurité', 'wifi',
                {'verrouille': True},
                {'tentatives_echouees': 0},
            ),
            (
                'Capteur CO2 Salle Commune', 'capteur', 'Salle commune', "Qualité de l'air", 'zigbee',
                {'co2_ppm': 650, 'temperature': 20.5},
                {'seuil_alerte': 1000},
            ),
            (
                'Borne Recharge VE', 'prise', 'Parking souterrain', 'Mobilité', 'wifi',
                {'puissance_kw': 7.4, 'en_charge': False},
                {'type_prise': 'type2', 'amperage': 32},
            ),
        ]

        marques = ['Somfy', 'Legrand', 'Schneider', 'Netatmo', 'Honeywell', 'Philips', 'Bosch']
        result = []
        for nom, type_objet, zone, cat_key, connectivite, valeur_actuelle, attributs in specs:
            obj = ConnectedObject(
                unique_id=f'CS-{fake.unique.bothify(text="??##??##").upper()}',
                nom=nom,
                description=fake.sentence(nb_words=10),
                marque=random.choice(marques),
                type_objet=type_objet,
                category=categories.get(cat_key),
                zone=zone,
                statut=random.choice(['actif', 'actif', 'actif', 'inactif', 'maintenance']),
                connectivite=connectivite,
                signal_force=random.choice(['fort', 'fort', 'moyen', 'faible']),
                consommation_kwh=round(random.uniform(0.5, 500.0), 2),
                batterie=random.randint(20, 100),
                valeur_actuelle=valeur_actuelle,
                valeur_cible=None,
                mode=random.choice(['automatique', 'manuel']),
                attributs_specifiques=attributs,
            )
            obj.save()
            result.append(obj)

        self.stdout.write(f'  {len(result)} objets connectés seedés.')
        return result

    def _seed_historique(self, objects):
        from objects.models import HistoriqueConso

        now = timezone.now()
        entries = []
        for obj in objects:
            if obj.type_objet == 'thermostat':
                low, high = 15.0, 26.0
            elif obj.type_objet == 'compteur' and 'Eau' in obj.nom:
                low, high = 80.0, 250.0      # litres/jour
            elif obj.type_objet == 'compteur':
                low, high = 5.0, 30.0        # kWh/jour
            elif 'CO2' in obj.nom:
                low, high = 400.0, 1200.0    # ppm
            elif obj.type_objet == 'prise':
                low, high = 0.0, 7.4         # kW
            else:
                low, high = 0.0, 100.0

            for day in range(30):
                base = now - timedelta(days=day)
                for hour in (0, 6, 12, 18):
                    entries.append(HistoriqueConso(
                        objet=obj,
                        date=base.replace(hour=hour, minute=0, second=0, microsecond=0),
                        valeur=round(random.uniform(low, high), 2),
                    ))

        HistoriqueConso.objects.bulk_create(entries)
        per_obj = len(entries) // len(objects)
        self.stdout.write(f'  {len(entries)} entrées historique seedées ({per_obj} par objet).')

    def _seed_announcements(self, users):
        from announcements.models import Announcement

        verified = [u for u in users if u.is_verified]
        data = [
            ('Réunion de copropriété', fake.paragraph(nb_sentences=3), True),
            ('Travaux ascenseur — semaine prochaine', fake.paragraph(nb_sentences=4), True),
            ('Résultats vote budget annuel', fake.paragraph(nb_sentences=5), False),
            ('Note interne : accès parking temporaire', fake.paragraph(nb_sentences=2), False),
            ('Rappel règlement intérieur', fake.paragraph(nb_sentences=3), False),
        ]
        for titre, contenu, visible in data:
            Announcement.objects.get_or_create(
                titre=titre,
                defaults={'contenu': contenu, 'auteur': random.choice(verified), 'visible': visible},
            )
        self.stdout.write('  5 annonces seedées (2 publiques, 3 privées).')

    def _seed_incidents(self, users, objects):
        from incidents.models import HistoriqueStatutIncident, Incident

        verified = [u for u in users if u.is_verified]
        for statut, type_incident in [
            ('signale', 'panne'),
            ('pris_en_charge', 'fuite'),
            ('resolu', 'securite'),
        ]:
            incident = Incident.objects.create(
                auteur=random.choice(verified),
                objet_lie=random.choice(objects),
                type_incident=type_incident,
                description=fake.paragraph(nb_sentences=3),
                statut=statut,
            )
            HistoriqueStatutIncident.objects.create(
                incident=incident,
                statut=statut,
                commentaire=fake.sentence(),
            )
        self.stdout.write('  3 incidents seedés (signalé, pris en charge, résolu).')

    def _seed_deletion_request(self, users, objects):
        from announcements.models import DeletionRequest

        verified = [u for u in users if u.is_verified]
        DeletionRequest.objects.get_or_create(
            demandeur=verified[1],
            objet=objects[-1],
            defaults={'motif': fake.paragraph(nb_sentences=2), 'statut': 'en_attente'},
        )
        self.stdout.write('  1 demande de suppression seedée.')
