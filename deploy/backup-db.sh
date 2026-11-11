#!/usr/bin/env bash
# Backup Postgres của RendeZ — chạy hằng ngày bằng cron/systemd timer.
#
#   ./backup-db.sh                    # dùng giá trị mặc định bên dưới
#   BACKUP_DIR=/srv/backups ./backup-db.sh
#
# Chạy TRONG container postgres (không cần psql trên máy chủ):
#   docker compose exec -T postgres sh -c 'pg_dump ...' > file
#
# Giữ tối đa RETENTION_DAYS bản mới nhất, xoá bản cũ hơn (chỉ trong BACKUP_DIR).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/rendez}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER="${CONTAINER:-rendez-postgres}"
PG_USER="${POSTGRES_USER:-rendez}"
PG_DB="${POSTGRES_DB:-rendez}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/rendez-$STAMP.sql.gz"

# pg_dump custom format (-Fc) nén sẵn và cho phép restore chọn lọc bằng pg_restore.
docker exec "$CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" -Fc | gzip > "$TARGET"

# Kiểm tra file không rỗng — backup 0 byte coi như thất bại (cron sẽ thấy exit != 0).
if [ ! -s "$TARGET" ]; then
  echo "Backup rỗng: $TARGET" >&2
  rm -f "$TARGET"
  exit 1
fi

echo "Đã backup: $TARGET ($(du -h "$TARGET" | cut -f1))"

# Xoá bản cũ hơn RETENTION_DAYS ngày.
find "$BACKUP_DIR" -name 'rendez-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
