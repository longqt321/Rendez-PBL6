# PROGRESS — Phiên tự hành 2026-11-11 (03:00 → 11:00)

Bảng điều khiển của agent. Cập nhật SAU MỖI TASK. Nếu crash/restart: đọc file này để tiếp tục.

Trạng thái: `todo` / `doing` / `done` / `blocked`. Commit hash ghi sau khi commit.

## Bảng task

| ID | Phase | Mô tả | Phụ thuộc | Trạng thái | Commit |
|---|---|---|---|---|---|
| T0.1 | 0 | Scaffold backend + env fail-fast | — | done (phiên trước) | — |
| T0.2 | 0 | packages/schema + FE re-export shim | T0.1 | done (phiên trước) | — |
| T0.3 | 0 | docs/STACK-BE.md | T0.1 | done (phiên trước) | — |
| T0.4 | 0 | Skeleton Hono + /healthz + error {message} | T0.1 | done (phiên trước) | — |
| T0.5 | 0 | Prisma 18 bảng + migration + seed 491 | T0.1 | done (phiên trước) | — |
| T0.7 | 0 | Commit Phase 0 (chưa commit ở phiên trước) | T0.1–T0.5 | doing | |
| T0.8 | 0 | Mount /api/v1 (K1) + script aliases migrate/seed | T0.4 | todo | |
| T0.6 | 0 | Testcontainers harness Postgres | T0.5 | done | |
| T1.1 | 1 | better-auth email+password + bảng auth (migration mới) | T0.5 | done | |
| T1.2 | 1 | GET/PATCH /me, POST/DELETE /session khớp userProfileSchema | T1.1 | done | |
| T1.3 | 1 | Đăng ký (POST /register) | T1.1 | done | |
| T1.4 | 1 | Middleware requireAuth + rate limit store Postgres | T1.1 | todo | |
| T1.5 | 1 | Contract test Phase 1 (schema A2) | T1.2 | done (auth) | |
| T2.1 | 2 | GET /places — bộ lọc A7.9 + cursor keyset | T1.4 | done | |
| T2.2 | 2 | GET /places/map — bbox + {items,total} + chặn 300 | T2.1 | done | |
| T2.3 | 2 | GET /places/:id — 404 nếu chưa publish | T2.1 | done | |
| T2.4 | 2 | GET /places/suggestions — port ranking.ts + unaccent | T2.1 | done | |
| T2.5 | 2 | pg_trgm index + test "banh xeo" khớp "Bánh Xèo" | T2.1 | done (unaccent; trgm index dùng cho T2.4) | |
| T2.6 | 2 | GET /users?q= | T2.1 | done | |
| T3.1 | 3 | POST /posts + GET /posts (filter all/unplaced/mine/saved + q) | T1.4 | done | |
| T3.2 | 3 | GET /posts/:id; PATCH like/save idempotent | T3.1 | done | |
| T3.3 | 3 | PATCH /posts/:id/place — side effects A7.3 trong transaction | T3.1 | done | |
| T3.4 | 3 | Comments GET/POST/PATCH like/DELETE (A7.6) | T3.1 | done | |
| T3.5 | 3 | Notification like/comment (follow ở T5.4) (A6.4) | T3.4 | done | |
| T4.1 | 4 | POST /places/:id/reviews — upsert + aggregate A7.4 | T1.4 | done | 6819909 |
| T4.2 | 4 | GET /places/:id/reviews — mới nhất trước | T4.1 | done | 6819909 |
| T4.3 | 4 | POST /places/:id/reports — A7.5 + unique | T1.4 | done | 6819909 |
| T4.4 | 4 | Job pg-boss phát hiện place (A7.2) + cron + unique index | T3.1 | done | f5a14e9 |
| T4.5 | 4 | Notifications GET/PATCH :id/PATCH all | T4.4 | done | |
| T5.1 | 5 | CRUD /collections + like + PATCH :id/places (A7.7) | T1.4 | done | 6819909 |
| T5.2 | 5 | GET /places/saved | T5.1 | done | 6819909 |
| T5.3 | 5 | GET /users/:handle (+/posts?tab=, /collections) | T2.6 | done | 0a4f078 |
| T5.4 | 5 | Follow/unfollow + bảng follows (migration mới) | T5.3 | done | 0a4f078 |
| T6.1 | 6 | Contract room: POST /rooms, GET /rooms/:code, join, proposals | T1.4 | done | (commit Phase 6) |
| T6.2 | 6 | Logic áp proposal vào filter | T6.1 | done | (commit Phase 6) |
| T6.3 | 6 | SSE /rooms/:code/events | T6.1 | done | (commit Phase 6) |
| T6.4 | 6 | GET /places nhận bộ lọc room (đã có ở T2.1) | T6.1 | done | c61de56 |
| T7.1 | 7 | R2 presigned PUT + POST /media | T1.4 | done (chưa xác minh với R2 thật) | (commit Phase 7) |
| T7.2 | 7 | Mở lại ảnh check-in (FE — chỉ nếu bug thật) | T7.1 | todo | |
| T7.3 | 7 | Rate-limit áp dụng + secure headers | T1.4 | done | (commit Phase 7) |
| T7.4 | 7 | Chạy song song mock/backend (không xoá mock) | T2–T6 | done | project `backend` Playwright, mock giữ nguyên |
| T8.1 | 8 | Dockerfile API multi-stage + compose | T2–T7 | done | runtime giữ nguyên cấu trúc workspace (node_modules/.bun + backend/node_modules) |
| T8.2 | 8 | Deploy Fly/Railway — CHỈ nếu user trả lời; mặc định bỏ | T8.1 | todo | |
| T8.3 | 8 | Đổi tile OSM — ngoài phạm vi backend, đã có BACKLOG | — | todo | |
| QA1 | — | Audit code-integrity toàn bộ diff | T2–T6 | done | xoá 7 chỗ `as never` → `lib/enums.ts`; bảng enum tường minh + test round-trip; typecheck + 113 test xanh |
| QA2 | — | Test: unit + integration + contract + e2e backend | T2–T6 | done (12/12 e2e backend, logout.spec bỏ do FE chưa có form đăng nhập — BACKLOG) | |
| QA3 | — | Kiểm thử bảo mật local (xh/curl; chỉ 127.0.0.1) | QA1 | done | 401/400/404 đúng, SQLi tham số hoá, cookie HttpOnly, nikto 7.948 request không lỗi nghiêm trọng; thêm CSP + Permissions-Policy | |
| DOC1 | — | docs/backend/API.md + RUNBOOK.md + REPORT.md | T2–T6 | done | 60ac3c1 | |
| DOC2 | — | Báo cáo đồ án docs/bao-cao/BAO-CAO-DO-AN.md (bắt đầu 09:30) | DOC1 | done (bản 1, còn bổ sung số liệu cuối) | 60ac3c1 | |

