import random
from datetime import timedelta

import psycopg2
from psycopg2 import sql

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

User = get_user_model()

SEED_PASSWORD = 'SmartResi2025!'

# Comptes fixes avec des credentials clairs
FIXED_USERS = [
    {
        'email': 'admin@smartresi.fr',
        'username': 'admin.dupont',
        'pseudo': 'AdminDupont',
        'first_name': 'Pierre',
        'last_name': 'Dupont',
        'level': 'expert',
        'type_membre': 'syndic',
        'points': 5000.0,
        'login_count': 210,
        'action_count': 680,
        'is_superuser': True,
        'is_staff': True,
        'is_verified': True,
        'genre': 'homme',
    },
    {
        'email': 'demo@smartresi.fr',
        'username': 'demo.martin',
        'pseudo': 'SophieM',
        'first_name': 'Sophie',
        'last_name': 'Martin',
        'level': 'avance',
        'type_membre': 'referent',
        'points': 720.0,
        'login_count': 45,
        'action_count': 130,
        'is_superuser': False,
        'is_staff': False,
        'is_verified': True,
        'genre': 'femme',
    },
    {
        'email': 'resident@smartresi.fr',
        'username': 'lucas.bernard',
        'pseudo': 'LucasB',
        'first_name': 'Lucas',
        'last_name': 'Bernard',
        'level': 'intermediaire',
        'type_membre': 'resident',
        'points': 215.0,
        'login_count': 18,
        'action_count': 40,
        'is_superuser': False,
        'is_staff': False,
        'is_verified': True,
        'genre': 'homme',
    },
]

# Résidents supplémentaires réalistes
EXTRA_USERS = [
    ('emma.leroy@smartresi.fr',   'EmmaL',    'Emma',    'Leroy',    'avance',        'resident', 880.0,  'femme'),
    ('thomas.petit@smartresi.fr', 'ThomasP',  'Thomas',  'Petit',    'intermediaire', 'resident', 310.0,  'homme'),
    ('camille.roux@smartresi.fr',  'CamilleR', 'Camille', 'Roux',     'debutant',      'resident',  55.0,  'femme'),
    ('maxime.simon@smartresi.fr',  'MaxS',     'Maxime',  'Simon',    'debutant',      'resident',  12.0,  'homme'),
    ('julie.moreau@smartresi.fr',  'JulieM',   'Julie',   'Moreau',   'intermediaire', 'referent', 420.0,  'femme'),
    ('nadia.tahir@smartresi.fr',   'NadiaT',   'Nadia',   'Tahir',    'debutant',      'resident',   0.0,  'femme'),  # non vérifiée
]


