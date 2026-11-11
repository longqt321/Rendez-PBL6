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
| QA1 | — | Audit code-integrity toàn bộ diff | T2–T6 | done | xoá 7 chỗ `as never` → `lib/enums.ts`; bảng enum tường minh + test round-trip; typecheck + 127 test xanh |
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

- Phase 0–8 xong trước mốc; chuyển sang audit + test bổ sung (xem các mục "Audit vòng").
- Số liệu ghi tại thời điểm đó (commit `0d92f5c`): 113 test backend, e2e backend 12/12,
  e2e mock 13/13. Con số hiện tại xem mục "Kết quả cuối".

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
- Audit vòng 2 (07:37–07:52):
  · `PATCH /posts/:id/place`: người không phải tác giả gắn được địa điểm vào bài người khác;
    thông báo đề xuất bị đánh dấu đọc cho SAI người (người gọi thay vì tác giả) → chặn 403
    + lọc theo `post.authorId` (770b203, +1 test).
  · `GET /places?category=<rác>` trả 500 (cast `::place_category` lỗi) → chuẩn hoá enum,
    giá trị lạ bị bỏ qua; danh sách toàn giá trị lạ trả trang RỖNG như mock (491feec, +2 test).
  · Query/body chứa ký tự NUL → 500 từ Postgres (SQLSTATE 22021) → map về 400 ở `onError`
    (624ce5d, +2 test).
  · Rà quyền: collections (owner), comments (tác giả), notifications (chủ sở hữu), rooms
    (thành viên/chủ phòng), follow (cấm tự theo dõi) — không phát hiện lỗ hổng mới.
- Số liệu mới nhất: 127 test backend (14 file), typecheck 0 lỗi, e2e backend 12/12,
  e2e mock 13/13, compose smoke healthz/readyz/places 200.

## Audit vòng 3 (07:53–07:58)

- `cursor` giả mạo (base64 hợp lệ nhưng id không phải uuid) → 500 do cast `::uuid` ở
  `/posts`, `/notifications`, `/users/:handle/posts` → `decodeCursor` nhận thêm mẫu id,
  route uuid truyền `UUID_ID_RE` (710476b, +2 test).
- Fuzz thêm 25 input rác (bbox, q dài 1000 ký tự, id 121 ký tự, uuid ngẫu nhiên, cursor rác…):
  không còn 500.
- Số liệu cuối: **119 test / 13 file pass**, e2e backend 12/12, e2e mock 13/13.

## Audit vòng 4 (08:01–08:08)

- Hoàn tất T2.5 còn thiếu: GIN `pg_trgm` index cho tìm kiếm không dấu. `unaccent()` STABLE
  và `array_to_string()` STABLE không dùng được trong biểu thức index (42P17) → bọc thành
  `immutable_unaccent`/`immutable_array_to_string` IMMUTABLE trong migration 9; `concat_ws`
  cũng STABLE → thay bằng `||`. `EXPLAIN` (seqscan off) xác nhận `Bitmap Index Scan on
  places_search_trgm_idx`. Test chặn hồi quy sự tồn tại index (120 test).
- Lint FE (eslint) sạch, prettier backend sạch.

## Audit vòng 5 (08:39–08:50)

- `GET /posts/:id/comments?sort=top`: mock xếp bình luận cha theo `likeCount` giảm dần, backend
  bỏ qua tham số → thêm `parseCommentSort` + `listCommentsForPost(..., sort)` (2eb50f0, +1 test;
  reply vẫn xếp tăng dần theo thời gian).
