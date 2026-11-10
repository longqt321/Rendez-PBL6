# Kế hoạch chi tiết triển khai backend — Đà Nẵng Ăn & Đi

Ngày: 2026-11-10. Nguồn sự thật: đọc trực tiếp toàn bộ `src/mocks/server.ts` (1.430 dòng),
8 file `*.schema.ts` zod, `src/lib/api-contracts.ts`, types từng feature, `src/lib/axios.ts`,
`src/lib/constants.ts`. Mọi khẳng định dưới đây đã đối chiếu với code.

Kiến trúc đã chốt: **SPA (React Router) — REST API thuần — Postgres**. Không Next.js, không SSR.

---

# PHẦN A — TÀI SẢN FRONTEND CHUẨN BỊ CHO BACKEND (đã kiểm chứng)

## A1. Zod schemas có sẵn (8 file) — nền tảng `packages/schema`

| File | Schema xuất | Ghi chú |
|---|---|---|
| `place.schema.ts` | `placeSchema`, `placeSummarySchema`, `placeSuggestionSchema` | `priceLevel` = literal 1\|2\|3; `status` optional |
| `post.schema.ts` | `postSchema` (+ input) | `place: PlaceSummary \| null` nhúng sẵn |
| `comment.schema.ts` | `commentSchema` | `replyTo: {commentId, handle} \| null` server nhúng |
| `review.schema.ts` | `reviewSchema` | `isMine` server gán |
| `place-report.schema.ts` | `placeReportSchema` + `PLACE_REPORT_REASONS` const | enum `closed\|wrong-info\|duplicate\|other` |
| `notification.schema.ts` | `notificationSchema` | union 3 kind: `place-suggestion` / `like\|comment\|follow` / `system` |
| `profile.schema.ts` | `userProfileSchema` | `isMe`, `followedByMe` server gán |
| `collection.schema.ts` | `collectionSchema`, `collectionSummarySchema` | `placeIds` giữ thứ tự; `containsPlace` chỉ khi `?placeId=` |

**Cách dùng:** di chuyển 8 file này sang `packages/schema` (workspace chung), FE import lại từ
đó. Không viết lại schema — chỉ đổi import path. `satisfies z.ZodType<T>` giữ nguyên để
type-check TS tiếp tục bảo vệ.

## A2. Bảng contract response có sẵn — `src/lib/api-contracts.ts`

32 mục `{pattern, method, schema}` phủ **mọi endpoint** mock implement. Đây là checklist
kiểm thử backend: mỗi route backend phải pass đúng schema này. **Giữ file này ở FE**, đổi
nguồn schema sang `packages/schema` — khi mock tắt, nó vẫn dùng để contract-test backend thật.

## A3. Error contract (từ `src/lib/axios.ts` + mock)

- Body lỗi: `{ message: string }` — FE nhận cả `{ detail }` (FastAPI-style) nhưng **chuẩn hoá
  về `message`**. Backend mới: trả `{ message }` thống nhất.
- `code?: string` optional — FE đọc nhưng chưa dùng gì cụ thể.
- Status FE phân biệt: **404** (`isNotFoundError` → trang "không tìm thấy"), **401**
  (`isUnauthorizedError` → trạng thái chưa đăng nhập, không retry), **400** (toast message),
  status 0 (lỗi mạng), 5xx (thử lại).
- FE timeout axios 10s.

## A4. Phân trang

- Hợp đồng: `Page<T> = { items: T[]; next: string | null }` (`src/types/api.ts`).
- Mock hiện dùng **offset số nguyên dạng string** (`"9"`, `"18"`).
- **Quyết định backend:** giữ `Page<T>` nguyên vẹn; cursor đổi thành **opaque** (base64 của
  `keyset` — ví dụ `created_at|id` của item cuối) để sort ổn định khi có insert mới giữa
  chừng. FE không đổi gì (chỉ chuyền lại `next`).
- Page size: places 9, posts 5, notifications 20 (mock). Backend có thể tăng (20/10/20) —
  FE không phụ thuộc số này (infinite scroll).

## A5. Giới hạn validate — `src/lib/constants.ts` (share luôn cho BE)

`MAX_CAPTION_LENGTH=500`, `MIN_CAPTION_LENGTH=3`, `PLACE_SUGGESTION_MIN_CHARS=8`,
`MAX_REVIEW_CONTENT_LENGTH=1000`, `MAX_REPORT_DETAIL_LENGTH=300`,
`MAX_COLLECTION_NAME_LENGTH=80`, `MAX_COLLECTION_DESCRIPTION_LENGTH=400`,
`MAX_ROOM_NAME_LENGTH=60`, `ROOM_CODE_LENGTH=6`, `MAX_ROOM_KEYWORD_LENGTH=30`,
`MAX_MEMBER_NAME_LENGTH=30`, `MAX_PROFILE_NAME_LENGTH=40`, `MAX_PROFILE_BIO_LENGTH=160`,
`MAX_PROFILE_LOCATION_LENGTH=60`.

## A6. Các "hợp đồng ngầm" frontend phụ thuộc (backend PHẢI giữ)

1. `Post.place` nhúng `PlaceSummary` (có `isPublished`) — FE không tra cứu id (L-001).
2. `Comment.replyTo` nhúng `{commentId, handle}` của cha — server suy ra, kể cả cha đã xoá
   mềm → `replyTo: null` khi cha xoá (mock: `parentHandle = parent && !parent.deleted ? ... : null`).
3. `Review.isMine`, `Comment.isMine`, `Collection.isMine`, `UserProfile.isMe`,
   `followedByMe`, `likedByMe`, `savedByMe` — **tất cả gán theo user đang gọi request**.
4. `Notification` là **union theo `kind`** — shape khác nhau từng loại, `postPlaceId` do
   server tính.
5. `CollectionSummary.containsPlace` **chỉ xuất hiện khi query có `?placeId=`**.
6. `GET /places/:id` trả 404 nếu place chưa publish (`publishedAt === null`).
7. Bình luận trả về **phẳng, cha kèm reply ngay sau cha** (client không tự ghép cây).
8. `GET /users` trả `Page<UserProfile>` (không phải mảng thuần).
9. Đếm (`likeCount`, `commentCount`, `reviewCount`, `followerCount`) là **số server đếm**,
   FE chỉ hiển thị.
10. `DELETE /session` trả `{ loggedOut: true }`.

## A7. Logic nghiệp vụ cần port nguyên văn từ mock

### A7.1. Xếp hạng đề xuất (`src/mocks/ranking.ts` — port 1:1)

- `normalizeText`: NFD → bỏ dấu combining → `đ→d` → lowercase → thay ký tự lạ bằng space →
  gộp space. **Backend: thay bằng `unaccent()` của Postgres** (so sánh kết quả trên dataset
  thật để chắc khớp hành vi).
- Stop words (26 từ: "va","cua","cho","voi","thi","la","co","mot","nay","do","khi","de","o",
  "tai","trong","ra","vao","luc","rat","kha","nhung","minh","ban","an"...), token ≥2 ký tự.
- `CATEGORY_KEYWORDS` 6 nhóm (cafe: "ca phe","cafe","coffee","quan nuoc"; restaurant: "quan
  an","nha hang","an com","com tam","bun bo","pho","lau"; street-food: "an vat","banh mi",
  "banh canh","banh khot","xoi","oc","banh xeo"; bakery: "tien banh","banh ngot","banh my",
  "bakery"; dessert: "che","kem","flan","trang mieng"; bar: "bar","bia","cocktail","rooftop","pub").
- Trọng số: tên khớp nguyên cụm (tên ≥4 ký tự) **+60**; từng token tên khớp **+12/token**;
  tag khớp (tag ≥3 ký tự) **+10/tag**; từ khoá loại hình trong caption **+8/từ**; token địa
  chỉ khớp **+6/token**; thành phố khớp **+5**; `rating*0.6 + min(reviewCount,5000)/5000`
  (chỉ phá hoà). Lọc score > 0, sort giảm dần, lấy top `limit` (mặc định 3).
- `reason`: tối đa 2 lý do ghép bằng " · "; rỗng → "cùng khu vực và loại hình".
- Điều kiện chạy: caption ≥ 8 ký tự (sau trim); candidates = place **đã publish** (cho
  `/places/suggestions`) hoặc **chưa publish** (cho job phát hiện).

