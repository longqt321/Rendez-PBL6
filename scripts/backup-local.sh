#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
umask 077
RENDEZ_BACKUP_DIR="$RENDEZ_ROOT/.local/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RENDEZ_BACKUP_DIR"
trap 'echo "Backup failed; cleaning up incomplete backup at $RENDEZ_BACKUP_DIR" >&2; rm -rf "$RENDEZ_BACKUP_DIR"' ERR

# 1. Relational Database Backup
has_docker=0
if command -v docker >/dev/null 2>&1; then
  has_docker=1
fi

if [[ "${DJANGO_DB_ENGINE:-}" == "sqlite" ]] || [[ -f backend/db.sqlite3 && ( ! -f compose.local.yaml || $has_docker -eq 0 ) ]]; then
  if [[ -f backend/db.sqlite3 ]]; then
    cp backend/db.sqlite3 "$RENDEZ_BACKUP_DIR/database.sqlite3"
  fi
else
  docker compose --env-file .local/runtime.env -f compose.local.yaml exec -T db pg_dump -U rendez -d "${POSTGRES_DB:-rendez_local}" -Fc > "$RENDEZ_BACKUP_DIR/database.dump"
fi

# 2. File Media Archive Backup
mkdir -p .local/media
tar -czf "$RENDEZ_BACKUP_DIR/media.tar.gz" -C .local media

# 3. Environment & Configuration Backup
if [[ -f .local/runtime.env ]]; then
  cp .local/runtime.env "$RENDEZ_BACKUP_DIR/runtime.env"
fi
if [[ -f .local/admin-credentials.json ]]; then
  cp .local/admin-credentials.json "$RENDEZ_BACKUP_DIR/admin-credentials.json" 2>/dev/null || true
fi

trap - ERR
printf '%s\n' "$RENDEZ_BACKUP_DIR"
