#!/usr/bin/env python3
"""
Hardened E2E Environment Manager for Rendez (Phase 1 Hardening).
Provides:
  - Preflight verification and isolation checks
  - Unprivileged PostgreSQL runtime role (rendez_e2e_app)
  - Dedicated E2E media root with path traversal and symlink guards
  - Deterministic test data with fine-grained permissions (Normal User, Moderator, Unprivileged Staff)
  - Secure credential storage in Git-ignored .local/e2e_credentials.json (no plaintext passwords in code)
  - Cryptographic data integrity verification (SHA-256 table digests & media manifest)
  - Safety-guarded database drop/reset preventing touches to rendez_local or system databases
"""

import argparse
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

# Paths
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
LOCAL_DIR = REPO_ROOT / ".local"
RUNTIME_ENV = LOCAL_DIR / "runtime.env"
E2E_RUNTIME_ENV = LOCAL_DIR / "e2e_runtime.env"
CREDENTIALS_FILE = LOCAL_DIR / "e2e_credentials.json"
SNAPSHOT_FILE = LOCAL_DIR / "e2e_dev_snapshot.json"

E2E_MEDIA_ROOT = (LOCAL_DIR / "e2e_media").resolve()
DEV_MEDIA_ROOT = (LOCAL_DIR / "media").resolve()

TARGET_E2E_DB = "rendez_e2e"
TARGET_E2E_APP_ROLE = "rendez_e2e_app"
PROTECTED_DATABASES = frozenset({"rendez", "rendez_local", "postgres", "template0", "template1"})


class SafetyViolationError(Exception):
    """Raised when an operation violates safety boundary rules."""
    pass


def get_pg_privileged_config():
    """Load postgres connection parameters for the database manager (setup/reset)."""
    env = {}
    if RUNTIME_ENV.is_file():
        for line in RUNTIME_ENV.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()

    host = os.environ.get("POSTGRES_HOST", env.get("POSTGRES_HOST", "127.0.0.1"))
    port = os.environ.get("POSTGRES_PORT", env.get("POSTGRES_PORT", "55433"))
    user = os.environ.get("POSTGRES_USER", env.get("POSTGRES_USER", "rendez"))
    password = os.environ.get("POSTGRES_PASSWORD", env.get("POSTGRES_PASSWORD", "rendez-local"))
    dev_db = env.get("POSTGRES_DB", "rendez_local")

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "dev_db": dev_db,
    }


def load_or_create_e2e_credentials():
    """
    Retrieve or securely generate E2E credentials in a Git-ignored file.
    Does not print passwords to stdout.
    """
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    creds = {}
    if CREDENTIALS_FILE.is_file():
        try:
            creds = json.loads(CREDENTIALS_FILE.read_text())
        except Exception:
            creds = {}

    modified = False

    # 1. Normal User
    if "user" not in creds:
        creds["user"] = {
            "email": "e2e-user@rendez.test",
            "password": os.environ.get("E2E_USER_PASSWORD") or secrets.token_urlsafe(24),
        }
        modified = True

    # 2. Moderator (Staff with review_photosubmission)
    if "moderator" not in creds:
        creds["moderator"] = {
            "email": "e2e-moderator@rendez.test",
            "password": os.environ.get("E2E_MODERATOR_PASSWORD") or os.environ.get("E2E_ADMIN_PASSWORD") or secrets.token_urlsafe(24),
        }
        modified = True

    # 3. Staff without permissions (for denial testing)
    if "staff_unprivileged" not in creds:
        creds["staff_unprivileged"] = {
            "email": "e2e-staff-unpriv@rendez.test",
            "password": os.environ.get("E2E_STAFF_UNPRIVILEGED_PASSWORD") or secrets.token_urlsafe(24),
        }
        modified = True

    # 4. PostgreSQL unprivileged application role
    if "pg_app_role" not in creds:
        creds["pg_app_role"] = {
            "user": TARGET_E2E_APP_ROLE,
            "password": secrets.token_urlsafe(24),
        }
        modified = True

    if modified:
        CREDENTIALS_FILE.write_text(json.dumps(creds, indent=2))
        try:
            os.chmod(CREDENTIALS_FILE, 0o600)
        except OSError:
            pass

    return creds


