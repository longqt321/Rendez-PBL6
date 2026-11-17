#!/usr/bin/env bash
# Sinh biến thể WebP cho dataset ảnh cold-start (thiết kế mục 5.3).
#
# Quy ước: `data/cold-start/images/venues/<tên>.<ext>`
#       →  `data/cold-start/images/venues/<tên>-400.webp` và `<tên>-800.webp`
#
# Chạy TAY khi dataset ảnh đổi (không chạy trong Docker build — output commit
# sẵn). Cần ImageMagick 7 (`magick`). Sau khi chạy, `predev`/`prebuild` sẽ chép
# cả biến thể sang `public/` (copy-cold-start-images.mjs walk toàn bộ thư mục).
# Chạy `node scripts/check-image-variants.mjs` để xác nhận đủ biến thể.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="data/cold-start/images"

count=0
for file in "$SRC"/venues/*; do
  [[ -f "$file" ]] || continue
  base="$(basename "$file")"
  # Bỏ qua chính biến thể đã sinh (kết thúc -400.webp / -800.webp).
  case "$base" in
    *-400.webp|*-800.webp) continue ;;
    *) ;;
  esac
  name="${base%.*}"
  magick "$file" -resize '400x>' -quality 78 -define webp:method=6 "$SRC/venues/${name}-400.webp"
  magick "$file" -resize '800x>' -quality 78 -define webp:method=6 "$SRC/venues/${name}-800.webp"
  count=$((count + 1))
  echo "OK: ${name} (+400w, +800w)"
done

echo "Đã sinh biến thể cho ${count} ảnh gốc."
