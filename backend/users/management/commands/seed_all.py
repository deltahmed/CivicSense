from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed complet de la base: données principales + objets/services additionnels.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Supprime les données avant de re-seeder la base principale.',
        )
        parser.add_argument(
            '--reset-services',
            action='store_true',
            help='Force le reset du seed des services additionnels.',
        )

    def handle(self, *args, **options):
        verbosity = options['verbosity']

        self.stdout.write(self.style.NOTICE('Lancement du seed principal...'))
        call_command('seed', clear=options['clear'], verbosity=verbosity)

        self.stdout.write(self.style.NOTICE('Lancement du seed des services additionnels...'))
        call_command('seed_services', reset=options['reset_services'], verbosity=verbosity)

        self.stdout.write(self.style.SUCCESS('Seed complet terminé avec succès.'))