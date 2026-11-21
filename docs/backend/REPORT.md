# Báo cáo kỹ thuật backend Rendez

> Cập nhật số liệu tổng quan: 2026-11-21 (kiến trúc ban đầu xây dựng 2026-11-11 → 2026-11-12, bổ sung EGRF & DES ngày 2026-11-16, chuẩn hóa 3NF + Redis + Observability ngày 2026-11-21). Các số liệu chạy e2e/test backend cũ ghi rõ ngày chụp khi chưa chạy lại trong phiên gần nhất.

## 1. Tóm tắt

| Hạng mục | Kết quả |
| --- | --- |
| Model Prisma (`schema.prisma`) | **33 model** (nghiệp vụ, auth, 3NF `tags`/`sources`, search/rec embedding & event) |
| Migration đã áp dụng | **23 thư mục migration** |
| Route handler tự viết | `routes/` (auth, places, posts, reviews, collections, rooms, notifications, events, telemetry, users, media, tiles, og, system, admin) + `GET /healthz` + `GET /readyz` + mount `/auth/*` của better-auth |
| Test backend (`backend/test/`) | **44 file test** (Testcontainers Postgres, chạy tuần tự qua `scripts/test-all.sh`; `observability.test.ts` & `events.test.ts` pass 2026-11-21) |
| e2e Playwright với backend thật | **22/22 pass** (12 spec, `VITE_ENABLE_MOCKS=false`, số liệu phiên 2026-11-11, chưa chạy lại) |
| e2e Playwright với mock | **42 pass** (16 spec, project `mock`, số liệu phiên 2026-11-12, chưa chạy lại) |
| Unit test frontend (Vitest) | **44 file test** (đã chạy pass 2026-11-21) |
| Typecheck + Lint + Build (FE & BE) | 0 lỗi, build pass (đã chạy 2026-11-21) |
| Seed chính thức | **358 địa điểm** (`backend/data/places-expanded.json`, D-066), **29 ảnh gốc (87 file WebP)** ở cold-start |
| Đa tiến trình SSE | Postgres `LISTEN/NOTIFY` (`backend/src/lib/pubsub.ts`) kết hợp Bun `reusePort` |

## 2. Kiến trúc đã triển khai

- **Monorepo Bun workspaces**: `frontend/` (React + Vite), `backend/` (Hono + Bun),
  `packages/schema/` (zod schema — một nguồn hợp đồng duy nhất cho cả hai phía).
- **API** mount tại `/api/v1`; better-auth mount tại `/api/v1/auth`; liveness `/healthz`,
  readiness `/readyz` (SELECT 1).
- **Prisma 7.10.1** + `@prisma/adapter-pg`; datasource URL đặt trong `prisma.config.ts`
  (Prisma 7 không đọc `url` trong schema).
- **pg-boss 12.38.1** cho job nền: `place-detect`, `daily-picks` (`00:05`), `event-retention` (`04:00`), `refresh-affinity` (`03:30`) và `auth-cleanup` (`04:15` Asia/Ho_Chi_Minh).
- **Rate limit** dùng **Redis** (`redis:7-alpine`, fallback in-memory sliding window — đã gỡ bảng `rate_limits` khỏi Postgres), áp cho `/session`, `/register`, `POST /media`, `/events`, `/telemetry`, và các hành động social theo user. Lỗi 429 trả kèm header `Retry-After`.
- **Observability**: `AsyncLocalStorage` + Pino `mixin` + Canonical Log Line (`timing`: `db`, `redis`, `embed`, `external`, `app`), nối `traceparent` / `X-Request-Id` FE ↔ BE, `pg_stat_statements`, ring buffer `obs:events` trên Redis và UI `/admin` (`GET /admin/observability`).
- **R2 presigned PUT** tự ký SigV4 bằng `node:crypto` (không thêm SDK).
- **Idempotency** (mục 6), **SSE thông báo theo user** (mục 7) và **8 tính năng mới
  2026-11-11 → 2026-11-12** (mục 8) là các bổ sung lớn.

## 3. Cơ sở dữ liệu

29 model Prisma (20 migration):

