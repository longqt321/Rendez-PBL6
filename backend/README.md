# backend — RendeZ API

Hono 4 + Bun + Prisma 7 + PostgreSQL 17 + better-auth + pg-boss.

- Kế hoạch/nguồn sự thật: [`../docs/backend/ke-hoach-backend-chi-tiet.md`](../docs/backend/ke-hoach-backend-chi-tiet.md)
- Stack đã cài & khác biệt Prisma 7: [`../docs/STACK-BE.md`](../docs/STACK-BE.md)

## Hiện trạng

- 20 migration, 29 model Prisma (`schema.prisma`); seed chính thức **358 địa điểm** (`data/places-expanded.json`).
- **40 file test** trong `test/` (`bun run test` chạy tuần tự qua `scripts/test-all.sh` với Testcontainers Postgres); typecheck + build 0 lỗi.
- Auth better-auth: **bắt buộc xác thực email trước khi đăng nhập**; đăng nhập bằng email.
- Tính năng chính:
  - **Tìm kiếm & Gợi ý**: Hybrid search (pg_trgm + pgvector + structured intent + EGRF), **Gợi ý hôm nay** (cron 00:05 giờ VN, `src/lib/daily-picks.ts`), gợi ý cá nhân hoá + DES cold-start (`GET /places/recommended`, `src/lib/recommendations.ts`), sự kiện tương tác (`POST /events`).
  - **Gợi ý theo dõi người dùng** (`src/lib/user-suggestions.ts`, route `users`).
  - **Route OG** (`src/routes/og.ts`): HTML meta Open Graph cho bot preview Facebook/Zalo/Messenger khi chia sẻ bài/quán.
  - **Rate limit & SSE**: rate limit hành động xã hội (`src/lib/rate-limit.ts`), SSE realtime qua Postgres `LISTEN/NOTIFY` (`src/lib/pubsub.ts`).

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
bun run test               # bun test (không cần DB)
curl -i localhost:8000/healthz
```

## Ghi chú

- `generated/` và `.env` bị gitignore; `prisma/migrations/` phải commit.
- Prisma 7 không nhận `datasource.url` trong schema — URL nằm ở `prisma.config.ts`.
- API chi tiết các route: `../docs/backend/API.md`. Vận hành: `../docs/backend/RUNBOOK.md`.
