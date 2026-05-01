"""
Commande de peuplement de la base pour les 4 services de la résidence.
Usage : python manage.py seed_services
        python manage.py seed_services --reset   (supprime et recrée)
"""
import random
from datetime import date, timedelta, datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from objects.models import AccesLog, Alert, Category, ConnectedObject, HistoriqueConso
from services.models import CollecteDechet, Service


PSEUDOS = ['Dupont M.', 'Martin L.', 'Bernard S.', 'Petit J.', 'Moreau A.',
           'Lefebvre C.', 'Simon R.', 'Laurent K.', 'Michel E.', 'Garcia T.']


class Command(BaseCommand):
    help = 'Peuple la base avec les objets connectés et données des 4 services'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Supprime les données existantes avant de recréer')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Suppression des données existantes...')
            AccesLog.objects.all().delete()
            CollecteDechet.objects.all().delete()
            ConnectedObject.objects.filter(unique_id__startswith=('SER-', 'DIG-', 'CPT-', 'CEL-', 'PRI-', 'CEA-', 'CFU-', 'BRE-', 'BOR-', 'BVE-')).delete()

        self._create_categories()
        acces_objs = self._create_acces_objects()
        energie_objs = self._create_energie_objects()
        eau_objs = self._create_eau_objects()
        dechets_objs = self._create_dechets_objects()

        self._create_acces_logs(acces_objs)
        self._create_historique_conso(energie_objs, 'kwh')
        self._create_historique_conso(eau_objs['compteurs'], 'litres')
        self._create_collectes_dechets()
        self._create_services(acces_objs, energie_objs, eau_objs['all'], dechets_objs)

        self.stdout.write(self.style.SUCCESS('Peuplement terminé avec succès !'))
        self.stdout.write(f'  {len(acces_objs)} objets accès, {len(energie_objs)} énergie, '
                          f'{len(eau_objs["all"])} eau, {len(dechets_objs)} déchets')

    def _create_categories(self):
        defs = [
            ('Contrôle d\'accès', 'Serrures, digicodes et capteurs de portes', 'lock'),
            ('Énergie', 'Compteurs et prises électriques connectés', 'bolt'),
            ('Eau', 'Compteurs d\'eau et capteurs de fuite', 'water_drop'),
            ('Déchets', 'Capteurs de remplissage des conteneurs', 'delete'),
        ]
        self.cats = {}
        for nom, desc, icone in defs:
            cat, _ = Category.objects.get_or_create(nom=nom, defaults={'description': desc, 'icone': icone})
            self.cats[nom] = cat

    def _create_acces_objects(self):
        cat = self.cats['Contrôle d\'accès']
        objs = []

        serrures = [
            ('SER-001', 'Serrure entrée principale', 'Yale', 'Entrée principale', 95),
            ('SER-002', 'Serrure parking souterrain', 'Schlage', 'Parking', 88),
            ('SER-003', 'Serrure salle commune', 'Nuki', 'Salle commune', 72),
        ]
        for uid, nom, marque, zone, batt in serrures:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Serrure connectée — {zone}',
                    'marque': marque, 'type_objet': 'serrure', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'zigbee',
                    'signal_force': 'fort', 'batterie': batt,
                    'valeur_actuelle': {'verrou': True, 'batterie_ok': batt > 20},
                    'attributs_specifiques': {'double_auth': False, 'verrou_moteur': True},
                }
            )
            objs.append(obj)

        digicodes = [
            ('DIG-001', 'Digicode Bâtiment A', 'Urmet', 'Bâtiment A'),
            ('DIG-002', 'Digicode Bâtiment B', 'Ritto', 'Bâtiment B'),
        ]
        for uid, nom, marque, zone in digicodes:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Digicode sécurisé — {zone}',
                    'marque': marque, 'type_objet': 'digicode', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'ethernet',
                    'signal_force': 'fort', 'batterie': 100,
                    'valeur_actuelle': {'tentatives_echec': 0, 'verrouille': False},
                    'attributs_specifiques': {'nb_codes_actifs': 12, 'temporisation_s': 5},
                }
            )
            objs.append(obj)

        capteurs_porte = [
            ('CPT-001', 'Capteur porte A101', 'Aeotec', 'Bâtiment A', 85),
            ('CPT-002', 'Capteur porte A201', 'Fibaro', 'Bâtiment A', 62),
            ('CPT-003', 'Capteur porte B101', 'Aeotec', 'Bâtiment B', 91),
            ('CPT-004', 'Capteur porte B201', 'Fibaro', 'Bâtiment B', 48),
        ]
        for uid, nom, marque, zone, batt in capteurs_porte:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Capteur d\'ouverture de porte — {zone}',
                    'marque': marque, 'type_objet': 'capteur_porte', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'zwave',
                    'signal_force': 'moyen', 'batterie': batt,
                    'valeur_actuelle': {'ouverte': False, 'temperature_c': 20},
                    'attributs_specifiques': {'alarme_si_ouvert_min': 5},
                }
            )
            objs.append(obj)

        self.stdout.write(f'  Accès : {len(objs)} objets créés/existants')
        return objs

    def _create_energie_objects(self):
        cat = self.cats['Énergie']
        objs = []

        compteurs = [
            ('CEL-001', 'Compteur électrique Bâtiment A', 'Enedis', 'Bâtiment A', 4.2),
            ('CEL-002', 'Compteur électrique Bâtiment B', 'Enedis', 'Bâtiment B', 3.8),
            ('CEL-003', 'Compteur parties communes', 'Enedis', 'Salle commune', 1.5),
        ]
        for uid, nom, marque, zone, conso in compteurs:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Compteur électrique connecté — {zone}',
                    'marque': marque, 'type_objet': 'compteur', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'ethernet',
                    'signal_force': 'fort', 'batterie': 100, 'consommation_kwh': conso,
                    'valeur_actuelle': {'kwh_total': round(random.uniform(1200, 3500), 1), 'puissance_w': round(random.uniform(500, 3000), 0)},
                    'attributs_specifiques': {'tarif': 'base', 'puissance_kva': 9},
                }
            )
            objs.append(obj)

        prises = [
            ('PRI-001', 'Prise buanderie 1', 'TP-Link', 'Cave', 0.8),
            ('PRI-002', 'Prise buanderie 2', 'Shelly', 'Cave', 0.6),
            ('PRI-003', 'Prise salle commune A', 'TP-Link', 'Salle commune', 0.3),
        ]
        for uid, nom, marque, zone, conso in prises:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Prise intelligente — {zone}',
                    'marque': marque, 'type_objet': 'prise', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'wifi',
                    'signal_force': 'fort', 'batterie': 100, 'consommation_kwh': conso,
                    'valeur_actuelle': {'allumee': True, 'puissance_w': round(random.uniform(100, 2000), 0)},
                    'attributs_specifiques': {'amperage_max_a': 16},
                }
            )
            objs.append(obj)

        self.stdout.write(f'  Énergie : {len(objs)} objets créés/existants')
        return objs

    def _create_eau_objects(self):
        cat = self.cats['Eau']
        compteurs = []
        capteurs = []

        for uid, nom, marque, zone in [
            ('CEA-001', 'Compteur eau Bâtiment A', 'Suez', 'Bâtiment A'),
            ('CEA-002', 'Compteur eau Bâtiment B', 'Veolia', 'Bâtiment B'),
        ]:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f"Compteur d'eau connecté — {zone}",
                    'marque': marque, 'type_objet': 'compteur_eau', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'ethernet',
                    'signal_force': 'fort', 'batterie': 100,
                    'valeur_actuelle': {'litres_total': round(random.uniform(50000, 200000), 0), 'debit_l_min': round(random.uniform(0, 15), 1)},
                    'attributs_specifiques': {'diametre_mm': 20, 'type_eau': 'froide'},
                }
            )
            compteurs.append(obj)

        for uid, nom, marque, zone, fuite in [
            ('CFU-001', 'Capteur fuite cave', 'Fibaro', 'Cave', False),
            ('CFU-002', 'Capteur fuite toiture', 'Aeotec', 'Toiture', False),
            ('CFU-003', 'Capteur fuite parking', 'Fibaro', 'Parking', False),
        ]:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Capteur de détection de fuite — {zone}',
                    'marque': marque, 'type_objet': 'capteur_fuite', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'zwave',
                    'signal_force': 'moyen', 'batterie': random.randint(50, 100),
                    'valeur_actuelle': {'fuite': fuite, 'humidite_pct': random.randint(20, 55)},
                    'attributs_specifiques': {'seuil_humidite': 85},
                }
            )
            capteurs.append(obj)

        all_eau = compteurs + capteurs
        self.stdout.write(f'  Eau : {len(all_eau)} objets créés/existants')
        return {'compteurs': compteurs, 'capteurs': capteurs, 'all': all_eau}

    def _create_dechets_objects(self):
        cat = self.cats['Déchets']
        objs = []

        bacs = [
            ('BRE-001', 'Poubelle recyclage parking',    'Sensoneo', 'Parking',     'recyclage', 65),
            ('BOR-001', 'Poubelle ordures parking',      'Bigbelly',  'Parking',     'ordures',   42),
            ('BVE-001', 'Conteneur verre Bâtiment A',    'Sensoneo', 'Bâtiment A',  'verre',     78),
            ('BVE-002', 'Conteneur verre Bâtiment B',    'Sensoneo', 'Bâtiment B',  'verre',     30),
        ]
        for uid, nom, marque, zone, type_d, taux in bacs:
            obj, _ = ConnectedObject.objects.get_or_create(
                unique_id=uid,
                defaults={
                    'nom': nom, 'description': f'Capteur de remplissage — {type_d} — {zone}',
                    'marque': marque, 'type_objet': 'capteur_remplissage', 'category': cat,
                    'zone': zone, 'statut': 'actif', 'connectivite': 'wifi',
                    'signal_force': 'moyen', 'batterie': random.randint(60, 100),
                    'valeur_actuelle': {'taux_remplissage': taux, 'temperature_c': random.randint(5, 25)},
                    'attributs_specifiques': {'type_dechet': type_d, 'capacite_litres': 1100},
                }
            )
            objs.append(obj)

        self.stdout.write(f'  Déchets : {len(objs)} objets créés/existants')
        return objs

    def _create_acces_logs(self, acces_objs):
        if AccesLog.objects.exists():
            self.stdout.write('  AccesLog : données existantes, skip')
            return

        now = timezone.now()
        logs = []
        for day_offset in range(7, 0, -1):
            base_dt = now - timedelta(days=day_offset)
            for objet in acces_objs[:5]:  # serrures + digicodes
                # matin : entrées
                for h in [7, 8, 9, 12, 13, 18, 19, 20]:
                    pseudo = random.choice(PSEUDOS)
                    direction = 'entree' if h in (7, 8, 9, 12, 13) else 'sortie'
                    ts = base_dt.replace(hour=h, minute=random.randint(0, 59), second=0, microsecond=0)
                    autorise = random.random() > 0.05  # 5 % refusés
                    logs.append(AccesLog(
                        objet=objet,
                        direction=direction,
                        timestamp=ts,
                        acces_autorise=autorise,
                        utilisateur_pseudo=pseudo if autorise else 'Inconnu',
                    ))

        AccesLog.objects.bulk_create(logs)
        self.stdout.write(f'  AccesLog : {len(logs)} entrées créées')

    def _create_historique_conso(self, objets, unite):
        if not objets:
            return

        # Vérifie si des données existent déjà pour ces objets
        if HistoriqueConso.objects.filter(objet__in=objets).exists():
            self.stdout.write(f'  HistoriqueConso ({unite}) : données existantes, skip')
            return

        now = timezone.now()
        entries = []
        for day_offset in range(90, 0, -1):
            jour = now - timedelta(days=day_offset)
            for objet in objets:
                if unite == 'kwh':
                    base = {'CEL-001': 18, 'CEL-002': 15, 'CEL-003': 6,
                            'PRI-001': 3, 'PRI-002': 2.5, 'PRI-003': 1}.get(objet.unique_id, 5)
                    valeur = round(base * (0.7 + random.random() * 0.6), 2)
                else:
                    base = {'CEA-001': 950, 'CEA-002': 800}.get(objet.unique_id, 300)
                    valeur = round(base * (0.8 + random.random() * 0.4), 1)

                ts = jour.replace(hour=12, minute=0, second=0, microsecond=0)
                entries.append(HistoriqueConso(objet=objet, date=ts, valeur=valeur))

        HistoriqueConso.objects.bulk_create(entries)
        self.stdout.write(f'  HistoriqueConso ({unite}) : {len(entries)} entrées créées')

    def _create_collectes_dechets(self):
        if CollecteDechet.objects.exists():
            self.stdout.write('  CollecteDechet : données existantes, skip')
            return

        today = date.today()

        def _next_weekday(weekday):
            """Retourne la prochaine date pour le jour donné (0=lundi … 6=dimanche)."""
            days_ahead = weekday - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return today + timedelta(days=days_ahead)

        collectes = [
            # Recyclage : chaque lundi
            CollecteDechet(
                type_dechet='recyclage',
                prochaine_collecte=_next_weekday(0),
                heure='07:30:00',
                description='Collecte hebdomadaire — papier, carton, plastique',
            ),
            # Ordures ménagères : chaque mercredi
            CollecteDechet(
                type_dechet='ordures',
                prochaine_collecte=_next_weekday(2),
                heure='06:00:00',
                description='Collecte hebdomadaire des ordures ménagères',
            ),
            # Verre : tous les deux vendredis (~quinzaine)
            CollecteDechet(
                type_dechet='verre',
                prochaine_collecte=_next_weekday(4),
                heure='08:00:00',
                description='Collecte bimensuelle des conteneurs verre',
            ),
        ]
        CollecteDechet.objects.bulk_create(collectes)
        self.stdout.write(f'  CollecteDechet : {len(collectes)} collectes créées')

    def _create_services(self, acces_objs, energie_objs, eau_objs, dechets_objs):
        # Nettoie les Services dupliquées pour éviter l'erreur MultipleObjectsReturned
        for categorie in ['acces', 'energie', 'eau', 'dechets']:
            services = Service.objects.filter(categorie=categorie).order_by('-id')
            for service in services[1:]:  # Garde le premier, supprime les doublons
                service.delete()

        services_defs = [
            {
                'nom': 'Gestion d\'accès',
                'description': 'Contrôle des serrures, digicodes et capteurs de portes de la résidence.',
                'categorie': 'acces',
                'niveau_requis': 'debutant',
                'objets': acces_objs,
            },
            {
                'nom': 'Consommation d\'énergie',
                'description': 'Suivi de la consommation électrique par compteurs et prises connectées.',
                'categorie': 'energie',
                'niveau_requis': 'debutant',
                'objets': energie_objs,
            },
            {
                'nom': 'Consommation d\'eau',
                'description': 'Monitoring de la consommation en eau et détection de fuites.',
                'categorie': 'eau',
                'niveau_requis': 'debutant',
                'objets': eau_objs,
            },
            {
                'nom': 'Gestion des déchets',
                'description': 'Calendrier des collectes et suivi du taux de remplissage des conteneurs.',
                'categorie': 'dechets',
                'niveau_requis': 'debutant',
                'objets': dechets_objs,
            },
        ]
        for sdef in services_defs:
            service, created = Service.objects.get_or_create(
                categorie=sdef['categorie'],
                defaults={
                    'nom': sdef['nom'],
                    'description': sdef['description'],
                    'niveau_requis': sdef['niveau_requis'],
                }
            )
            service.objets_lies.set(sdef['objets'])
            if created:
                self.stdout.write(f'  Service créé : {sdef["nom"]}')