### A7.2. Job phát hiện địa điểm (mock `syncPlaceSuggestions`)

- Quét post `placeId === null`, chưa từng được thông báo (Set `notifiedPostIds`).
- Chấm điểm trên place **chưa publish**; nếu có kết quả → tạo notification `place-suggestion`
  (3 gợi ý + reason), đánh dấu post đã xử lý.
- **Backend:** job pg-boss chạy cron (5 phút); idempotence bằng unique index
  `(post_id)` trên bảng `place_suggestion_notifications` thay cho Set.
- Trigger bổ sung: tạo post mới → chạy job cho post đó ngay (độ trễ thấp).

### A7.3. Gắn địa điểm vào bài (`PATCH /posts/:id/place`) — side effects bắt buộc

1. `post.placeId = placeId`.
2. Nếu place chưa publish → **publish ngay** (set `publishedAt`).
3. Mọi notification `place-suggestion` của post này → `read = true`.

### A7.4. Đánh giá (`POST /places/:id/reviews`) — upsert + aggregate

- 1 user 1 review/place: tồn tại → **ghi đè** (cập nhật rating, content, createdAt).
- Aggregate tăng dần: tạo mới → trung bình có trọng số, `reviewCount + 1`; ghi đè → trừ cũ
  cộng mới, `reviewCount` giữ nguyên. Làm tròn 1 chữ số thập phân.
- **Backend:** lưu rating nguyên (1–5) từng review; `rating`/`reviewCount` của place tính
  bằng query aggregate (không lưu cột trừ khi hiệu năng cần — ở scale này COUNT+AVG đủ).
  **Lưu ý:** làm tròn 1 chữ số là chi tiết hiển thị — backend trả số đầy đủ, FE `formatRating`
  đã tự làm tròn. (Kiểm tra `formatRating` khi port.)

### A7.5. Báo cáo (`POST /places/:id/reports`)

- Validate reason ∈ `PLACE_REPORT_REASONS`; `reason="other"` bắt buộc `detail` khác rỗng;
  `detail ≤ 300`.
- 1 user 1 reason 1 place — lặp → 400 "Bạn đã gửi báo cáo...". Unique `(place_id, reason, reporter_id)`.
- **Không có GET** — dữ liệu kiểm duyệt, client không đọc lại.
- Side-effect mock không làm (backend thật nên có): khi đủ N báo cáo "closed" chưa có trạng
  thái → đặt `status = "unknown"`/hàng chờ duyệt. Ghi BACKLOG, không chặn.

### A7.6. Bình luận

- Lồng **tối đa 1 cấp** (`parentId !== null` → parent phải là bình luận gốc, `parentId: null`).
- Xoá **mềm**: cha xoá → reply cũng ẩn; `commentCount` của post trừ (1 + số reply).
- Like idempotent: `liked !== likedByMe` mới tăng/giảm count.
- Sort: `new` (createdAt desc) / `top` (likeCount desc) — chỉ sort cấp 1, reply luôn theo
  thời gian tăng dần ngay sau cha.

### A7.7. Bộ sưu tập

- `PATCH /collections/:id/places` body `{placeId, member}`: `member=true` → thêm **cuối
  danh sách** nếu chưa có (idempotent); `member=false` → bỏ nếu có (idempotent, không lỗi).
- Like: **cấm tự like bộ sưu tập của mình** (400); private của người khác → 404 (giấu tồn tại).
- Xoá/sửa: chỉ owner (403 "Không phải bộ sưu tập của bạn").
- `listMyCollections`: mới tạo trước; `listUserCollections(handle)`: ẩn private trừ khi xem chính mình.
- `GET /places/saved`: hợp các collection của mình, loại trùng, chỉ place `isPubliclyVisible`.

### A7.8. Hồ sơ / follow

- Follow: cấm tự follow (400); idempotent; `followerCount` tăng/giảm.
- `GET /users/:handle/posts?tab=`: tab `pinned`/`saved` chỉ hoạt động khi xem chính mình
  (mock: lọc `savedByMe && user.id === ME.id` — tab của người khác trả rỗng). Backend giữ
  semantics: tab "saved" của người khác → rỗng (không lộ dữ liệu riêng tư).
- `PATCH /me`: name/bio/location/privateProfile, validate độ dài theo A5.

### A7.9. Địa điểm — bộ lọc server (dùng chung `/places` và `/places/map`)

- Chỉ trả place **published** và `status !== "closed"` (`isPubliclyVisible`).
- `category`/`district`: nhiều giá trị phân tách `,` (khi có room); 1 giá trị khi lọc cá nhân.
- `q`: substring trên haystack = name + address + tags (normalized).
- `includeKeyword`: **mọi** từ khoá phải xuất hiện (AND); `excludeKeyword`: bất kỳ xuất hiện
  → loại. `priceMax`: `≤`.
- `bbox=minLng,minLat,maxLng,maxLat`: 4 số hữu hạn mới có hiệu lực; sai định dạng → bỏ qua
  lọc khung (không lỗi).
- `/places/map`: không phân trang, `{items, total}`, chặn 300 (`total` = số khớp thật).

## A8. Rooms — KHÔNG nằm trong mock API (thiết kế mới hoàn toàn)

Rooms hiện thuần client: `useLocalStorage` + BroadcastChannel (`src/features/rooms/hooks/use-rooms.ts`,
key `danang-rooms-v1`), mã phòng sinh client-side (`generateRoomCode`, alphabet bỏ O/0/I/1),
member nhập tay không cần tài khoản (`ME_MEMBER = {id:"u-me"}`).

→ Backend cần **thiết kế hợp đồng mới** cho room (mục D6), FE sẽ chuyển từ localStorage sang
API. Đây là phần duy nhất không có contract sẵn — phải thiết kế cẩn thận để FE đổi ít nhất.

## A9. Fixtures/seed

- `places.json` (dataset cold-start ~492 place, có `imageCredit`, `imageKind`, `osmId`,
  `publishedAt`) — **seed cho Postgres**; các fixture posts/comments/reviews/notifications/
  collections hiện **rỗng** (cold-start sạch dữ liệu giả theo D-049).
- Users: chỉ `ME` + `CURRENT_USER` (một user).
- **Seed script backend:** import `data/cold-start/places.json` → bảng `places` + `place_images`
  + `place_tags`. Posts/comments... để rỗng (đúng tinh thần không dữ liệu ảo).

## A10. Env FE

`VITE_API_BASE_URL` (mặc định `/api` — proxy dev), `VITE_ENABLE_MOCKS=false` khi backend sẵn
sàng. Backend cần CORS cho origin FE khi không đi proxy; hoặc giữ proxy dev trỏ `VITE_PROXY_TARGET`.

---

# PHẦN B — TECH STACK (ưu tiên bản stable mới nhất; version sẽ xác minh khi cài)

| Lớp | Chọn | Version (npm latest, tra 2026-11-10) | Ghi chú |
|---|---|---|---|
| Runtime | Bun | 1.3.x stable | Hono native; Prisma 7 hỗ trợ Bun qua driver adapter — fallback Node 22 LTS |
| Framework | Hono | **4.13.17** | `@hono/node-server` **2.1.6** nếu chạy Node |
| Contract | zod + `@hono/zod-openapi` | zod **4.6.7** + zod-openapi **1.6.3** | zod-openapi 1.6.x đã hỗ trợ zod 4 (mainstream) — xác minh thêm khi cài |
| OpenAPI UI | `@hono/swagger-ui` | — | serve `/doc` + `/ui` |
| ORM | Prisma | **7.10.1** (stable) | Rust engine đã bỏ — generator `prisma-client` + engineType "client", bundle nhỏ ~90%, hỗ trợ Bun; **không dùng 8.0.0-rc** (chưa stable) |
| DB | PostgreSQL | 17.x | extensions: `unaccent`, `pg_trgm`; UUID: `gen_random_uuid()` built-in |
| Auth | better-auth | **1.7.19** | Postgres adapter; session cookie |
| Job | pg-boss | **12.38.1** | queue trong Postgres, cron |
| Storage | Cloudflare R2 + AWS SDK v3 | S3 client **3.1165.0** | presigned PUT |
| Test | Vitest + Testcontainers-node | postgres **12.2.1** | Postgres thật trong Docker |
| Deploy | Docker Compose → Fly.io/Railway | — | 1 API + Postgres managed |

