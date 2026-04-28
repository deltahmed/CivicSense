from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = 'Create an admin superuser. Use --email and --password or set ADMIN_EMAIL/ADMIN_PASSWORD env vars.'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Admin email')
        parser.add_argument('--username', type=str, help='Admin username', default='admin')
        parser.add_argument('--password', type=str, help='Admin password')

    def handle(self, *args, **options):
        User = get_user_model()
        email = options.get('email') or os.getenv('ADMIN_EMAIL')
        username = options.get('username') or os.getenv('ADMIN_USERNAME', 'admin')
        password = options.get('password') or os.getenv('ADMIN_PASSWORD')

        if not email or not password:
            self.stderr.write('Error: admin email and password required (args or ADMIN_EMAIL/ADMIN_PASSWORD).')
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(f'Admin with email {email} already exists.')
            return

        user = User.objects.create_superuser(username=username, email=email, password=password)
        user.is_verified = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Admin user {email} created successfully.'))
