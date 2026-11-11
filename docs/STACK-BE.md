# STACK-BE — Backend (đã cài & xác minh)

> Ghi chú: mục 3–6 là ảnh chụp lúc scaffold Phase 0 (18 bảng, 2 migration, seed 491).
> Trạng thái hiện tại (25 bảng, 14 migration, seed 344, 185 test) xem
> [REPORT.md](file:///home/longtran/Projects/rendez/docs/backend/REPORT.md); mục 1–2
> (version đã cài) vẫn đúng.

Ngày: 2026-11-11. Nguồn: `bun install` thật + `node_modules/<pkg>/package.json` +
`bunx prisma --version` + chạy migration/seed/smoke thật. Không ghi version từ trí nhớ.

## 1. Version đã cài (pin chính xác, không `^` cho package bảo mật)

| Gói | Version | Vai trò | Ghi chú xác minh |
|---|---|---|---|
| Bun | 1.3.14 | Runtime + package manager | `bun --version` |
| `hono` | 4.13.17 | HTTP framework | `npm view` + cài thật |
| `@hono/zod-openapi` | 1.6.3 | Route + OpenAPI 3.1 | peer `zod ^4.0.0`, `hono >=4.10.0` (đọc `package.json` sau cài) |
| `zod` | 4.6.7 | Schema dùng chung FE/BE | `packages/schema` khai dependency riêng |
| `prisma` (CLI) | 7.10.1 | Migrate/generate | `bunx prisma --version`; registry latest là 8.0.0-rc → **không dùng** |
| `@prisma/client` | 7.10.1 | Client | khớp CLI |
| `@prisma/adapter-pg` | 7.10.1 | Driver adapter bắt buộc ở Prisma 7 | peer `pg ^8.16.3` |
| `pg` | 8.23.1 | Pool kết nối | adapter dùng trực tiếp |
| `pino` | 10.4.0 | Structured log JSON | G3 |
| PostgreSQL | 17-alpine | DB | `docker compose up -d postgres` |
| `typescript` | 6.0.3 | Typecheck | giống FE |

Chưa cài ở Phase 0 (sẽ thêm đúng phase): `better-auth` 1.7.19 (T1.1), `pg-boss` 12.38.1 (T4.4),
`@aws-sdk/client-s3` 3.1165.0 (T7.1), `@testcontainers/postgresql` 12.2.1 (T0.6).

## 2. Khác biệt Prisma 7 phát hiện khi cài (đã sửa, không đoán)

| Điều | Prisma 6 (tài liệu cũ) | Prisma 7.10.1 thực tế |
|---|---|---|
| `datasource.url` trong `schema.prisma` | Có | **Bị bỏ** — validate báo `P1012: The datasource property 'url' is no longer supported` |
| Nơi khai connection URL | `schema.prisma` | `prisma.config.ts` → `datasource.url: env("DATABASE_URL")` |
| Nạp `.env` | CLI tự nạp | CLI **không tự nạp**; `prisma.config.ts` gọi `process.loadEnvFile()` (Node ≥ 20.12, không thêm `dotenv`) |
| Generator | `prisma-client-js` vào `node_modules` | `prisma-client` + `output` bắt buộc → `backend/generated/prisma` |
| Runtime | engine Rust | driver adapter `@prisma/adapter-pg` + `pg.Pool` |

## 3. Cấu trúc đã scaffold

```
backend/
├── prisma/
│   ├── schema.prisma              # 18 bảng (mục 4.1) — xem §4
│   └── migrations/
│       ├── 20261110182222_init/           # 18 bảng + enum + index
│       └── 20261110182227_extensions/     # unaccent + pg_trgm
├── prisma.config.ts               # datasource URL + seed command
├── scripts/seed.ts                # import 491 place, idempotent (upsert)
├── src/
│   ├── env.ts                     # zod parse fail-fast lúc boot
│   ├── app.ts                     # app factory: requestId, log, CORS, secureHeaders, /healthz, onError
│   ├── server.ts                  # Bun.serve + SIGTERM/SIGINT
│   └── lib/{errors,logger,prisma}.ts
└── test/health.test.ts            # bun test (không cần DB)
```

`packages/schema` là workspace chung: 8 file `*.schema.ts` + type + `Page` + `pageSchema` +
`constants.ts`. FE giữ import path cũ qua các file re-export (`@/lib/constants`,
`@/features/*/types/*`) nên không phải sửa component/hook.

## 4. 18 bảng schema v1 (map từ mục 4.1)

`users`, `sessions`, `places`, `place_images`, `reviews`, `place_reports`, `posts`,
`post_likes`, `post_saves`, `comments`, `comment_likes`, `collections`, `collection_places`,
`collection_likes`, `rooms`, `room_members`, `room_proposals`, `notifications`.

- `places.tags` là `text[]` (mục 4.2) → **không có bảng `place_tags`** dù mục 4.1 liệt kê;
  đây là lý do danh sách còn đúng 18 bảng.
- `places` có đủ 23 cột dataset + trường duyệt/kiểm duyệt (F1/F2/F3); `rating`/`reviewCount`
  **không lưu cột** — tính COUNT/AVG (D3).
- `notifications.payload` là JSONB (shape khác nhau theo `type`), `rooms.filter` JSONB.
- Thiếu so với kế hoạch (đã ghi `docs/BACKLOG.md`, thêm bằng migration riêng): `follows` (T5.4),
  `place_suggestion_notifications` (T4.4), `idempotency_keys` (K2), `rate_limits` (H4),
  `audit_logs` (F3).

## 5. Lệnh

```bash
# từ root
bun run db:up            # docker compose up -d postgres
bun run db:migrate       # prisma migrate dev (backend)
bun run db:seed          # seed 491 place
bun run dev:api          # API :8000 (cần backend/.env)
bun run test:api         # bun test backend
bun run typecheck:api    # tsc --noEmit backend

# backend/.env: copy từ backend/.env.example
```

## 6. Đã chạy thật (bằng chứng)

- `bun install` → 304 packages, không lỗi.
- `prisma validate` → schema valid; `prisma generate` → client vào `backend/generated/prisma`.
- `prisma migrate dev` → 2 migration áp dụng; `\dt` thấy 18 bảng + `_prisma_migrations`;
  `pg_extension` có `unaccent`, `pg_trgm`.
- `bun run scripts/seed.ts` lần 1 → 491 place, 29 ảnh; lần 2 → `thêm mới 0` (idempotent).
- `curl /healthz` → 200 `{"status":"ok"}` + `X-Request-Id` + security headers;
  route lạ → 404 `{"message":"Không tìm thấy"}`; CORS preflight trả đúng origin FE.
- `bun test` backend → 2 pass; FE `typecheck` + 72 unit test + lint + build + 13 e2e pass sau khi chuyển schema.