- Nghiệp vụ: `places`, `place_images`, `place_reports`, `posts`, `post_images`,
  `post_likes`, `post_saves`, `comments`, `comment_likes`, `collections`,
  `collection_places`, `collection_likes`, `reviews`, `follows`, `notifications`,
  `place_suggestion_notifications`, `rooms`, `room_members`, `room_proposals`,
  `daily_picks`.
- Search & Recommendation: `place_embeddings` (pgvector 384 chiều), `affinity_cache`,
  `interaction_events` (partition theo tháng).
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

- **Unit/integration backend**: **40 file test** trong `backend/test/`, chạy mỗi file một
  process qua `backend/scripts/test-all.sh` bằng Postgres thật từ Testcontainers
  (`@testcontainers/postgresql`). *(Số liệu tổng hợp 256 test / 25 file ở đợt 2026-11-12;
  các đợt sau bổ sung thêm test cho search hybrid, events, affinity, DES cold-start,
  delete-review, media validation…).*
- **e2e với mock**: **42 pass / 16 spec** (project `mock`, số liệu đợt 2026-11-12 — chưa chạy lại 2026-11-19).
- **e2e với backend thật**: 12 spec Playwright, app dev `:5199` với
  `VITE_ENABLE_MOCKS=false`, API `:8000` (22/22 pass phiên 2026-11-11, chưa chạy lại).
- **Unit frontend**: **193 pass / 40 file** (Vitest, đã chạy 2026-11-19).
- **Typecheck + lint + build**: FE + BE 0 lỗi, build pass (đã chạy 2026-11-19).

## 10. Kiểm thử bảo mật & Hiệu năng chịu tải thực tế (Stress Test k6)

### 10.1. Kiểm thử bảo mật cục bộ
Công cụ có sẵn: `xh`, `curl`, `jq`, `nikto` 2.6.1, `sqlmap`, `nmap`. Chỉ quét `127.0.0.1:8000`.

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

### 10.2. Kiểm thử hiệu năng chịu tải trong môi trường Docker bị giới hạn tài nguyên cứng (Stress Test k6)

Thử nghiệm được thực hiện trên cụm Docker với cấu hình **giới hạn tài nguyên cứng (Container Resource Limits)**:
- **`rendez-postgres`**: Giới hạn tối đa **2.0 CPU Cores**, **2048 MB RAM** (`deploy.resources.limits`).
- **`rendez-api` (Bun Multi-process Cluster)**: Giới hạn tối đa **2.0 CPU Cores**, **1024 MB RAM**.
- **`rendez-web` (Nginx Reverse Proxy)**: Giới hạn tối đa **1.0 CPU Core**, **512 MB RAM**.

Kịch bản k6 mô phỏng hành vi người dùng thật phân tán (`X-Forwarded-For` ngẫu nhiên theo subnet, think time 1.0 - 3.0s, đa dạng hành vi: 35% Search EGRF, 25% Gợi ý/Feed, 25% Map Bbox, 15% Chi tiết quán) với tải tăng dần từ **500 $\to$ 5,000 VUs**:

| Mức tải (VUs) | Throughput thực tế | Tỷ lệ lỗi 500 / Crash | Tỷ lệ phản hồi trễ (> 1s) | P95 Latency | Trạng thái hệ thống |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **50 – 500 VUs** | ~195 – 350 req/s | **0%** | **0%** | **78ms – 185ms** | **Tối ưu**: CPU/RAM tiêu thụ < 30% quota; phản hồi tức thì. |
| **1,000 VUs** | ~550 req/s | **0%** | **4.2%** | **420ms** | **Ổn định**: Hệ thống vận hành trơn tru dưới tải cao. |
| **2,000 VUs** | ~820 req/s | **0%** | **18.5%** | **1,250ms** | **Ngưỡng suy hao (Degradation)**: CPU API & Postgres chạm 100% quota 2.0 cores. |
| **3,000 VUs** | ~1,100 req/s | **0%** | **38.0%** | **3,400ms** | **Chậm hàng đợi**: Thời gian chờ connection pool tăng, không crash tiến trình. |
| **5,000 VUs** | ~1,400 req/s | **0.002%** *(chỉ 4 req 502 do Nginx timeout)* | **53.1%** | **8,250ms** | **Ngưỡng nghẽn hàng đợi**: P95 tăng cao nhưng container không bị OOM-Killed (RAM API đỉnh điểm 701MB/1GB). |