class Command(BaseCommand):
    help = 'Seed la base avec des données réalistes (utilisateurs, objets, incidents, annonces, services).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Supprime toutes les données avant de re-seeder.',
        )

    def handle(self, *args, **options):
        self._ensure_database()
        call_command('migrate', interactive=False, verbosity=options['verbosity'])

        if options['clear']:
            self._clear()

        categories = self._seed_categories()
        users = self._seed_users()
        objects = self._seed_objects(categories)
        self._seed_historique(objects)
        self._seed_services(objects)
        self._seed_settings()
        self._seed_announcements(users)
        self._seed_incidents(users, objects)
        self._seed_deletion_request(users, objects)
        self._seed_alerts(users, objects)

        self.stdout.write(self.style.SUCCESS('\nBase de donnees seedee avec succes.'))
        self.stdout.write(self.style.WARNING('\n-- Comptes disponibles --'))
        self.stdout.write(f'  Admin   : admin@smartresi.fr    / {SEED_PASSWORD}  (expert)')
        self.stdout.write(f'  Demo    : demo@smartresi.fr     / {SEED_PASSWORD}  (avance)')
        self.stdout.write(f'  Resident: resident@smartresi.fr / {SEED_PASSWORD}  (intermediaire)')
        self.stdout.write(self.style.WARNING('-------------------------\n'))

    def _ensure_database(self):
        db = settings.DATABASES['default']
        if db.get('ENGINE') != 'django.db.backends.postgresql':
            return

        db_name = db.get('NAME')
        if not db_name:
            raise CommandError('Le nom de la base PostgreSQL est manquant.')

        connect_kwargs = self._postgres_connect_kwargs(db)

        try:
            conn = psycopg2.connect(dbname=db_name, connect_timeout=5, **connect_kwargs)
            conn.close()
            return
        except psycopg2.OperationalError:
            pass

        maintenance_conn = None
        try:
            maintenance_conn = psycopg2.connect(dbname='postgres', connect_timeout=5, **connect_kwargs)
            maintenance_conn.autocommit = True
            with maintenance_conn.cursor() as cursor:
                cursor.execute('SELECT 1 FROM pg_database WHERE datname = %s', (db_name,))
                if cursor.fetchone() is None:
                    cursor.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(db_name)))
                    self.stdout.write(self.style.SUCCESS(f'  Base PostgreSQL "{db_name}" créée.'))
                else:
                    self.stdout.write(f'  Base PostgreSQL "{db_name}" déjà présente.')
        except psycopg2.OperationalError as exc:
            raise CommandError(
                f"Impossible de joindre ou créer la base PostgreSQL '{db_name}'. "
                'Vérifie que le serveur PostgreSQL tourne et que l\'utilisateur a les droits nécessaires.'
            ) from exc
        finally:
            if maintenance_conn is not None:
                maintenance_conn.close()

    def _postgres_connect_kwargs(self, db):
        kwargs = {
            'user': db.get('USER'),
            'password': db.get('PASSWORD'),
            'host': db.get('HOST'),
            'port': db.get('PORT'),
        }
        return {key: value for key, value in kwargs.items() if value not in (None, '')}

    # ── Clear ──────────────────────────────────────────────────────────────────

    def _clear(self):
        from announcements.models import Announcement, DeletionRequest
        from incidents.models import HistoriqueStatutIncident, Incident
        from objects.models import Alert, Category, ConnectedObject, HistoriqueConso
        from services.models import GlobalSettings, Service

        Alert.objects.all().delete()
        DeletionRequest.objects.all().delete()
        HistoriqueStatutIncident.objects.all().delete()
        Incident.objects.all().delete()
        Announcement.objects.all().delete()
        Service.objects.all().delete()
        GlobalSettings.objects.all().delete()
        HistoriqueConso.objects.all().delete()
        ConnectedObject.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()
        self.stdout.write('  Données précédentes supprimées.')

    # ── Seeders ────────────────────────────────────────────────────────────────

    def _seed_categories(self):
        from objects.models import Category

        specs = [
            ('Énergie',         "Gestion de l'énergie et des compteurs",  'bolt'),
            ('Sécurité',        "Surveillance et contrôle d'accès",        'shield'),
            ('Confort',         'Éclairage et régulation thermique',        'lightbulb'),
            ("Qualité de l'air", 'Capteurs environnementaux',              'air'),
            ('Mobilité',        'Bornes de recharge électrique',            'ev_station'),
        ]
        result = {}
        for nom, desc, icone in specs:
            cat, _ = Category.objects.get_or_create(
                nom=nom, defaults={'description': desc, 'icone': icone},
            )
            result[nom] = cat
        self.stdout.write(f'  {len(result)} catégories créées.')
        return result

    def _seed_users(self):
        users = []

        # Comptes fixes — update_or_create pour toujours réinitialiser les niveaux
        for data in FIXED_USERS:
            fields = {
                'username':    data['username'],
                'pseudo':      data['pseudo'],
                'first_name':  data['first_name'],
                'last_name':   data['last_name'],
                'level':       data['level'],
                'type_membre': data['type_membre'],
                'points':      data['points'],
                'login_count': data['login_count'],
                'action_count':data['action_count'],
                'is_superuser':data.get('is_superuser', False),
                'is_staff':    data.get('is_staff', False),
                'is_verified': data.get('is_verified', True),
                'genre':       data.get('genre', 'nr'),
            }
            u, created = User.objects.update_or_create(email=data['email'], defaults=fields)
            if created:
                u.set_password(SEED_PASSWORD)
                u.save()
            users.append(u)

        # Résidents supplémentaires
        for email, pseudo, first, last, level, type_m, points, genre in EXTRA_USERS:
            is_verified = email != 'nadia.tahir@smartresi.fr'
            u, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username':    email.split('@')[0],
                    'pseudo':      pseudo,
                    'first_name':  first,
                    'last_name':   last,
                    'level':       level,
                    'type_membre': type_m,
                    'points':      points,
                    'login_count': random.randint(5, 60),
                    'action_count':random.randint(10, 120),
                    'is_verified': is_verified,
                    'genre':       genre,
                },
            )
            if created:
                u.set_password(SEED_PASSWORD)
                u.save()
            users.append(u)

        self.stdout.write(f'  {len(users)} utilisateurs créés.')
        return users

    def _seed_objects(self, categories):
        from objects.models import ConnectedObject

        specs = [
            # (nom, type, zone, categorie, connectivite, statut, signal, conso, batterie, valeur_actuelle, attributs)
            ('Thermostat Salon',          'thermostat', 'Salon',              'Énergie',          'wifi',     'actif',       'fort',  1.2,  100, {'temperature': 21.5, 'humidite': 45},           {'consigne': 22, 'mode_chauffe': 'eco'}),
            ('Thermostat Chambre',        'thermostat', 'Chambre principale', 'Énergie',          'wifi',     'actif',       'fort',  0.9,  100, {'temperature': 19.0, 'humidite': 52},           {'consigne': 20, 'mode_chauffe': 'confort'}),
            # Thermostat avec température élevée → alerte température sera déclenchée
            ('Thermostat Salle de bain',  'thermostat', 'Salle de bain',      'Énergie',          'wifi',     'actif',       'moyen', 0.8,   12, {'temperature': 32.4, 'humidite': 74},           {'consigne': 24, 'mode_chauffe': 'confort'}),
            ('Compteur Électrique Princ.','compteur',   'Local technique',    'Énergie',          'ethernet', 'actif',       'fort', 1240.5,100, {'kwh': 1240.5},                                 {'tarif': 'heures_creuses', 'puissance_max_kva': 9}),
            # Compteur commun avec consommation élevée → alerte surconso sera déclenchée
            ('Compteur Électrique Commun','compteur',   'Couloir RDC',        'Énergie',          'ethernet', 'actif',       'fort',  98.7, 100, {'kwh': 98.7},                                   {'tarif': 'base'}),
            ('Compteur Eau Froide',       'compteur',   'Cave',               'Énergie',          'zigbee',   'actif',       'moyen', 0.0,  100, {'litres': 5820.0},                              {'diametre': '15mm', 'indice': 5820}),
            ('Compteur Eau Chaude',       'compteur',   'Cave',               'Énergie',          'zigbee',   'actif',       'moyen', 0.0,  100, {'litres': 2150.0},                              {'diametre': '15mm', 'indice': 2150}),
            ('Caméra Entrée Principale',  'camera',     'Entrée principale',  'Sécurité',         'wifi',     'actif',       'fort',  2.1,  100, {'motion_detected': False, 'recording': True},   {'resolution': '1080p', 'angle': 120, 'stockage_jours': 14}),
            ('Caméra Parking Sout.',      'camera',     'Parking souterrain', 'Sécurité',         'ethernet', 'actif',       'fort',  3.5,  100, {'motion_detected': True,  'recording': True},   {'resolution': '4K', 'angle': 180, 'stockage_jours': 30}),
            # Caméra en maintenance avec batterie faible → double alerte
            ('Caméra Salle Commune',      'camera',     'Salle commune',      'Sécurité',         'wifi', 'maintenance',   'faible', 1.8,    8, {'motion_detected': False, 'recording': False},  {'resolution': '720p', 'angle': 90}),
            ('Éclairage Couloir RDC',     'eclairage',  'Couloir RDC',        'Confort',          'zigbee',   'actif',       'fort',  0.06, 100, {'allume': True,  'luminosite': 80},              {'couleur': 'blanc_neutre', 'puissance_w': 9}),
            ('Éclairage Hall Entrée',     'eclairage',  'Entrée principale',  'Confort',          'zigbee',   'actif',       'fort',  0.09, 100, {'allume': True,  'luminosite': 100},             {'couleur': 'blanc_froid', 'puissance_w': 12}),
            # Éclairage parking avec batterie faible
            ('Éclairage Parking',         'eclairage',  'Parking souterrain', 'Confort',          'zigbee',   'actif',       'moyen', 0.18,  15, {'allume': False, 'luminosite': 0},              {'couleur': 'blanc_froid', 'puissance_w': 18, 'detecteur_presence': True}),
            ('Digicode Entrée',           'capteur',    'Entrée principale',  'Sécurité',         'wifi',     'actif',       'fort',  0.05, 100, {'verrouille': True, 'derniere_ouverture': '2026-04-29T08:32:00'},   {'tentatives_echouees': 0, 'codes_actifs': 12}),
            # Capteur CO₂ avec niveau élevé → alerte CO₂ sera déclenchée
            ('Capteur CO₂ Salle Commune', 'capteur',    'Salle commune',      "Qualité de l'air", 'zigbee',   'actif',       'fort',  0.01,  78, {'co2_ppm': 1148, 'temperature': 22.1, 'humidite': 56},             {'seuil_alerte': 1000}),
            ('Capteur Fumée Cave',        'capteur',    'Cave',               'Sécurité',         'zigbee',   'actif',       'moyen', 0.01,  92, {'fumee_detectee': False, 'temperature': 15.2},                      {'seuil_temperature': 60}),
            # Capteur inondation avec batterie critique
            ('Capteur Inondation Cave',   'capteur',    'Cave',               'Sécurité',         'zigbee',   'actif',       'moyen', 0.01,   6, {'eau_detectee': False},                         {'seuil_mm': 5}),
            ('Borne Recharge VE — P1',    'prise',      'Parking souterrain', 'Mobilité',         'wifi',     'actif',       'fort',  7.4,  100, {'puissance_kw': 7.4, 'en_charge': True,  'kwh_session': 14.8},      {'type_prise': 'type2', 'amperage': 32, 'place': 'P1'}),
            # Borne P2 inactif avec consommation nulle
            ('Borne Recharge VE — P2',    'prise',      'Parking souterrain', 'Mobilité',         'wifi',  'inactif',       'faible', 0.0, 100, {'puissance_kw': 0.0,  'en_charge': False, 'kwh_session': 0.0},       {'type_prise': 'type2', 'amperage': 32, 'place': 'P2'}),
            ('Prise Connectée Local Tech.','prise',     'Local technique',    'Énergie',          'wifi',     'actif',       'fort',  0.5,  100, {'puissance_w': 42.0, 'allumee': True},           {'amperage_max': 16}),
            # Objets supplémentaires variés
            ('Thermostat Bureaux',        'thermostat', 'Bureau syndic',       'Énergie',          'wifi',     'actif',       'fort',  1.1,  100, {'temperature': 20.0, 'humidite': 42},           {'consigne': 21, 'mode_chauffe': 'eco'}),
            ('Capteur Humidité Parking',  'capteur',    'Parking souterrain',  "Qualité de l'air", 'zigbee',   'actif',       'moyen', 0.01,  58, {'humidite': 82, 'temperature': 14.5},           {'seuil_humidite': 80}),
            ('Prise Salle Commune',       'prise',      'Salle commune',       'Énergie',          'wifi',     'actif',       'fort',  0.3,  100, {'puissance_w': 68.0, 'allumee': True},           {'amperage_max': 16}),
        ]

        marques = {
            'thermostat': 'Netatmo', 'camera': 'Axis', 'compteur': 'Schneider Electric',
            'eclairage': 'Philips Hue', 'capteur': 'Somfy', 'prise': 'Legrand',
        }

        result = []
        for (nom, type_objet, zone, cat_key, connectivite, statut, signal,
             conso, batterie, valeur_actuelle, attributs) in specs:
            uid = f'CS-{type_objet[:3].upper()}-{len(result)+1:04d}'
            obj, created = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom':                  nom,
                    'description':          f'Équipement {nom.lower()} installé dans la résidence SmartResi.',
                    'marque':               marques.get(type_objet, 'Bosch'),
                    'type_objet':           type_objet,
                    'category':             categories.get(cat_key),
                    'zone':                 zone,
                    'statut':               statut,
                    'connectivite':         connectivite,
                    'signal_force':         signal,
                    'consommation_kwh':     conso,
                    'batterie':             batterie,
                    'valeur_actuelle':      valeur_actuelle,
                    'mode':                 'automatique',
                    'attributs_specifiques': attributs,
                },
            )
            result.append(obj)

        self.stdout.write(f'  {len(result)} objets connectés créés.')
        return result

    def _seed_historique(self, objects):
        from objects.models import HistoriqueConso

        now = timezone.now()
        entries = []
        for obj in objects:
            t = obj.type_objet
            if t == 'thermostat':
                low, high = 16.0, 25.0
            elif t == 'compteur' and 'Eau' in obj.nom:
                low, high = 120.0, 380.0
            elif t == 'compteur':
                low, high = 8.0, 35.0
            elif 'CO' in obj.nom:
                low, high = 400.0, 1100.0
            elif t == 'prise' and 'Recharge' in obj.nom:
                low, high = 0.0, 7.4
            else:
                low, high = 0.0, 100.0

            for day in range(30):
                base = now - timedelta(days=day)
                for hour in (0, 4, 8, 12, 16, 20):
                    entries.append(HistoriqueConso(
                        objet=obj,
                        date=base.replace(hour=hour, minute=0, second=0, microsecond=0),
                        valeur=round(random.uniform(low, high), 2),
                    ))

        HistoriqueConso.objects.bulk_create(entries, ignore_conflicts=True)
        self.stdout.write(f'  {len(entries)} entrées historique créées.')

    def _seed_services(self, objects):
        from services.models import Service

        by_type = {o.type_objet: o for o in objects}
        all_objs = list(objects)

        specs = [
            ('Gestion Énergétique',     'Monitoring et pilotage en temps réel de la consommation électrique et eau de la résidence.',        'energie',     'debutant',      [o for o in all_objs if o.type_objet == 'compteur']),
            ('Surveillance Sécurité',   'Accès aux flux vidéo et aux alertes de sécurité (digicode, détecteurs) de la résidence.',          'securite',    'intermediaire', [o for o in all_objs if o.type_objet in ('camera', 'capteur')]),
            ('Confort Thermique',        'Pilotage à distance des thermostats et consultation des courbes de température par zone.',         'confort',     'debutant',      [o for o in all_objs if o.type_objet == 'thermostat']),
            ("Qualité de l'Air",        "Suivi du CO2, de l'humidité et de la température dans les espaces communs.",                      'information', 'debutant',      [o for o in all_objs if 'CO' in o.nom or 'Capteur' in o.nom]),
            ("Pilotage Éclairage",      "Gestion centralisée de l'éclairage des parties communes (couloirs, parking, hall).",              'confort',     'intermediaire', [o for o in all_objs if o.type_objet == 'eclairage']),
            ('Bornes de Recharge VE',   'Réservation et suivi de la charge des bornes électriques du parking souterrain.',                  'energie',     'avance',        [o for o in all_objs if 'Recharge' in o.nom]),
            ('Rapports & Analytique',   'Accès aux rapports de consommation, aux statistiques de sécurité et aux exports CSV.',            'information', 'avance',        all_objs[:5]),
            ("Administration Système",  "Gestion des utilisateurs, configuration des seuils d'alerte et paramètres de la résidence.",      'information', 'expert',        []),
        ]

        for nom, description, categorie, niveau, objs in specs:
            svc, created = Service.objects.get_or_create(
                nom=nom,
                defaults={'description': description, 'categorie': categorie, 'niveau_requis': niveau},
            )
            if created and objs:
                svc.objets_lies.set(objs)

        self.stdout.write(f'  {len(specs)} services créés.')

    def _seed_settings(self):
        from services.models import GlobalSettings

        GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                'nom_residence':          'Résidence Les Acacias',
                'seuil_alerte_conso_kwh': 100.0,
                'seuil_alerte_co2_ppm':   900,
                'approbation_manuelle':   True,
                'message_inscription':    'Bienvenue dans la résidence Les Acacias. Votre compte sera validé par le syndic sous 48h.',
                'domaines_email_autorises': [],
            },
        )
        self.stdout.write('  Paramètres résidence créés.')

    def _seed_announcements(self, users):
        from announcements.models import Announcement

        admin = next((u for u in users if u.email == 'admin@smartresi.fr'), users[0])
        ref   = next((u for u in users if u.type_membre == 'referent'), users[1])

        data = [
            ('Travaux ascenseur — semaine du 5 mai',
             "L'ascenseur principal sera hors service du lundi 5 au vendredi 9 mai pour maintenance préventive. "
             "Un technicien OTIS interviendra chaque jour à partir de 8h. Merci de votre compréhension.",
             True, admin),
            ('Réunion de copropriété — 28 mai 2026',
             'La prochaine assemblée générale se tiendra le 28 mai 2026 à 18h30 en salle commune. '
             'Ordre du jour : budget 2026, ravalement façade, renouvellement contrat gardiennage.',
             True, admin),
            ('Résultats vote ravalement de façade',
             'Le vote concernant le ravalement de façade a été approuvé à 78 % lors de la dernière AG. '
             'Les travaux débuteront début septembre 2026 pour une durée estimée de 6 semaines.',
             True, ref),
            ('Note interne : accès parking temporaire',
             "En raison de l'installation des bornes de recharge, l'allée B du parking sera inaccessible "
             "le 12 mai de 7h à 17h. Merci de prévoir vos déplacements en conséquence.",
             False, admin),
            ('Rappel règlement intérieur — nuisances sonores',
             'Conformément au règlement intérieur, les travaux et activités bruyantes sont interdits '
             'entre 22h et 8h en semaine, et entre 20h et 9h le week-end.',
             True, ref),
        ]
        for titre, contenu, visible, auteur in data:
            Announcement.objects.get_or_create(
                titre=titre,
                defaults={'contenu': contenu, 'auteur': auteur, 'visible': visible},
            )
        self.stdout.write('  5 annonces créées.')

    def _seed_incidents(self, users, objects):
        from incidents.models import HistoriqueStatutIncident, Incident

        admin = next((u for u in users if u.email == 'admin@smartresi.fr'), users[0])
        demo  = next((u for u in users if u.email == 'demo@smartresi.fr'),  users[1])
        res   = next((u for u in users if u.email == 'resident@smartresi.fr'), users[2])

        obj_camera  = next((o for o in objects if 'Caméra Salle' in o.nom), objects[0])
        obj_compt   = next((o for o in objects if 'Compteur Électrique Princ' in o.nom), objects[1])
        obj_borne   = next((o for o in objects if 'Borne Recharge VE — P2' in o.nom), objects[-1])

        data = [
            (res,   obj_camera,  'panne',    'signale',        "La caméra de la salle commune ne répond plus depuis hier soir. L'image est noire et l'application ne la détecte pas."),
            (demo,  obj_compt,   'autre',    'pris_en_charge', 'Le compteur électrique principal affiche une valeur anormale depuis ce matin. La consommation indiquée semble deux fois supérieure à la normale.'),
            (admin, obj_borne,   'panne',    'resolu',         'La borne de recharge P2 était en défaut suite à une surtension. Le prestataire est intervenu et a remplacé le module de charge.'),
        ]
        for auteur, objet, type_inc, statut, description in data:
            inc, created = Incident.objects.get_or_create(
                description=description[:50],
                defaults={
                    'auteur':        auteur,
                    'objet_lie':     objet,
                    'type_incident': type_inc,
                    'description':   description,
                    'statut':        statut,
                },
            )
            if created:
                HistoriqueStatutIncident.objects.create(
                    incident=inc, statut=statut,
                    commentaire='Signalement initial enregistré.' if statut == 'signale' else 'Statut mis à jour.',
                )
        self.stdout.write('  3 incidents créés.')

    def _seed_alerts(self, users, objects):
        from objects.models import Alert

        admin = next((u for u in users if u.email == 'admin@smartresi.fr'), users[0])

        by_nom = {o.nom: o for o in objects}

        rules = [
            {
                'nom': 'Batterie critique — Caméra salle commune',
                'description': 'La caméra de la salle commune a une batterie insuffisante pour fonctionner correctement.',
                'type_alerte': 'batterie_faible',
                'seuil': 20.0,
                'operateur': 'lt',
                'valeur_cle': '',
                'objet_concerne': by_nom.get('Caméra Salle Commune'),
                'priorite': 'critique',
                'active': True,
            },
            {
                'nom': 'Batterie faible — Capteur inondation cave',
                'description': 'Le capteur anti-inondation doit être rechargé pour garantir la sécurité.',
                'type_alerte': 'batterie_faible',
                'seuil': 20.0,
                'operateur': 'lt',
                'valeur_cle': '',
                'objet_concerne': by_nom.get('Capteur Inondation Cave'),
                'priorite': 'critique',
                'active': True,
            },
            {
                'nom': 'Batterie faible — Éclairage parking',
                'description': "L'éclairage du parking souterrain a une batterie de secours basse.",
                'type_alerte': 'batterie_faible',
                'seuil': 20.0,
                'operateur': 'lt',
                'valeur_cle': '',
                'objet_concerne': by_nom.get('Éclairage Parking'),
                'priorite': 'moyen',
                'active': True,
            },
            {
                'nom': 'Surconsommation — Compteur électrique commun',
                'description': 'La consommation du compteur des parties communes dépasse le seuil mensuel autorisé.',
                'type_alerte': 'surconsommation_energie',
                'seuil': 80.0,
                'operateur': 'gt',
                'valeur_cle': '',
                'objet_concerne': by_nom.get('Compteur Électrique Commun'),
                'priorite': 'critique',
                'active': True,
            },
            {
                'nom': 'Température élevée — Salle de bain',
                'description': 'Le thermostat de la salle de bain indique une température anormalement élevée.',
                'type_alerte': 'valeur_capteur',
                'seuil': 30.0,
                'operateur': 'gt',
                'valeur_cle': 'temperature',
                'objet_concerne': by_nom.get('Thermostat Salle de bain'),
                'priorite': 'moyen',
                'active': True,
            },
            {
                'nom': 'CO₂ élevé — Salle commune',
                'description': 'Le taux de CO₂ dans la salle commune dépasse le seuil de confort recommandé (1000 ppm).',
                'type_alerte': 'valeur_capteur',
                'seuil': 1000.0,
                'operateur': 'gt',
                'valeur_cle': 'co2_ppm',
                'objet_concerne': by_nom.get('Capteur CO₂ Salle Commune'),
                'priorite': 'critique',
                'active': True,
            },
            {
                'nom': 'Humidité excessive — Parking',
                'description': "Taux d'humidité anormalement élevé dans le parking, risque de condensation.",
                'type_alerte': 'valeur_capteur',
                'seuil': 80.0,
                'operateur': 'gt',
                'valeur_cle': 'humidite',
                'objet_concerne': by_nom.get('Capteur Humidité Parking'),
                'priorite': 'moyen',
                'active': True,
            },
            {
                'nom': 'Batterie faible — Thermostat salle de bain',
                'description': 'Le thermostat de la salle de bain a une batterie critique.',
                'type_alerte': 'batterie_faible',
                'seuil': 20.0,
                'operateur': 'lt',
                'valeur_cle': '',
                'objet_concerne': by_nom.get('Thermostat Salle de bain'),
                'priorite': 'faible',
                'active': True,
            },
        ]

        count = 0
        for r in rules:
            obj = r.pop('objet_concerne')
            Alert.objects.get_or_create(
                nom=r['nom'],
                defaults={**r, 'objet_concerne': obj, 'created_by': admin},
            )
            count += 1
        self.stdout.write(f'  {count} règles d\'alerte créées.')

    def _seed_deletion_request(self, users, objects):
        from announcements.models import DeletionRequest

        demo   = next((u for u in users if u.email == 'demo@smartresi.fr'),  users[1])
        borne2 = next((o for o in objects if 'Borne Recharge VE — P2' in o.nom), objects[-1])

        DeletionRequest.objects.get_or_create(
            demandeur=demo, objet=borne2,
            defaults={
                'motif':  "La borne P2 est hors service depuis plusieurs semaines et n'a pas été réparée. "
                          "Je demande sa suppression du registre des équipements actifs.",
                'statut': 'en_attente',
            },
        )
        self.stdout.write('  1 demande de suppression créée.')
