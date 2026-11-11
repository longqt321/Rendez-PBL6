# Đề xuất tech stack backend — Rendez

> [!IMPORTANT]
> **Tài liệu gốc 2026-11-10, có 2 chỗ đã lỗi thời** — luôn ưu tiên
> `ke-hoach-backend-chi-tiet.md` khi mâu thuẫn:
> 1. Mục 5 ghi "Prisma 6" → thực tế đã chốt **Prisma 7.10.1** (bỏ Rust engine, dùng
>    `@prisma/adapter-pg` — xem Phần L của kế hoạch).
> 2. Mục 10 vẽ cấu trúc `apps/web` + `apps/api` → thực tế đã chốt **`frontend/` + `backend/`**
>    (monorepo đã migrate 2026-11-11).
>
> Giá trị còn lại của tài liệu này: lý do chọn Hono (mục 3/3b — đối chiếu Fastify đã xác minh
> docs), thiết kế 4 cơ chế lưu trữ trong Postgres (mục 4), và lộ trình ban đầu (mục 11 —
> đã chi tiết hoá thành Phase 0–8 trong kế hoạch).

Ngày: 2026-11-10. Cơ sở: phân tích entity + query pattern thật từ frontend
(`src/features/*/types/*.ts`, `src/mocks/server.ts` ~45 route, `src/mocks/ranking.ts`).
Kiến trúc đã chốt: **frontend SPA tách biệt — backend HTTP API thuần — không monolith Next**.

## 1. Nguyên tắc chọn

1. **Một ngôn ngữ TypeScript** cả FE-BE → share zod schema (frontend đã dùng zod ở 3 form).
2. **Không thêm hạ tầng khi nhu cầu chưa phát sinh** — scale hiện tại: ~500 place, 8-9 entity,
   query đơn giản (bbox, substring, cursor pagination). Mọi lựa chọn dưới đây có lý do
   "khi nào mới cần nâng cấp" đi kèm.
3. **Port logic từ mock nguyên văn** — `ranking.ts`, job phát hiện địa điểm đã viết rồi.

## 2. Stack đề xuất (tổng quan)

| Lớp | Chọn | Vai trò |
|---|---|---|
| Runtime | **Bun 1.3** (dev + prod) hoặc Node 22 LTS — Hono chạy cả hai | Bun native, không cần adapter; Node nếu cần ecosystem Node thuần |
| Framework | **Hono 4** | HTTP server (Web Standard, chạy Node qua `@hono/node-server`) |
| Validation | **zod 4** (share với FE) + **`@hono/zod-openapi`** | Validate + **sinh OpenAPI 3.1 tự động từ chính zod schema** — đúng yêu cầu "OpenAPI làm nguồn sự thật" |
| ORM | **Prisma 6** | Type-safe, migration, schema declarative |
| Database | **PostgreSQL 17** | Chi tiết loại lưu trữ bên trong ở mục 4 |
| Auth | **better-auth** (Postgres adapter, session cookie) | `/session`, `/me`, đăng ký/đăng nhập, OAuth sau này |
| Job nền | **pg-boss** (queue nằm trong Postgres) | Job phát hiện địa điểm mới — **không cần Redis** |
| Realtime (phòng lọc nhóm) | **SSE trước, Socket.IO sau** | Đa thiết bị cho room |
| File storage | **Cloudflare R2** (S3-compatible, free egress) hoặc Supabase Storage | Ảnh check-in, avatar, ảnh venue |
| Test | Vitest + Testcontainers (Postgres thật trong Docker) | Khớp runner FE |
| Deploy | Docker Compose → Fly.io / Railway | 1 container API + 1 Postgres managed |

## 3. Framework — vì sao Fastify, không phải khác

| Phương án | Kết luận |
|---|---|
| **Hono 4** | **Chọn (đánh giá lại 2026-11-10 — xem mục 3b)** — zod-native OpenAPI chính thức, SSE built-in, better-auth mount không adapter, chạy Bun native |
| Fastify 5 | Phương án 2 — trưởng thành hơn, throughput Node cao hơn, nhưng OpenAPI đi qua JSON Schema (không phải zod) |
| NestJS | Loại — DI/decorator/class-validator là khái niệm thừa cho ~45 endpoint; muốn dùng zod phải cắm adapter thêm |
| Express | Loại — cũ, không có schema-first, phải tự ghép mọi thứ |
| tRPC | Loại — buộc đổi toàn bộ tầng `features/*/api/*.ts` của FE (axios), phá kiến trúc D-011 |

