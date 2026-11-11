# RUNBOOK — vận hành backend Rendez

> Đối tượng: người chạy/dev backend. Mọi lệnh chạy từ thư mục gốc repo
> (`~/Projects/rendez`) trừ khi ghi khác. Cập nhật: 2026-11-11.

## 1. Yêu cầu môi trường

| Thành phần | Phiên bản | Kiểm tra |
|---|---|---|
| Bun | 1.3.14 | `bun --version` |
| Docker + compose | 24+ | `docker compose version` |
| PostgreSQL | 17 (container) | `docker compose ps postgres` |

## 2. Chạy dev (không container hoá API)

```bash
docker compose up -d postgres          # Postgres 17, port 5432
cd backend
cp .env.example .env                   # nếu chưa có; điền BETTER_AUTH_SECRET >= 32 ký tự
bun install                            # từ root nếu chưa: bun install
bunx prisma migrate deploy             # áp migration đã commit
bun run seed                           # corpus hiện tại 344 POI (idempotent, tự dọn tier='osm' cũ)
bun run dev                            # API ở http://localhost:8000, watch mode
```

Kiểm tra nhanh:

```bash
xh GET :8000/healthz                   # {"status":"ok"}
xh GET :8000/readyz                    # {"status":"ok"} — có kiểm DB
xh GET :8000/api/v1/places --limit 5   # Page<Place>
```

Frontend dev (`bun run dev:web` ở root) proxy `/api/v1` sang `:8000`, không cần CORS.

## 3. Biến môi trường

| Biến | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|
| `DATABASE_URL` | ✔ | — | Phải bắt đầu bằng `postgres` |
| `PORT` | — | `8000` | Khớp `VITE_PROXY_TARGET` của FE |
| `NODE_ENV` | — | `development` | `production` chặn secret dev |
| `BETTER_AUTH_SECRET` | ✔ (prod) | secret dev | ≥ 32 ký tự; production **phải** đổi |
| `BETTER_AUTH_URL` | — | `http://localhost:8000` | Dùng dựng cookie/callback |
| `CORS_ORIGINS` | — | rỗng | CSV origin FE; rỗng = không CORS (dev qua proxy) |
| `LOG_LEVEL` | — | `info` | `fatal\|error\|warn\|info\|debug\|trace` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | — | rỗng | Đủ 4 → bật `/media`; thiếu → 503 |
| `R2_PUBLIC_BASE_URL` | — | rỗng | Domain đọc ảnh công khai |
| `TRUSTED_PROXIES` | — | rỗng | CSV IP/mạng proxy tin tưởng (để lấy IP client thật cho rate limit); rỗng = chỉ tin socket trực tiếp |

Env được validate **một lần lúc boot** (`backend/src/env.ts`); sai → process thoát ngay
với thông báo rõ, không chạy nửa vời.

## 4. Migration và seed

```bash
cd backend
bunx prisma migrate deploy     # production/CI: chỉ áp migration đã commit
bunx prisma migrate dev        # dev: tạo migration mới (KHÔNG sửa migration đã commit)
bunx prisma generate           # sau mỗi lần đổi schema
bun run seed                   # idempotent: upsert theo id place
```

Quy tắc: migration đã commit là bất biến. Cần đổi schema → migration mới.

## 5. Test

```bash
cd backend
bun test --parallel=1          # 185 test / 20 file, Testcontainers Postgres 17 thật
bun run typecheck              # tsc --noEmit
```

- `--parallel=1` là **bắt buộc**: mỗi file test tự dựng container riêng; chạy chung process
  sẽ khiến file sau dùng connection của container đã bị file trước dừng (ECONNREFUSED).
- Mỗi file test: start container → `prisma migrate deploy` → seed → chạy → stop container.
  Cần Docker đang chạy; tốn ~8s/file.

## 6. Docker (production-like)

