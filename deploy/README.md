# Deploy RendeZ — cấu hình chuẩn bị (người dùng tự chạy)

Phiên này CHỈ chuẩn bị cấu hình, KHÔNG deploy. Mọi lệnh dưới đây do bạn tự thực hiện.

## 1. Máy chủ cần gì

- Linux + Docker + Docker Compose v2
- Domain trỏ về máy chủ (Caddy xin chứng chỉ Let's Encrypt tự động)
- Thư mục dữ liệu: `/var/lib/rendez/pgdata` (Postgres), `/var/backups/rendez` (backup)

## 2. Build & chạy

```bash
# Trên máy chủ, sau khi clone repo:
bun install --frozen-lockfile
docker compose -f compose.yaml -f deploy/compose.prod.yml build

# Biến môi trường production (KHÔNG commit):
cp deploy/.env.example /srv/rendez/.env   # điền giá trị thật
# Lưu ý: ngoài POSTGRES_PASSWORD/BETTER_AUTH_SECRET/BETTER_AUTH_URL/CORS_ORIGINS,
# bắt buộc đặt APP_ORIGIN = URL public https của FE (API dùng cho og:url/canonical
# và tuyệt đối hoá ảnh OG — xem deploy/compose.prod.yml, docs/thiet-ke/chia-se-og-dong.md).

docker compose --env-file /srv/rendez/.env \
  -f compose.yaml -f deploy/compose.prod.yml up -d

# Build frontend tĩnh rồi Caddy phục vụ:
cd frontend && bun run build
# mount frontend/dist vào Caddy: thêm volume `./frontend/dist:/srv/web:ro`
# vào service `caddy` trong deploy/compose.prod.yml (đã ghi chú sẵn).
```

## 3. Backup

```bash
chmod +x deploy/backup-db.sh
# cron hằng ngày 02:30:
30 2 * * * /srv/rendez/deploy/backup-db.sh >> /var/log/rendez-backup.log 2>&1
```

## 4. Kiểm tra sau khi chạy

- `curl https://<domain>/healthz` → `{"status":"ok"}`
- `curl -I https://<domain>/api/v1/places` → có `ETag` + `Cache-Control`
- Đăng ký tài khoản thật qua `/register` (FE), kiểm tra email trong log nếu chưa có SMTP
- `docker compose logs api | grep "DEV ONLY"` phải KHÔNG xuất hiện ở production
  (sendResetPassword ở production không log token — xem `docs/DECISIONS.md` 23)

## 5. Chưa xác minh

- Cấu hình này CHƯA được chạy trên máy chủ thật — chỉ đã kiểm cú pháp và luồng logic.
- TLS Let's Encrypt cần domain công khai; chạy local không xin được chứng chỉ.
