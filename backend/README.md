# backend — RendeZ API

Hono 4 + Bun 1.3 + Prisma 7 + PostgreSQL 17 (`pgvector`, `pg_stat_statements`) + Redis 7 + better-auth + pg-boss.

- Stack đầy đủ: [`../docs/STACK.md`](../docs/STACK.md)
- Tài liệu API: [`../docs/backend/API.md`](../docs/backend/API.md)
- Vận hành & deploy: [`../docs/backend/RUNBOOK.md`](../docs/backend/RUNBOOK.md)

## Hiện trạng

- **23 migration**, **33 model Prisma** (`prisma/schema.prisma`, chuẩn 3NF cho `tags`/`place_tags` và `sources`/`place_sources`); seed chính thức **358 địa điểm** (`data/places-expanded.json`).
- **44 file test** trong `test/` (`bun run test` chạy tuần tự qua `scripts/test-all.sh` với Testcontainers Postgres); typecheck + build 0 lỗi.
- **Auth (`better-auth`)**: Bắt buộc xác thực email trước khi đăng nhập; cron `auth-cleanup` dọn `sessions`, `verifications`, `idempotency_keys` hết hạn hằng ngày (`04:15` giờ VN).
- **Tính năng & Hạ tầng chính**:
  - **Tìm kiếm & Gợi ý**: Hybrid search (`pg_trgm` + `pgvector` HNSW + structured intent + EGRF), **Gợi ý hôm nay** (`00:05` giờ VN), gợi ý cá nhân hoá + DES cold-start (`GET /places/recommended`), thu thập hành vi bulk `unnest` (`POST /events`).
  - **Redis & Độ bền**: `Bun.RedisClient` (`src/lib/redis.ts`) cho rate-limit, cache, dedupe `/events`, ring buffer `/admin/observability` (kèm fallback in-memory); `cockatiel` circuit-breaker/timeout cho ONNX embeddings.
  - **Observability**: `AsyncLocalStorage` (`src/lib/request-context.ts`) + Pino `mixin` + Canonical Log Line phân rã độ trễ (`db`, `redis`, `embed`, `external`, `app`), nối `traceparent` / `X-Request-Id`, `POST /telemetry` (`client_error` & `web_vital`) và `GET /admin/observability` (`pg_stat_statements` + `p50/p95/p99`).
  - **Route OG & SSE**: Open Graph preview (`src/routes/og.ts`) và SSE phòng lọc nhóm qua Postgres `LISTEN/NOTIFY` (`src/lib/pubsub.ts`).

## Chạy dev

```bash
cd ..                      # root
bun run db:up              # Postgres 17 (:5432)
cp backend/.env.example backend/.env
bun run db:migrate         # migration + seed tự động
bun run db:seed            # (chạy lại an toàn — upsert theo id)
bun run dev:api            # http://localhost:8000/healthz
```

## Kiểm tra

```bash
bun run typecheck          # tsc --noEmit
bun test test/observability.test.ts  # unit/app test nhanh không cần Docker
bun run test               # toàn bộ 44 file test (Testcontainers Postgres)
bun run build              # bundle backend/dist/server.js
```

## Ghi chú

- `generated/` và `.env` bị gitignore; `prisma/migrations/` phải commit và không sửa migration lịch sử.
- Prisma 7 dùng driver adapter `@prisma/adapter-pg` + URL trong `prisma.config.ts`.