## 3b. Đánh giá lại Hono (2026-11-10) — vì sao đổi khuyến nghị

Đánh giá đầu tiên xếp Hono "phương án 2" dựa trên ấn tượng "ecosystem mỏng hơn". Sau khi
tra docs thực tế (context7: `/honojs/hono`, `/honojs/middleware`) + web search, các khẳng
định đó cần sửa:

### Hono có sẵn (đã xác minh trong docs chính thức)

| Nhu cầu của dự án | Hono | Fastify |
|---|---|---|
| OpenAPI từ zod | **`@hono/zod-openapi`** — package chính thức `@hono/*`, sinh OpenAPI 3.1 từ chính zod schema, kèm `@hono/swagger-ui` | `@fastify/swagger` — sinh từ **JSON Schema**; dùng zod phải qua type-provider (lớp trung gian) |
| SSE cho phòng lọc nhóm | **`streamSSE` built-in** (helper chuẩn, set header + TransformStream) | Không built-in — tự viết hoặc plugin |
| CORS / body limit / multipart | `hono/cors`, `bodyLimit`, `c.req.parseBody()` (File object) built-in | `@fastify/cors`, `@fastify/rate-limit`… — plugin riêng từng cái, đầy đủ hơn |
| better-auth | **Tài liệu chính thức có trang Hono**: `app.all("/api/auth/*", (c) => auth.handler(c.req.raw))` — không cần adapter (cùng Web Standard Request/Response) | Có hỗ trợ nhưng qua adapter Node |
| Test | `app.request()` — gọi trực tiếp app không cần mở server, khớp Vitest | `app.inject()` — tương đương |
| Runtime | Chạy Bun native (repo đã dùng Bun); port sang Workers/Deno gần như 0 thay đổi | Node only |

### Fastify vẫn thắng ở đâu (thật, nhưng ít ảnh hưởng dự án này)

1. **Throughput Node thuần + p99 latency** — Fastify tối ưu serialization bằng JSON Schema
   (`fast-json-stringify`); Hono trên Node đi qua adapter (`@hono/node-server`) có chi phí
   chuyển đổi. Ở scale ~500 place + vài nghìn user, chênh lệch này không cảm nhận được.
2. **Ecosystem plugin Node "enterprise"** sâu hơn (rate-limit phân tán, multipart nâng cao,
   proxy…). Hono mỏng hơn nhưng có đủ thứ cơ bản; cái thiếu thì tự viết ngắn.
3. **Tuổi + số dự án production lớn** — Fastify battle-tested lâu hơn; Hono tăng trưởng
   rất nhanh nhưng trẻ hơn.

### Kết luận

Ba quyết định kiến trúc của dự án — **zod share FE-BE làm nguồn sự thật**, **SSE cho room**,
**Bun làm package manager** — đều nghiêng về Hono, và cả ba đều là quyết định dài hạn.
Fastify chỉ thắng ở hiệu năng raw Node và độ sâu plugin — hai thứ dự án này chưa cần.
Đổi khuyến nghị framework thành **Hono 4 + @hono/zod-openapi**. Các phần còn lại của stack
(Prisma, Postgres, pg-boss, better-auth, R2) **không đổi** — đều framework-agnostic.

## 4. Database: PostgreSQL — và **bên trong dùng gì để lưu gì**

Đây là phần bạn hỏi kỹ nhất. Một instance Postgres duy nhất, bên trong dùng **4 cơ chế lưu trữ khác nhau**, mỗi loại cho đúng loại dữ liệu:

### 4.1. Bảng quan hệ (table + FK) — dữ liệu có quan hệ cứng

Mọi entity chính. Schema dự kiến (map 1-1 từ type frontend):

