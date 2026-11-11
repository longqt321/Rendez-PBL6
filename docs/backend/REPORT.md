# Báo cáo kỹ thuật backend RendeZ

> Phiên tự hành 2026-11-11 (03:00 → 11:00). Mọi số liệu dưới đây lấy từ lần chạy thật
> trên máy dev (Postgres 17 trong Docker, API trong container). Hạng mục chưa kiểm được
> ghi rõ ở mục **Chưa xác minh**.

## 1. Tóm tắt

| Hạng mục | Kết quả |
| --- | --- |
| Bảng trong DB (schema `public`) | 24 (23 bảng nghiệp vụ/auth + `_prisma_migrations`) |
| Migration đã áp dụng | 9 |
| Route handler tự viết (`routes/` + `healthz`/`readyz`) | 52 (50 khai báo trong `routes/` + `GET /healthz` + `GET /readyz`) |
| Mã nguồn backend (`src/**/*.ts`) | 35 file, ~4.200 dòng (routes + lib + hạ tầng) |
| Test backend (`bun test --parallel=1`) | **133 pass / 0 fail**, 14 file, ~95 giây |
| e2e Playwright với backend thật | **12/12 pass** (`VITE_ENABLE_MOCKS=false`) |
| e2e Playwright với mock | **13/13 pass** |
| Typecheck (`bun run typecheck` = FE + BE) | 0 lỗi |
| Seed cold-start | 491 địa điểm, 29 ảnh |
| Container | `rendez-postgres` (healthy), `rendez-migrate-1` (one-shot OK), `rendez-api` (healthz/readyz 200) |

## 2. Kiến trúc đã triển khai

- **Monorepo Bun workspaces**: `frontend/` (React + Vite, đã xong từ trước), `backend/`
  (Hono + Bun), `packages/schema/` (8 file zod schema chuyển nguyên từ frontend — một
  nguồn hợp đồng duy nhất cho cả hai phía).
- **API** mount tại `/api/v1`; better-auth mount tại `/api/v1/auth`; liveness `/healthz`,
  readiness `/readyz` (SELECT 1).
- **Prisma 7.10.1** + `@prisma/adapter-pg`; datasource URL đặt trong `prisma.config.ts`
  (Prisma 7 không đọc `url` trong schema).
- **pg-boss 12.38.1** cho job phát hiện địa điểm (`place-detect`), cron 5 phút + enqueue
  khi tạo bài không gắn địa điểm; DLQ + retry 5 lần backoff.
- **Rate limit** lưu Postgres (`rate_limits`), UPSERT nguyên tử, áp cho `/session`,
  `/register`, `POST /media`.
- **R2 presigned PUT** tự ký SigV4 bằng `node:crypto` (không thêm SDK).

## 3. Cơ sở dữ liệu

23 bảng nghiệp vụ/auth:

`users`, `sessions`, `accounts`, `verifications` (better-auth) · `places`, `place_images`,
`place_reports` · `posts`, `post_likes`, `post_saves`, `comments`, `comment_likes` ·
`collections`, `collection_places`, `collection_likes` · `reviews` · `follows` ·
`notifications`, `place_suggestion_notifications` · `rooms`, `room_members`,
`room_proposals` · `rate_limits`.

Điểm thiết kế đáng chú ý:

- `rating`/`reviewCount` của place **không lưu cột** — tính bằng aggregate trên `reviews`
  khi đọc (quyết định D3), nên không có nguy cơ lệch số.
- `place_suggestion_notifications.notification_id` là `@unique` để job idempotent
  (một bài chỉ sinh một thông báo đề xuất, kể cả khi nhiều worker chạy song song).
- `follows` dùng khoá chính ghép `(follower_id, following_id)` + index `following_id`.
- Enum có `@map` về dạng gạch nối trong DB (`place-suggestion`, `wrong-info`) — mọi quy
  đổi tập trung ở `backend/src/lib/enums.ts` (audit 2026-11-11 đã xoá 7 chỗ `as never`).

## 4. Hợp đồng API

