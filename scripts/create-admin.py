"""Create one local admin with a random password stored only in .local."""
import json
import os
import secrets
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()
from apps.accounts.models import User

path = root / ".local/admin-credentials.json"
if path.exists():
    print("Local admin credentials already exist: .local/admin-credentials.json")
else:
    email = "admin@rendez.local"
    if User.objects.filter(email=email).exists():
        raise SystemExit("Admin already exists. Use the existing password or Django changepassword.")
    password = secrets.token_urlsafe(20)
    User.objects.create_superuser(email, password, display_name="Quản trị Rendez")
    path.write_text(json.dumps({"email": email, "password": password}, indent=2) + "\n")
    path.chmod(0o600)
    print("Local admin created. Credentials: .local/admin-credentials.json")
