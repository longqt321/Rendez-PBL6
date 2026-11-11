# docs/backend — Tài liệu triển khai backend

| File | Dùng khi nào |
|---|---|
| [ke-hoach-backend-chi-tiet.md](./ke-hoach-backend-chi-tiet.md) | **Nguồn sự thật chính.** Phần A: hợp đồng API rút từ frontend/mock (đã kiểm code từng dòng). Phần B: stack + version đã xác minh. Phần C: Phase 0–8, task atomic T0.1–T8.3. Phần D: 7 quyết định (đã duyệt). Phần E: chưa xác minh. Phần F–M: trường ẩn, log/lỗi, bảo mật, cache, tối ưu DB, testing, docs đã xác minh, đối chiếu pitfalls. |
| [de-xuat-techstack-backend.md](./de-xuat-techstack-backend.md) | Lý do chọn stack (đối chiếu Hono vs Fastify đã tra docs, thiết kế 4 cơ chế lưu trữ Postgres). **Lỗi thời 2 chỗ** (Prisma 6→7, cấu trúc apps/*→frontend/backend) — đã ghi chú đầu trang; ưu tiên kế hoạch khi mâu thuẫn. |

## Trạng thái (2026-11-11 — phiên tự hành)

- Monorepo: `frontend/` + `backend/` + `packages/schema/` (FE/BE dùng chung 8 file zod).
- Backend: **Phase 0–8 xong** — scaffold Hono + env fail-fast, 23 bảng nghiệp vụ + 10 migration,
  seed 491 place, auth better-auth, places/posts/reviews/collections/users/rooms(SSE)/media,
  job pg-boss phát hiện địa điểm, rate limit, presigned R2, Dockerfile + compose.
- Kiểm thử: **135 test backend pass** (Testcontainers Postgres thật), **12/12 e2e với backend
  thật** (`VITE_ENABLE_MOCKS=false`), 13/13 e2e mock, typecheck FE+BE 0 lỗi.
- Tài liệu: [API.md](./API.md) · [RUNBOOK.md](./RUNBOOK.md) · [REPORT.md](./REPORT.md) ·
  [PROGRESS.md](./PROGRESS.md).
- Chưa xác minh: R2 thật, email thật, deploy thật, SSE nhiều instance (xem REPORT mục 8).
- Quyết định Phần D đã duyệt: D1 zod 4 · D2 cursor opaque keyset · D3 COUNT · D4 email+password ·
  D5 room guest · D6 `{message}` · D7 Bun workspaces; tự quyết phiên tự hành: `docs/DECISIONS.md`
  mục D-055 (8–12).

## Tài sản frontend tham chiếu (từ mock — đặc tả hành vi thật)

- `frontend/src/mocks/server.ts` (41 route, 1.430 dòng) — đặc tả hành vi.
- `frontend/src/lib/api-contracts.ts` — 32 contract.
- `frontend/src/features/*/types/*.schema.ts` — 8 file zod (nguyên liệu `packages/schema`).
- `frontend/data/cold-start/places.json` — 491 place thật cho seed.