def get_psycopg_connection(dbname="postgres", user=None, password=None, autocommit=True):
    """Create a psycopg connection."""
    import psycopg

    cfg = get_pg_privileged_config()
    conn = psycopg.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=user or cfg["user"],
        password=password or cfg["password"],
        dbname=dbname,
        autocommit=autocommit,
    )
    return conn


def validate_safe_database_for_drop(conn, target_name):
    """
    Strict safety check before dropping any database:
    - Verifies effective connection database is NOT the target or protected.
    - Confirms target name is exactly 'rendez_e2e'.
    - Refuses protected databases (rendez, rendez_local, postgres, template*).
    """
    if target_name != TARGET_E2E_DB:
        raise SafetyViolationError(
            f"Safety guard: Target database '{target_name}' is not '{TARGET_E2E_DB}'. Refusing drop."
        )

    if target_name in PROTECTED_DATABASES:
        raise SafetyViolationError(
            f"Safety guard: Target database '{target_name}' is in protected databases list. Refusing drop."
        )

    with conn.cursor() as cur:
        cur.execute("SELECT current_database();")
        active_db = cur.fetchone()[0]
        if active_db == target_name:
            raise SafetyViolationError(
                f"Safety guard: Cannot drop connected database '{active_db}'."
            )
        if active_db in PROTECTED_DATABASES and active_db != "postgres":
            raise SafetyViolationError(
                f"Safety guard: Active connection is on protected database '{active_db}'."
            )

    return True


def validate_safe_media_path(media_path):
    """
    Strict safety guard before media cleanup:
    - Resolves path and verifies it strictly equals E2E_MEDIA_ROOT.
    - Detects symlinks and path traversal attempts.
    - Explicitly protects development media, repository root, and system roots.
    """
    p = Path(media_path)
    if p.is_symlink():
        raise SafetyViolationError("Safety guard: Symlink detected for media directory. Refusing operation.")

    resolved = p.resolve()
    expected = (LOCAL_DIR / "e2e_media").resolve()

    if resolved != expected:
        raise SafetyViolationError(
            f"Safety guard: Path '{resolved}' does not match expected E2E media root '{expected}'."
        )

    if resolved == DEV_MEDIA_ROOT or resolved == (REPO_ROOT / "backend" / ".private-media").resolve():
        raise SafetyViolationError("Safety guard: Refusing deletion of development or default media directory.")

    dangerous = {Path("/"), Path.home(), REPO_ROOT, LOCAL_DIR}
    if resolved in dangerous:
        raise SafetyViolationError(f"Safety guard: Refusing deletion of critical directory '{resolved}'.")

    return True