Chi tiết từng endpoint: [API.md](file:///home/longtran/Projects/rendez/docs/backend/API.md).
Nhóm chính:

| Nhóm | Endpoint tiêu biểu |
| --- | --- |
| Hạ tầng | `GET /healthz`, `GET /readyz` |
| Auth | `POST /register`, `POST /session`, `DELETE /session`, `GET/PATCH /me` |
| Địa điểm | `GET /places`, `GET /places/map`, `GET /places/suggestions`, `GET /places/:id`, `GET /places/saved` |
| Đánh giá | `GET/POST /places/:id/reviews`, `POST /places/:id/reports` |
| Bài đăng | `GET/POST /posts`, `GET /posts/:id`, `PATCH /posts/:id/save`, `POST/DELETE /posts/:id/like`, `GET/POST /posts/:id/comments`, `POST/DELETE /comments/:id/like` |
| Thông báo | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` |
| Bộ sưu tập | CRUD `/collections`, `PATCH /collections/:id/places`, `POST/DELETE /collections/:id/like` |
| Hồ sơ | `GET /users`, `GET /users/:handle`, `GET /users/:handle/posts`, `POST/DELETE /users/:handle/follow` |
| Phòng lọc nhóm | `POST /rooms`, `GET /rooms/:code`, `POST /rooms/:code/join`, `POST /rooms/:code/proposals`, `POST .../apply`, `POST .../dismiss`, `DELETE /rooms/:code/members/:memberId`, `GET /rooms/:code/events` (SSE) |
| Media | `POST /media` (presigned PUT) |

Quy ước: lỗi luôn `{ "message": string }` (D6); phân trang keyset cursor opaque base64
(D2); mọi route công khai tự tính `isMine`/`likedByMe` từ phiên nếu có.

## 5. Kiểm thử

- **Unit/integration backend**: 133 test, mỗi file dùng Postgres thật qua Testcontainers
  (`@testcontainers/postgresql`), chạy tuần tự `--parallel=1` để tránh tranh chấp.
  Phủ: health, auth (đăng ký/đăng nhập/đăng xuất/rate limit), places (list/map/suggestions/
  chi tiết/saved), posts (feed, like, save, comment), reviews + reports, collections,
  profile + follow, rooms (kể cả đọc SSE thật), job đề xuất, hạ tầng (body limit, presign).
- **e2e với backend thật**: 12 spec Playwright chạy app dev `:5199` với
  `VITE_ENABLE_MOCKS=false`, API `:8000`, user demo đăng ký qua API trong `globalSetup`.
  `logout.spec.ts` bị loại vì FE chưa có form đăng nhập email+password (ghi BACKLOG).
- **e2e với mock**: 13/13 pass — không hồi quy frontend.

## 6. Kiểm thử bảo mật cục bộ (QA3)

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
| Cookie phiên | `HttpOnly; SameSite=Lax; Max-Age=604800; Path=/` |
| CORS với `Origin: http://evil.example` | không có `Access-Control-Allow-Origin` (đúng: `CORS_ORIGINS` rỗng) |
| Header bảo mật | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP `default-src 'none'`, Permissions-Policy |
| nikto | 7.948 request, 6 lỗi kết nối, 4 mục thông tin; sau khi thêm CSP + Permissions-Policy không còn cảnh báo thiếu header |

## 7. Docker & vận hành

- `backend/Dockerfile` 4 stage: `builder` (cài deps, generate Prisma, bundle) →
  `migrator` (= builder, chạy `prisma migrate deploy`) → `runtime` (COPY bundle +
  `node_modules` giữ nguyên cấu trúc workspace Bun + `packages/schema`).
- `compose.yaml`: `postgres` (healthcheck), `migrate` (one-shot, `service_completed_successfully`),
  `api` (healthcheck bằng `fetch` nội bộ, không cần `curl` trong image).
- Sự cố đã gặp và cách sửa: xem [RUNBOOK.md](file:///home/longtran/Projects/rendez/docs/backend/RUNBOOK.md)
  mục "Sự cố thường gặp".

## 8. Chưa xác minh

- **Cloudflare R2 thật**: chưa có credentials/bucket. Đã kiểm bằng unit test chữ ký SigV4
  tất định và `POST /media` trả 503 khi thiếu cấu hình; chưa upload/download thật.
- **Gửi email thật**: chưa có nhà cung cấp email; luồng xác thực email của better-auth
  chưa bật.
- **Deploy thật** (Fly/Railway/VPS): chưa thực hiện (T8.2 chờ quyết định).
- **SSE nhiều instance**: pub/sub trong bộ nhớ, chỉ đúng khi chạy 1 instance API.
- **Tải lớn**: dataset 491 dòng; chưa benchmark `unaccent + pg_trgm` ở ≥ 50k địa điểm.
- **Trình duyệt thật trên thiết bị di động**: e2e chỉ chạy Chromium desktop.
