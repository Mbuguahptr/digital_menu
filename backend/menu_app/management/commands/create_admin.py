from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = os.getenv("ADMIN_USER", "admin")
        password = os.getenv("ADMIN_PASS", "admin123")
        email = os.getenv("ADMIN_EMAIL", "admin@example.com")

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write("Superuser created.")
        else:
            self.stdout.write("Superuser already exists.")