def run_preflight():
    """Verify PostgreSQL connectivity, role privileges, and PostGIS status."""
    print("=== [PostgreSQL Preflight Inspection] ===")
    cfg = get_pg_privileged_config()
    print(f"PostgreSQL Host: {cfg['host']}:{cfg['port']}")
    print(f"Development Database: {cfg['dev_db']}")
    print(f"Manager Role: {cfg['user']}")

    try:
        conn = get_psycopg_connection(dbname="postgres")
    except Exception as exc:
        print(f"[FAIL] Unable to connect to PostgreSQL: {exc}")
        return False

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT rolname, rolsuper, rolcreatedb 
            FROM pg_roles 
            WHERE rolname = current_user;
            """
        )
        role_info = cur.fetchone()
        if not role_info:
            print(f"[FAIL] Role '{cfg['user']}' not found.")
            conn.close()
            return False

        rolname, rolsuper, rolcreatedb = role_info
        print(f"Manager Role Attributes: rolname={rolname}, rolsuper={rolsuper}, rolcreatedb={rolcreatedb}")

        if not rolcreatedb and not rolsuper:
            print("[BLOCKER] Manager role has neither CREATEDB nor SUPERUSER.")
            conn.close()
            return False

        cur.execute("SELECT datname, pg_catalog.pg_get_userbyid(datdba) FROM pg_database ORDER BY datname;")
        dbs = cur.fetchall()
        print("Existing databases:")
        for db, owner in dbs:
            print(f"  - {db} (owner: {owner})")

        cur.execute("SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name = 'postgis';")
        postgis = cur.fetchall()
        if postgis:
            print(f"PostGIS Extension: Available {postgis}")
        else:
            print("PostGIS Extension: NOT installed in postgres container.")
            print("  Note: Rendez coordinates are DecimalField with GIS-free standard BBox algorithms.")

        # Check effective E2E app role
        cur.execute("SELECT rolname, rolsuper, rolcreatedb FROM pg_roles WHERE rolname = %s;", (TARGET_E2E_APP_ROLE,))
        app_role = cur.fetchone()
        if app_role:
            print(f"E2E App Role '{TARGET_E2E_APP_ROLE}': rolsuper={app_role[1]}, rolcreatedb={app_role[2]} (Unprivileged)")
        else:
            print(f"E2E App Role '{TARGET_E2E_APP_ROLE}': Will be provisioned on setup.")

    conn.close()
    print("[PASS] Preflight inspection satisfied.")
    return True


def ensure_e2e_database_and_roles():
    """Ensure database rendez_e2e and unprivileged role rendez_e2e_app exist with correct grants."""
    cfg = get_pg_privileged_config()
    creds = load_or_create_e2e_credentials()
    app_pwd = creds["pg_app_role"]["password"]

    conn = get_psycopg_connection(dbname="postgres", autocommit=True)
    with conn.cursor() as cur:
        # 1. Create database if not exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (TARGET_E2E_DB,))
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{TARGET_E2E_DB}" OWNER "{cfg["user"]}";')
            print(f"Created database '{TARGET_E2E_DB}'.")

        # 2. Create unprivileged app role if not exists
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s;", (TARGET_E2E_APP_ROLE,))
        from psycopg import sql
        if not cur.fetchone():
            cur.execute(
                sql.SQL('CREATE ROLE {} WITH LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE;').format(
                    sql.Identifier(TARGET_E2E_APP_ROLE),
                    sql.Literal(app_pwd)
                )
            )
            print(f"Created unprivileged role '{TARGET_E2E_APP_ROLE}'.")
        else:
            cur.execute(
                sql.SQL('ALTER ROLE {} WITH PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE;').format(
                    sql.Identifier(TARGET_E2E_APP_ROLE),
                    sql.Literal(app_pwd)
                )
            )

        # 3. Grant database privileges
        cur.execute(f'GRANT ALL PRIVILEGES ON DATABASE "{TARGET_E2E_DB}" TO "{TARGET_E2E_APP_ROLE}";')

    conn.close()

    # 4. Connect to rendez_e2e to grant schema, table, sequence privileges
    conn_e2e = get_psycopg_connection(dbname=TARGET_E2E_DB, autocommit=True)
    with conn_e2e.cursor() as cur:
        cur.execute(f'GRANT ALL ON SCHEMA public TO "{TARGET_E2E_APP_ROLE}";')
        cur.execute(f'GRANT ALL ON ALL TABLES IN SCHEMA public TO "{TARGET_E2E_APP_ROLE}";')
        cur.execute(f'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "{TARGET_E2E_APP_ROLE}";')
        cur.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{TARGET_E2E_APP_ROLE}";')
        cur.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "{TARGET_E2E_APP_ROLE}";')
    conn_e2e.close()


def safe_drop_e2e_database():
    """Drop rendez_e2e with strict safety guards and literal SQL."""
    conn = get_psycopg_connection(dbname="postgres", autocommit=True)
    validate_safe_database_for_drop(conn, TARGET_E2E_DB)

    with conn.cursor() as cur:
        # Terminate active connections
        cur.execute(
            """
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = %s AND pid <> pg_backend_pid();
            """,
            (TARGET_E2E_DB,),
        )
        # Drop with hardcoded literal string
        cur.execute('DROP DATABASE IF EXISTS "rendez_e2e";')
        print(f"Safely dropped database '{TARGET_E2E_DB}'.")

    conn.close()


def safe_clean_e2e_media():
    """Safely clean and initialize dedicated E2E media directories."""
    validate_safe_media_path(E2E_MEDIA_ROOT)

    if E2E_MEDIA_ROOT.exists():
        shutil.rmtree(E2E_MEDIA_ROOT)

    E2E_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    (E2E_MEDIA_ROOT / "visual" / "derivatives").mkdir(parents=True, exist_ok=True)
    (E2E_MEDIA_ROOT / "visual" / "originals").mkdir(parents=True, exist_ok=True)
    (E2E_MEDIA_ROOT / "fixtures").mkdir(parents=True, exist_ok=True)
    print(f"Safely cleaned and initialized E2E media root at {E2E_MEDIA_ROOT}")


def get_e2e_backend_env(as_unprivileged_app=True):
    """
    Generate environment variables for E2E backend.
    Uses unprivileged rendez_e2e_app for app server; privileged user for migrations.
    """
    cfg = get_pg_privileged_config()
    creds = load_or_create_e2e_credentials()

    env = os.environ.copy()
    env["POSTGRES_DB"] = TARGET_E2E_DB
    env["POSTGRES_HOST"] = cfg["host"]
    env["POSTGRES_PORT"] = cfg["port"]

    if as_unprivileged_app:
        env["POSTGRES_USER"] = TARGET_E2E_APP_ROLE
        env["POSTGRES_PASSWORD"] = creds["pg_app_role"]["password"]
    else:
        env["POSTGRES_USER"] = cfg["user"]
        env["POSTGRES_PASSWORD"] = cfg["password"]

    env["PRIVATE_MEDIA_ROOT"] = str(E2E_MEDIA_ROOT)
    env["DJANGO_DEBUG"] = "1"
    env["DJANGO_ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"
    env["DJANGO_CSRF_TRUSTED_ORIGINS"] = "http://localhost:5174,http://127.0.0.1:5174,http://localhost:5173,http://127.0.0.1:5173"
    env["DJANGO_HTTPS"] = "0"
    env["PYTHONPATH"] = str(BACKEND_DIR) + (f":{env['PYTHONPATH']}" if "PYTHONPATH" in env else "")

    return env


def run_django_command(*cmd_args, as_unprivileged_app=False):
    """Run a Django manage.py command targeting rendez_e2e."""
    env = get_e2e_backend_env(as_unprivileged_app=as_unprivileged_app)
    full_cmd = ["uv", "run", "--project", str(BACKEND_DIR), "python", str(BACKEND_DIR / "manage.py")] + list(cmd_args)
    res = subprocess.run(full_cmd, cwd=REPO_ROOT, env=env, check=True)
    return res.returncode


def seed_test_accounts():
    """Seed test accounts with precise role and permission boundaries."""
    creds = load_or_create_e2e_credentials()
    user_cred = creds["user"]
    mod_cred = creds["moderator"]
    staff_cred = creds["staff_unprivileged"]

    script = f"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from apps.accounts.models import User
from apps.photos.models import PhotoSubmission

# 1. Normal User (no staff, no superuser)
u_norm, _ = User.objects.get_or_create(
    email='{user_cred["email"]}',
    defaults={{'display_name': 'E2E Normal User', 'is_active': True}}
)
u_norm.is_staff = False
u_norm.is_superuser = False
u_norm.is_active = True
u_norm.set_password('{user_cred["password"]}')
u_norm.user_permissions.clear()
u_norm.save()
print("  - Normal User: is_staff=False, is_superuser=False")

# 2. Moderator (is_staff=True, is_superuser=False, has photos.review_photosubmission)
u_mod, _ = User.objects.get_or_create(
    email='{mod_cred["email"]}',
    defaults={{'display_name': 'E2E Photo Moderator', 'is_active': True}}
)
u_mod.is_staff = True
u_mod.is_superuser = False
u_mod.is_active = True
u_mod.set_password('{mod_cred["password"]}')
u_mod.user_permissions.clear()

ct = ContentType.objects.get_for_model(PhotoSubmission)
perm = Permission.objects.get(content_type=ct, codename="review_photosubmission")
u_mod.user_permissions.add(perm)
u_mod.save()
print("  - Moderator: is_staff=True, is_superuser=False, with review_photosubmission permission")

# 3. Staff Unprivileged (is_staff=True, is_superuser=False, NO moderation permission)
u_staff, _ = User.objects.get_or_create(
    email='{staff_cred["email"]}',
    defaults={{'display_name': 'E2E Staff Unprivileged', 'is_active': True}}
)
u_staff.is_staff = True
u_staff.is_superuser = False
u_staff.is_active = True
u_staff.set_password('{staff_cred["password"]}')
u_staff.user_permissions.clear()
u_staff.save()
print("  - Staff Unprivileged: is_staff=True, is_superuser=False, without moderation permission")

# 4. Seed an initial photo submission for Normal User to enable permission and media verification
import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.photos.services import submit
from apps.places.models import Place

# Seed onto a real (non-demo) venue, deterministically. Pinning this to a
# demo fixture adds a second published photo to that place, which duplicates
# its Discover card and breaks strict-mode locators in the visual specs.
place = (
    Place.objects.filter(slug__startswith="danang-", is_demo=False)
    .order_by("id")
    .first()
    or Place.objects.filter(is_demo=False).order_by("id").first()
    or Place.objects.first()
)
if place and not PhotoSubmission.objects.filter(submitted_by=u_norm, idempotency_key="e2e-seed-sub-1").exists():
    buf = io.BytesIO()
    Image.new("RGB", (120, 120), (180, 120, 70)).save(buf, format="JPEG")
    buf.seek(0)
    file = SimpleUploadedFile("e2e_seed_photo.jpg", buf.read(), content_type="image/jpeg")
    sub = submit(
        u_norm,
        {{"place_id": place, "consent_version": "photo-rights-v2"}},
        [file],
        "e2e-seed-sub-1",
    )
    print(f"  - Seed submission ready for Normal User (submission={{sub.id}})")

"""
    # Seeding creates/updates auth permissions, run with privileged migration env
    env = get_e2e_backend_env(as_unprivileged_app=False)
    subprocess.run(
        ["uv", "run", "--project", str(BACKEND_DIR), "python", "-c", script],
        cwd=REPO_ROOT,
        env=env,
        check=True,
    )


