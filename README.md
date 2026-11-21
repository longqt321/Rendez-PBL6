# Rendez

Web app khám phá quán ăn / địa điểm ở Đà Nẵng: tìm kiếm và lọc theo loại hình, quận,
mức giá, xem trên bản đồ, lưu địa điểm vào bộ sưu tập, đọc/đăng bài cộng đồng, và
**lọc nhóm** — nhiều người cùng đề xuất include/exclude để ra một kết quả chung.

Tính năng & kiến trúc nổi bật:

- **Tìm kiếm & Gợi ý**: Hybrid search (`pg_trgm` + `pgvector` HNSW + structured intent + EGRF), **Gợi ý hôm nay** (cron `00:05` giờ VN), gợi ý cá nhân hoá + DES cold-start (`GET /places/recommended`).
- **Chuẩn hoá 3NF & Tối ưu DB**: `tags` / `place_tags`, `sources` / `place_sources`, partial unique/B-tree index (`WHERE deleted_at IS NULL`), optimistic locking (`version` + `SELECT ... FOR UPDATE`), `pg_stat_statements`.
- **Redis & Độ bền**: `redis:7-alpine` giới hạn phần cứng (`0.5` CPU, `192MB` RAM) cho rate-limit, HTTP cache, dedupe `/events`, ring buffer `/admin/observability` (kèm fallback in-memory) và `cockatiel` circuit-breaker cho ONNX embeddings.
- **Observability & Admin Command Center (`/admin`)**: `AsyncLocalStorage` + Pino `mixin` + Canonical Log Line phân rã độ trễ (`db`, `redis`, `embed`, `external`, `app`), nối trace FE ↔ BE qua `traceparent` / `X-Request-Id`, `web-vitals` (`LCP`, `INP`, `CLS`), và giao diện điều hành `/admin` (kiểm duyệt, hiệu suất `p50/p95/p99`, top SQL chậm, live log stream).
- **Xác thực & Chia sẻ**: Bắt buộc xác thực email (`better-auth`), OG meta động cho Facebook/Zalo/Messenger, đồng bộ đăng xuất đa tab.

## Cấu trúc

| Thư mục | Vai trò |
| --- | --- |
| `frontend/` | SPA React 19 + Vite 8 (Rolldown code-splitting) + TypeScript strict. Mặc định nối backend thật qua proxy (`/api/v1`), hoặc chạy độc lập bằng mock in-memory qua `bun run dev:mock` (`VITE_ENABLE_MOCKS=true`). 44 file test (Vitest). |
| `backend/` | API Hono 4 + Bun + Prisma 7 + PostgreSQL 17 (`pgvector`, `pg_stat_statements`) + Redis 7 + better-auth + pg-boss. 44 file test (`test-all.sh` + Testcontainers); 23 migration; 33 model Prisma; seed 358 địa điểm (`backend/data/places-expanded.json`). |
| `packages/schema/` | Zod schema dùng chung frontend ↔ backend (`@rendez/schema`). |
| `docs/` | Tài liệu chính thức: kiến trúc, stack, API, vận hành, quyết định kỹ thuật, bài học và backlog. |

## Chạy dự án

```bash
bun install                 # cài cho cả workspace
bun run db:up               # Postgres 17 (:5432)
bun run db:migrate          # chạy migration + seed
bun run dev:api             # backend :8000 (cần backend/.env)
bun run dev                 # frontend nối backend thật (:8000) → http://localhost:5173
cd frontend && bun run dev:mock  # frontend chạy độc lập bằng mock in-memory
```

| Lệnh | Việc |
| --- | --- |
| `bun run dev` | Dev server frontend (nối backend `:8000`) |
| `bun run build` | Typecheck + build production frontend |
| `bun run build:api` | Bundle production backend (`backend/dist/server.js`) |
| `bun run typecheck` / `lint` / `format:check` / `test` | Kiểm tra toàn workspace |
| `bun run test:api` | Test backend (44 file Testcontainers Postgres, chạy tuần tự) |
| `bun run e2e` | Playwright (16 spec mock) |
| `E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend` | Playwright với backend thật |
| `docker compose up -d --build` | Dựng full-stack `postgres` + `redis` + `migrate` + `api` + `web` |

## Tài liệu

- Stack công nghệ thống nhất (FE + BE + Infra): [`docs/STACK.md`](./docs/STACK.md)
- API đã triển khai (`/api/v1/*`): [`docs/backend/API.md`](./docs/backend/API.md)
- Vận hành & chạy thực tế: [`docs/backend/RUNBOOK.md`](./docs/backend/RUNBOOK.md) · [`docs/HUONG-DAN-CHAY-VA-NGHIEM-THU.md`](./docs/HUONG-DAN-CHAY-VA-NGHIEM-THU.md)
- Cấu hình dịch vụ ngoài: [`docs/backend/R2-SETUP.md`](./docs/backend/R2-SETUP.md) · [`docs/backend/SMTP-SETUP.md`](./docs/backend/SMTP-SETUP.md)
- Thiết kế tính năng (`docs/thiet-ke/`): `goi-y-hom-nay.md`, `tim-nguoi.md`, `chia-se-og-dong.md`, `loc-gia-sap-xep-anh.md`, `xac-thuc-email.md`, `cache-va-phien.md`, và [`docs/backend/thiet-ke-rooms-bao-mat.md`](./docs/backend/thiet-ke-rooms-bao-mat.md)
- Báo cáo kỹ thuật & đồ án: [`docs/backend/REPORT.md`](./docs/backend/REPORT.md) · [`docs/bao-cao/BAO-CAO-DO-AN.md`](./docs/bao-cao/BAO-CAO-DO-AN.md)
- Quy ước, Quyết định, Bài học & Tồn đọng: [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) · [`docs/DECISIONS.md`](./docs/DECISIONS.md) · [`docs/LESSONS.md`](./docs/LESSONS.md) · [`docs/BACKLOG.md`](./docs/BACKLOG.md)
