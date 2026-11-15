# Báo cáo kỹ thuật backend Rendez

> Cập nhật 2026-11-12 (phiên tự hành 2026-11-11 → 2026-11-12, gồm phiên 03:00 → 23:30
> ngày 11-11). Mọi số liệu dưới đây lấy từ lần chạy thật trên máy dev (Postgres 17 trong
> Docker, API trong container). Hạng mục chưa kiểm được ghi rõ ở mục **Chưa xác minh**.

## 1. Tóm tắt

| Hạng mục | Kết quả |
| --- | --- |
| Bảng trong DB (schema `public`) | 27 (22 nghiệp vụ + 4 bảng better-auth + `_prisma_migrations`) |
| Migration đã áp dụng | 18 |
| Route handler tự viết | 56 trong `routes/` + `GET /healthz` + `GET /readyz` + mount `/auth/*` của better-auth |
| Mã nguồn backend (`src/**/*.ts`) | 45 file, ~7.200 dòng (routes + lib + hạ tầng) |
| Mã nguồn frontend (`frontend/src/**`) | 282 file, ~21.300 dòng |
| Test backend (`bun test --parallel=1`) | **256 pass / 0 fail**, 25 file, ~154 giây |
| e2e Playwright với backend thật | **22/22 pass** (12 spec, `VITE_ENABLE_MOCKS=false`) — số liệu phiên 2026-11-11, **chưa chạy lại** ngày 2026-11-12 |
| e2e Playwright với mock | **42 pass** (16 spec, project `mock`) |
| Unit test frontend | **170 pass** (37 file) |
| Lint + typecheck (FE + BE) | 0 lỗi, 0 cảnh báo |
| Seed | **358 địa điểm seed** (nguồn `collected-places-websearch.json` đã làm giàu đầy đủ 26 trường), **11 ảnh quán thật trong DB**, còn lại dùng placeholder |
| DB dev | 3 user thật (đã dọn 167 user fixture test, 32 post rác, 6 phòng test) |
| Container | `rendez-postgres` (healthy), `rendez-migrate-1` (one-shot OK), `rendez-api` (healthz/readyz 200) |

## 2. Kiến trúc đã triển khai

- **Monorepo Bun workspaces**: `frontend/` (React + Vite), `backend/` (Hono + Bun),
  `packages/schema/` (zod schema — một nguồn hợp đồng duy nhất cho cả hai phía).
- **API** mount tại `/api/v1`; better-auth mount tại `/api/v1/auth`; liveness `/healthz`,
  readiness `/readyz` (SELECT 1).
- **Prisma 7.10.1** + `@prisma/adapter-pg`; datasource URL đặt trong `prisma.config.ts`
  (Prisma 7 không đọc `url` trong schema).
- **pg-boss 12.38.1** cho job nền: `place-detect` (phát hiện địa điểm, cron 5 phút +
  enqueue khi tạo bài không gắn địa điểm; DLQ + retry 5 lần backoff) và `daily-picks`
  (chọn gợi ý hôm nay, cron 00:05 Asia/Ho_Chi_Minh — mục 8).
- **Rate limit** lưu Postgres (`rate_limits`), UPSERT nguyên tử, có cả giới hạn theo IP
  lẫn theo user; áp cho `/session`, `/register`, `POST /media`, và từ phiên 2026-11-12
  áp thêm cho social theo user: `POST /posts` 30/giờ, like 30/phút, comment 10/phút,
  follow 20/phút. Lỗi 429 trả kèm header
  `Retry-After` (middleware phải trả `c.json(..., 429, headers)` trực tiếp vì `onError`
  của Hono dựng lại Response và làm mất header đã set).
- **R2 presigned PUT** tự ký SigV4 bằng `node:crypto` (không thêm SDK).
- **Idempotency** (mục 6), **SSE thông báo theo user** (mục 7) và **8 tính năng mới
  2026-11-11 → 2026-11-12** (mục 8) là các bổ sung lớn.

## 3. Cơ sở dữ liệu

27 bảng:

- Nghiệp vụ: `places`, `place_images`, `place_reports`, `posts`, `post_likes`,
  `post_saves`, `comments`, `comment_likes`, `collections`, `collection_places`,
  `collection_likes`, `reviews`, `follows`, `notifications`,
  `place_suggestion_notifications`, `rooms`, `room_members`, `room_proposals`,
  `daily_picks`.
- Hạ tầng: `rate_limits`, `idempotency_keys`.
- better-auth: `users`, `sessions`, `accounts`, `verifications`.

Điểm thiết kế đáng chú ý:

- `rating`/`reviewCount` của place **không lưu cột** — tính bằng aggregate trên `reviews`
  khi đọc (quyết định D3), nên không có nguy cơ lệch số.
- `place_suggestion_notifications.notification_id` là `@unique` để job idempotent
  (một bài chỉ sinh một thông báo đề xuất, kể cả khi nhiều worker chạy song song).
- `follows` dùng khoá chính ghép `(follower_id, following_id)` + index `following_id`.
- `idempotency_keys` khoá chính ghép `(key, user_id)`, lưu `request_hash` và response
  đã hoàn tất, có `expires_at` (24 giờ) dọn dẹp định kỳ.
- `daily_picks` lưu lựa chọn theo ngày cho gợi ý hôm nay (mục 8.1); migration
  `20261112030000_audit_indexes` thêm index `reviews(author_id)` và bỏ index thừa
  `daily_picks_pick_date_idx`.
- Enum có `@map` về dạng gạch nối trong DB (`place-suggestion`, `wrong-info`) — mọi quy
  đổi tập trung ở `backend/src/lib/enums.ts` (audit 2026-11-11 đã xoá 7 chỗ `as never`).

## 4. Hợp đồng API

