#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
umask 077
RENDEZ_BACKUP_DIR="$RENDEZ_ROOT/.local/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RENDEZ_BACKUP_DIR"
docker compose --env-file .local/runtime.env -f compose.local.yaml exec -T db pg_dump -U rendez -d rendez_local -Fc > "$RENDEZ_BACKUP_DIR/database.dump"
tar -czf "$RENDEZ_BACKUP_DIR/media.tar.gz" -C .local media
cp .local/runtime.env "$RENDEZ_BACKUP_DIR/runtime.env"
cp .local/admin-credentials.json "$RENDEZ_BACKUP_DIR/admin-credentials.json" 2>/dev/null || true
printf '%s\n' "$RENDEZ_BACKUP_DIR"
