# API RendeZ — tài liệu hợp đồng

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
| Enum loại hình | API và DB đều dùng gạch nối: `street-food` (Prisma `@map`); bộ lọc nhận cả `street_food` |

### 1.1. Cursor (D2)

Cursor là base64url của `created_at|id` — client KHÔNG được parse, chỉ truyền lại
nguyên văn. Cursor hỏng → `400 {"message":"Cursor không hợp lệ"}`.

### 1.2. Phân quyền

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
| POST | `/register` | — | `{name, email, password, handle}` | `201 UserProfile` + `Set-Cookie` |
| POST | `/session` | — | `{email, password}` | `200 UserProfile` + `Set-Cookie` |
| DELETE | `/session` | ✔ | — | `200 {"loggedOut":true}` |
| GET | `/me` | ✔ | — | `200 UserProfile` |
| PATCH | `/me` | ✔ | `{name?, bio?, location?, privateProfile?}` | `200 UserProfile` |
| DELETE | `/me` | ✔ | — | `200 {"deleted":true}` — xoá mềm + thu hồi mọi phiên |
| POST | `/auth/request-password-reset` | — | `{email, redirectTo?}` | `200 {"status":true}` (luôn thành công) |
| POST | `/auth/reset-password` | — | `{token, newPassword}` | `200 {"status":true}` / `400` token sai |
| GET/POST | `/auth/*` | — | do better-auth quản lý | passthrough |

Ràng buộc đầu vào:

- `name`: 2–40 ký tự (sau trim); `handle`: 3–30, chỉ `[a-z0-9_]`; `password`: 8–128;
  `email`: chuẩn hoá lowercase.
- Trùng email → `409 {"message":"Email đã được sử dụng"}`; trùng handle →
  `409 {"message":"Handle đã được sử dụng"}` (kiểm trước khi gọi better-auth vì
  better-auth nuốt P2002 của handle thành 422 chung).
- Sai mật khẩu → `401 {"message":"Email hoặc mật khẩu không đúng"}`. Tài khoản đã xoá mềm
  cũng trả 401 dù mật khẩu đúng.
- Rate limit: 20 request/phút/IP cho mỗi route `/session` và `/register`.
- Quên mật khẩu: dev **chưa có SMTP** — link reset được ghi vào log backend
  (`DEV ONLY — link đặt lại mật khẩu`); production cần thay `sendResetPassword` bằng gửi mail
  thật (xem `docs/DECISIONS.md` mục 23).

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
| POST | `/posts` | ✔ | `{caption, placeId?}` → `201 Post`; bài chưa gắn địa điểm được đẩy job phát hiện |
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

`Post`:

```json
{
  "id": "uuid", "author": {"id":"uuid","name":"…","handle":"…","initials":"…"},
  "caption": "…", "place": {"id":"…","name":"…","address":"…","category":"cafe","isPublished":true},
  "createdAt": "…", "likeCount": 4, "commentCount": 2, "likedByMe": false, "savedByMe": false
}
```

## 6. Thông báo

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/notifications?cursor=` | ✔ | `Page<AppNotification>`, 20/trang, mới nhất trước |
| PATCH | `/notifications` | ✔ | Đánh dấu TẤT CẢ đã đọc → `200 AppNotification[]` |
| PATCH | `/notifications/:id` | ✔ | Đánh dấu 1 thông báo → `200 AppNotification`; 404 nếu không phải của mình |

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
| GET | `/users/:handle` | — | `UserProfile`; 404 nếu không có |
| GET | `/users/:handle/posts?tab=posts\|saved\|pinned&cursor=` | — | Tab `saved`/`pinned` của người khác → trang RỖNG (không 403) |
| GET | `/users/:handle/collections` | — | `Page<CollectionSummary>`; ẩn private trừ chính chủ |
| POST | `/users/:handle/follow` | ✔ | Idempotent; tự follow → `400`; trả `UserProfile` mới |
| DELETE | `/users/:handle/follow` | ✔ | Idempotent; trả `UserProfile` mới |

## 9. Phòng lọc nhóm (hợp đồng mới Phase 6)

Trước Phase 6 phòng chỉ sống trong trình duyệt (localStorage + BroadcastChannel). Backend
giữ nguyên shape `Room` của frontend, thêm `memberId` cho khách.

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/rooms` | ✔ | `{name?}` → `201 Room`; mã 6 ký tự alphabet `A–Z2–9` (bỏ O/0/I/1) |
| GET | `/rooms/:code?memberId=` | — | `Room`; mã sai → `404` |
| POST | `/rooms/:code/join` | — | `{displayName}` → `{room, memberId, joined}`; trùng tên → `joined:false` |
| POST | `/rooms/:code/proposals` | — | `{memberId, kind, field, value}` → `201 Room`; không phải thành viên → `403`; `value` không hợp lệ theo `field` (category lạ, priceMax ngoài 1–3) → `400` |
| POST | `/rooms/:code/proposals/:id/apply?memberId=` | — | `{room, summary}`; đề xuất đã xử lý → `400` |
| POST | `/rooms/:code/proposals/:id/dismiss?memberId=` | — | `Room`; filter không đổi |
| DELETE | `/rooms/:code/members/:memberId?actorId=` | — | `Room`; xoá kèm mọi đề xuất của thành viên. `actorId` phải là thành viên; xoá người khác khi không phải chủ phòng → `403` |
| GET | `/rooms/:code/events?memberId=` | — | SSE: `event: room` (JSON `Room`), `event: ping` mỗi 15s |

