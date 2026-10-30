#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
[[ $# == 2 && $2 == --yes ]] || { echo 'Usage: bash scripts/restore-local.sh .local/backups/<backup> --yes'; echo 'Restores the local database and media. Stop the app first. A new backup is made before restoring.'; exit 1; }
RENDEZ_RESTORE_DIR="$(realpath "$1")"
[[ "$RENDEZ_RESTORE_DIR" == "$RENDEZ_ROOT/.local/backups/"* ]] || { echo 'Backup must be inside workspace .local/backups.'; exit 1; }

has_db=0
if [[ -s "$RENDEZ_RESTORE_DIR/database.dump" || -s "$RENDEZ_RESTORE_DIR/database.sqlite3" ]]; then
  has_db=1
fi
if [[ $has_db -eq 0 || ! -s "$RENDEZ_RESTORE_DIR/media.tar.gz" ]]; then
  echo 'Incomplete backup: requires valid database dump/sqlite and media.tar.gz.'
  exit 1
fi

if [[ -f .local/app.pid ]]; then
  PID="$(cat .local/app.pid 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    echo 'Stop the app first: bash scripts/stop-local.sh'
    exit 1
  fi
fi

# 1. Always create a pre-restore safety backup
printf 'Creating safety backup of current state before restore...\n'
bash scripts/backup-local.sh

# 2. Verify media tar integrity before modifying anything
tar -tzf "$RENDEZ_RESTORE_DIR/media.tar.gz" > /dev/null

# 3. Restore Database
if [[ -s "$RENDEZ_RESTORE_DIR/database.dump" ]]; then
  if [[ -f compose.local.yaml ]] && command -v docker >/dev/null 2>&1; then
    docker compose --env-file .local/runtime.env -f compose.local.yaml up -d --wait db
    docker compose --env-file .local/runtime.env -f compose.local.yaml exec -T db pg_restore -U rendez -d "${POSTGRES_DB:-rendez_local}" --clean --if-exists --no-owner --exit-on-error < "$RENDEZ_RESTORE_DIR/database.dump"
  fi
elif [[ -s "$RENDEZ_RESTORE_DIR/database.sqlite3" ]]; then
  cp "$RENDEZ_RESTORE_DIR/database.sqlite3" backend/db.sqlite3
fi

# 4. Restore Media Files
mkdir -p .local/restore-staging
tar -xzf "$RENDEZ_RESTORE_DIR/media.tar.gz" -C .local/restore-staging
if [[ -d .local/media ]]; then
  mv .local/media ".local/media-before-restore-$(date +%s)"
fi
mv .local/restore-staging/media .local/media
rm -rf .local/restore-staging

printf 'Restored local database and media. Run bash scripts/start-local.sh\n'