| Bảng | Cột chính | Quan hệ |
|---|---|---|
| `users` | id (uuid), name, handle (unique), avatar_url, bio | — |
| `sessions` | user_id, token_hash, expires_at | FK users |
| `places` | id, name, address, city, district, category, price_level, lat, lng, status, is_published | — |
| `place_tags` | place_id, tag | FK places (tags là mảng — xem 4.2) |
| `place_images` | place_id, url, height, credit, kind | FK places |
| `reviews` | place_id, user_id, rating, content, created_at | FK places, users |
| `reports` | place_id, user_id, reason, status | FK places, users |
| `posts` | id, author_id, place_id (nullable), caption, created_at | FK users, places |
| `post_likes` | post_id, user_id (unique cặp) | FK posts, users |
| `post_saves` | post_id, user_id (unique cặp) | FK posts, users |
| `comments` | post_id, author_id, reply_to_id (nullable, FK self), content | FK posts, users |
| `comment_likes` | comment_id, user_id | FK |
| `collections` | id, owner_id, name, description, is_private | FK users |
| `collection_places` | collection_id, place_id, **position** (giữ thứ tự thêm — FE yêu cầu "thêm mới đẩy xuống cuối") | FK |
| `collection_likes` | collection_id, user_id | FK |
| `rooms` | id, code (unique 6 ký tự), name, owner_id | FK users |
| `room_members` | room_id, user_id, joined_at | FK |
| `room_proposals` | room_id, member_id, kind, field, value, status | FK |
| `notifications` | id, user_id, type, read_at, created_at | FK users |

**Đếm like/follow/reviewCount**: không lưu cột counter tự tăng — dùng `COUNT(*)` + index,
hoặc materialized khi nặng. (Mock hiện lưu `likeCount` trực tiếp — backend thật chuẩn hoá.)

### 4.2. Mảng + JSONB — dữ liệu dạng cấu trúc, không cần join ngược

- `places.tags: text[]` — mảng Postgres, dùng `GIN index` để lọc "quán có tag X".
- `rooms.filter: jsonb` — toàn bộ `RoomFilter` (categories/districts/keywords/priceMax) là
  **state của phòng**, luôn đọc/ghi nguyên khối theo room, không bao giờ query "tìm phòng có
  filter chứa X" → bảng con chỉ thêm join vô ích. JSONB + validation bằng zod khi ghi.
- `notifications.payload: jsonb` — mỗi loại thông báo có shape khác nhau
  (`place-suggestion` mang 3 gợi ý + lý do; loại khác không) → polymorphic, đúng chỗ dùng JSONB.
- `users.taste_profile: jsonb` (sau này, DX-7.1 "Sở thích của tôi").

### 4.3. Full-text / fuzzy search — `unaccent` + `pg_trgm` (không cần Elasticsearch)

Tìm kiếm hiện tại: `normalizeText` (bỏ dấu tiếng Việt) + `includes` — backend thật phải
tương đương nhưng nhanh hơn:

- Extension **`unaccent`**: chuẩn hoá bỏ dấu ("Bánh Xèo Bà Dưỡng" ↔ "banh xeo ba duong").
- Extension **`pg_trgm`**: index GIN trigram trên `places.name`, `places.address`, `posts.caption`,
  `users.name` → tìm substring mờ ("banh xeo" khớp "Bánh Xèo"), gõ sai vẫn ra.
- Khi nào nâng cấp: nếu sau này cần search theo nghĩa/số điểm (không chỉ khớp chuỗi) →
  `tsvector` tiếng Việt (vẫn trong Postgres) hoặc Meilisearch. **Chưa cần lúc này.**

### 4.4. Geospatial — `numeric` lat/lng + composite index (chưa cần PostGIS)

- Query bản đồ là **bbox** (`minLng,minLat,maxLng,maxLat` — D-052) → chỉ cần 2 cột
  `double precision` + composite btree index `(minLng, maxLng, minLat, maxLat)` style
  (hoặc 2 index riêng lat, lng). Ở scale ~500–50k place, bbox range query là đủ nhanh.
- **PostGIS** (kiểu `geography`, index GiST, query bán kính km, "quán gần tôi 2km") —
  chỉ bật khi có tính năng "gần đây theo bán kính" (DX-7.2) hoặc dữ liệu lên trăm nghìn.
  Ghi BACKLOG, không cài trước.
- Lưu ý: `calculateDistanceKm` (Haversine) đang chạy ở FE để hiện "cách bạn x km" —
  giữ ở FE (dựa trên toạ độ đã có), không phải việc của backend.

### 4.5. Không dùng trong DB (chống overengineering)