## Quy ước phiên này

- API mount tại `/api/v1` (K1). FE `VITE_API_BASE_URL` mặc định đổi `/api` → `/api/v1`
  (thay đổi FE duy nhất ngoài bug, lý do: mặc định cũ lệch quyết định K1 đã duyệt).
- Script backend: thêm alias `migrate`/`seed` (điều kiện dừng gọi `bun --cwd backend run migrate`).
  Lưu ý L-014: `bun --cwd backend run X` là cú pháp SAI — dùng `cd backend && bun run X`.
- Commit mỗi task, conventional commits, không commit khi đỏ.
- Bị chặn → ghi mục "Bị chặn" dưới đây, chuyển việc khác, quay lại sau (tối đa 3 cách thử).

## Bị chặn

(Chưa có)

## Checkpoint 05:30

(chưa đến)

## Checkpoint 06:40 (bổ sung)

- Phase 0–7 xong; Phase 8: Dockerfile + compose chạy được (healthz/readyz/places 200 trong container).
- Audit enum: 7 chỗ `as never` đã thay bằng `lib/enums.ts`; 4 bản `toApiCategory` cục bộ gộp về một nơi.
- e2e backend: 12/12 spec pass với `VITE_ENABLE_MOCKS=false`; `logout.spec.ts` bị loại vì FE
  chưa có form đăng nhập email+password (ghi BACKLOG).
- Seed: gán `created_at` theo thứ tự dataset để `GET /places` khớp thứ tự mock (trang đầu có ảnh).

## Checkpoint 08:00

- Tiến độ so với kế hoạch: KHÔNG chậm — Phase 0–8, QA1–QA3, DOC1, DOC2 (bản 1) đều xong
  trước mốc cắt scope, không cần cắt Phase 7/8.
- Phát hiện & sửa trong vòng audit:
  · `GET /places/:id/posts` thiếu so với mock (FE đang gọi) → bổ sung + 3 test (7a220ec).
  · Enum `street-food` trong DB là gạch nối (`@map`) → mapper nhận cả hai dạng (2e72a8a).
  · Thông báo: 3 endpoint chưa có test → thêm `test/notifications.test.ts` (5 test) (ccfd63d).
  · CI job `api` bật lại (typecheck + prettier + test Testcontainers) (191071b).
- Số liệu mới nhất: 113 test backend (13 file), typecheck 0 lỗi, e2e backend 12/12,
  e2e mock 13/13, compose smoke healthz/readyz/places 200.

## Checkpoint 08:00

(chưa đến)

## Kết quả cuối

(chưa đến)
