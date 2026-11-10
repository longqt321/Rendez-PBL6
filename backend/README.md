# backend — RendeZ API

Hono 4 + Bun + Prisma 7 + PostgreSQL 17. Phase 0 đã scaffold: health check, error shape
`{message}`, logging, env fail-fast, 18 bảng + migration + seed 491 place.

- Kế hoạch/nguồn sự thật: [`../docs/backend/ke-hoach-backend-chi-tiet.md`](../docs/backend/ke-hoach-backend-chi-tiet.md)
- Stack đã cài & khác biệt Prisma 7: [`../docs/STACK-BE.md`](../docs/STACK-BE.md)

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
- Chưa có route nghiệp vụ nào (đúng phạm vi Phase 0).