def compute_dev_snapshot():
    """
    Compute cryptographic SHA-256 digests over all tables in rendez_local
    and all binary files in .local/media to guarantee zero mutations.
    """
    cfg = get_pg_privileged_config()
    conn = get_psycopg_connection(dbname=cfg["dev_db"])
    table_digests = {}
    db_hasher = hashlib.sha256()

    with conn.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = [r[0] for r in cur.fetchall()]
        for t in tables:
            cur.execute(f'SELECT * FROM "{t}";')
            rows = cur.fetchall()
            sorted_rows = sorted(rows, key=lambda r: str(r[0]) if r else "")
            t_hasher = hashlib.sha256()
            for row in sorted_rows:
                t_hasher.update(str(row).encode("utf-8"))
            t_digest = t_hasher.hexdigest()
            table_digests[t] = t_digest
            db_hasher.update(f"{t}:{t_digest}".encode("utf-8"))

    conn.close()
    overall_db_digest = db_hasher.hexdigest()

    # Media manifest
    media_hasher = hashlib.sha256()
    file_count = 0
    if DEV_MEDIA_ROOT.exists():
        for p in sorted(DEV_MEDIA_ROOT.rglob("*")):
            if p.is_file():
                file_count += 1
                f_hash = hashlib.sha256(p.read_bytes()).hexdigest()
                rel = p.relative_to(DEV_MEDIA_ROOT)
                media_hasher.update(f"{rel}:{f_hash}".encode("utf-8"))
    overall_media_digest = media_hasher.hexdigest()

    snapshot = {
        "db_name": cfg["dev_db"],
        "tables_count": len(table_digests),
        "overall_db_digest": overall_db_digest,
        "table_digests": table_digests,
        "media_file_count": file_count,
        "overall_media_digest": overall_media_digest,
    }
    return snapshot