Nguồn: `npm view <pkg> version` (chạy thật 2026-11-10) + web search xác nhận Prisma 7
đã GA bỏ Rust engine, `@hono/zod-openapi` 1.6.x hỗ trợ zod 4.

**Quyết định đã chốt (từ phiên trước):** Hono thay Fastify (zod-native OpenAPI, SSE built-in,
better-auth mount không adapter, Bun native). Prisma/Postgres/pg-boss/better-auth/R2 giữ nguyên.

---

# PHẦN C — KẾ HOẠC TRIỂN KHAI ATOMIC (theo phase, mỗi task 1 PR được)

## Phase 0 — Scaffold + hợp đồng (không đụng nghiệp vụ)

- **T0.1** Monorepo Bun workspaces: `apps/web` (di chuyển FE nguyên vẹn), `apps/api`,
  `packages/schema`. CI chạy test cả 3 workspace. *Đầu ra: `bun install` + test pass.*
- **T0.2** Di chuyển 8 `*.schema.ts` + `Page` schema + constants validate sang
  `packages/schema`; FE đổi import (không đổi nội dung). *Đầu ra: FE typecheck/test/e2e pass như cũ.*
- **T0.3** Ghi `docs/STACK-BE.md` với version đã tra (mục B). Còn phải xác minh khi cài:
  Prisma 7 + Bun runtime, zod-openapi 1.6.3 + zod 4.6.7 trên schema thật của dự án.
- **T0.4** Skeleton Hono: app factory, error handler chuẩn `{message}` (map 400/401/403/404/500),
  request logging, health `/healthz`. *Đầu ra: `curl /healthz` 200.*
- **T0.5** Prisma schema v1 (18 bảng mục 4.1 của artifact stack) + migration đầu + seed
  script import `places.json`. *Đầu ra: `prisma migrate dev` + seed chạy sạch.*
- **T0.6** Testcontainers harness: Postgres thật cho integration test.

## Phase 1 — Auth + user (nền cho mọi mutation)

- **T1.1** better-auth: email+password, session cookie, adapter Postgres.
- **T1.2** `GET /me` (401 khi chưa đăng nhập), `PATCH /me` (validate A5), `DELETE /session`,
  `POST /session` (đăng nhập). Shape khớp `userProfileSchema`.
- **T1.3** Đăng ký (endpoint mới — FE chưa có UI, thêm sau; API có trước).
- **T1.4** Middleware `requireAuth` cho mutation; GET công khai không cần auth (khớp mock:
  chỉ `/me`, `/session` kiểm tra auth).
- **T1.5** Contract test: mọi response đối chiếu schema A2.

## Phase 2 — Places (read-only trước)

- **T2.1** `GET /places` — full bộ lọc A7.9 + cursor keyset + `Page<Place>`.
- **T2.2** `GET /places/map` — bbox + `{items,total}` + chặn 300. Composite index lat/lng.
- **T2.3** `GET /places/:id` — 404 nếu chưa publish.
- **T2.4** `GET /places/suggestions?q=&limit=` — port `ranking.ts` (A7.1) + `unaccent`.
  Test so khớp output mock trên cùng caption.
- **T2.5** Search `pg_trgm` index + test "banh xeo" khớp "Bánh Xèo".
- **T2.6** `GET /users?q=` (search user theo name/handle, normalized).

## Phase 3 — Social write

- **T3.1** `POST /posts` (validate caption A5) + `GET /posts?filter=all|unplaced|mine|saved&q=`
  (filter `saved` = post user đã save; `unplaced` = `place_id IS NULL`).
- **T3.2** `GET /posts/:id`; `PATCH /posts/:id/like|save` (idempotent, bảng `post_likes`/`post_saves`).
- **T3.3** `PATCH /posts/:id/place` — side effects A7.3 trong 1 transaction.
- **T3.4** Comments: GET (flatten cha+reply, sort A7.6), POST (validate 1 cấp), PATCH like,
  DELETE (soft + cascade reply + đếm lại).
- **T3.5** Notification sinh khi like/comment/follow (kind `like|comment|follow` — shape A6.4).

## Phase 4 — Places write

- **T4.1** `POST /places/:id/reviews` — upsert + aggregate A7.4.
- **T4.2** `GET /places/:id/reviews` — mới nhất trước.
- **T4.3** `POST /places/:id/reports` — A7.5 + unique constraint.
- **T4.4** Job pg-boss phát hiện địa điểm (A7.2) + cron + idempotence unique index.
- **T4.5** Notifications: `GET /notifications` (cursor, page 20), `PATCH /notifications/:id`
  (read), `PATCH /notifications` (đọc tất cả, trả mảng).

## Phase 5 — Collections + profile công khai

- **T5.1** CRUD `/collections` + like + `PATCH :id/places` (A7.7, `position` tăng dần).
- **T5.2** `GET /places/saved` (hợp collection, loại trùng).
- **T5.3** `GET /users/:handle`, `/users/:handle/posts?tab=`, `/users/:handle/collections`
  (quy tắc private A7.7/A7.8).
- **T5.4** Follow/unfollow + bảng `follows` + đếm.

## Phase 6 — Rooms (thiết kế mới) + realtime

- **T6.1** Thiết kế contract room (bảng mới — xem artifact stack mục 4.1):
  `POST /rooms` (tạo, owner = mình, sinh code 6 ký tự alphabet không O/0/I/1 — port
  `generateRoomCode`), `GET /rooms/:code` (shape `Room` hiện có: members, proposals, filter),
  `POST /rooms/:code/join` (body `displayName` — thành viên nhập tay không cần tài khoản,
  giữ semantics `RoomMember.isMe`), `POST /rooms/:code/proposals` (include/exclude +
  field + value), `PATCH /proposals/:id` (apply/dismiss → cập nhật `RoomFilter`).
- **T6.2** Logic áp đề xuất vào filter (port từ `src/features/rooms/lib/room.ts` — cần đọc
  kỹ khi port: merge include/exclude, priceMax min).
- **T6.3** SSE `GET /rooms/:code/events` — push room state khi có thay đổi; FE chuyển từ
  BroadcastChannel sang SSE (giữ BroadcastChannel làm fallback cùng-tab).
- **T6.4** `GET /places` nhận bộ lọc room qua chính các param hiện có (FE đã quy đổi
  `serverFilters` — không cần endpoint riêng).

## Phase 7 — Ảnh + hoàn thiện

- **T7.1** R2 presigned PUT + `POST /media` trả URL; bảng `place_images`/`post_images`.
- **T7.2** Mở lại tính năng ảnh check-in (FE: thêm `imageUrl` vào `Post` — đã ghi BACKLOG).
- **T7.3** Rate-limit (Postgres-based hoặc `hono-rate-limiter`), helmet-style headers.
- **T7.4** Xoá `src/mocks/`, bỏ adapter, `VITE_ENABLE_MOCKS=false` mặc định, chạy song song
  1 tuần trước khi xoá hẳn.

## Phase 8 — Deploy

- **T8.1** Dockerfile API (multi-stage), docker-compose (API + Postgres dev).
- **T8.2** Fly.io/Railway + Postgres managed + backup; secrets qua env (không hardcode).
- **T8.3** Đổi tile OSM sang provider có SLA (BACKLOG D-054) trước khi public.

---

# PHẦN D — QUYẾT ĐỊNH CẦN DUYỆT TRƯỚC KHI CODE

| # | Quyết định | Đề xuất | Lý do |
|---|---|---|---|
| D1 | zod version trong `packages/schema` | zod 4 nếu `@hono/zod-openapi` hỗ trợ; ngược lại zod 3 | tương thích OpenAPI generator |
| D2 | Cursor format | opaque base64 keyset | sort ổn định; FE không đổi |
| D3 | Counter lưu cột hay COUNT | COUNT + index (trừ `place.rating` aggregate có thể cache sau) | tránh drift |
| D4 | Auth: email+password trước | có | mock đã có luồng session; OAuth sau |
| D5 | Room member không cần tài khoản | giữ (displayName nhập tay, `memberId` là guest id) | khớp UX hiện có |
| D6 | Response lỗi chuẩn `{message}` | có | khớp `toApiError` |
| D7 | Monorepo Bun workspaces | có | share schema trực tiếp |

