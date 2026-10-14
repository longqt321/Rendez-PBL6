#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
[[ $# == 2 && $2 == --yes ]] || { echo 'Usage: bash scripts/restore-local.sh .local/backups/<backup> --yes'; echo 'Restores the local database and media. Stop the app first. A new backup is made before restoring.'; exit 1; }
RENDEZ_RESTORE_DIR="$(realpath "$1")"
[[ "$RENDEZ_RESTORE_DIR" == "$RENDEZ_ROOT/.local/backups/"* ]] || { echo 'Backup must be inside workspace .local/backups.'; exit 1; }
[[ -s "$RENDEZ_RESTORE_DIR/database.dump" && -s "$RENDEZ_RESTORE_DIR/media.tar.gz" ]] || { echo 'Incomplete backup.'; exit 1; }
if [[ -f .local/app.pid ]] && kill -0 "$(cat .local/app.pid)" 2>/dev/null; then echo 'Stop the app first: bash scripts/stop-local.sh'; exit 1; fi
bash scripts/backup-local.sh
tar -tzf "$RENDEZ_RESTORE_DIR/media.tar.gz" > /dev/null
docker compose --env-file .local/runtime.env -f compose.local.yaml exec -T db pg_restore -U rendez -d rendez_local --clean --if-exists --no-owner --exit-on-error < "$RENDEZ_RESTORE_DIR/database.dump"
mkdir -p .local/restore-staging
tar -xzf "$RENDEZ_RESTORE_DIR/media.tar.gz" -C .local/restore-staging
mv .local/media ".local/media-before-restore-$(date +%s)"
mv .local/restore-staging/media .local/media
rmdir .local/restore-staging
printf 'Restored local database and media. Run bash scripts/start-local.sh\n'
