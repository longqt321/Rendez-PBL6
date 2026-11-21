# docs/backend — Tài liệu triển khai backend

| File | Dùng khi nào |
|---|---|
| [ke-hoach-backend-chi-tiet.md](./ke-hoach-backend-chi-tiet.md) | **Nguồn sự thật gốc của kiến trúc API & DB.** Hợp đồng API rút từ frontend/mock, phase triển khai, bảo mật, cache, tối ưu DB và testing. |
| [API.md](./API.md) | Tài liệu chi tiết từng endpoint HTTP `/api/v1/*`, query param, mã lỗi và Cache-Control. |
| [REPORT.md](./REPORT.md) | Báo cáo kỹ thuật tổng hợp kiến trúc, benchmark và kiểm thử chịu tải. |
| [RUNBOOK.md](./RUNBOOK.md) | Hướng dẫn chạy dev, seed DB, vận hành container, benchmark search/rec. |
| [thiet-ke-rooms-bao-mat.md](./thiet-ke-rooms-bao-mat.md) | Thiết kế bảo mật phòng lọc nhóm (cookie HttpOnly, HMAC-SHA256, CAS). |
| [R2-SETUP.md](./R2-SETUP.md) & [SMTP-SETUP.md](./SMTP-SETUP.md) | Cấu hình Cloudflare R2 upload ảnh và SMTP gửi mail xác thực/quên mật khẩu. |

## Trạng thái hiện tại (cập nhật 2026-11-19)

- **Monorepo**: `frontend/` + `backend/` + `packages/schema/` (FE/BE dùng chung bộ zod schema).
- **Schema & Dữ liệu**: **20 migration**, **29 model Prisma** trong `schema.prisma`, seed chính thức **358 địa điểm** từ `backend/data/places-expanded.json` (fallback `frontend/data/cold-start/places.json`).
- **Tính năng đã triển khai**:
  - **Tìm kiếm lai & gợi ý**: EGRF hybrid search (pg_trgm + pgvector dense + structured intent, `GET /places`), gợi ý hôm nay (`GET /places/daily-picks`, cron 00:05 VN), gợi ý cá nhân hoá & DES cold-start (`GET /places/recommended`), thu thập tương tác (`POST /events`) và `affinity_cache`.
  - **Cộng đồng & bảo mật**: auth better-auth (bắt buộc xác thực email — D-056), bài đăng kèm ảnh presigned R2, bình luận/reply, đánh giá & xoá đánh giá, bộ sưu tập, tìm & gợi ý theo dõi người dùng, phòng lọc nhóm & thông báo realtime qua SSE + Postgres LISTEN/NOTIFY, OG động (`/og/*`), rate limit IP/user và idempotency key.
- **Kiểm thử hiện tại**:
  - Backend: **40 file test** trong `backend/test/` (Testcontainers Postgres thật, chạy tuần tự qua `backend/scripts/test-all.sh`). *Chưa chạy lại `test:api` trong phiên dọn dẹp 2026-11-19 vì Postgres chưa bật.*
  - Frontend: **193 unit test pass / 40 file** (Vitest), typecheck + eslint + build PASS.
- **Chưa xác minh**: R2 thật, SMTP/Resend thật (dev log link ra console), `caddy validate`, deploy production thật, preview FB/Zalo thật trên domain công khai, `test:api` & e2e trong đợt dọn dẹp 2026-11-19.