- **Bug thật về tìm kiếm** (3 route cùng một lớp lỗi): `?q=bánh xèo` ở `/places`, `/posts`,
  `/users` không khớp dù mock khớp — cột đã bỏ dấu còn từ khoá thì chưa; mock còn coi dấu câu
  là khoảng trắng ("Đường 2/9" → "duong 2 9"). Migration 10 thêm `immutable_search_normalize()`
  (bỏ dấu, lowercase, dấu câu → space, gộp space, trim), dựng lại GIN index trên biểu thức mới,
  cả 3 route chuẩn hoá 2 phía bằng chính hàm đó (32731b8 + 0083082, +3 test; `EXPLAIN` xác nhận
  `Bitmap Index Scan on places_search_trgm_idx`; smoke container: `q=bánh xèo` 3 bài,
  `q=yến nguyễn` và `q=yen nguyen` đều trả "Yến Nguyễn").
  · Ghi chú: Prisma chạy migration với `search_path` rỗng → hàm SQL phải tham chiếu
    `public.immutable_unaccent` (lỗi 42883 nếu không).
- `listCommentsForPost` không có `ORDER BY` → thứ tự reply khi trùng `created_at` phụ thuộc
  planner; thêm `ORDER BY c.created_at ASC, c.id ASC` để tất định (02161dd).
- **Đề xuất phòng lọc nhận giá trị rác**: `POST /rooms/:code/proposals` chỉ kiểm `value` là
  chuỗi 1–80 ký tự, giá trị đi thẳng vào filter JSONB. `field=category, value=hack` khiến lần
  `GET /rooms/:code` kế tiếp ném lỗi ở `toApiCategory` → **phòng hỏng vĩnh viễn (500)**.
  Đã thêm `normalizeProposalValue()` (category phải là loại hình đã biết, priceMax phải 1–3,
  `street_food` chuẩn hoá về `street-food`) → 400; `parseRoomFilter` bỏ qua loại hình lạ thay vì
  ném (dữ liệu cũ) (4dcf0ad, +1 test).
- **Code chết trong `onError`**: nhánh `err instanceof ZodError` không bao giờ chạy — zod 4
  `ZodError` không phải `instanceof Error` (xác minh bằng script) và Hono chỉ chuyển lỗi
  `instanceof Error` cho `onError` (hono/dist/compose.js:37), nên ZodError thoát ra ngoài hoàn
  toàn. Không có đường nào ném ZodError (validate đều `safeParse`/`defaultHook`) → xoá nhánh,
  ghi chú lý do ngay tại chỗ (e78212b trước đó + commit này).
- Thêm test: chạy đua 2 worker job gợi ý (chỉ 1 thông báo), probe `onError` 500 giữ
  `X-Request-Id` và không lộ stack (health 2→3 test).
- `detectPlaceSuggestions` quét toàn bộ post chưa gắn địa điểm trong một lần → thêm `take: 50`
  (K6 "batch nhỏ 50 post/lần"); `postId` cụ thể (trigger) không giới hạn (9ea259a).
- `GET /places/map` kéo cả dataset về RAM rồi `slice(0,300)` → `LIMIT` trong SQL + `COUNT(*)`
  riêng cho `total` (giữ đúng ngữ nghĩa mock: `total` = tổng khớp, `items` chặn 300) (9ea259a).
- Đối chiếu `lib/ranking.ts` với `frontend/src/mocks/ranking.ts`: trọng số, thứ tự xét, chuỗi
  `reason`, ngưỡng `score > 0` khớp 1:1 (khác biệt duy nhất là chuẩn hoá do SQL đảm nhận).
- Quét `as any`/`@ts-ignore`/`TODO`/`console.log`/`test.skip` trong `backend/src|test|prisma`:
  không có. Ba `catch {}` còn lại đều có chú thích lý do nghiệp vụ (signOut, decodeCursor,
  publishRoom) và không nuốt lỗi hạ tầng.
- Rà danh sách route: mọi route ghi đều có `requireAuth`; route công khai tự đọc phiên để tính
  `isMine`/`likedByMe`; quyền sở hữu kiểm ở collections/comments/notifications/rooms.

## Kết quả cuối (phiên tự hành 2026-11-11)

| Hạng mục | Kết quả (output thật) |
| --- | --- |
| Typecheck FE + BE | 0 lỗi (`bun run typecheck`) |
| Test backend | **135 pass / 0 fail**, 14 file, ~100 giây (`bun test --parallel=1`) |
| E2E backend thật | **12/12 pass**, 9,4 giây |
| E2E mock | **13/13 pass**, 16,3 giây |
| Migration | 11 migration áp dụng sạch trên Postgres 17 (compose + Testcontainers) |
| Smoke compose | `/healthz` 200, `/readyz` 200, `/places?limit=9` 9 item + `next`, `/places?q=bánh xèo` 3 item |
| Endpoint | 50 endpoint nghiệp vụ + 2 health check + mount better-auth |

