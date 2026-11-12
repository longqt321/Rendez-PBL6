# API Rendez — tài liệu hợp đồng

> Trạng thái: Phase 0–8 đã cài đặt và có integration test trên Postgres thật.
> Mọi route mount dưới `/api/v1` (quyết định K1). Lỗi luôn có shape `{ "message": string }`
> (D6). Ngày cập nhật: 2026-11-11.

## 1. Quy ước chung

| Hạng mục | Quy ước |
|---|---|
| Base URL (dev) | `http://localhost:8000/api/v1` |
| Xác thực | Cookie phiên của better-auth (`Set-Cookie` sau `/register`, `/session`) |
| Định dạng | JSON UTF-8; request có body phải gửi `Content-Type: application/json` |
| Lỗi | `{ "message": "..." }` + status 400/401/403/404/409/413/429/500 |
| Request id | Mọi response có header `X-Request-Id` (UUID), log server dùng cùng id |
| Phân trang | `{ "items": [...], "next": string \| null }`; `next` là cursor opaque base64 (D2) |
| Giới hạn body | 1 MB (JSON). Ảnh đi thẳng lên R2 qua presigned URL, không qua API |
| Rate limit | Vượt ngưỡng → `429` + `Retry-After` (giây) |
| Idempotency | POST tạo tài nguyên nhận header tùy chọn `Idempotency-Key` (mục 1.3) |
| Enum loại hình | API và DB đều dùng gạch nối: `street-food` (Prisma `@map`); bộ lọc nhận cả `street_food` |

### 1.1. Cursor (D2)

Cursor là base64url của `created_at|id` — client KHÔNG được parse, chỉ truyền lại
nguyên văn. Cursor hỏng → `400 {"message":"Cursor không hợp lệ"}`.

### 1.2. Idempotency (`Idempotency-Key`)

Áp dụng cho `POST /posts`, `POST /places/:id/reviews`, `POST /collections` — header
tùy chọn, theo semantics của bản nháp IETF `Idempotency-Key`:

- Khoá là `(key, user_id)` — user khác dùng lại cùng key không xung đột.
- Request đang xử lý mà nhận thêm request cùng key → `409`; hoàn tất rồi → trả lại đúng
  status + body cũ kèm header `Idempotency-Replayed: true`.
- Cùng key nhưng payload khác (`request_hash` khác) → `422`.
- Lỗi 4xx được lưu (replay trả lại đúng lỗi); lỗi 5xx không lưu để client retry. Key sống
  24 giờ.

### 1.3. Phân quyền

| Nhóm | Quyền |
|---|---|
| `GET /places*`, `GET /posts*`, `GET /users*`, `GET /collections/:id` | công khai (đọc phiên nếu có để tính `isMine`/`likedByMe`) |
| `POST/PATCH/DELETE` nghiệp vụ | bắt buộc đăng nhập → `401` nếu không |
| `GET /me`, `/notifications`, `/collections`, `/places/saved` | bắt buộc đăng nhập |
| `/rooms/*` | ai có mã phòng; guest không cần tài khoản (D5) |

## 2. Hạ tầng

| Method | Path | Mô tả | Response |
|---|---|---|---|
| GET | `/healthz` (root và `/api/v1/healthz`) | Liveness, không chạm DB | `200 {"status":"ok"}` |
| GET | `/readyz` (root) | Readiness: `SELECT 1` tới Postgres | `200 {"status":"ok"}` / `503 {"status":"unavailable"}` |