def save_dev_snapshot():
    """Save current dev snapshot to .local/e2e_dev_snapshot.json."""
    snapshot = compute_dev_snapshot()
    SNAPSHOT_FILE.write_text(json.dumps(snapshot, indent=2))
    print(f"Development baseline snapshot saved to {SNAPSHOT_FILE}")
    print(f"  DB SHA-256: {snapshot['overall_db_digest'][:16]}...")
    print(f"  Media SHA-256: {snapshot['overall_media_digest'][:16]}... ({snapshot['media_file_count']} files)")


def verify_isolation():
    """
    Compare current dev state against saved baseline snapshot,
    providing mathematical cryptographic proof of zero modification.
    """
    print("=== [Cryptographic Data Isolation Verification] ===")
    current = compute_dev_snapshot()

    if not SNAPSHOT_FILE.is_file():
        print("[WARN] No baseline snapshot found. Generating and saving current state as baseline.")
        save_dev_snapshot()
        return

    baseline = json.loads(SNAPSHOT_FILE.read_text())

    # 1. Compare DB digest
    if current["overall_db_digest"] != baseline["overall_db_digest"]:
        print("[FAIL] Database digest MISMATCH! Development database was mutated.")
        for t, d in current["table_digests"].items():
            if baseline["table_digests"].get(t) != d:
                print(f"  Table changed: {t}")
        sys.exit(1)
    else:
        print(f"[PASS] Development database '{current['db_name']}' is 100% IDENTICAL.")
        print(f"       SHA-256 digest: {current['overall_db_digest']}")

    # 2. Compare Media digest
    if current["overall_media_digest"] != baseline["overall_media_digest"]:
        print("[FAIL] Development media digest MISMATCH! Development media was mutated.")
        sys.exit(1)
    else:
        print(f"[PASS] Development media directory is 100% IDENTICAL.")
        print(f"       SHA-256 digest: {current['overall_media_digest']} ({current['media_file_count']} files)")


