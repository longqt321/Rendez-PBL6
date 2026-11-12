# docs/backend — Tài liệu triển khai backend

| File | Dùng khi nào |
|---|---|
| [ke-hoach-backend-chi-tiet.md](./ke-hoach-backend-chi-tiet.md) | **Nguồn sự thật chính.** Phần A: hợp đồng API rút từ frontend/mock (đã kiểm code từng dòng). Phần B: stack + version đã xác minh. Phần C: Phase 0–8, task atomic T0.1–T8.3. Phần D: 7 quyết định (đã duyệt). Phần E: chưa xác minh. Phần F–M: trường ẩn, log/lỗi, bảo mật, cache, tối ưu DB, testing, docs đã xác minh, đối chiếu pitfalls. |
| [de-xuat-techstack-backend.md](./de-xuat-techstack-backend.md) | Lý do chọn stack (đối chiếu Hono vs Fastify đã tra docs, thiết kế 4 cơ chế lưu trữ Postgres). **Lỗi thời 2 chỗ** (Prisma 6→7, cấu trúc apps/*→frontend/backend) — đã ghi chú đầu trang; ưu tiên kế hoạch khi mâu thuẫn. |

## Trạng thái (2026-11-12 — phiên tự hành 2026-11-11 → 2026-11-12)

- Monorepo: `frontend/` + `backend/` + `packages/schema/` (FE/BE dùng chung bộ zod schema).
- Backend: **Phase 0–8 xong** — scaffold Hono + env fail-fast, **27 bảng** (22 nghiệp vụ +
  4 better-auth) + **18 migration**, seed **344 place published** (86 curated + 258 OSM,
  29 ảnh gốc trong DB — 87 tệp cold-start gồm biến thể WebP), auth better-auth (bắt buộc xác thực email — D-056),
  places/posts/reviews/collections/users/rooms(SSE)/media, job pg-boss phát hiện địa điểm
  + job `daily-picks` (gợi ý hôm nay, cron 00:05), rate limit theo IP và user (kể cả
  social byUser), presigned R2, idempotency key cho POST tạo tài nguyên, SSE thông báo
  theo user, OG động cho bot crawler, sort/lọc giá server-side, Dockerfile + compose +
  compose.prod.
- Kiểm thử (chạy 2026-11-12): **256 test backend pass / 0 fail** (25 file, Testcontainers
  Postgres thật, `--parallel=1`), **42 e2e mock pass / 16 spec**, **135 unit FE pass /
  29 file**, typecheck + lint FE+BE 0 lỗi 0 cảnh báo. e2e với backend thật: 22/22 (12 spec,
  số liệu phiên 2026-11-11, chưa chạy lại).
- Mã nguồn: backend 45 file `src` ~7.200 dòng, 56 route handler tự viết; frontend 282 file
  ~21.300 dòng.
- Tài liệu: [API.md](./API.md) · [RUNBOOK.md](./RUNBOOK.md) · [REPORT.md](./REPORT.md) ·
  [PROGRESS.md](./PROGRESS.md) · thiết kế tính năng mới trong `docs/thiet-ke/`
  (`goi-y-hom-nay.md`, `tim-nguoi.md`, `chia-se-og-dong.md`, `loc-gia-sap-xep-anh.md`).
- Chưa xác minh: R2 thật, SMTP/Resend thật (mail dev vẫn log link), `caddy validate`,
  deploy prod thật, preview FB/Zalo thật, SSE nhiều instance, `bun test` không
  `--parallel=1` (xem REPORT mục 12).
- Quyết định Phần D đã duyệt: D1 zod 4 · D2 cursor opaque keyset · D3 COUNT · D4 email+password ·
  D5 room guest · D6 `{message}` · D7 Bun workspaces; tự quyết phiên tự hành: `docs/DECISIONS.md`
  mục D-055 (8–12), D-056 (bắt buộc xác thực email), D-057 (ảnh WebP lúc build),
  D-058 (`sort` là nguồn sự thật duy nhất).

## Tài sản frontend tham chiếu (từ mock — đặc tả hành vi thật)

- `frontend/src/mocks/server.ts` (41 route, 1.430 dòng) — đặc tả hành vi.
- `frontend/src/lib/api-contracts.ts` — 32 contract.
- `frontend/src/features/*/types/*.schema.ts` — 8 file zod (nguyên liệu `packages/schema`).
- `frontend/data/cold-start/places.json` — dữ liệu địa điểm gốc cho seed (corpus hiện tại 344 place).