# PHẦN E — CHƯA XÁC MINH

- ~~Version chính xác mọi package~~ → **ĐÃ XÁC MINH** bằng `npm view` (xem Phần L).
- ~~Tương thích zod 4 ↔ `@hono/zod-openapi`~~ → **ĐÃ XÁC MINH**: `@hono/zod-openapi@1.6.3`
  khai báo `peerDependencies: { zod: "^4.0.0", hono: ">=4.10.0" }` → zod 4 chính thức được hỗ trợ.
- Prisma + Bun runtime (nếu không ổn → Node 22, không ảnh hưởng code).
- Hành vi `unaccent` so với `normalizeText` NFD trên dataset thật (T2.4 phải có test đối chiếu).
- ~~`formatRating` FE đã tự làm tròn chưa~~ → **ĐÃ XÁC MINH** (đọc code FE): dùng
  `Intl.NumberFormat("vi", {min/maxFractionDigits: 1})` → FE tự làm tròn, backend trả số thô.
- **Mới:** hiệu năng thật của `unaccent + pg_trgm` trên 491 dòng là không đại diện — phải
  benchmark lại khi có ≥ 50k place (ghi BACKLOG).
- **Mới:** `hono/prometheus` (K5) chưa xác minh là built-in hay middleware riêng — kiểm tra
  khi làm Phase 8; nếu không có thì bỏ metrics, giữ log structured.

---

# PHẦN F — TRƯỜNG BACKEND CẦN NHƯNG FRONTEND KHÔNG HIỂN THỊ

Phần này liệt kê dữ liệu **phải có trong DB** dù không xuất hiện trong response API. Thiếu
những trường này backend không vận hành được (không kiểm duyệt, không debug, không xử lý sự cố).

## F1. Từ dataset cold-start (`data/cold-start/places.json`, 491 place — đã kiểm)

Dataset có **23 trường**, nhưng `Place` DTO chỉ dùng 13. Các trường còn lại **phải lưu DB**:

| Trường dataset | Ví dụ thực | Vì sao backend cần | Có trả API? |
|---|---|---|---|
| `description` | "Bánh xèo nổi tiếng với nước chấm gan đậu phộng đậm đà." | Nội dung trang chi tiết (hiện FE tự sinh câu chung chung); nguồn cho ranking/suggestion; SEO sau này | Chưa (thêm khi có UI) |
| `phone` | null (toàn dataset) | Liên hệ quán, xác minh khi kiểm duyệt | Chưa |
| `openingHours` | null | Tính năng "đang mở cửa" (BACKLOG DX-A) | Chưa |
| `sources` | `["tourism.danang.vn","canvashotel.com.vn"]` | **Truy vết nguồn dữ liệu** — bắt buộc để chứng minh không bịa dữ liệu (rule người dùng) | Không |
| `geoSource` | `"osm"` | Biết toạ độ đến từ đâu khi toạ độ sai (đã có sự cố lệch vị trí) | Không |
| `geoPrecision` | `"poi"` | Độ chính xác: `poi` (điểm) vs `street` (đường) — quyết định có hiện pin hay không | Không |
| `venuePageUrl` | Google Maps URL | Kiểm duyệt viên đối chiếu; nút "Mở Google Maps" | Không (FE tự dựng URL) |
| `verified` | `false` | Cờ kiểm duyệt thủ công — công cụ review thủ công (đề xuất trước đó) | Không |
| `collectedAt` | `"2026-11-09"` | Tuổi dữ liệu — biết khi nào cần thu thập lại | Không |
| `tier` | `"osm"` (405) / `"curated-v2"` (52) / `"curated"` (34) | Chất lượng nguồn — ưu tiên hiển thị curated trước | Không |
| `osmId` | `"node/123"` (420/491) | Truy vết OSM, chạy lại enrich, tránh trùng khi crawl lại | Không |
| `imageKind` | null / `"venue"` | Phân biệt ảnh quán thật vs ảnh minh hoạ hệ thống (D-049/D-050) | Không |
| `imageNote` | "Chưa có ảnh thật của quán…" | Ghi chú nội bộ khi thiếu ảnh | Không |
| `images` | `[]` (mảng) | Nhiều ảnh/quán — DTO chỉ có 1 `imageUrl` | Chưa |
| `status` | `"unknown"` (toàn bộ 491) | Đóng/mở — DTO có nhưng hiện toàn `unknown` | Có (`status`) |

**Quyết định:** bảng `places` có đủ 23 cột; DTO chỉ serialize 13 trường (đúng hợp đồng A6).
Thêm cột mới **không phá FE** vì `placeSchema` zod là `z.object` không `strict()` — trường
thừa bị bỏ qua. Nhưng **không trả trường nội bộ** để tránh rò rỉ (xem H5).

## F2. Trường nội bộ chỉ server biết (mock đã có, phải giữ)

| Trường | Bảng | Vì sao cần |
|---|---|---|
| `published_at` (nullable) | `places` | Trạng thái duyệt lên /discover. `null` = chưa duyệt. **Không có trong DTO** (chỉ `isPublished` trong `PlaceSummary`) |
| `reporter_id` | `place_reports` | Chống spam trùng (unique `place_id, reason, reporter_id`). **Không trả** — báo cáo là dữ liệu kiểm duyệt |
| `report.status` | `place_reports` | `pending`/`reviewed`/`dismissed` — hàng chờ kiểm duyệt |
| `deleted_at` (soft) | `comments` | Xoá mềm để reply không mất cha |
| `deleted_at` | `posts`, `collections`, `reviews` | Xoá mềm: giữ dữ liệu cho audit + khôi phục |
| `password_hash`, `email_verified_at` | `users` | Auth — tuyệt đối không trả |
| `session.token_hash`, `ip`, `user_agent`, `expires_at` | `sessions` | Bảo mật phiên, thu hồi phiên, phát hiện bất thường |
| `post_likes.user_id`, `created_at` | `post_likes` | Đếm + xác định `likedByMe`; audit |
| `notified_post_ids` → `place_suggestion_notifications.post_id` (unique) | — | Idempotence job (thay Set trong mock) |
| `collection_places.position` | `collection_places` | Giữ thứ tự thêm (FE yêu cầu "thêm mới đẩy xuống cuối") |
| `room_proposals.status` | `room_proposals` | `open`/`applied`/`dismissed` — FE hiển thị nhưng server quyết định |
| `room_members.is_guest`, `guest_token` | `room_members` | Thành viên nhập tay không có tài khoản (D5) |

## F3. Trường audit / vận hành (thêm mới, mock không có)

| Trường | Bảng | Mục đích |
|---|---|---|
| `created_at`, `updated_at` | mọi bảng | Chuẩn; `updated_at` trigger DB |
| `deleted_at` | bảng có soft delete | Xoá mềm |
| `created_by`, `updated_by` (user_id) | `places`, `collections` | Truy vết ai sửa |
| `moderation_status`, `moderated_by`, `moderated_at`, `moderation_note` | `places` | Công cụ review thủ công (đề xuất trước) |
| `request_id` | `audit_logs` | Nối log với request |
| `idempotency_key`, `response_body`, `expires_at` | `idempotency_keys` | Chống double-submit (xem K3) |
| `search_vector` (tsvector, optional) | `places`, `posts` | Search nâng cao sau này |

---

# PHẦN G — LOGGING & KIỂM SOÁT LỖI

## G1. Phân loại lỗi (3 tầng)

| Tầng | Ví dụ | Xử lý | Trả client |
|---|---|---|---|
| **Lỗi nghiệp vụ dự kiến** | caption quá ngắn, tự like collection của mình, báo cáo trùng | `HTTPException(400, {message})` | `{message}` + status đúng |
| **Lỗi xác thực/quyền** | chưa đăng nhập, không phải chủ | 401/403 | `{message}` — **không lộ chi tiết** |
| **Lỗi hệ thống** | DB down, bug, timeout | Bắt ở `app.onError`, log full stack + request_id | `{message:"Máy chủ trả lỗi — thử lại sau.", code:"INTERNAL"}` + 500. **Không trả stack/SQL** |

## G2. Error handler chuẩn (Hono)

