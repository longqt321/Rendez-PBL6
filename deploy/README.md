# Triển khai Production — Rendez

Tài liệu hướng dẫn cấu hình và vận hành hệ thống Rendez trên máy chủ Linux bằng Docker Compose và Caddy.

## 1. Yêu cầu máy chủ

- Linux + Docker + Docker Compose v2.
- Tên miền trỏ về IP máy chủ (Caddy tự động cấp và gia hạn chứng chỉ TLS Let's Encrypt).
- Thư mục lưu trữ bền vững trên máy chủ: `/var/lib/rendez/pgdata` (PostgreSQL) và `/var/backups/rendez` (sao lưu).

## 2. Biến môi trường bắt buộc

`deploy/compose.prod.yml` kiểm tra fail-fast khi thiếu các biến sau:

| Biến | Ý nghĩa |
| --- | --- |
| `POSTGRES_PASSWORD` | Mật khẩu Postgres |
| `BETTER_AUTH_SECRET` | Khóa ký phiên `better-auth` (tối thiểu 32 ký tự, không dùng khóa dev) |
| `BETTER_AUTH_URL` | URL công khai của API/auth |
| `CORS_ORIGINS` | Danh sách origin frontend được phép |
| `APP_ORIGIN` | URL HTTPS công khai của frontend (dùng tạo canonical/OG và biến build `VITE_APP_ORIGIN`) |

Biến tùy chọn: `SMTP_*` + `MAIL_FROM` (gửi email xác thực và đặt lại mật khẩu), 5 biến Cloudflare R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` — nếu thiếu, endpoint `/media` trả 503), và `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (bật nút đăng nhập Google).

```bash
cp deploy/.env.example /srv/rendez/.env   # điền giá trị thật, không commit vào git
```

## 3. Build và khởi chạy

```bash
bun install --frozen-lockfile

# Build frontend tĩnh kèm VITE_APP_ORIGIN để sinh robots.txt, sitemap.xml và thẻ OG đúng domain
docker compose --env-file /srv/rendez/.env \
  -f compose.yaml -f deploy/compose.prod.yml build web

# Trích xuất dist ra thư mục phục vụ bởi Caddy (service web bị tắt ở prod)
docker create --name rendez-web-tmp rendez-web
docker cp rendez-web-tmp:/usr/share/nginx/html/. ./frontend/dist/
docker rm rendez-web-tmp

docker compose --env-file /srv/rendez/.env \
  -f compose.yaml -f deploy/compose.prod.yml up -d
```

## 4. Kiến trúc triển khai

- Caddy là điểm vào duy nhất (cổng 80/443), phục vụ file tĩnh từ `./frontend/dist` và reverse proxy `/api` về `api:8000` (API không mở cổng ra ngoài).
- Service `web` (nginx dev) tắt ở production (`entrypoint: ["true"]`, `restart: "no"`).
- Tệp `robots.txt` và `sitemap.xml` được sinh tự động khi build từ `VITE_APP_ORIGIN` (`frontend/vite.config.ts`).

## 5. Sao lưu dữ liệu định kỳ

```bash
chmod +x deploy/backup-db.sh
# Cron chạy lúc 02:30 hằng ngày:
30 2 * * * /srv/rendez/deploy/backup-db.sh >> /var/log/rendez-backup.log 2>&1
```

## 6. Danh sách kiểm tra sau triển khai

- `curl https://<domain>/healthz` trả về `{"status":"ok"}`.
- `curl -I https://<domain>/api/v1/places` có header `ETag` và `Cache-Control`.
- `curl https://<domain>/robots.txt` và `/sitemap.xml` trỏ đúng domain công khai.
- Kiểm tra luồng đăng ký tài khoản thật qua `/register` và nhận email xác thực.
- Xác nhận log `api` không chứa chuỗi `DEV ONLY`.
