import os
from django.core.management.base import BaseCommand, CommandError
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Tạo staff E2E local với mật khẩu từ environment, không dùng credential cố định."

    def handle(self, *args, **options):
        password = os.environ.get("E2E_ADMIN_PASSWORD")
        if not password:
            raise CommandError("Set E2E_ADMIN_PASSWORD")
        user, _ = User.objects.get_or_create(
            email="e2e-admin@demo.invalid", defaults={"display_name": "Admin E2E"}
        )
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        self.stdout.write("Đã chuẩn bị staff E2E.")