```
app.onError((err, c) => {
  if (err instanceof HTTPException) → trả status + {message}
  if (err instanceof ZodError) → 400 {message: lỗi đầu tiên, errors: [...]}  (chỉ dev)
  else → log.error({err, requestId, path, method, userId}); 500 {message, code:"INTERNAL"}
})
app.notFound(c => 404 {message:"Không tìm thấy"})
```

**Đã xác minh từ docs chính thức** ([hono.dev/docs/api/exception](https://hono.dev/docs/api/exception)):

- `new HTTPException(status, { message?, res?, cause? })` — `message` chỉ dùng khi trả text;
  muốn trả **JSON** phải truyền `res: new Response(JSON.stringify({message}), {headers:{'Content-Type':'application/json'}})`.
  → Vì API trả JSON, ta **không** dùng `message` trực tiếp mà bọc helper `ApiError`:

```ts
// src/lib/errors.ts
export class ApiError extends HTTPException {
  constructor(status: ContentfulStatusCode, message: string, code?: string) {
    super(status, {
      res: new Response(JSON.stringify({ message, ...(code && { code }) }), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    })
  }
}
// dùng: throw new ApiError(404, 'Không tìm thấy bài viết', 'NOT_FOUND')
```

- `err.getResponse()` **không biết `Context`** → header đã set trong `c` (ví dụ `X-Request-Id`,
  CORS) **không** tự có trong response lỗi; trong `onError` phải chủ động set lại `X-Request-Id`.
- `onError` chỉ bắt lỗi **không được xử lý**; lỗi validate của `@hono/zod-openapi` trả 400 qua
  `defaultHook` — cấu hình `defaultHook` để đổi shape lỗi về `{message}` cho khớp FE.
```

**Quan trọng:** `toApiError` của FE đọc `body.message` **hoặc** `body.detail`, và `body.code`
optional → backend giữ đúng shape này (quyết định D6).

## G3. Logging

- **Thư viện:** `pino` (chuẩn de-facto, Hono có `hono/logger` nhưng chỉ log dòng ngắn —
  dùng pino cho structured log). Output JSON, một dòng/request.
- **Trường bắt buộc mỗi log request:** `requestId` (UUID sinh ở middleware), `method`, `path`
  (bỏ query nhạy cảm), `status`, `durationMs`, `userId` (nếu đã auth), `ip` (sau proxy tin cậy).
- **Mức log:** `debug` (dev: SQL query), `info` (request 2xx/3xx), `warn` (4xx, chậm > 1s),
  `error` (5xx + exception).
- **Không log:** mật khẩu, token, cookie, toàn bộ body của `POST /session`, email đầy đủ
  (mask `a***@x.com`), nội dung báo cáo kiểm duyệt (nhạy cảm).
- **Correlation:** trả header `X-Request-Id` cho client để user báo lỗi kèm mã.
- **Nơi lưu:** dev → stdout; prod → stdout JSON (Fly/Railway gom) hoặc Loki/Better Stack.
  Không tự dựng hệ log phức tạp ở giai đoạn này.

## G4. Health & readiness

- `GET /healthz` — process sống (200 luôn, không chạm DB).
- `GET /readyz` — `SELECT 1` tới DB + kiểm tra queue pg-boss → 200/503. Dùng cho deploy
  rolling + load balancer.

## G5. Graceful shutdown

`SIGTERM` → ngừng nhận request mới → chờ request đang chạy (timeout 10s) → đóng pg-boss →
`prisma.$disconnect()` → exit 0. Bắt buộc để không mất job/transaction khi deploy.

---

# PHẦN H — BẢO MẬT & PHÂN QUYỀN

## H1. Xác thực (authn)

- **better-auth** (1.7.19): session cookie **httpOnly, Secure, SameSite=Lax** (Lax để OAuth
  redirect hoạt động; nếu chỉ email+password có thể `Strict`), `Path=/`, expiry 7 ngày trượt.
- Lưu **hash** token phiên trong DB (không lưu token thô) — đã có `sessions.token_hash`.
- Mật khẩu: better-auth tự dùng scrypt/argon2 — **không tự viết**.
- Chống brute-force: rate-limit endpoint auth (xem H4) + better-auth có plugin rate-limit.
- `POST /session` (đăng nhập) trả `{...userProfile}` khớp mock; `DELETE /session` →
  `{loggedOut:true}` + xoá cookie.

## H2. Phân quyền (authz) — ma trận quyền từ mock (đã kiểm code)

| Tài nguyên | Hành động | Ai được phép | Hành vi khi sai |
|---|---|---|---|
| `posts` | POST | đã đăng nhập | 401 |
| `posts/:id` | PATCH like/save | đã đăng nhập | 401 |
| `posts/:id` | PATCH place | **chủ bài** (mock chưa kiểm — backend PHẢI kiểm) | 403 |
| `comments/:id` | DELETE | **tác giả** (mock có kiểm: `comment.author.id !== CURRENT_USER.id` → 403) | 403 |
| `collections/:id` | PATCH/DELETE/places | **owner** (mock: 403 "Không phải bộ sưu tập của bạn") | 403 |
| `collections/:id` | like | **không phải owner** (mock: 400 "Không thể thả tim bộ sưu tập của mình"); private của người khác → **404** (giấu tồn tại) | 400/404 |
| `places/:id` | POST review/report | đã đăng nhập | 401 |
| `users/:handle` | POST/DELETE follow | đã đăng nhập, **không tự follow** (400) | 400 |
| `me` | GET/PATCH | đã đăng nhập | 401 |
| `rooms/:code` | join/propose | **bất kỳ ai có mã** (guest được) | 404 nếu mã sai |
| `room_proposals/:id` | apply/dismiss | **chủ phòng** (thiết kế mới — cần chốt) | 403 |

**Nguyên tắc bắt buộc:**
1. **Kiểm quyền ở server, không tin client.** Mock hiện chưa kiểm `PATCH /posts/:id/place`
   (ai cũng gắn được địa điểm vào bài người khác) — backend phải sửa.
2. **IDOR:** mọi route có `:id` phải kiểm quyền sở hữu sau khi tìm bản ghi, không chỉ kiểm
   "đã đăng nhập".
3. **Không lộ tồn tại:** tài nguyên riêng tư của người khác → **404** (không phải 403).
4. **Mass assignment:** body validate bằng zod `pick` đúng trường cho phép — không
   `Object.assign(entity, body)`. Ví dụ `PATCH /me` chỉ nhận `name|bio|location|privateProfile`;
   `PATCH /collections/:id` chỉ `name|description|isPrivate`.
5. **Privilege escalation:** user không được đổi `isMe`, `isMine`, `likedByMe`, `likeCount`,
   `rating`, `reviewCount`, `publishedAt`, `status` qua body — đây là **trường server tính**.
   zod schema request **không chứa** các trường này.

## H3. Validate input

- **zod cho mọi body/query/param** — dùng `@hono/zod-validator` hoặc `@hono/zod-openapi` route
  (đã có schema sẵn từ A1/A2).
- Giới hạn độ dài theo A5; giới hạn `limit` (suggestion ≤ 10), `cursor` phải decode được.
- Sanitize: dữ liệu text lưu nguyên (FE render bằng React — tự escape). **Không** tự viết
  HTML sanitizer; nếu sau này render markdown mới cần.
- Từ chối trường lạ ở body nhạy cảm (zod `.strict()` cho input) để chặn mass assignment.

## H4. Rate limiting (không cần Redis)

- **Đã xác minh (npm view):** `hono-rate-limiter@0.5.4` có peer dependency `unstorage@^1.17.3`
  → kéo thêm 1 hệ storage abstraction nữa, **không đáng**. Quyết định: **tự viết store Postgres**
  (~40 dòng: bảng `rate_limits(key, window_start, count)` + `INSERT ... ON CONFLICT DO UPDATE
  SET count = count + 1 RETURNING count`), không thêm dependency.
  (`rate_limits(key, window_start, count)` + UPSERT nguyên tử) — chọn cách đơn giản nhất khi
  triển khai; **không thêm Redis** cho nhu cầu này.
- Giới hạn đề xuất: auth 10/phút/IP; mutation chung 60/phút/user; `GET /places/suggestions`
  30/phút/user (gọi mỗi lần gõ phím); upload 10/giờ/user.
- Trả `429` + header `Retry-After`.

## H5. Các biện pháp khác

- **Security headers:** `hono/secure-headers` — **đã xác minh options thật**
  ([hono.dev/docs/middleware/builtin/secure-headers](https://hono.dev/docs/middleware/builtin/secure-headers)):
  mặc định bật `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=15552000; includeSubDomains`,
  `Cross-Origin-Resource-Policy: same-origin`, `Cross-Origin-Opener-Policy: same-origin`,
  `X-Permitted-Cross-Domain-Policies: none`, `X-DNS-Prefetch-Control: off`, `Origin-Agent-Cluster: ?1`.
  **CSP mặc định KHÔNG set** (`contentSecurityPolicy` default: No Setting) → đúng ý đồ: API
  không phục vụ HTML nên không cần CSP. Lưu ý `crossOriginResourcePolicy: 'same-origin'` —
  nếu sau này API serve ảnh cho origin FE khác thì phải đổi thành `'cross-origin'`.
  Referrer-Policy, HSTS ở prod). API không cần CSP phức tạp (FE tự phục vụ).
- **CORS:** chỉ cho origin FE (env `CORS_ORIGINS`), `credentials: true` (cookie), không `*`
  khi có credentials.
- **Body size limit:** `bodyLimit` 1MB (JSON), ảnh đi qua presigned R2 nên API không nhận file.
  **Đã xác minh API:** `bodyLimit({ maxSize, onError })` — dùng `Content-Length` nếu có, nếu không
  thì đọc stream; `onError` phải trả 413 JSON `{message}` (không trả text như docs mẫu).
  Cảnh báo từ docs: với **Bun**, `maxSize` > 128MiB cần cấu hình `Bun.serve({ maxRequestBodySize })`,
  nếu không request bị 413 trước khi vào Hono — ta để 1MB nên không ảnh hưởng.
- **SQL injection:** Prisma parameterize mọi query; `$queryRaw` **chỉ** dùng `Prisma.sql`
  tagged template với tham số — cấm nối chuỗi.
- **Secrets:** env vars, không commit; `.env.example` chỉ tên biến. Không hardcode.
- **Log rò rỉ:** xem G3.
- **Dependency:** `bun audit` trong CI; pin version, không `^` cho package bảo mật (auth, prisma).
- **HTTPS bắt buộc** ở prod (Fly/Railway tự cấp); cookie `Secure` chỉ gửi qua HTTPS.
- **CSRF:** SameSite=Lax + kiểm `Origin` header cho mutation (API JSON-only nên rủi ro thấp,
  nhưng vẫn bật kiểm Origin).

## H6. Quyền riêng tư dữ liệu

- `users.private_profile` → bài đăng chỉ người theo dõi xem được (mock chưa enforce — backend
  phải làm: lọc `posts` theo quan hệ follow khi `private_profile = true`).
- Xoá tài khoản: soft delete + ẩn dữ liệu (chưa làm giai đoạn này, ghi BACKLOG).
- Export dữ liệu cá nhân: BACKLOG.

---

# PHẦN I — CACHE

## I1. Nguyên tắc: chỉ cache khi đo được nhu cầu

FE đã dùng TanStack Query (`staleTime` 5 phút cho map, gcTime 10 phút) → **client đã giảm tải
lớn**. Server chỉ cần cache cho dữ liệu **đọc nhiều, ghi ít, tính đắt**.

## I2. Tầng cache theo thứ tự ưu tiên

| Tầng | Áp dụng | Cách làm |
|---|---|---|
| **HTTP cache (bắt buộc)** | `GET /places/:id`, `GET /users/:handle`, `GET /places/map` | `ETag` (hash nội dung) + `Cache-Control: private, max-age=60` cho dữ liệu công khai; `no-store` cho `/me`, `/notifications`. Hỗ trợ `If-None-Match` → 304 |
| **In-process LRU** | `GET /places/suggestions` (tính ranking đắt), category/district list | `lru-cache` (thư viện nhỏ, đã phổ biến) TTL 60s, key = normalized caption + limit. **Single instance** — nếu scale nhiều instance thì phải chuyển tầng sau |
| **Postgres materialized view** | Bảng xếp hạng / thống kê (nếu sau này cần) | `REFRESH MATERIALIZED VIEW CONCURRENTLY` theo cron. **Chưa làm** — chưa có nhu cầu |
| **Postgres UNLOGGED table / cache table** | Rate limit, idempotency keys | Đã dùng cho H4/K3 |
| **Redis** | — | **Không dùng giai đoạn này** (thêm service vận hành). Xem lại khi cần cache chia sẻ giữa nhiều instance hoặc rate-limit phân tán |

## I3. Cache invalidation (bắt buộc có chiến lược, không chỉ TTL)

| Dữ liệu cache | Khi nào xoá |
|---|---|
| `place.rating`/`reviewCount` (nếu cache) | Sau `POST /places/:id/reviews` |
| Suggestion LRU | TTL 60s (chấp nhận trễ) + xoá khi place publish |
| ETag của place | Tự đổi vì ETag = hash nội dung hiện tại (không cần xoá thủ công) |
| `GET /places` list | Không cache server (query phụ thuộc nhiều filter) — dựa vào index + client cache |

**Nguyên tắc:** nếu không mô tả được "khi nào xoá" thì **không cache** — cache sai gây lỗi khó
tìm hơn là chậm.

## I4. Chống cache stampede

Khi cache miss đồng loạt (nhiều request cùng key) → dùng "single flight" (Map<key, Promise>)
trong process để chỉ 1 request tính toán. Chỉ cần cho suggestion LRU.

---

# PHẦN J — TỐI ƯU DATABASE & QUERY

## J1. Index (thiết kế theo đúng query thật của FE)

| Bảng | Index | Phục vụ query |
|---|---|---|
| `places` | `(published_at, status)` partial `WHERE published_at IS NOT NULL AND status <> 'closed'` | mọi list công khai |
| `places` | `(lat, lng)` hoặc `(lng, lat)` | bbox `/places/map` |
| `places` | `GIN (tags)` | lọc tag |
| `places` | `GIN (name gin_trgm_ops)`, `GIN (address gin_trgm_ops)` | search mờ |
| `places` | `(category)`, `(district)` | filter |
| `posts` | `(created_at DESC, id DESC)` | feed cursor |
| `posts` | `(author_id, created_at DESC)` | tab "Bài đăng của tôi" |
| `posts` | `(place_id) WHERE place_id IS NOT NULL` | trang quán → bài đăng |
| `posts` | `GIN (caption gin_trgm_ops)` | search caption |
| `post_likes` | `UNIQUE (post_id, user_id)` | chống like trùng + `likedByMe` |
| `comments` | `(post_id, parent_id, created_at)` | list comment |
| `reviews` | `UNIQUE (place_id, author_id)` | 1 review/người/quán |
| `place_reports` | `UNIQUE (place_id, reason, reporter_id)` | chống báo cáo trùng |
| `collection_places` | `UNIQUE (collection_id, place_id)`, `(collection_id, position)` | thứ tự + chống trùng |
| `notifications` | `(user_id, created_at DESC)` | list |
| `notifications` | `(user_id) WHERE read_at IS NULL` | đếm chưa đọc |
| `follows` | `UNIQUE (follower_id, following_id)` | chống follow trùng |
| `sessions` | `(token_hash)` unique, `(user_id)` | auth |
| `idempotency_keys` | `UNIQUE (key, user_id)`, `(expires_at)` | chống double-submit |

## J2. Chống N+1 (rủi ro lớn nhất với Prisma)

- `GET /posts` trả `Post.place` nhúng → dùng `include: { place: true }` **một query** (Prisma
  dịch thành JOIN hoặc `IN`), **không** map từng post rồi query place.
- `Post.likedByMe`/`savedByMe` → 1 query `post_likes WHERE post_id IN (...) AND user_id = me`,
  không query từng post.
- `Comment.replyTo` → load cả comment của post **một lần**, dựng map trong bộ nhớ (mock cũng
  làm vậy).
- **Kiểm soát:** bật Prisma `log: ['query']` ở dev; review mọi endpoint list xem số query
  là hằng số (không phụ thuộc số item).

## J3. Cursor pagination (keyset, không offset)

```
WHERE (created_at, id) < ($cursor_created_at, $cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT $size
```
- `next` = base64 của `created_at|id` item cuối.
- **Vì sao không offset:** offset chậm dần (OFFSET 10000 phải quét 10000 dòng) và **nhảy
  item** khi có insert mới. Mock dùng offset — backend đổi sang keyset, FE không biết.
- Bắt buộc `ORDER BY` có **tie-breaker duy nhất** (`id`) để phân trang không lặp/mất.

## J4. Connection pooling

- Prisma 7 dùng driver adapter (`@prisma/adapter-pg`) + `pg.Pool` → đặt `max` = 10–20 (tuỳ
  instance), `idleTimeoutMillis` 30s.
- Nếu deploy nhiều instance + Postgres giới hạn connection → thêm **PgBouncer** (transaction
  mode). **Chưa cần** khi 1 instance.
- **Cấm** mở connection mới mỗi request.

## J5. Transaction & race condition

- **Counter (likeCount, commentCount, followerCount):** không đọc–sửa–ghi. Dùng
  `UPDATE ... SET like_count = like_count + 1` nguyên tử, hoặc **không lưu cột** mà COUNT
  (quyết định D3: COUNT). Nếu lưu cột thì bọc trong transaction + `INSERT ... ON CONFLICT DO NOTHING`
  để like trùng không tăng đếm.
- **`PATCH /posts/:id/place`:** 3 side-effect (gắn place, publish place, mark notification read)
  trong **một** `prisma.$transaction`.
- **Review upsert + aggregate:** transaction để rating không lệch khi 2 request đồng thời.
- **Room proposal apply:** transaction + kiểm `status = 'open'` trong WHERE (optimistic lock),
  tránh 2 người apply cùng lúc gây áp 2 lần.

## J6. Query hygiene

- Luôn `select` đúng cột cần (không `SELECT *` qua Prisma mặc định trả hết) — bảo vệ cả hiệu
  năng và rò rỉ (`password_hash`).
- `EXPLAIN (ANALYZE, BUFFERS)` cho mọi query list trước khi release; ghi vào
  `docs/BACKEND-PERF.md`.
- `LIMIT` cứng cho mọi list (kể cả `/places/map` chặn 300).
- Tránh `%...%` không index — dùng `pg_trgm` GIN.
- Đo bằng `pg_stat_statements` (bật extension) ở staging.

## J7. Vận hành DB

- Autovacuum mặc định đủ; theo dõi `pg_stat_user_tables.n_dead_tup`.
- Backup: PITR của Postgres managed (Fly/Railway/Neon); test restore 1 lần trước khi public.
- Migration: `prisma migrate deploy` trong CI/CD; **không sửa migration đã chạy** (rule người dùng).
- Seed idempotent (`upsert` theo `id`) để chạy lại không nhân đôi 491 place.

---

# PHẦN K — CÁC PHẦN BỔ SUNG KHÁC (tự đề xuất)

## K1. Versioning API

- Prefix `/api/v1` **ngay từ đầu** — rẻ lúc đầu, đắt nếu thêm sau. FE đổi `VITE_API_BASE_URL=/api/v1`.
- Breaking change → `/api/v2`, giữ v1 song song ≥ 3 tháng.

## K2. Idempotency cho mutation quan trọng

- `POST /posts`, `POST /places/:id/reviews`, `POST /collections` nhận header
  `Idempotency-Key` (FE sinh UUID) → lưu `idempotency_keys(key, user_id, response, expires_at)`,
  trả lại response cũ nếu trùng. Chống double-submit do mạng chập chờn.
- Đơn giản hơn: các mutation đã idempotent tự nhiên (like/save/follow dùng `ON CONFLICT`).

## K3. Testing strategy (3 tầng)

| Tầng | Công cụ | Phạm vi |
|---|---|---|
| Unit | Vitest | ranking (so khớp output mock trên cùng input), normalize/unaccent, cursor encode/decode, validate |
| Integration | Vitest + Testcontainers (Postgres thật) | mỗi route: happy path + 400/401/403/404 + side-effect (transaction) |
| Contract | Vitest + zod schema từ `packages/schema` | **mọi response** đối chiếu schema (dùng lại 32 contract của FE) |
| E2E (sau) | Playwright trên FE + backend thật | `VITE_ENABLE_MOCKS=false` chạy lại 13 spec hiện có |

**Chốt:** bộ e2e FE hiện có (13 spec) trở thành **bộ kiểm thử tích hợp miễn phí** cho backend —
chỉ cần trỏ vào backend thật. Đây là lợi ích lớn nhất của kiến trúc tách biệt.

## K4. Migration dữ liệu từ mock

- Seed: `places` từ `places.json` (491, `upsert` theo id), `place_images` từ `venue-images.json`
  (40 quán có ảnh), `place_tags` từ `tags` (rỗng hiện tại).
- Posts/comments/reviews/notifications/collections: **để rỗng** (cold-start không dữ liệu ảo — D-049).
- Users: tạo 1 user thật qua đăng ký, không seed user giả.

## K5. Observability

- Metrics tối thiểu: request count/duration theo route (Prometheus format qua
  `hono/prometheus` nếu cần), DB pool saturation, job queue depth (pg-boss có bảng).
- **Chưa dựng** Grafana/Datadog — chỉ log structured + health; thêm khi có traffic thật.
- Alert: 5xx rate > 1%, `/readyz` fail, queue job fail > 3 lần.

## K6. Background job hygiene

- Job phải **idempotent** (chạy lại không sai) — unique index thay vì Set.
- Retry với backoff (pg-boss hỗ trợ), DLQ sau N lần; log `jobId`, `postId`.
- Job không giữ transaction dài; batch nhỏ (50 post/lần) để không khoá bảng.

## K7. API documentation

- OpenAPI 3.1 sinh từ `@hono/zod-openapi` tại `/doc`, Swagger UI `/ui` (chỉ bật ở dev/staging
  hoặc sau auth ở prod).
- `docs/API.md` (markdown tóm tắt) — bạn đã chọn "cả hai" (markdown + OpenAPI).
- Mỗi endpoint: mô tả quyền, lỗi có thể trả, ví dụ request/response.

## K8. Dev experience

- `docker compose up` → Postgres + API + seed tự động.
- Script: `bun run db:migrate`, `db:seed`, `db:studio`, `test:integration`.
- `.env.example` đầy đủ tên biến (không giá trị thật).
- Pre-commit: prettier + eslint + typecheck (đã có ở FE, áp cho `apps/api`).

## K9. Những thứ CỐ Ý KHÔNG làm giai đoạn này

| Không làm | Lý do |
|---|---|
| Microservices | 1 API đủ; tách khi có nhu cầu thật |
| GraphQL | REST đã chốt, FE đã viết theo REST |
| Redis / Kafka | Chưa có nhu cầu; pg-boss + Postgres đủ |
| Kubernetes | Docker Compose + Fly/Railway đủ |
| Elasticsearch | `pg_trgm` đủ cho search hiện tại |
| Full CI/CD đa môi trường | 1 staging + 1 prod trước |
| Multi-tenant | Chưa có nhu cầu |

---

# PHẦN L — API ĐÃ XÁC MINH TỪ DOCS CHÍNH THỨC (dùng khi code, không phải suy đoán)

Toàn bộ dưới đây lấy từ docs chính thức qua context7 + `npm view` (output thật), không phải
ký ức. Mục đích: lúc code Phase 0–2 **không phải tra lại**.

## L1. Bảng version đã xác minh

| Package | Version | Ghi chú xác minh |
|---|---|---|
| `hono` | 4.13.17 | `npm view` |
| `@hono/node-server` | 2.1.6 | chỉ dùng nếu chạy Node thay Bun |
| `@hono/zod-openapi` | 1.6.3 | peer `zod ^4.0.0`, `hono >=4.10.0` |
| `zod` | 4.6.7 | |
| `prisma` / `@prisma/client` | 7.10.1 | không dùng 8.0.0-rc |
| `@prisma/adapter-pg` | 7.10.1 | **cùng version với prisma** — bắt buộc |
| `better-auth` | 1.7.19 | |
| `pg-boss` | 12.38.1 | |
| `@aws-sdk/client-s3` | 3.1165.0 | |
| `@testcontainers/postgresql` | 12.2.1 | |
| `hono-rate-limiter` | 0.5.4 | **bị loại** — peer `unstorage ^1.17.3` |

## L2. Prisma 7 — bắt buộc dùng driver adapter

Docs Prisma 7 ([prisma.io/docs/guides/upgrade-prisma-orm/postgresql](https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql)):

```ts
// apps/api/src/db.ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'   // theo `output` trong generator

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const prisma = new PrismaClient({ adapter })
```

Hệ quả cho kế hoạch:
- `generator client` **phải** khai báo `output` (Prisma 7 không còn sinh vào `node_modules`).
- Connection string cho **runtime** = pooled URL; `prisma.config.ts` (CLI/migrate) = direct URL.
- Vì dùng `pg` driver adapter → pooling do `pg.Pool` quản lý (J4 đúng hướng, không cần
  `?pgbouncer=true` kiểu Prisma cũ).

## L3. better-auth + Hono — mount và session middleware

Docs ([better-auth.com/docs/integrations/hono](https://www.better-auth.com/docs/integrations/hono)):

```ts
// auth.ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
})

// app.ts
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))   // basePath mặc định /api/auth

