# RendeZ — Đà Nẵng Ăn & Đi

Web app khám phá quán ăn / địa điểm ở Đà Nẵng: tìm kiếm và lọc theo loại hình, quận,
mức giá, xem trên bản đồ, lưu địa điểm vào bộ sưu tập, đọc/đăng bài cộng đồng, và
**lọc nhóm** — nhiều người cùng đề xuất include/exclude để ra một kết quả chung.

## Cấu trúc

| Thư mục | Vai trò |
| --- | --- |
| `frontend/` | SPA React 19 + Vite 8 + TypeScript strict. Chạy độc lập bằng mock in-memory, hoặc nối backend thật bằng `VITE_ENABLE_MOCKS=false`. |
| `backend/` | API Hono 4 + Prisma 7 + PostgreSQL 17 + better-auth + pg-boss. Đã xong Phase 0–8 (103 test, 12 spec e2e với backend thật). |
| `packages/schema/` | zod schema dùng chung frontend ↔ backend (8 file, chuyển từ frontend). |
| `docs/` | Tài liệu chung: quyết định kiến trúc, hợp đồng API, bài học, kế hoạch backend, báo cáo đồ án. |

## Chạy dự án

```bash
bun install                 # cài cho cả workspace
bun run dev                 # frontend (mock bật mặc định) → http://localhost:5173
bun run db:up               # Postgres 17 cho backend
bun run dev:api             # backend :8000 (cần backend/.env)
```

| Lệnh | Việc |
| --- | --- |
| `bun run dev` | Dev server frontend |
| `bun run build` | Typecheck + build production frontend |
| `bun run typecheck` / `lint` / `test` | Kiểm tra frontend + backend |
| `bun run test:api` | Test backend (Testcontainers Postgres, chạy tuần tự) |
| `bun run e2e` | Playwright (13 spec mock) |
| `E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend` | Playwright với backend thật (12 spec) |
| `bun run db:up` / `db:down` | Postgres dev |
| `docker compose up -d` | Dựng Postgres + migration + API trong container |

## Tài liệu

- Hợp đồng API (nguồn sự thật hiện tại): `docs/DECISIONS.md` (D-011).
- Kế hoạch triển khai backend: `docs/backend/ke-hoach-backend-chi-tiet.md`.
- API đã triển khai: `docs/backend/API.md`. Vận hành: `docs/backend/RUNBOOK.md`.
- Báo cáo kỹ thuật backend: `docs/backend/REPORT.md`. Báo cáo đồ án: `docs/bao-cao/BAO-CAO-DO-AN.md`.
- Quy ước code: `docs/CONVENTIONS.md`. Bài học: `docs/LESSONS.md`. Tồn đọng: `docs/BACKLOG.md`.