def setup_e2e_environment():
    """Complete E2E setup pipeline."""
    print(">>> Setting up Hardened E2E Environment...")
    if not run_preflight():
        sys.exit(1)

    # Save dev baseline snapshot before any changes
    save_dev_snapshot()

    ensure_e2e_database_and_roles()

    print("Applying migrations on rendez_e2e (privileged setup)...")
    run_django_command("migrate", as_unprivileged_app=False)

    print("Importing Da Nang dataset into rendez_e2e...")
    run_django_command("import_danang", as_unprivileged_app=False)

    print("Seeding visual demo fixtures into rendez_e2e...")
    run_django_command("seed_visual_demo", as_unprivileged_app=False)

    # Ensure app role has privileges on all newly created tables/sequences
    conn_e2e = get_psycopg_connection(dbname=TARGET_E2E_DB, autocommit=True)
    with conn_e2e.cursor() as cur:
        cur.execute(f'GRANT ALL ON ALL TABLES IN SCHEMA public TO "{TARGET_E2E_APP_ROLE}";')
        cur.execute(f'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "{TARGET_E2E_APP_ROLE}";')
    conn_e2e.close()

    seed_test_accounts()

    # Write e2e_runtime.env
    cfg = get_pg_privileged_config()
    creds = load_or_create_e2e_credentials()
    app_pwd = creds["pg_app_role"]["password"]

    content = f"""# Auto-generated Hardened E2E runtime environment
POSTGRES_DB={TARGET_E2E_DB}
POSTGRES_HOST={cfg['host']}
POSTGRES_PORT={cfg['port']}
POSTGRES_USER={TARGET_E2E_APP_ROLE}
POSTGRES_PASSWORD={app_pwd}
PRIVATE_MEDIA_ROOT={E2E_MEDIA_ROOT}
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174,http://localhost:5173,http://127.0.0.1:5173
DJANGO_HTTPS=0
BACKEND_PORT=8001
FRONTEND_PORT=5174
"""
    E2E_RUNTIME_ENV.write_text(content)
    try:
        os.chmod(E2E_RUNTIME_ENV, 0o600)
    except OSError:
        pass

    print(">>> Hardened E2E Environment Setup Completed Successfully.")