Chi tiết từng endpoint: [API.md](file:///home/longtran/Projects/rendez/docs/backend/API.md).
Nhóm chính:

| Nhóm | Endpoint tiêu biểu |
| --- | --- |
| Hạ tầng | `GET /healthz`, `GET /readyz` |
| Auth | `POST /register`, `POST /session`, `DELETE /session`, `GET/PATCH/DELETE /me` |
| Địa điểm | `GET /places`, `GET /places/map`, `GET /places/suggestions`, `GET /places/daily-picks`, `GET /places/:id`, `GET /places/saved` |
| Đánh giá | `GET/POST /places/:id/reviews`, `POST /places/:id/reports` |
| Bài đăng | `GET/POST /posts`, `GET /posts/:id`, `PATCH /posts/:id/save`, `POST/DELETE /posts/:id/like`, `GET/POST /posts/:id/comments`, `POST/DELETE /comments/:id/like` |
| Thông báo | `GET /notifications`, `PATCH /notifications` (đánh dấu tất cả), `PATCH /notifications/:id`, `GET /notifications/events` (SSE) |
| Bộ sưu tập | CRUD `/collections`, `PATCH /collections/:id/places`, `POST/DELETE /collections/:id/like` |
| Hồ sơ | `GET /users`, `GET /users/suggestions`, `GET /users/:handle`, `GET /users/:handle/posts`, `POST/DELETE /users/:handle/follow` |
| OG động | `GET /og/place/:id`, `GET /og/post/:id` (HTML meta cho bot crawler — mục 8.3) |
| Phòng lọc nhóm | `POST /rooms`, `GET /rooms/:code`, `POST /rooms/:code/join`, `POST /rooms/:code/proposals`, `POST .../apply`, `POST .../dismiss`, `DELETE /rooms/:code/members/:memberId`, `GET /rooms/:code/events` (SSE) |
| Media | `POST /media` (presigned PUT) |

Quy ước: lỗi luôn `{ "message": string }` (D6); phân trang keyset cursor opaque base64
(D2); mọi route công khai tự tính `isMine`/`likedByMe` từ phiên nếu có; POST tạo tài
nguyên chấp nhận header `Idempotency-Key` tùy chọn (mục 6).

## 5. Bảo mật phòng lọc nhóm

Thiết kế chi tiết nằm ở [thiet-ke-rooms-bao-mat.md](file:///home/longtran/Projects/rendez/docs/backend/thiet-ke-rooms-bao-mat.md).
Tóm tắt các điểm đã cài đặt:

- Token tham gia phòng là chuỗi ngẫu nhiên 32 byte; DB chỉ lưu HMAC-SHA256 trong
  `room_members.token_hash`, không lưu token gốc.
- Danh tính khách trong phòng chỉ đọc từ cookie `rendez_room_<code>` (HttpOnly,
  `Path=/api/v1/rooms/<code>`, `SameSite=Lax`, Max-Age 86400) hoặc từ phiên đăng nhập —
  **không bao giờ** tin `memberId` từ query/body (có test riêng cho trường hợp giả mạo).
- `POST .../apply` dùng CAS: `updateMany({ id, roomId, status: "open" })`, nếu count = 0
  trả 409 (đề xuất đã bị người khác chốt).
- Tên hiển thị trong phòng là duy nhất (không phân biệt hoa/thường) qua expression index
  `(room_id, LOWER(display_name))`.

## 6. Idempotency cho POST tạo tài nguyên

Áp dụng cho `POST /posts`, `POST /places/:id/reviews`, `POST /collections`, theo
semantics của bản nháp IETF `Idempotency-Key` (kiểu Stripe):

- Header tùy chọn; nếu có, khoá là `(key, user_id)` nên user khác dùng lại key không xung đột.
- Request lần đầu: chèn dòng `pending` (`INSERT ... ON CONFLICT DO NOTHING`); nếu đã có
  dòng đang chờ → 409.
- Hoàn tất: lưu status + body; replay trả lại đúng response cũ kèm header
  `Idempotency-Replayed: true`; `request_hash` khác → 422.
- Lỗi 4xx được lưu (xác định lại được, client sửa payload mới gửi lại được); lỗi 5xx
  không lưu để client retry.
- TTL 24 giờ, dọn các key hết hạn ngay trong middleware khi có ghi.

## 7. SSE thông báo theo user

- `backend/src/lib/notification-events.ts`: kênh in-RAM theo `userId`, event
  `notification-created` chỉ mang `{ version }` (payload trung tính, không rò dữ liệu).
- Publish gọi **sau khi transaction commit** (cả luồng đồng bộ lẫn job đề xuất) để
  tránh báo trước khi dữ liệu sẵn sàng.
- Route `GET /notifications/events`: heartbeat ping 15 giây giữ kết nối.
- Frontend `use-notification-stream` (EventSource) gắn trong `app-shell`, nhận event thì
  invalidate query `notifications`; poll 60 giây giữ lại làm dự phòng. Mock mode bỏ qua
  EventSource.

## 8. Tính năng mới 2026-11-11 → 2026-11-12

Thiết kế chi tiết nằm ở `docs/thiet-ke/` (`goi-y-hom-nay.md`, `tim-nguoi.md`,
`chia-se-og-dong.md`, `loc-gia-sap-xep-anh.md`, `xac-thuc-email.md`,
`cache-va-phien.md`); quyết định ở `docs/DECISIONS.md` D-055..D-058.

### 8.1 Gợi ý hôm nay (daily picks)

- Bảng `daily_picks` + job pg-boss `daily-picks`, cron 00:05 Asia/Ho_Chi_Minh.
- Job chạy trong transaction; test dùng rollback bằng **trigger Postgres thật** (không mock).
- Ưu tiên quán curated có ảnh: `imageCount` +2 điểm, có cổng chất lượng trước khi vào pool.
- `GET /places/daily-picks` public, cache `max-age=300` + ETag.

### 8.2 Tìm người + gợi ý theo dõi

- `GET /users/suggestions` (yêu cầu đăng nhập, `no-store`, chỉ trả dữ liệu công khai).
- Scoring theo: quán chung, theo dõi chéo, hoạt động trong 30 ngày.
- Chặn khai thác: pool ứng viên giới hạn 500 người mới nhất.
- Index `reviews(author_id)` (migration `20261112030000_audit_indexes`, đồng thời bỏ
  index thừa `daily_picks_pick_date_idx`).

### 8.3 Share + OG động

- nginx UA-sniff bot (regex `(?i)`) → proxy `GET /og/place/:id` và `GET /og/post/:id`
  (Hono, escape qua `hono/html`, `safeImageUrl` chặn `javascript:`/`data:`).
- Caddy tương ứng ở prod; cache public 600 giây / 404 cache 60 giây.

### 8.4 Lọc giá + sắp xếp server-side

- `sort=newest/rating/distance` — server là nguồn sự thật duy nhất (D-058, `nearby=1`
  thành alias chỉ-đọc); `PlaceCursor` 3 kind, keyset cursor xử lý NULL distance;
  `priceMax` 1–3.
- Ảnh responsive WebP sinh lúc build (D-057): 58 biến thể, tổng ảnh trang discover
  2,61 MB → 0,72 MB; `EXPLAIN` cả 3 sort < 50 ms.

### 8.5 Bắt buộc xác thực email trước khi đăng nhập (D-056)

- Đăng ký không tạo phiên; gửi mail xác thực; xác thực xong redirect
  `/verify-email?verified=1`.
- Đăng nhập khi chưa xác thực → 403 với message tiếng Việt.

### 8.6 Rate limit social theo user

- `POST /posts` 30/giờ, like 30/phút, comment 10/phút, follow 20/phút; vượt hạn trả
  429 kèm `Retry-After`.

### 8.7 Cache + phiên FE

- Cache private `no-cache` cho dữ liệu phụ thuộc viewer.
- Interceptor 401 FE chỉ đá phiên khi mutation hoặc GET có `authRequired`; đồng bộ
  đăng xuất đa tab bằng `BroadcastChannel`.

### 8.8 Deploy

- `compose.prod`: tách network (`postgres`/`migrate` vào `rendez_net`), thêm
  `APP_ORIGIN` + 5 biến `R2_*`.
- Caddy: mount `/srv/web`, matcher file tĩnh 404, regex bot `(?i)`.
- nginx: `proxy_buffering off` cho SSE.
- SEO origin động: plugin Vite sinh `robots.txt`/`sitemap.xml` từ `APP_ORIGIN` lúc
  build, token `__APP_ORIGIN__` trong `index.html`.

## 9. Kiểm thử

- **Unit/integration backend**: **256 test / 25 file**, mỗi file dùng Postgres thật qua
  Testcontainers (`@testcontainers/postgresql`), chạy `--parallel=1`, ~154 giây.
  Phân bố chính (đếm ở phiên 2026-11-11, chưa đếm lại toàn bộ): places 27, posts 25,
  rooms 20, auth 16, collections 14, posts-images 8, idempotency 8, reviews 8,
  profile 7, infra 7, notifications 6, rate-limit 11 (IP + user), users 6, http-cache 5,
  suggestions-job 5, enums 5, notification-events 3, health 3, media 3; phiên 2026-11-12
  thêm test cho daily-picks, user-suggestions, OG, sort/filter, xác thực email.
- **e2e với mock**: **42 pass / 16 spec** (project `mock`) — không hồi quy frontend.
- **e2e với backend thật**: 12 spec Playwright, app dev `:5199` với
  `VITE_ENABLE_MOCKS=false`, API `:8000`, user demo đăng ký qua API trong `globalSetup`.
  22/22 pass (số liệu phiên 2026-11-11, **chưa chạy lại** ngày 2026-11-12), kể cả case
  suy giảm khi `POST /media` trả 503 (không có R2 trong container).
- **Unit frontend**: **135 pass / 29 file**.
- **Typecheck + lint**: FE + BE 0 lỗi, 0 cảnh báo.

## 10. Kiểm thử bảo mật cục bộ (QA3)

Công cụ có sẵn: `xh`, `curl`, `jq`, `nikto` 2.6.1, `sqlmap`, `nmap`. Chỉ quét
`127.0.0.1:8000`.

| Kiểm tra | Kết quả |
| --- | --- |
| `GET /me`, `GET /places/saved` không cookie | 401 |
| JSON hỏng ở `POST /session` | 400 |
| `q=' OR 1=1 --` | 200, 0 kết quả (tham số hoá) |
| `id` dài 500 ký tự | 404 |
| `cursor=%%%` | 400 |
| Mật khẩu 3 ký tự khi đăng ký | 400 |
| `memberId` giả mạo khi kick thành viên phòng | bị từ chối (danh tính chỉ từ cookie/phiên) |
| Cookie phiên | `HttpOnly; SameSite=Lax; Max-Age=604800; Path=/` |
| CORS với `Origin: http://evil.example` | không có `Access-Control-Allow-Origin` (đúng: `CORS_ORIGINS` rỗng) |
| Header bảo mật | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP `default-src 'none'`, Permissions-Policy |
| nikto | 7.948 request, 6 lỗi kết nối, 4 mục thông tin; sau khi thêm CSP + Permissions-Policy không còn cảnh báo thiếu header |

## 11. Docker & vận hành

- `backend/Dockerfile` 4 stage: `builder` (cài deps, generate Prisma, bundle) →
  `migrator` (= builder, chạy `prisma migrate deploy`) → `runtime` (COPY bundle +
  `node_modules` giữ nguyên cấu trúc workspace Bun + `packages/schema`).
- `compose.yaml`: `postgres` (healthcheck), `migrate` (one-shot,
  `service_completed_successfully`), `api` (healthcheck bằng `fetch` nội bộ, không cần
  `curl` trong image); service `web` do người dùng tự thêm, không thuộc phạm vi backend.
- `compose.prod`: đã sửa tách network (`postgres`/`migrate` vào `rendez_net`), thêm
  `APP_ORIGIN` + 5 biến `R2_*`; Caddy mount `/srv/web` + matcher file tĩnh 404 + regex
  bot `(?i)`; nginx `proxy_buffering off` cho SSE. **Chưa deploy thật** (mục 12).
- Sự cố đã gặp và cách sửa: xem [RUNBOOK.md](file:///home/longtran/Projects/rendez/docs/backend/RUNBOOK.md)
  mục "Sự cố thường gặp".

## 12. Chưa xác minh

- **Cloudflare R2 thật**: chưa có credentials/bucket. Đã kiểm bằng unit test chữ ký
  SigV4 tất định và `POST /media` trả 503 khi thiếu cấu hình; chưa upload/download thật.
- **Gửi email thật (SMTP/Resend)**: luồng xác thực email đã bật (D-056) nhưng mail dev
  vẫn chỉ log link ra console; chưa cấu hình nhà cung cấp thật, chưa kiểm hộp thư thật.
- **`caddy validate`**: chưa chạy được (máy dev không có binary Caddy) — cấu hình Caddy
  prod mới chỉ được rà bằng mắt.
- **Deploy prod thật** (Fly/Railway/VPS): chưa thực hiện; `compose.prod` mới dừng ở mức
  sửa file cấu hình.
- **Preview share thật trên Facebook/Zalo**: chưa kiểm — cần domain public để crawler
  của họ fetch `/og/*`; mới kiểm bằng UA giả lập qua nginx.
- **`bun test` không có cờ `--parallel=1`**: chưa xác minh có race giữa các file test
  dùng chung Postgres hay không; mọi số liệu 256 test đều chạy với `--parallel=1`.
- **SSE nhiều instance**: pub/sub trong bộ nhớ (cả rooms lẫn notifications), chỉ đúng
  khi chạy 1 instance API; cần Redis pub/sub khi scale ngang.
- **Buffering SSE qua Caddy**: nginx đã đặt `proxy_buffering off`, nhưng chưa kiểm cấu
  hình Caddy thật trong môi trường chạy.
- **Tải lớn**: dataset 344 dòng; chưa benchmark `unaccent + pg_trgm` ở ≥ 50k địa điểm.
- **Trình duyệt thật trên thiết bị di động**: e2e chỉ chạy Chromium desktop.
