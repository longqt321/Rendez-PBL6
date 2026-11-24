# Backend — Rendez API

Hono 4 + Bun 1.3 + Prisma 7 + Kysely + PostgreSQL 17 (`pgvector`, `pg_trgm`, `unaccent`, `pg_stat_statements`) + Redis 7 + Better Auth + `pg-boss`.

- Stack đầy đủ: [`../docs/STACK.md`](../docs/STACK.md)
- Tài liệu API: [`../docs/backend/API.md`](../docs/backend/API.md)
- Vận hành & deploy: [`../docs/backend/RUNBOOK.md`](../docs/backend/RUNBOOK.md)

## Hiện trạng hệ thống

- **Cơ sở dữ liệu:** **30 migration**, **43 model Prisma** và **15 enum** (`prisma/schema.prisma`, chuẩn hóa 3NF cho `tags`/`place_tags` và `sources`/`place_sources`); seed chính thức **360 địa điểm Đà Nẵng** (`data/places-expanded.json`).
- **Tầng truy vấn lai:** Prisma 7 cho CRUD chuẩn kết hợp Kysely (`src/lib/kysely.ts`, sinh kiểu tự động qua `prisma-kysely`) cho các truy vấn ghép bảng phức tạp, CTE và `distinctOn`.
- **Route & Kiểm thử:** **18 nhóm route** (`src/routes/index.ts`), **52 file test** trong `test/` (`bun run test` chạy tuần tự từng file qua `scripts/test-all.sh` cùng Testcontainers Postgres).
- **Xác thực (`better-auth`):** Hỗ trợ email/mật khẩu (bắt buộc xác thực email), đăng nhập Google OAuth có điều kiện và cron `auth-cleanup` dọn token hết hạn lúc `04:15` giờ VN.
- **Tính năng & Hạ tầng:**
  - **Tìm kiếm & Gợi ý:** Hybrid search (`pg_trgm` + `pgvector` HNSW + suy luận thuộc tính + EGRF), **Gợi ý hôm nay** (`00:05` giờ VN), gợi ý cá nhân hóa + DES cold-start (`GET /places/recommended`), thu thập hành vi bulk `unnest` (`POST /events`).
  - **Phòng nhóm & Nhắn tin SSE:** Điều phối phòng nhóm (đề xuất ứng viên, tọa độ thành viên, tính khoảng cách & xếp hạng đáp ứng tiêu chí), nhắn tin trực tiếp (hòm thư Chính/Tin nhắn chờ, đính kèm, chặn user) phát sự kiện thời gian thực qua Postgres `LISTEN/NOTIFY` (`src/lib/pubsub.ts`, `src/lib/message-events.ts`).
  - **Redis & Độ bền:** `Bun.RedisClient` (`src/lib/redis.ts`) cho rate-limit, cache, dedupe `/events`, ring buffer `/admin/observability` (kèm fallback in-memory); `cockatiel` circuit breaker cho embeddings/SMTP/tiles.
  - **Observability:** `AsyncLocalStorage` (`src/lib/request-context.ts`) + Pino Canonical Log Line phân rã độ trễ (`db`, `redis`, `embed`, `external`, `app`), nối `traceparent` / `X-Request-Id`, `POST /telemetry` và `GET /admin/observability`.

## Chạy dev

```bash
cd ..                      # về thư mục gốc repo
bun run db:up              # Postgres 17 (:5432) + Redis 7 (:6379)
cp backend/.env.example backend/.env
bun run db:migrate         # chạy migration + seed
bun run db:seed            # chạy seed độc lập (idempotent)
bun run dev:api            # http://localhost:8000/healthz
```

## Kiểm tra

```bash
bun run typecheck                    # tsc --noEmit
bun test test/observability.test.ts  # unit test nhanh không cần Docker
bun run test                         # toàn bộ 52 file test (Testcontainers Postgres)
bun run build                        # bundle backend/dist/server.js
```

## Ghi chú

- `generated/` và `.env` được bỏ qua khỏi git; không chỉnh sửa migration lịch sử trong `prisma/migrations/`.
- Prisma 7 dùng driver adapter `@prisma/adapter-pg` với URL cấu hình trong `prisma.config.ts`.