// middleware đọc session
export const sessionMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  c.set('session', session)
  await next()
})
```

Lưu ý: đường dẫn auth mặc định là `/api/auth/*` → nếu API versioning `/api/v1` thì đặt
`basePath: '/api/v1/auth'` để không lẫn; quyết định này ghi vào T3.1.

## L4. pg-boss v12 — queue, retry, DLQ

Docs ([timgit/pg-boss/docs/api/queues.md](https://github.com/timgit/pg-boss/blob/master/docs/api/queues.md)):

```ts
await boss.createQueue('place-detect-dlq')
await boss.createQueue('place-detect', {
  retryLimit: 5, retryDelay: 60, retryBackoff: true, deadLetter: 'place-detect-dlq',
})
await boss.work('place-detect', { localConcurrency: 5 }, async ([job]) => { /* ... */ })
```

Khớp K6: `retryBackoff` + `deadLetter` là **option của queue**, không phải của từng job →
khai báo queue một lần lúc khởi động (idempotent), không tạo queue trong request handler.

## L5. @hono/zod-openapi — pattern route

```ts
const app = new OpenAPIHono({ defaultHook })   // defaultHook đổi lỗi validate về {message}

app.openapi(createRoute({
  method: 'get', path: '/places/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: { 200: { description: 'OK', content: { 'application/json': { schema: PlaceSchema } } } },
}), (c) => c.json(place, 200))

