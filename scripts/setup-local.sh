#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p .local/logs .local/media
if [[ ! -f .local/runtime.env ]]; then
  umask 077
  python3 - <<'PY'
import secrets
from pathlib import Path
root = Path.cwd()
Path('.local/runtime.env').write_text(f'''DJANGO_DEBUG=0
DJANGO_SECRET_KEY={secrets.token_urlsafe(48)}
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver,hoangngan.tailc69000.ts.net
DJANGO_CSRF_TRUSTED_ORIGINS=http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5173,http://localhost:5173,https://hoangngan.tailc69000.ts.net
DJANGO_HTTPS=0
POSTGRES_DB=rendez_local
POSTGRES_USER=rendez
POSTGRES_PASSWORD={secrets.token_urlsafe(32)}
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=55433
PRIVATE_MEDIA_ROOT={root}/.local/media
VITE_MAP_STYLE=/map/style.json
''')
PY
  source scripts/env.sh
fi

# Verify environment target is strictly local before applying migrations
target_host="${POSTGRES_HOST:-127.0.0.1}"
if [[ "$target_host" != "127.0.0.1" && "$target_host" != "localhost" && "$target_host" != "db" ]]; then
  echo "ERROR: setup-local.sh is restricted to local development environments only."
  echo "Target database host '$target_host' appears to be an external or remote environment."
  echo "Automatic migrations and seeding will NOT be executed."
  exit 1
fi

if [[ "${DJANGO_DB_ENGINE:-}" != "sqlite" ]] && [[ -f compose.local.yaml ]] && command -v docker >/dev/null 2>&1; then
  docker compose --env-file .local/runtime.env -f compose.local.yaml up -d --wait db
fi
if [[ ! -x backend/.venv/bin/python ]]; then uv sync --project backend --frozen; fi
if [[ ! -d frontend/node_modules ]]; then bun install --cwd frontend --frozen-lockfile; fi
backend/.venv/bin/python backend/manage.py migrate --noinput
backend/.venv/bin/python backend/manage.py import_danang
backend/.venv/bin/python scripts/create-admin.py
backend/.venv/bin/python backend/manage.py collectstatic --noinput --verbosity 0
(cd frontend && bun run build)
printf '\nSetup complete. Run bash scripts/start-local.sh\n'
