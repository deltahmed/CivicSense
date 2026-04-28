"""
Management command to purge database.
Usage:
  python manage.py purge_db --users          # Delete all users
  python manage.py purge_db --all            # Delete everything (full flush)
  python manage.py purge_db                  # Delete all users (default)
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Purge database: delete all users or full flush'

    def add_arguments(self, parser):
        parser.add_argument('--users', action='store_true', help='Delete all users only')
        parser.add_argument('--all', action='store_true', help='Full database flush')
        parser.add_argument('--yes', action='store_true', help='Skip confirmation')

    def handle(self, *args, **options):
        User = get_user_model()
        
        if options['all']:
            # Full flush
            confirm = options['yes'] or input('⚠️  FULL FLUSH ALL DATA? Type "yes" to confirm: ')
            if confirm != 'yes':
                self.stdout.write('Cancelled.')
                return
            self.stdout.write('Flushing database...')
            from django.core.management import call_command
            call_command('flush', '--no-input')
            self.stdout.write(self.style.SUCCESS('✅ Database flushed completely.'))
        else:
            # Delete users only (default)
            count = User.objects.count()
            confirm = options['yes'] or input(f'⚠️  Delete all {count} users? Type "yes" to confirm: ')
            if confirm != 'yes':
                self.stdout.write('Cancelled.')
                return
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f'✅ Deleted {count} users.'))
