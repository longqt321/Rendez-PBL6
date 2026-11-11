# Báo cáo kỹ thuật backend Rendez

> Cập nhật 2026-11-11 (phiên tự hành 03:00 → 23:30). Mọi số liệu dưới đây lấy từ lần
> chạy thật trên máy dev (Postgres 17 trong Docker, API trong container). Hạng mục
> chưa kiểm được ghi rõ ở mục **Chưa xác minh**.

## 1. Tóm tắt

| Hạng mục | Kết quả |
| --- | --- |
| Bảng trong DB (schema `public`) | 25 (21 nghiệp vụ + 4 bảng better-auth + `_prisma_migrations`) |
| Migration đã áp dụng | 14 |
| Route handler tự viết | 48 trong `routes/` + `GET /healthz` + `GET /readyz` + mount `/auth/*` của better-auth |
| Mã nguồn backend (`src/**/*.ts`) | 40 file, ~5.400 dòng (routes + lib + hạ tầng) |
| Test backend (`bun test --parallel=1`) | **185 pass / 0 fail**, 20 file, ~134 giây |
| e2e Playwright với backend thật | **22/22 pass** (12 spec, `VITE_ENABLE_MOCKS=false`) |
| e2e Playwright với mock | **22/22 pass** (12 spec) |
| Unit test frontend | **68/68 pass** (17 file) |
| Lint + typecheck (FE + BE) | 0 lỗi, 0 cảnh báo |
| Seed | **344 địa điểm** (86 curated + 258 OSM từ 3.202 điểm thô), 29 ảnh cho 20 địa điểm |
| Container | `rendez-postgres` (healthy), `rendez-migrate-1` (one-shot OK), `rendez-api` (healthz/readyz 200) |

## 2. Kiến trúc đã triển khai

- **Monorepo Bun workspaces**: `frontend/` (React + Vite), `backend/` (Hono + Bun),
  `packages/schema/` (zod schema — một nguồn hợp đồng duy nhất cho cả hai phía).
- **API** mount tại `/api/v1`; better-auth mount tại `/api/v1/auth`; liveness `/healthz`,
  readiness `/readyz` (SELECT 1).
- **Prisma 7.10.1** + `@prisma/adapter-pg`; datasource URL đặt trong `prisma.config.ts`
  (Prisma 7 không đọc `url` trong schema).
- **pg-boss 12.38.1** cho job phát hiện địa điểm (`place-detect`), cron 5 phút + enqueue
  khi tạo bài không gắn địa điểm; DLQ + retry 5 lần backoff.
- **Rate limit** lưu Postgres (`rate_limits`), UPSERT nguyên tử, có cả giới hạn theo IP
  lẫn theo user; áp cho `/session`, `/register`, `POST /media`. Lỗi 429 trả kèm header
  `Retry-After` (middleware phải trả `c.json(..., 429, headers)` trực tiếp vì `onError`
  của Hono dựng lại Response và làm mất header đã set).
- **R2 presigned PUT** tự ký SigV4 bằng `node:crypto` (không thêm SDK).
- **Idempotency** (mục 6) và **SSE thông báo theo user** (mục 7) là hai bổ sung lớn
  trong phiên này.

## 3. Cơ sở dữ liệu

25 bảng:

- Nghiệp vụ: `places`, `place_images`, `place_reports`, `posts`, `post_likes`,
  `post_saves`, `comments`, `comment_likes`, `collections`, `collection_places`,
  `collection_likes`, `reviews`, `follows`, `notifications`,
  `place_suggestion_notifications`, `rooms`, `room_members`, `room_proposals`.
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
- Enum có `@map` về dạng gạch nối trong DB (`place-suggestion`, `wrong-info`) — mọi quy
  đổi tập trung ở `backend/src/lib/enums.ts` (audit 2026-11-11 đã xoá 7 chỗ `as never`).

## 4. Hợp đồng API

