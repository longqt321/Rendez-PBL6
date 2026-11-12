# Deploy RendeZ — cấu hình chuẩn bị (người dùng tự chạy)

Phiên này CHỈ chuẩn bị cấu hình, KHÔNG deploy. Mọi lệnh dưới đây do bạn tự thực hiện.

## 1. Máy chủ cần gì

- Linux + Docker + Docker Compose v2
- Domain trỏ về máy chủ (Caddy xin chứng chỉ Let's Encrypt tự động)
- Thư mục dữ liệu: `/var/lib/rendez/pgdata` (Postgres), `/var/backups/rendez` (backup)

## 2. Biến môi trường

`deploy/compose.prod.yml` bắt buộc (compose fail-fast nếu thiếu):

| Biến | Ý nghĩa |
| --- | --- |
| `POSTGRES_PASSWORD` | Mật khẩu Postgres |
| `BETTER_AUTH_SECRET` | Secret better-auth |
| `BETTER_AUTH_URL` | URL công khai của API/auth |
| `CORS_ORIGINS` | Origin của FE |
| `APP_ORIGIN` | URL public **https** của FE — API dùng dựng `og:url`/canonical và tuyệt đối hoá ảnh OG; đồng thời là build arg `VITE_APP_ORIGIN` cho frontend |

Tuỳ chọn: `SMTP_*` + `MAIL_FROM` (mail quên mật khẩu; thiếu vẫn chạy), và 5 biến R2
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`R2_PUBLIC_BASE_URL` — thiếu thì route media trả 503, phần còn lại chạy).

```bash
cp deploy/.env.example /srv/rendez/.env   # điền giá trị thật, KHÔNG commit
```

## 3. Build & chạy

```bash
# Trên máy chủ, sau khi clone repo:
bun install --frozen-lockfile

# Build frontend tĩnh vào image nginx. Build arg VITE_APP_ORIGIN lấy từ APP_ORIGIN
# (compose.yaml) → canonical/OG + robots.txt/sitemap.xml sinh đúng lúc build.
docker compose --env-file /srv/rendez/.env \
  -f compose.yaml -f deploy/compose.prod.yml build web

# Lấy dist ra để Caddy phục vụ (service `web` bị tắt ở prod — xem mục 4):
docker create --name rendez-web-tmp rendez-web
docker cp rendez-web-tmp:/usr/share/nginx/html/. ./frontend/dist/
docker rm rendez-web-tmp

docker compose --env-file /srv/rendez/.env \
  -f compose.yaml -f deploy/compose.prod.yml up -d
```

## 4. Kiến trúc prod

- Caddy là điểm vào duy nhất (80/443), proxy `/api` → `api:8000`; API không lộ port.
- **Service `web` (nginx dev) bị tắt ở prod**: `entrypoint: ["true"]`, `restart: "no"`.
- Caddy phục vụ frontend tĩnh từ mount `./frontend/dist:/srv/web:ro` (đường dẫn tính
  từ compose.yaml gốc, không phải từ `deploy/`).
- `robots.txt` + `sitemap.xml` sinh lúc build từ `VITE_APP_ORIGIN` (`frontend/vite.config.ts`).

## 5. Backup

```bash
chmod +x deploy/backup-db.sh
# cron hằng ngày 02:30:
30 2 * * * /srv/rendez/deploy/backup-db.sh >> /var/log/rendez-backup.log 2>&1
```

## 6. Kiểm tra sau khi chạy

- `curl https://<domain>/healthz` → `{"status":"ok"}`
- `curl -I https://<domain>/api/v1/places` → có `ETag` + `Cache-Control`
- `curl https://<domain>/robots.txt` và `/sitemap.xml` → trỏ đúng domain (không phải localhost)
- Đăng ký tài khoản thật qua `/register` (FE), xác thực email rồi mới đăng nhập được
- `docker compose logs api | grep "DEV ONLY"` phải KHÔNG xuất hiện ở production
  (sendResetPassword ở production không log token — xem `docs/DECISIONS.md` 23)

## 7. Chưa xác minh

- Cấu hình này CHƯA được chạy trên máy chủ thật — chỉ đã kiểm cú pháp và luồng logic.
- TLS Let's Encrypt cần domain công khai; chạy local không xin được chứng chỉ.
