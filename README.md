# Rendez

Ứng dụng web khám phá địa điểm ăn uống, cà phê tại Đà Nẵng: tìm kiếm tiếng Việt không dấu kết hợp ngữ nghĩa, lọc theo loại hình/quận/giá, bản đồ cụm tương tác, bài viết cộng đồng, đánh giá 4 mức, tin nhắn trực tiếp và phòng nhóm điều phối điểm hẹn theo khoảng cách và tiêu chí.

## Quy mô & Kiến trúc hiện tại

- **Tìm kiếm & Gợi ý:** Hybrid search (`pg_trgm` + `pgvector` HNSW 384 chiều + suy luận thuộc tính + EGRF), **Gợi ý hôm nay** (cron `00:05` giờ VN), gợi ý cá nhân hóa + DES cold-start (`GET /places/recommended`).
- **Phòng nhóm cộng tác (`/rooms/:code`):** Thành viên tự ghim vị trí, đề xuất địa điểm ứng viên và đặt tiêu chí cá nhân. Hệ thống tính khoảng cách từ từng quán tới mọi thành viên, hiển thị avatar pin trên bản đồ và xếp hạng địa điểm theo mức đáp ứng tiêu chí (kèm cảnh báo mâu thuẫn), cập nhật thời gian thực qua SSE (`LISTEN/NOTIFY`).
- **Mạng xã hội & Nhắn tin:** Bài đăng gắn địa điểm, bình luận nhiều cấp, đánh giá 4 mức (`must_try`, `good`, `ok`, `not_for_me`) kèm ảnh và bình chọn hữu ích, đóng góp địa điểm mới từ cộng đồng, tin nhắn trực tiếp thời gian thực qua SSE (hỗ trợ hòm thư Chính/Tin nhắn chờ, đính kèm thẻ quán/bộ sưu tập/phòng, chặn người dùng).
- **Cơ sở dữ liệu & Chuẩn hóa 3NF:** PostgreSQL 17 với **43 bảng, 15 enum, 30 migration** (`tags`/`place_tags`, `sources`/`place_sources`, partial unique/B-tree index `WHERE deleted_at IS NULL`, optimistic locking, `pg_stat_statements`), truy vấn lai **Prisma 7 + Kysely**.
- **Redis & Độ bền:** `redis:7-alpine` cho rate-limit, HTTP cache, dedupe `/events`, ring buffer `/admin/observability` (kèm fallback in-memory) và `cockatiel` circuit breaker cho embeddings/SMTP/tiles.
- **Quan sát & Cổng quản trị (`/admin`):** `AsyncLocalStorage` + Pino Canonical Log Line phân rã độ trễ (`db`, `redis`, `embed`, `external`, `app`), nối trace FE ↔ BE qua `traceparent` / `X-Request-Id`, Web Vitals (`LCP`, `INP`, `CLS`), và `/admin` kiểm duyệt báo cáo/đề xuất quán/người dùng/audit log.

## Cấu trúc Monorepo

| Thư mục | Vai trò |
| --- | --- |
| `frontend/` | SPA React 19 + Vite 8 + TypeScript strict + Tailwind CSS 4 + shadcn (`@base-ui/react`). Mặc định nối backend thật qua `/api/v1`, hoặc chạy mock bằng `bun run dev:mock`. 50 file unit test (230 test cases), 21 spec E2E Playwright. |
| `backend/` | API Hono 4 + Bun + Prisma 7 + Kysely + PostgreSQL 17 (`pgvector`, `pg_stat_statements`) + Redis 7 + Better Auth + `pg-boss` (5 hàng đợi nền). 18 nhóm route, 52 file test (`test-all.sh`), 30 migration, 43 model, seed 360 địa điểm Đà Nẵng. |
| `packages/schema/` | Zod schema và parser dùng chung frontend ↔ backend (`@rendez/schema`). 3 file test (20 test cases). |
| `deploy/` | Cấu hình Docker production (`compose.prod.yml`), Caddy reverse proxy và script backup DB (`backup-db.sh`). |
| `docs/` | Tài liệu kỹ thuật: kiến trúc, stack, API, vận hành, quy ước code, quyết định kiến trúc và báo cáo đồ án. |

## Chạy dự án

```bash
bun install                 # Cài dependency cho toàn bộ workspace
bun run db:up               # Khởi chạy Postgres 17 (:5432) + Redis 7 (:6379)
bun run db:migrate          # Chạy toàn bộ migration + seed dữ liệu
bun run dev:api             # Chạy backend API tại :8000 (cần backend/.env)
bun run dev                 # Chạy frontend nối backend thật → http://localhost:5173
cd frontend && bun run dev:mock  # Chạy frontend độc lập với mock in-memory
```

| Lệnh | Tác vụ |
| --- | --- |
| `bun run dev` | Dev server frontend nối backend `:8000` |
| `bun run build` | Typecheck + build production frontend |
| `bun run build:api` | Bundle production backend (`backend/dist/server.js`) |
| `bun run typecheck` / `lint` / `format:check` / `test` | Kiểm tra toàn workspace |
| `bun run test:api` | Chạy 52 file test backend tuần tự qua Testcontainers Postgres |
| `bun run e2e` | Chạy E2E Playwright (chế độ mock) |
| `E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend` | Chạy E2E Playwright với backend thật |
| `docker compose up -d --build` | Dựng full-stack `postgres` + `redis` + `migrate` + `api` + `web` |

## Tài liệu

- Stack công nghệ: [`docs/STACK.md`](./docs/STACK.md)
- Đặc tả API (`/api/v1/*`): [`docs/backend/API.md`](./docs/backend/API.md)
- Vận hành & Kiểm thử: [`docs/backend/RUNBOOK.md`](./docs/backend/RUNBOOK.md) · [`docs/HUONG-DAN-CHAY-VA-NGHIEM-THU.md`](./docs/HUONG-DAN-CHAY-VA-NGHIEM-THU.md)
- Cấu hình dịch vụ ngoài: [`docs/backend/R2-SETUP.md`](./docs/backend/R2-SETUP.md) · [`docs/backend/SMTP-SETUP.md`](./docs/backend/SMTP-SETUP.md) · [`deploy/README.md`](./deploy/README.md)
- Báo cáo đồ án môn học (bản chính thức): [`docs/bao-cao/BAO-CAO-DO-AN.md`](./docs/bao-cao/BAO-CAO-DO-AN.md)
- Quy ước, Quyết định, Bài học & Tồn đọng: [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) · [`docs/DECISIONS.md`](./docs/DECISIONS.md) · [`docs/LESSONS.md`](./docs/LESSONS.md) · [`docs/BACKLOG.md`](./docs/BACKLOG.md)