## 3. Xác thực và hồ sơ

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/register` | — | `{name, email, password, handle}` | `201 {"requiresVerification":true}` — KHÔNG có phiên, đã gửi mail xác thực |
| POST | `/session` | — | `{email, password}` | `200 UserProfile` + `Set-Cookie`; `403` khi email chưa xác thực |
| DELETE | `/session` | ✔ | — | `200 {"loggedOut":true}` |
| GET | `/me` | ✔ | — | `200 UserProfile` |
| PATCH | `/me` | ✔ | `{name?, bio?, location?, privateProfile?, avatarUrl?, coverUrl?}` — `avatarUrl`/`coverUrl` `null` = xoá ảnh, bỏ trống = giữ nguyên | `200 UserProfile` |
| DELETE | `/me` | ✔ | — | `200 {"deleted":true}` — xoá mềm + thu hồi mọi phiên |
| POST | `/auth/request-password-reset` | — | `{email, redirectTo?}` | `200 {"status":true}` (luôn thành công) |
| POST | `/auth/reset-password` | — | `{token, newPassword}` | `200 {"status":true}` / `400` token sai |
| POST | `/auth/send-verification-email` | — | `{email, callbackURL?}` | `200 {"status":true}` (luôn thành công) — gửi lại mail xác thực |
| GET | `/auth/verify-email` | — | `?token=&callbackURL=` | `302` redirect về `callbackURL` (thành công giữ nguyên `callbackURL` — FE dùng `/verify-email?verified=1` làm marker, lỗi nối thêm `?error=CODE`); `autoSignInAfterVerification` → kèm Set-Cookie phiên |
| GET/POST | `/auth/*` | — | do better-auth quản lý | passthrough |

Ràng buộc đầu vào:

- `name`: 2–40 ký tự (sau trim); `handle`: 3–30, chỉ `[a-z0-9_]`; `password`: 8–128;
  `email`: chuẩn hoá lowercase.
- Trùng email → `201 {"requiresVerification":true}` (better-auth "generic duplicate" — không lộ
  email đã tồn tại, cùng response với đăng ký mới). Hook `onExistingUserSignUp` gửi mail thật
  cho chủ tài khoản: **chưa xác thực** → gửi lại link xác thực; **đã xác thực** → mail "tài
  khoản Rendez của bạn đã tồn tại" kèm link đăng nhập / quên mật khẩu (không kèm token). Trùng
  handle → `409 {"message":"Handle đã được sử dụng"}` (kiểm trước khi gọi better-auth vì
  better-auth nuốt P2002 của handle thành 422 chung).
- **Bắt buộc xác thực email (D-056):** đăng ký không tạo phiên; mail xác thực chứa link trỏ
  tới API rồi redirect về `APP_ORIGIN/verify-email?verified=1` (marker để FE không hiện "xác
  thực thành công" khi mở trang trực tiếp). Đăng nhập khi chưa xác thực →
  `403 {"message":"Email chưa được xác thực. Hãy mở link trong email xác thực (kiểm tra cả mục spam) rồi đăng nhập lại."}`.
  Gửi lại mail: `POST /auth/send-verification-email` (luôn 200 để không lộ email tồn tại).
- Sai mật khẩu → `401 {"message":"Email hoặc mật khẩu không đúng"}`. Tài khoản đã xoá mềm
  cũng trả 401 dù mật khẩu đúng.
- Rate limit: 20 request/phút/IP cho mỗi route `/session` và `/register`.
- Quên mật khẩu / xác thực email: đủ `SMTP_*` + `MAIL_FROM` thì gửi mail thật; thiếu thì dev
  **log link** (`DEV ONLY — link đặt lại mật khẩu` / `DEV ONLY — link xác thực email`),
  production chỉ ghi nhận (không log token). Xem `docs/backend/SMTP-SETUP.md`.

`UserProfile` (khớp `userProfileSchema` của `@rendez/schema`):

```json
{
  "id": "uuid", "name": "Nguyễn Yến", "handle": "yen_nguyen", "initials": "NY",
  "bio": "", "location": "Đà Nẵng", "joinedAt": "2026-11-11T00:00:00.000Z",
  "postCount": 3, "followerCount": 12, "followingCount": 4,
  "followedByMe": false, "isMe": false, "privateProfile": false
}
```

## 4. Địa điểm

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/places` | — | `Page<Place>`, 9 item/trang, bộ lọc A7.9; `q` khớp không dấu + bỏ dấu câu |
| GET | `/places/map` | — | `{items, total}`, chặn 300 item, `total` = số khớp thật |
| GET | `/places/daily-picks` | — | `{date, items: [{place, reason}]}` — 3 quán job `daily-picks` chọn cho hôm nay (Asia/Ho_Chi_Minh); chưa có picks → `items: []` (200) |
| GET | `/places/suggestions?q=&limit=` | — | `{suggestions: PlaceSuggestion[]}`; caption < 8 ký tự → rỗng; `limit` 1–10 (mặc định 3) |
| GET | `/places/saved` | ✔ | `Page<Place>` gộp mọi bộ sưu tập của chính mình, loại trùng |
| GET | `/places/:id` | — | `Place`; 404 nếu chưa publish/đã xoá |
| GET | `/places/:id/posts` | — | `Page<Post>` chỉ bài gắn địa điểm, cursor keyset; 404 nếu place chưa publish |
| GET | `/places/:id/reviews` | — | `{items: Review[], next: null}` mới nhất trước |
| POST | `/places/:id/reviews` | ✔ | upsert 1 user 1 review (A7.4) → `201 Review` |
| POST | `/places/:id/reports` | ✔ | `201 PlaceReport`; unique (place, reason, reporter) |

### 4.1. Tham số lọc của `/places` và `/places/map`

| Tham số | Kiểu | Hành vi |
|---|---|---|
| `q` | string | Khớp không dấu trên name + address + city + district + tags |
| `category` | CSV | Danh sách loại hình cần có; `all` = bỏ lọc |
| `district` | CSV | Danh sách quận |
| `priceMax` | 1–3 | Ngoài khoảng/không phải số → **bỏ lọc** (không lỗi) |
| `excludeCategory` | CSV | Loại trừ loại hình |
| `excludeDistrict` | CSV | Loại trừ quận |
| `includeKeyword` | CSV | Phải có ĐỦ mọi từ khoá (AND) |
| `excludeKeyword` | CSV | Có bất kỳ từ khoá nào là loại (OR) |
| `bbox` | `minLng,minLat,maxLng,maxLat` | Chỉ áp dụng khi đủ 4 số hữu hạn |
| `cursor` | string | Cursor trang kế |

`Place` (khớp `placeSchema`):

```json
{
  "id": "mirkocoffeechillbeer-493", "name": "Mirko Coffee", "address": "12 Nguyễn Chí Thanh",
  "city": "Đà Nẵng", "district": "Hải Châu", "category": "cafe",
  "tags": ["cà phê", "yên tĩnh"], "rating": 4.5, "reviewCount": 21, "priceLevel": 2,
  "imageUrl": "https://…", "imageHeight": 320, "lat": 16.06, "lng": 108.22, "status": "open"
}
```

Trường `district`, `imageUrl`, `lat`, `lng`, `status` **vắng mặt** khi không có dữ liệu
(không gửi `null`) — client dùng optional chaining.

### 4.2. Đánh giá (A7.4) và báo cáo (A7.5)

- `rating`: số nguyên 1–5; `content`: 1–1000 ký tự sau trim. Gửi lại = ghi đè, không tạo
  bản ghi mới. `rating`/`reviewCount` của place **không lưu cột** — tính bằng aggregate
  khi đọc nên không bao giờ lệch.
- Báo cáo: `reason` ∈ `closed | wrong-info | duplicate | other`; `detail` ≤ 300 ký tự và
  **bắt buộc** khi `reason = "other"`. Trùng (place, reason, người báo) → `400`.

## 5. Bài đăng, bình luận

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/posts?filter=&q=&cursor=` | — | `filter` ∈ `all\|unplaced\|mine\|saved\|following`; `mine`/`saved`/`following` cần đăng nhập (401); 5 item/trang; `q` khớp caption không dấu |
| POST | `/posts` | ✔ | `{caption, placeId?, images?}` → `201 Post`; tối đa 4 URL ảnh thuộc `posts/<userId>/`; bài chưa gắn địa điểm được đẩy job phát hiện |
| GET | `/posts/:id` | — | `Post`; 404 nếu đã xoá |
| PATCH | `/posts/:id/like` | ✔ | `{liked?: boolean}` (mặc định đảo trạng thái), idempotent |
| PATCH | `/posts/:id/save` | ✔ | `{saved?: boolean}`, idempotent |
| PATCH | `/posts/:id/place` | ✔ | `{placeId}` — chỉ tác giả bài (403); thiếu `placeId` → 404; side effects A7.3 trong 1 transaction |
| GET | `/posts/:id/comments?sort=new\|top` | — | `{items, next:null}` phẳng: cha rồi reply của nó |
| POST | `/posts/:id/comments` | ✔ | `{body, parentId?}` → `201 Comment`; reply 1 cấp |
| PATCH | `/comments/:id/like` | ✔ | `{liked?: boolean}` idempotent |
| DELETE | `/comments/:id` | ✔ | Chỉ tác giả (403); xoá mềm + cascade reply → `204` |

`caption`: 3–500 ký tự. Gắn địa điểm (A7.3): gán `placeId`, publish place nếu chưa, đánh
dấu đã đọc mọi thông báo `place-suggestion` của bài.

`images` (tuỳ chọn, G5b): tối đa **4** URL tuyệt đối `http(s)`, không trùng nhau. Khi R2 đã
cấu hình, mỗi URL phải nằm dưới `${R2_PUBLIC_BASE_URL}/posts/<userId>/` — chỉ gắn được ảnh do
chính mình tải lên (sai prefix/user khác → `400 "Ảnh không hợp lệ hoặc không thuộc tài khoản
của bạn"`). R2 chưa cấu hình mà client gửi `images` → `400 "Tính năng ảnh chưa được cấu hình"`;
request không có `images` vẫn chạy bình thường. Bài + ảnh được ghi trong một transaction.

`Post`:

```json
{
  "id": "uuid", "author": {"id":"uuid","name":"…","handle":"…","initials":"…"},
  "caption": "…", "place": {"id":"…","name":"…","address":"…","category":"cafe","isPublished":true},
  "createdAt": "…", "likeCount": 4, "commentCount": 2, "likedByMe": false, "savedByMe": false,
  "images": ["https://cdn.example.com/posts/<userId>/<uuid>.jpg"]
}
```

`images` LUÔN là mảng (rỗng khi bài không có ảnh) — client không phải xử lý `null`.

## 5b. OG preview cho bot mạng xã hội

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/og/place/:id` | — | HTML meta Open Graph cho bot preview (nginx sniff UA rồi proxy `/discover/:id` sang đây); 200 kèm `Cache-Control: public, max-age=600`; id sai format/chưa publish/đã xoá → `404` + meta mặc định (`max-age=60`) |
| GET | `/og/post/:id` | — | Như trên cho bài đăng (`/post/:id`); id phải là uuid, sai → `404` HTML |

Không dùng cho client — trả HTML chỉ gồm thẻ meta, không phải JSON. Người dùng thường
không bao giờ nhận HTML này (nginx chỉ chuyển bot: `facebookexternalhit`, `Zalo`,
`meta-externalagent`, …).

## 6. Thông báo

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/notifications?cursor=` | ✔ | `Page<AppNotification>`, 20/trang, mới nhất trước |
| PATCH | `/notifications` | ✔ | Đánh dấu TẤT CẢ đã đọc → `200 AppNotification[]` |
| PATCH | `/notifications/:id` | ✔ | Đánh dấu 1 thông báo → `200 AppNotification`; 404 nếu không phải của mình |
| GET | `/notifications/events` | ✔ | SSE: `event: notification-created` + `{"version":n}` (payload trung tính — client refetch), `event: ping` mỗi 15s |

Ba nhánh `kind`: `place-suggestion` (kèm `postId`, `postCaption`, `postPlaceId`,
`suggestions[]`), `like|comment|follow` (kèm `actorName`, `actorInitials`, `postId?`,
`excerpt?`), `system` (`title`, `body`). Like/comment/follow của chính mình **không** sinh
thông báo.

## 7. Bộ sưu tập

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/collections?placeId=` | ✔ | `Page<CollectionSummary>` của chính mình; có `placeId` thì nhúng `containsPlace` |
| POST | `/collections` | ✔ | `{name, description?, isPrivate?}` → `201 Collection` |
| GET | `/collections/:id` | — | `Collection`; private của người khác → `404` |
| PATCH | `/collections/:id` | ✔ | Chỉ owner (403); cập nhật một phần |
| DELETE | `/collections/:id` | ✔ | Chỉ owner (403) → `200 true` |
| PATCH | `/collections/:id/places` | ✔ | `{placeId, member?: boolean}` — thêm đẩy cuối, idempotent |
| POST | `/collections/:id/like` | ✔ | Idempotent; tự like → `400` |
| DELETE | `/collections/:id/like` | ✔ | Idempotent |

`name`: 1–80 ký tự; `description` ≤ 400. `Collection.placeIds` giữ đúng thứ tự thêm
(`collection_places.position`).

## 8. Trang cá nhân và theo dõi

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/users?q=&cursor=` | — | `Page<UserProfile>` 20/trang, `q` khớp không dấu + bỏ dấu câu |
| GET | `/users/suggestions` | ✔ | `{ items: { user: UserProfile, reason: string }[] }` tối đa 5; loại chính mình + người đã theo dõi; rỗng = `200 { items: [] }` (không 404); `no-store`. Khai TRƯỚC `/users/:handle` |
| GET | `/users/:handle` | — | `UserProfile`; 404 nếu không có |
| GET | `/users/:handle/posts?tab=posts\|saved\|pinned&cursor=` | — | Tab `saved`/`pinned` của người khác → trang RỖNG (không 403) |
| GET | `/users/:handle/collections` | — | `Page<CollectionSummary>`; ẩn private trừ chính chủ |
| POST | `/users/:handle/follow` | ✔ | Idempotent; tự follow → `400`; trả `UserProfile` mới |
| DELETE | `/users/:handle/follow` | ✔ | Idempotent; trả `UserProfile` mới |

## 9. Phòng lọc nhóm (hợp đồng mới Phase 6, bảo mật D-056/D-057)

Trước Phase 6 phòng chỉ sống trong trình duyệt (localStorage + BroadcastChannel). Backend
giữ nguyên shape `Room` của frontend.

**Danh tính (D-056):** khách tham gia bằng tên và nhận token bí mật qua cookie HttpOnly
`rendez_room_<code>` (`Path=/api/v1/rooms/<code>`, `SameSite=Lax`, TTL 24h). DB chỉ lưu
HMAC-SHA256(token, BETTER_AUTH_SECRET) — token gốc KHÔNG bao giờ nằm trong DB hay DTO.
`memberId` xuất hiện công khai trong DTO nên không phải credential; mọi mutation xác thực
actor từ phiên đăng nhập hoặc cookie token (`resolveRoomActor`), không đọc `memberId`/
`actorId` từ query/body.

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/rooms` | ✔ | `{name?}` → `201 Room + guestToken`; mã 6 ký tự base32 Crockford (bỏ I/L/O/U), `crypto.randomInt` |
| GET | `/rooms/:code` | — | `Room` (`isMe` tính theo caller); mã sai → `404`; rate limit 240/phút/IP |
| POST | `/rooms/:code/join` | — | `{displayName}` → `{room, memberId, joined, guestToken?}`; token cũ khớp → `joined:false` (idempotent); trùng tên KHÔNG có token khớp → `409`; rate limit 20/phút/IP |
| POST | `/rooms/:code/proposals` | — | `{kind, field, value}` → `201 Room`; không phải thành viên → `403`; `value` không hợp lệ theo `field` (category lạ, priceMax ngoài 1–3) → `400` |
| POST | `/rooms/:code/proposals/:id/apply` | — | `{room, summary}`; chỉ tác giả đề xuất hoặc chủ phòng → `403`; CAS: đề xuất đã xử lý (hoặc apply song song thua cuộc) → `409` |
| POST | `/rooms/:code/proposals/:id/dismiss` | — | `Room`; quyền như apply; đã xử lý → `409` |
| DELETE | `/rooms/:code/members/:memberId` | — | `Room`; xoá kèm mọi đề xuất của thành viên; tự rời mình hoặc chủ phòng xoá người khác; vi phạm → `403`; tự rời → xoá cookie token |
| GET | `/rooms/:code/events` | — | SSE trung tính: `event: room-updated` + `{"version":n}` (KHÔNG isMe/token/memberId — client refetch `GET /rooms/:code`), `event: ping` mỗi 15s |

Quy tắc áp đề xuất (port 1:1 từ `frontend/src/features/rooms/lib/room.ts`):

| field | include | exclude |
|---|---|---|
| `category` | thêm vào `categories`, bỏ khỏi `excludedCategories` | ngược lại |
| `district` | thêm vào `districts`, bỏ khỏi `excludedDistricts` | ngược lại |
| `priceMax` | đặt `priceMax` (giá trị lạ → bỏ qua, không tự quy về 3) | bỏ qua (không có nghĩa) |
| `keyword` | thêm vào `includeKeywords` | thêm vào `excludeKeywords` |

Client chuyển `RoomFilter` sang tham số của `GET /places` (đã có từ Phase 2): `categories`
→ `category`, `excludedCategories` → `excludeCategory`, `includeKeywords` →
`includeKeyword`, `excludeKeywords` → `excludeKeyword`, `priceMax` → `priceMax`.

## 10. Upload ảnh (Phase 7)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/media` | ✔ | `{folder: "posts"\|"places"\|"avatars"\|"covers", contentType}` → `201 {uploadUrl, publicUrl, key, expiresAt, headers}` |

- Chỉ nhận `image/jpeg|png|webp|avif`; khoá object do server sinh
  (`<folder>/<userId>/<uuid>.<ext>`), không dùng tên client gửi.
- Presigned PUT sống 600 giây, ký SigV4 (region `auto`). Rate limit 10 request/giờ/IP.
- Chưa cấu hình R2 (thiếu `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/
  `R2_BUCKET`) → `503 {"message":"Tính năng upload ảnh chưa được cấu hình"}`.
- **Chưa xác minh với bucket thật** (không có credentials trong phiên này).

### Luồng đăng ảnh bài viết (G5b)

1. `POST /media {folder:"posts", contentType}` → `201 {uploadUrl, publicUrl, key, expiresAt, headers}`.
2. Client `PUT uploadUrl` với body là file (giữ nguyên `headers` server trả, kèm `Content-Type`).
3. `POST /posts {caption, placeId?, images:[publicUrl, …]}` — tối đa 4 ảnh, server kiểm prefix
   `posts/<userId>/` trước khi lưu vào bảng `post_images` (đúng thứ tự gửi lên).

Mock dev không có storage thật: `POST /media` của mock trả `uploadUrl` host `mock-r2.test` và
client bỏ qua bước PUT, dùng thẳng `publicUrl`.

### Luồng ảnh hồ sơ (avatar + ảnh bìa)

1. `POST /media {folder:"avatars"|"covers", contentType}` → `201 {uploadUrl, publicUrl, …}`.
2. Client `PUT uploadUrl` với body là file (giữ nguyên `headers` server trả).
3. `PATCH /me {name, bio, location, privateProfile, avatarUrl|coverUrl}` — server kiểm prefix
   `avatars/<userId>/` hoặc `covers/<userId>/` (cùng quy tắc ảnh bài đăng) rồi lưu vào
   `users.avatar_url`/`users.cover_url`. `null` = xoá ảnh.
4. R2 chưa cấu hình mà gửi URL ảnh → `400 {"message":"Tính năng ảnh chưa được cấu hình"}`
   (gửi `null`/bỏ trống vẫn hợp lệ để xoá/giữ nguyên).

## 11. Mã lỗi thường gặp

| Status | Khi nào |
|---|---|
| 400 | Dữ liệu sai (zod), cursor hỏng, đề xuất đã xử lý, tự like/tự follow |
| 401 | Chưa đăng nhập hoặc sai mật khẩu |
| 403 | Không phải chủ tài nguyên, không phải thành viên phòng |
| 404 | Không tồn tại / chưa publish / private của người khác (giấu tồn tại) |
| 409 | Trùng email hoặc handle khi đăng ký; idempotency key đang xử lý |
| 413 | Body > 1 MB |
| 422 | `Idempotency-Key` tái sử dụng với payload khác |
| 429 | Vượt rate limit (kèm `Retry-After`) |
| 500 | Lỗi không lường trước — không trả stack/SQL ra ngoài |
| 503 | `/readyz` khi DB chết; `/media` khi chưa cấu hình R2 |

## Cache (G2)

| Endpoint | `Cache-Control` | Ghi chú |
|---|---|---|
| `GET /places/:id` | `public, max-age=60` | kèm `ETag`; `If-None-Match` khớp → `304` không body |
| `GET /og/place/:id`, `GET /og/post/:id` | `public, max-age=600` (404: `max-age=60`) | HTML meta cho bot preview; nginx `proxy_cache` cache cùng TTL |
| `GET /places/map` | `public, max-age=30` | kèm `ETag` |
| `GET /places/daily-picks` | `public, max-age=300` | giống nhau với mọi người; 5 phút ngắn hơn chu kỳ đổi dữ liệu (ngày) |
| `GET /users/:handle` | `private, max-age=15` | `followedByMe` phụ thuộc người xem |
| `GET /me`, `PATCH /me` | `no-store` | dữ liệu riêng tư |
| `GET /users/suggestions` | `no-store` | gợi ý cá nhân hoá hoàn toàn (`followedByMe` + thứ tự theo người xem) |
| `GET /notifications`, `PATCH /notifications*` | `no-store` | thay đổi liên tục |
| `GET /places/suggestions` | — | cache ứng viên 60s trong tiến trình + single-flight; invalidate khi publish place |
