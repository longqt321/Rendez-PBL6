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
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver
DJANGO_CSRF_TRUSTED_ORIGINS=http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5173,http://localhost:5173
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
docker compose --env-file .local/runtime.env -f compose.local.yaml up -d --wait db
if [[ ! -x backend/.venv/bin/python ]]; then uv sync --project backend --frozen; fi
if [[ ! -d frontend/node_modules ]]; then bun install --cwd frontend --frozen-lockfile; fi
backend/.venv/bin/python backend/manage.py migrate --noinput
backend/.venv/bin/python backend/manage.py import_danang
backend/.venv/bin/python scripts/create-admin.py
backend/.venv/bin/python backend/manage.py collectstatic --noinput --verbosity 0
(cd frontend && bun run build)
printf '\nSetup complete. Run bash scripts/start-local.sh\n'
