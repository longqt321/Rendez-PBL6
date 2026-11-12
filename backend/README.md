# backend — RendeZ API

Hono 4 + Bun + Prisma 7 + PostgreSQL 17 + better-auth + pg-boss.

- Kế hoạch/nguồn sự thật: [`../docs/backend/ke-hoach-backend-chi-tiet.md`](../docs/backend/ke-hoach-backend-chi-tiet.md)
- Stack đã cài & khác biệt Prisma 7: [`../docs/STACK-BE.md`](../docs/STACK-BE.md)

## Hiện trạng

- 18 migration, 27 bảng; seed 344 địa điểm (86 curated + 258 OSM).
- 256 test pass / 25 file (`bun test --parallel=1`, Testcontainers Postgres);
  typecheck + lint 0 lỗi.
- Auth better-auth: **bắt buộc xác thực email trước khi đăng nhập**; đăng nhập bằng
  email (không còn username).
- Tính năng mới:
  - **Gợi ý hôm nay**: 3 quán hệ thống chọn mỗi ngày — job nền qua pg-boss chạy
    00:05 giờ VN (`src/lib/daily-picks.ts`).
  - **Gợi ý theo dõi người dùng** (`src/lib/user-suggestions.ts`, route `users`).
  - **Route OG** (`src/routes/og.ts`): HTML meta Open Graph cho bot preview
    Facebook/Zalo/Messenger khi chia sẻ bài/quán.
  - **Rate limit hành động xã hội** (`src/lib/rate-limit.ts`).
- 45 file ~7.200 dòng.

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