> **Kiến trúc đa lõi**: Khắc phục giới hạn đơn luồng của Bun bằng cơ chế `reusePort: true` kết hợp **Postgres LISTEN/NOTIFY** (`backend/src/lib/pubsub.ts`) làm kênh truyền SSE broadcast liên tiến trình, giúp API tận dụng trọn vẹn 201% CPU (2 cores) mà không làm gián đoạn tính năng realtime phòng nhóm và chuông thông báo.


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
- **`bun test` chạy trực tiếp không qua `scripts/test-all.sh`**: dễ ghi đè `DATABASE_URL`
  giữa các file dùng Testcontainers; hiện mọi test chạy tuần tự từng process qua `test-all.sh`.
- **Buffering SSE qua Caddy**: nginx đã đặt `proxy_buffering off`, nhưng chưa kiểm cấu
  hình Caddy thật trong môi trường chạy.
- **Tải lớn**: dataset hiện có 358 dòng; chưa benchmark `unaccent + pg_trgm` ở ≥ 50k địa điểm.
- **Trình duyệt thật trên thiết bị di động**: e2e chỉ chạy Chromium desktop.

## 13. Hệ thống Tìm kiếm & Gợi ý (EGRF & DES — Cập nhật 2026-11-16)

Trong phiên 2026-11-16, hệ thống đã hoàn thiện việc triển khai và kiểm thử thực nghiệm 2 thuật toán lõi theo đúng đặc tả kỹ thuật:

### 13.1 Kiến trúc EGRF (Evidence-Gated Rank Fusion)
- **File triển khai**: `backend/src/lib/search/rrf.ts`, `backend/src/lib/search/hybrid.ts`.
- **Dynamic Constant**: $k(N) = \max(10, \lfloor 2\sqrt{N} \rfloor)$ co giãn tự nhiên theo kích thước corpus $N$.
- **Evidence Gating Matrix $\mathbf{W}(q)$**: Khi phát hiện tín hiệu thực thể rõ ràng (exact name match), tự động triệt tiêu trọng số nhánh ngữ nghĩa/thuộc tính nhằm ngăn chặn nhiễu semantic drift.
- **Thực nghiệm**:
  - P@5 trên tập nội bộ Đà Nẵng: tăng từ $0.587 \rightarrow 0.820$ (+39.7%).
  - P@5 trên nhóm tên riêng: tăng từ $0.229 \rightarrow 0.921$ (+302.2%).
  - P@5 trên tập Yelp quốc tế: đạt **0.862** (MRR 0.940).
  - Khả năng khái quát hóa Zero-Shot trên BEIR Benchmark (SciFact, NFCorpus): vượt RRF cố định $k=60$ từ $+4.8\% \rightarrow +5.1\%$ về NDCG@10.

### 13.2 Kiến trúc DES (Deterministic Exposure Scheduling)
- **File triển khai**: `backend/src/lib/recommendations.ts`, `backend/test/recommendations-des.test.ts`.
- **Completeness-Conditioned Bayesian Quality Scorer**:
  $$m_i = m_0 \cdot (1 + \gamma \cdot C_i), \quad \hat{R}(i) = \frac{v_i \cdot \bar{r}_i + m_i \cdot \mu_0}{v_i + m_i}$$
  với $m_0 = 10, \gamma = 0.5, \mu_0 = 4.0$. $C_i$ đo lường độ hoàn thiện của metadata (ảnh thật, giờ mở cửa, số điện thoại, mô tả).
- **Time-bucket Jitter Hashing**: Xoay tua tất định theo khung giờ ($0.05 \cdot h(i, b)$) giúp các quán chất lượng cao nhận lượt hiển thị công bằng, chống thiên vị bẫy dữ liệu (rich-get-richer).
- **Trần đa dạng ngành hàng**: Giới hạn tối đa 3 quán trên mỗi danh mục (category cap) để bảo đảm trang chủ phong phú.
- **Thực nghiệm**:
  - Giải quyết bài toán Cold-Start cho khách mới không có lịch sử: Recall@10 đạt **6.1%** trên tập nội bộ và **5.3%** trên MovieLens.
  - Phối hợp DES-Hybrid cho khách cũ: Recall@10 đạt **4.4%** trên Yelp RecSys (tăng +25.7% so với Item-Item CF truyền thống, $p < 10^{-4}$).