def reset_e2e_environment():
    """Safely reset and rebuild E2E environment."""
    print(">>> Resetting Hardened E2E Environment...")
    safe_drop_e2e_database()
    # Media clean must pair with the DB drop: wiping files while keeping rows
    # would leave every seeded photo pointing at a missing derivative.
    safe_clean_e2e_media()
    setup_e2e_environment()
    print(">>> Hardened E2E Environment Reset Completed.")


def run_backend_server(port="8001"):
    """Run Django backend test server bound strictly to rendez_e2e and unprivileged app role."""
    print(f">>> Launching Django E2E Backend Server on 127.0.0.1:{port} (Role: {TARGET_E2E_APP_ROLE})...")
    env = get_e2e_backend_env(as_unprivileged_app=True)

    # Fail fast assertions
    if env["POSTGRES_DB"] != TARGET_E2E_DB:
        raise SafetyViolationError(f"Fail-fast guard: POSTGRES_DB is '{env['POSTGRES_DB']}', not '{TARGET_E2E_DB}'!")
    if env["POSTGRES_USER"] != TARGET_E2E_APP_ROLE:
        raise SafetyViolationError(f"Fail-fast guard: POSTGRES_USER is '{env['POSTGRES_USER']}', not '{TARGET_E2E_APP_ROLE}'!")
    if str(E2E_MEDIA_ROOT) not in env["PRIVATE_MEDIA_ROOT"]:
        raise SafetyViolationError("Fail-fast guard: PRIVATE_MEDIA_ROOT does not point to E2E media root!")

    full_cmd = [
        "uv",
        "run",
        "--project",
        str(BACKEND_DIR),
        "python",
        str(BACKEND_DIR / "manage.py"),
        "runserver",
        f"127.0.0.1:{port}",
        "--noreload",
    ]
    subprocess.run(full_cmd, cwd=REPO_ROOT, env=env)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rendez Hardened E2E Environment Manager")
    parser.add_argument(
        "command",
        choices=["preflight", "setup", "reset", "verify", "run-backend", "snapshot"],
        help="Command to run",
    )
    parser.add_argument("--port", default="8001", help="Backend port for run-backend")
    args = parser.parse_args()

    if args.command == "preflight":
        success = run_preflight()
        sys.exit(0 if success else 1)
    elif args.command == "setup":
        setup_e2e_environment()
    elif args.command == "reset":
        reset_e2e_environment()
    elif args.command == "verify":
        verify_isolation()
    elif args.command == "snapshot":
        save_dev_snapshot()
    elif args.command == "run-backend":
        run_backend_server(port=args.port)