app.doc31('/doc', { openapi: '3.1.0', info: { title: 'API', version: 'v1' } })
```

- Dùng `app.doc31` (OpenAPI **3.1**) chứ không phải `app.doc` (3.0) — zod 4 sinh JSON Schema
  2020-12 khớp 3.1.
- Path dùng `{id}` (không phải `:id`) trong `createRoute`.
- `c.req.valid('param' | 'query' | 'json')` để lấy dữ liệu đã validate.

## L6. Sai lệch phát hiện khi đối chiếu docs (đã sửa trong kế hoạch)

| Chỗ | Trước | Sau khi đối chiếu docs |
|---|---|---|
| G2 | `HTTPException(400, {message})` trả JSON | `message` chỉ trả **text** → phải truyền `res` JSON (đã thêm `ApiError`) |
| G2 | tưởng header `c` tự có trong response lỗi | `getResponse()` không biết Context → phải set lại `X-Request-Id` |
| H4 | dùng `hono-rate-limiter` | loại, vì kéo `unstorage` → tự viết store Postgres |
| H5 | "secure-headers bật HSTS ở prod" | HSTS **mặc định đã bật** (`max-age=15552000`), CSP mặc định **tắt** |
| K7 | `app.doc` | `app.doc31` cho OpenAPI 3.1 |

---

# PHẦN M — ĐỐI CHIẾU VỚI NGHIÊN CỨU PITFALLS (OWASP/RFC/Prisma/PG) — CẬP NHẬT CUỐI

Nguồn: báo cáo research "Backend design best practices cho REST API TypeScript
(Hono + Prisma + PostgreSQL)" (subagent, 2026-11-10) + docs chính thức đã xác minh ở Phần L.
Chỉ ghi **điểm thay đổi quyết định**, không nhại lại toàn bộ báo cáo.

## M1. Chấp nhận áp dụng

| Điểm | Áp vào đâu | Ghi chú |
|---|---|---|
| `relationLoadStrategy: "join"` (LATERAL JOIN + json_agg, 1 roundtrip thay nhiều `IN (...)`) | J2 chống N+1 | Prisma 7: kiểm tra có cần `previewFeatures` không khi scaffold; nếu GA thì bật luôn |
| Partial unique index cho soft delete (`WHERE deleted_at IS NULL`) | J1 index + soft-delete | Giải mâu thuẫn "xóa mềm + unique" (ví dụ report unique theo user/post) |
| Clamp `limit`: `z.coerce.number().int().min(1).max(100).default(20)` | H3 validate | Chặn `?limit=1000000` (OWASP API4: Unrestricted Resource Consumption) |
| Ánh xạ `PrismaClientKnownRequestError` P2002 → 409, P2025 → 404; không lộ chi tiết DB | G2 | Bổ sung vào `onError`: nhận diện mã lỗi Prisma, map sang HTTP, log nội bộ |
| Env fail-fast bằng zod parse lúc boot | K8 / T0.1 | Không cần thêm `@t3-oss/env-core` — zod có sẵn là đủ (tránh thêm dep) |
| `Idempotency-Key` theo IETF draft: khóa key khi đang xử lý (409), key + payload khác → 422 | K2 | Bổ sung bảng `idempotency_keys`: thêm `request_hash`, `locked_at` |
| ETag + `If-Match` optimistic concurrency (chỉ resource có xung đột ghi thật) | I2 + J5 | Chỉ `PATCH /me`, `PATCH /collections/:id`; không làm blanket |
| Autovacuum tune cho bảng ghi dồn (`posts`, `notifications`) | J7 | Chỉ khi có dữ liệu thật; ghi BACKLOG, không làm từ đầu |
| Cookie prefix `__Host-` cho session (prod) | H1 | Kiểm tra better-auth option tên cookie khi làm T3.1 |
| CORS `allowHeaders` phải chứa `Idempotency-Key` khi bật K2 | H5 | Chi tiết dễ quên |

## M2. Cân nhắc và QUYẾT ĐỊNH KHÔNG áp dụng

| Điểm | Vì sao không |
|---|---|
| RFC 9457 Problem Details (`application/problem+json`) làm error shape | FE đã chốt `{message}` (D6) và `toApiError` đọc `body.message`/`body.detail`. Đổi = sửa FE. Ghi BACKLOG: cân nhắc khi có client thứ 2 |
| HATEOAS | Không cần cho SPA + TanStack Query; payload tăng 20–40% vô ích |
| PgBouncer ngay từ đầu | Prisma 7 + driver adapter `pg` tự pool; 1 instance chưa cần. Khi scale multi-instance mới thêm (transaction mode + `DIRECT_URL` cho migrate) |
| `@hono/rate-limiter` in-memory | Đã loại ở H4 (kéo `unstorage`); store Postgres tự viết đủ cho single-instance |
| Row-Level Security (RLS) | Overengineering cho app 1-tenant; authz làm ở tầng query Prisma (H2) |
| `xXssProtection` config | Header lỗi thời; mặc định `0` của `secureHeaders` đã đúng |

## M3. Checklist bổ sung (một dòng mỗi mục)

- [ ] T0.1: env schema zod + fail-fast lúc boot.
- [ ] T2.x: mọi list endpoint clamp `limit` ≤ 100.
- [ ] T3.1: tên cookie session `__Host-...` ở prod.
- [ ] T4.x: `relationLoadStrategy: "join"` + test đếm số query.
- [ ] T5.x: soft-delete → partial unique index.
- [ ] onError: map P2002→409, P2025→404; còn lại 500 chung chung.
- [ ] K2: `idempotency_keys` có `request_hash` + `locked_at`; CORS thêm `Idempotency-Key`.
- [ ] I2: ETag/If-Match chỉ cho `PATCH /me`, `PATCH /collections/:id`.