Quy tắc áp đề xuất (port 1:1 từ `frontend/src/features/rooms/lib/room.ts`):

| field | include | exclude |
|---|---|---|
| `category` | thêm vào `categories`, bỏ khỏi `excludedCategories` | ngược lại |
| `district` | thêm vào `districts`, bỏ khỏi `excludedDistricts` | ngược lại |
| `priceMax` | đặt `priceMax` (giá trị lạ → 3) | bỏ qua (không có nghĩa) |
| `keyword` | thêm vào `includeKeywords` | thêm vào `excludeKeywords` |

Client chuyển `RoomFilter` sang tham số của `GET /places` (đã có từ Phase 2): `categories`
→ `category`, `excludedCategories` → `excludeCategory`, `includeKeywords` →
`includeKeyword`, `excludeKeywords` → `excludeKeyword`, `priceMax` → `priceMax`.

## 10. Upload ảnh (Phase 7)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/media` | ✔ | `{folder: "posts"\|"places", contentType}` → `201 {uploadUrl, publicUrl, key, expiresAt, headers}` |

- Chỉ nhận `image/jpeg|png|webp|avif`; khoá object do server sinh
  (`<folder>/<userId>/<uuid>.<ext>`), không dùng tên client gửi.
- Presigned PUT sống 600 giây, ký SigV4 (region `auto`). Rate limit 10 request/giờ/IP.
- Chưa cấu hình R2 (thiếu `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/
  `R2_BUCKET`) → `503 {"message":"Tính năng upload ảnh chưa được cấu hình"}`.
- **Chưa xác minh với bucket thật** (không có credentials trong phiên này).

## 11. Mã lỗi thường gặp

| Status | Khi nào |
|---|---|
| 400 | Dữ liệu sai (zod), cursor hỏng, đề xuất đã xử lý, tự like/tự follow |
| 401 | Chưa đăng nhập hoặc sai mật khẩu |
| 403 | Không phải chủ tài nguyên, không phải thành viên phòng |
| 404 | Không tồn tại / chưa publish / private của người khác (giấu tồn tại) |
| 409 | Trùng email hoặc handle khi đăng ký |
| 413 | Body > 1 MB |
| 429 | Vượt rate limit (kèm `Retry-After`) |
| 500 | Lỗi không lường trước — không trả stack/SQL ra ngoài |
| 503 | `/readyz` khi DB chết; `/media` khi chưa cấu hình R2 |

## Cache (G2)

| Endpoint | `Cache-Control` | Ghi chú |
|---|---|---|
| `GET /places/:id` | `public, max-age=60` | kèm `ETag`; `If-None-Match` khớp → `304` không body |
| `GET /places/map` | `public, max-age=30` | kèm `ETag` |
| `GET /users/:handle` | `private, max-age=15` | `followedByMe` phụ thuộc người xem |
| `GET /me`, `PATCH /me` | `no-store` | dữ liệu riêng tư |
| `GET /notifications`, `PATCH /notifications*` | `no-store` | thay đổi liên tục |
| `GET /places/suggestions` | — | cache ứng viên 60s trong tiến trình + single-flight; invalidate khi publish place |