Lỗi thật đã sửa trong phiên: quyền gắn địa điểm vào bài người khác + thông báo sai người nhận;
`category` rác gây 500; ký tự NUL gây 500; cursor giả mạo gây 500; thiếu `?sort=top`; tìm kiếm
có dấu/dấu câu không khớp mock ở cả `/places`, `/posts`, `/users`; job quét không batch;
`/places/map` tải cả dataset; thứ tự bình luận không tất định khi trùng thời điểm; đề xuất
phòng lọc nhận giá trị rác làm phòng 500 vĩnh viễn.

Chưa xác minh (giữ nguyên như báo cáo §4.5): R2 thật, gửi email thật, deploy công khai, SSE
nhiều instance, hiệu năng ≥ 50k dòng, trình duyệt mobile thật.

## Xác minh cuối (10:12, 2026-11-11)

- `bun run typecheck` — 0 lỗi.
- `cd backend && bun test --parallel=1` — **135 pass / 0 fail**, 14 file, 99.73s.
- `bun run e2e --project=mock` — **13/13 pass** (16.4s).
- `E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend` — **12/12 pass** (8.5s).
- Smoke trên image cuối: `/healthz` 200, `/api/v1/places` 200 (9 item/trang, khớp mock bỏ qua `limit`).
- Audit grep cuối: không còn `as any`/`@ts-ignore`/`.skip`/catch rỗng/TODO trong `backend/src`.
- Docker chỉ còn `rendez-postgres` + `rendez-api`; không có dev server sót.

## G1 — Vòng đời tài khoản (2026-11-11 chiều)

Đã làm:

- Backend: `emailAndPassword.sendResetPassword` (log token ở dev — DECISIONS 23),
  `resetPasswordTokenExpiresIn` 1 giờ; `DELETE /me` xoá mềm + thu hồi mọi phiên (DECISIONS 24);
  chặn đăng nhập tài khoản đã xoá; trùng handle trả 409 đúng thông điệp (DECISIONS 25).
- FE: `/login`, `/register`, `/forgot-password`, `/reset-password` (RHF + zod, ngoài AppShell);
  menu header điều hướng `/login`; trang cài đặt có mục xoá tài khoản (AlertDialog xác nhận).
- Mock: `POST /session` kiểm email+password (`me@rendez.test` / `password123`), `POST /register`,
  `POST /auth/request-password-reset`, `POST /auth/reset-password`, `DELETE /me`.
- E2E: `logout.spec` đăng nhập lại qua form; thêm `auth.spec.ts` (4 test).

Xác minh:

- `bun run typecheck` — 0 lỗi (FE + BE).
- `cd backend && bun test test/auth.test.ts --parallel=1` — **16 pass / 0 fail**.
- `cd frontend && bun run test` — **72 pass / 0 fail**, 16 file.
- `bun run e2e --project=mock` — **17/17 pass** (16.8s).

## G2 — Cache (2026-11-11 chiều)

- `lib/http-cache.ts`: `jsonWithCache` (ETag sha256 + `Cache-Control` + 304), `noStore`,
  `createTtlCache` (TTL + single-flight + giới hạn phần tử, không thêm dependency).
- Áp dụng: `/places/:id` (public 60s), `/places/map` (public 30s), `/users/:handle`
  (private 15s), `/me` + `/notifications` (`no-store`).
- `GET /places/suggestions` dùng `fetchPublishedRankCandidates()` (cache 60s);
  `PATCH /posts/:id/place` publish place → `invalidateSuggestionCache()`.

Xác minh: `bun test test/http-cache.test.ts test/places.test.ts test/auth.test.ts --parallel=1`
— **48 pass / 0 fail**; typecheck 0 lỗi.
