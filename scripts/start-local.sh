#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
[[ -f .local/runtime.env && -f frontend/dist/index.html ]] || { echo 'Run bash scripts/setup-local.sh first.'; exit 1; }
mkdir -p "$RENDEZ_ROOT/.local/logs"
if [[ -f .local/app.pid ]]; then
  PID="$(cat .local/app.pid 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "Rendez already running (PID $PID): http://127.0.0.1:8080"
    exit 0
  else
    rm -f .local/app.pid
  fi
fi
if [[ "${DJANGO_DB_ENGINE:-}" != "sqlite" ]] && [[ -f compose.local.yaml ]] && command -v docker >/dev/null 2>&1; then
  docker compose --env-file .local/runtime.env -f compose.local.yaml up -d --wait db
fi
printf 'Rendez: http://127.0.0.1:8080 (Ctrl+C to stop)\n'
exec backend/.venv/bin/python -m gunicorn --chdir backend config.wsgi:application --bind 127.0.0.1:8080 --workers 2 --timeout 60 --pid "$RENDEZ_ROOT/.local/app.pid" --access-logfile "$RENDEZ_ROOT/.local/logs/access.log" --error-logfile -
