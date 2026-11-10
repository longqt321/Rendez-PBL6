# RendeZ — Đà Nẵng Ăn & Đi

Web app khám phá quán ăn / địa điểm ở Đà Nẵng: tìm kiếm và lọc theo loại hình, quận,
mức giá, xem trên bản đồ, lưu địa điểm vào bộ sưu tập, đọc/đăng bài cộng đồng, và
**lọc nhóm** — nhiều người cùng đề xuất include/exclude để ra một kết quả chung.

## Cấu trúc

| Thư mục | Vai trò |
| --- | --- |
| `frontend/` | SPA React 19 + Vite 8 + TypeScript strict. Chạy độc lập bằng mock in-memory. |
| `backend/` | API Hono 4 + Prisma 7 + PostgreSQL 17. *(Phase 0 — chưa scaffold)* |
| `packages/schema/` | zod schema dùng chung frontend ↔ backend. *(Phase 0)* |
| `docs/` | Tài liệu chung: quyết định kiến trúc, hợp đồng API, bài học, kế hoạch backend. |

## Chạy dự án

```bash
bun install                 # cài cho cả workspace
bun run dev                 # frontend (mock bật mặc định) → http://localhost:5173
bun run db:up               # Postgres 17 cho backend
bun run dev:api             # backend (sau Phase 0)
```

| Lệnh | Việc |
| --- | --- |
| `bun run dev` | Dev server frontend |
| `bun run build` | Typecheck + build production frontend |
| `bun run typecheck` / `lint` / `test` | Kiểm tra frontend |
| `bun run e2e` | Playwright (13 spec) |
| `bun run db:up` / `db:down` | Postgres dev |

## Tài liệu

- Hợp đồng API (nguồn sự thật hiện tại): `docs/DECISIONS.md` (D-011).
- Kế hoạch triển khai backend: `docs/backend/ke-hoach-backend-chi-tiet.md`.
- Quy ước code: `docs/CONVENTIONS.md`. Bài học: `docs/LESSONS.md`. Tồn đọng: `docs/BACKLOG.md`.