| Không dùng | Lý do |
|---|---|
| Redis | pg-boss + session cookie + HTTP cache đã phủ; thêm Redis = thêm 1 service phải vận hành. Xem lại khi cần rate-limit phân tán hoặc cache nóng thật sự |
| Elasticsearch/Meilisearch | pg_trgm đủ cho tìm quán theo tên/địa chỉ |
| MongoDB | Dữ liệu là quan hệ rõ (post→place→review→user); JSONB đã phủ phần linh hoạt |
| S3 cho ảnh nhỏ trong DB | Ảnh để object storage (mục 6), DB chỉ lưu URL |

## 5. ORM — Prisma 6

- Schema declarative + `prisma migrate` — đúng rule "không sửa migration cũ".
- Client type-safe sinh từ schema — khớp zod share từ FE.
- Phương án Drizzle (nhẹ hơn, SQL-transparent) — cân nhắc nếu muốn SQL thô nhiều; Prisma
  ưu tiên vì migration + docs + agent-friendly.

## 6. File storage — Cloudflare R2

- S3-compatible API, **không tính phí egress** (ảnh quán load nhiều lần).
- Cấu trúc: `venues/{placeId}/{hash}.jpg`, `posts/{postId}/{n}.jpg`, `avatars/{userId}.jpg`.
- Upload: client ký URL trước (presigned PUT) → upload thẳng R2, không qua API server.
- DB chỉ lưu URL + credit (D-051 đã có `imageCredit` — giữ nguyên contract).

## 7. Auth — better-auth

- Session cookie httpOnly (mock đã có `/session` GET/DELETE — hợp đồng giữ nguyên shape).
- Email+password trước; Google OAuth sau (người dùng quán ăn hay đăng bằng Google).
- Không tự viết mã hoá mật khẩu/session — dùng thư viện, tránh tự chế bảo mật.

## 8. Job nền — pg-boss (queue trong Postgres)

Job đầu tiên (đã có spec từ mock): **phát hiện địa điểm mới** — quét bài `place_id IS NULL`,
chạy `ranking.ts` trên place chưa publish, sinh notification `place-suggestion`.
- pg-boss dùng chính Postgres (table `pgboss.*`) → không thêm Redis/BullMQ.
- Cron: `schedule` mỗi 5 phút; idempotent (mỗi post chỉ sinh 1 lần — unique index).

## 9. Realtime cho phòng lọc nhóm

- Hiện FE: BroadcastChannel + localStorage (cùng trình duyệt). Đa thiết bị cần server push.
- **Giai đoạn 1: SSE** (`GET /rooms/:code/events`) — 1 chiều server→client, đủ cho
  "thành viên A đề xuất → thành viên B thấy ngay"; mutation vẫn là REST POST/PATCH.
- **Giai đoạn 2 (khi cần 2 chiều thật)**: Socket.IO. Không làm trước.

## 10. Cấu trúc repo & tooling

*(Lỗi thời — xem ghi chú đầu trang. Cấu trúc thực tế: `frontend/` + `backend/` + `packages/schema/`)*

## 11. Lộ trình triển khai backend (theo thứ tự)

1. **Contract**: trích ~45 route từ `src/mocks/server.ts` + type FE → `packages/schema` (zod)
   + OpenAPI sinh tự động. Duyệt trước khi code.
2. Skeleton Hono + Prisma + Postgres (Docker), auth better-auth, `/me` `/session`.
3. Port `places` (gồm `/places/map` bbox) + reviews + reports.
4. Port `posts` + comments + likes + collections (cursor pagination thật).
5. Port `rooms` + SSE.
6. Job pg-boss phát hiện địa điểm + notifications.
7. Upload ảnh (presigned R2) → mở lại tính năng đăng ảnh check-in (đang bị bỏ ở D-049).
8. Xoá `src/mocks/`, đổi `VITE_API_BASE_URL`.

## 12. Chưa xác minh

- ~~Version chính xác Hono 4 / Prisma 6 / better-auth~~ → đã xác minh trong Phần L của kế hoạch.
- Chi phí R2/Supabase ở mức dùng thật chưa tính — cần bảng giá thời điểm triển khai.
- Hiệu năng pg_trgm trên caption tiếng Việt có emoji/chữ hoa lẫn lộn — cần test với dữ liệu thật.
