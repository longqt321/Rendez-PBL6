#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
[[ -f .local/runtime.env && -f frontend/dist/index.html ]] || { echo 'Run bash scripts/setup-local.sh first.'; exit 1; }
if [[ -f .local/app.pid ]] && kill -0 "$(cat .local/app.pid)" 2>/dev/null; then echo 'Rendez already running: http://127.0.0.1:8080'; exit 0; fi
docker compose --env-file .local/runtime.env -f compose.local.yaml up -d --wait db
printf 'Rendez: http://127.0.0.1:8080 (Ctrl+C to stop)\n'
exec backend/.venv/bin/python -m gunicorn --chdir backend config.wsgi:application --bind 127.0.0.1:8080 --workers 2 --timeout 60 --pid "$RENDEZ_ROOT/.local/app.pid" --access-logfile "$RENDEZ_ROOT/.local/logs/access.log" --error-logfile -