Chi tiết từng endpoint: [API.md](file:///home/longtran/Projects/rendez/docs/backend/API.md).
Nhóm chính:

| Nhóm | Endpoint tiêu biểu |
| --- | --- |
| Hạ tầng | `GET /healthz`, `GET /readyz` |
| Auth | `POST /register`, `POST /session`, `DELETE /session`, `GET/PATCH/DELETE /me` |
| Địa điểm | `GET /places`, `GET /places/map`, `GET /places/suggestions`, `GET /places/:id`, `GET /places/saved` |
| Đánh giá | `GET/POST /places/:id/reviews`, `POST /places/:id/reports` |
| Bài đăng | `GET/POST /posts`, `GET /posts/:id`, `PATCH /posts/:id/save`, `POST/DELETE /posts/:id/like`, `GET/POST /posts/:id/comments`, `POST/DELETE /comments/:id/like` |
| Thông báo | `GET /notifications`, `PATCH /notifications` (đánh dấu tất cả), `PATCH /notifications/:id`, `GET /notifications/events` (SSE) |
| Bộ sưu tập | CRUD `/collections`, `PATCH /collections/:id/places`, `POST/DELETE /collections/:id/like` |
| Hồ sơ | `GET /users`, `GET /users/:handle`, `GET /users/:handle/posts`, `POST/DELETE /users/:handle/follow` |
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

## 8. Kiểm thử

- **Unit/integration backend**: 185 test / 20 file, mỗi file dùng Postgres thật qua
  Testcontainers (`@testcontainers/postgresql`), chạy `--parallel=1`. Phân bố chính:
  places 27, posts 25, rooms 20, auth 16, collections 14, posts-images 8, idempotency 8,
  reviews 8, profile 7, infra 7, notifications 6, rate-limit 11 (IP + user), users 6,
  http-cache 5, suggestions-job 5, enums 5, notification-events 3, health 3, media 3.
- **e2e với backend thật**: 12 spec Playwright, app dev `:5199` với
  `VITE_ENABLE_MOCKS=false`, API `:8000`, user demo đăng ký qua API trong `globalSetup`.
  22/22 pass, kể cả case suy giảm khi `POST /media` trả 503 (không có R2 trong container).
- **e2e với mock**: 22/22 pass — không hồi quy frontend.
- **Unit frontend**: 68/68.

## 9. Kiểm thử bảo mật cục bộ (QA3)

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

## 10. Docker & vận hành

- `backend/Dockerfile` 4 stage: `builder` (cài deps, generate Prisma, bundle) →
  `migrator` (= builder, chạy `prisma migrate deploy`) → `runtime` (COPY bundle +
  `node_modules` giữ nguyên cấu trúc workspace Bun + `packages/schema`).
- `compose.yaml`: `postgres` (healthcheck), `migrate` (one-shot,
  `service_completed_successfully`), `api` (healthcheck bằng `fetch` nội bộ, không cần
  `curl` trong image); service `web` do người dùng tự thêm, không thuộc phạm vi backend.
- Sự cố đã gặp và cách sửa: xem [RUNBOOK.md](file:///home/longtran/Projects/rendez/docs/backend/RUNBOOK.md)
  mục "Sự cố thường gặp".

## 11. Chưa xác minh

- **Cloudflare R2 thật**: chưa có credentials/bucket. Đã kiểm bằng unit test chữ ký
  SigV4 tất định và `POST /media` trả 503 khi thiếu cấu hình; chưa upload/download thật.
- **Gửi email thật**: chưa có nhà cung cấp email; luồng xác thực email của better-auth
  chưa bật.
- **Deploy thật** (Fly/Railway/VPS): chưa thực hiện (T8.2 chờ quyết định).
- **SSE nhiều instance**: pub/sub trong bộ nhớ (cả rooms lẫn notifications), chỉ đúng
  khi chạy 1 instance API; cần Redis pub/sub khi scale ngang.
- **Buffering SSE qua Caddy**: chưa kiểm cấu hình reverse proxy thực tế.
- **Tải lớn**: dataset 344 dòng; chưa benchmark `unaccent + pg_trgm` ở ≥ 50k địa điểm.
- **Trình duyệt thật trên thiết bị di động**: e2e chỉ chạy Chromium desktop.