```bash
export BETTER_AUTH_SECRET=$(openssl rand -hex 32)   # production BẮT BUỘC
docker compose build                                 # api + migrate
docker compose up -d                                 # postgres → migrate → api
docker compose ps
docker compose logs -f api
```

Thứ tự khởi động: `postgres` (healthy) → `migrate` (one-shot, `prisma migrate deploy`) →
`api` (`depends_on: service_completed_successfully`).

- Image runtime chạy bằng user `bun`, không chứa devDependency.
- Healthcheck của container gọi `/healthz`; dùng `/readyz` cho load balancer.
- Seed **không** tự chạy trong container — chạy tay khi cần:
  `docker compose run --rm migrate bun run seed`.

## 7. Job nền (pg-boss)

- Queue `place-detect`, cron `*/5 * * * *`; retry 5 lần có backoff; DLQ `place-detect-dlq`.
- Sau khi tạo bài chưa gắn địa điểm, route đẩy thêm 1 job cho riêng bài đó (độ trễ thấp).
- Idempotence: bảng `place_suggestion_notifications` khoá chính `post_id` — một bài chỉ
  được thông báo một lần.
- Xem job: `docker exec rendez-postgres psql -U rendez -d rendez -c "select name, state, count(*) from pgboss.job group by 1,2;"`

## 8. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `Biến môi trường không hợp lệ: DATABASE_URL…` | thiếu/sai URL | điền `.env`, URL phải bắt đầu `postgres` |
| `BETTER_AUTH_SECRET phải được đặt riêng ở production` | chạy prod với secret dev | đặt secret ≥ 32 ký tự |
| `prisma migrate deploy` báo `CLI.COMMAND_MOVED` | `bunx` tải Prisma mới (8.x) | dùng Prisma trong `node_modules` (image builder/migrator) hoặc `bun run db:deploy` |
| Test fail `ECONNREFUSED` | chạy `bun test` không có `--parallel=1` | thêm `--parallel=1` |
| `Prisma schema mismatch: Missing columns …` | client cũ sau migration | `bunx prisma generate` |
| `/media` trả 503 | chưa cấu hình R2 | điền 4 biến `R2_*` — hướng dẫn từng bước: [R2-SETUP.md](./R2-SETUP.md) |
| Upload ảnh báo lỗi CORS trong console | bucket chưa có CORS Policy | thêm CORS Policy cho bucket (mục 3 của R2-SETUP.md) |
| 429 liên tục khi test tay | rate limit Postgres theo IP | xoá `rate_limits` của IP đó hoặc chờ hết cửa sổ |
| SSE không nhận cập nhật | API chạy nhiều instance | pub/sub rooms lẫn notifications đều in-RAM, hiện chỉ hỗ trợ 1 instance (xem BACKLOG) |
| `422 Idempotency-Key` | client gửi lại cùng key với payload khác | dùng key mới cho request khác nội dung |
| `409` khi POST có `Idempotency-Key` | request trước cùng key còn `pending` | đợi request đầu hoàn tất hoặc gửi key mới |

## 9. Vận hành DB

```bash
docker exec -it rendez-postgres psql -U rendez -d rendez
\dt                                  # danh sách bảng
select count(*) from places;
select count(*) from pgboss.job;
select count(*) from idempotency_keys where expires_at < now();   -- key hết hạn chờ dọn
```

- Backup: `docker exec rendez-postgres pg_dump -U rendez rendez > backup.sql`
- Khôi phục: `docker exec -i rendez-postgres psql -U rendez -d rendez < backup.sql`
- **Không** chạy `prisma migrate reset` trên DB không phải DB dev của mình.

## 10. Graceful shutdown

`SIGTERM`/`SIGINT` → `server.stop()` (ngừng nhận request) → `pg-boss stop({graceful:true})`
→ `prisma.$disconnect()` → thoát. Thời gian chờ tối đa do orchestrator quyết định
(khuyến nghị 30s).
