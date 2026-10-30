#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [[ -f .local/app.pid ]]; then
  PID="$(cat .local/app.pid 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill -TERM "$PID"
  fi
  rm -f .local/app.pid
fi
if [[ ${1:-} == --database ]] && [[ "${DJANGO_DB_ENGINE:-}" != "sqlite" ]] && [[ -f compose.local.yaml ]] && command -v docker >/dev/null 2>&1; then
  docker compose --env-file .local/runtime.env -f compose.local.yaml stop db
fi
