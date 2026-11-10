# docs/backend — Tài liệu triển khai backend

| File | Dùng khi nào |
|---|---|
| [ke-hoach-backend-chi-tiet.md](./ke-hoach-backend-chi-tiet.md) | **Nguồn sự thật chính.** Phần A: hợp đồng API rút từ frontend/mock (đã kiểm code từng dòng). Phần B: stack + version đã xác minh. Phần C: Phase 0–8, task atomic T0.1–T8.3. Phần D: 7 quyết định (đã duyệt). Phần E: chưa xác minh. Phần F–M: trường ẩn, log/lỗi, bảo mật, cache, tối ưu DB, testing, docs đã xác minh, đối chiếu pitfalls. |
| [de-xuat-techstack-backend.md](./de-xuat-techstack-backend.md) | Lý do chọn stack (đối chiếu Hono vs Fastify đã tra docs, thiết kế 4 cơ chế lưu trữ Postgres). **Lỗi thời 2 chỗ** (Prisma 6→7, cấu trúc apps/*→frontend/backend) — đã ghi chú đầu trang; ưu tiên kế hoạch khi mâu thuẫn. |

## Trạng thái (2026-11-11)

- Monorepo: `frontend/` + `backend/` + `packages/schema/` (đã tạo, FE/BE dùng chung).
- Backend: **Phase 0 xong** (T0.1–T0.5) — scaffold Hono, env fail-fast, 18 bảng + migration
  + seed 491 place, `/healthz`. Chi tiết version/khác biệt Prisma 7: [`../STACK-BE.md`](../STACK-BE.md).
- Chưa làm: T0.6 (Testcontainers), Phase 1 (auth) trở đi.
- Quyết định Phần D đã duyệt: D1 zod 4 · D2 cursor opaque keyset · D3 COUNT · D4 email+password · D5 room guest · D6 `{message}` · D7 Bun workspaces.

## Tài sản frontend tham chiếu (từ mock — đặc tả hành vi thật)

- `frontend/src/mocks/server.ts` (~45 route, 1.430 dòng) — đặc tả hành vi.
- `frontend/src/lib/api-contracts.ts` — 32 contract.
- `frontend/src/features/*/types/*.schema.ts` — 8 file zod (nguyên liệu `packages/schema`).
- `frontend/data/cold-start/places.json` — 491 place thật cho seed.
