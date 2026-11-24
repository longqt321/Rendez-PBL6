# API Rendez — tài liệu hợp đồng

> Trạng thái: Phase 0–8 đã cài đặt và có integration test trên Postgres thật.
> Mọi route mount dưới `/api/v1` (quyết định K1). Lỗi luôn có shape `{ "message": string }`
> (D6). Ngày cập nhật: 2026-11-13.

## 1. Quy ước chung

| Hạng mục | Quy ước |
|---|---|
| Base URL (dev) | `http://localhost:8000/api/v1` |
| Xác thực | Cookie phiên của better-auth (`Set-Cookie` sau `/register`, `/session`) |
| Định dạng | JSON UTF-8; request có body phải gửi `Content-Type: application/json` |
| Lỗi | `{ "message": "..." }` + status 400/401/403/404/409/413/429/500 |
| Request id | Mọi response có header `X-Request-Id` (UUID), log server dùng cùng id |
| Phân trang | `{ "items": [...], "next": string \| null, "meta"?: PageMeta }`; `next` là cursor opaque base64 (D2) |
| Giới hạn body | 1 MB (JSON). Ảnh đi thẳng lên R2 qua presigned URL, không qua API |
| Rate limit | Vượt ngưỡng → `429` + `Retry-After` (giây) |
| Idempotency | POST tạo tài nguyên nhận header tùy chọn `Idempotency-Key` (mục 1.3) |
| Enum loại hình | API và DB đều dùng gạch nối: `street-food` (Prisma `@map`); bộ lọc nhận cả `street_food` |

### 1.1. Cursor (D2)

Cursor là base64url của `created_at|id` — client KHÔNG được parse, chỉ truyền lại
nguyên văn. Cursor hỏng → `400 {"message":"Cursor không hợp lệ"}`.

### 1.1b. `meta` của endpoint danh sách

`GET /places`, `GET /places/map`, `GET /places/daily-picks`, `GET /users`,
`GET /users/suggestions` đều gắn `meta` (optional trong `Page<T>` để không phá
consumer cũ):

```json
{
  "items": [],
  "next": null,
  "meta": { "tookMs": 12, "cacheHit": false, "totalResults": 343 }
}
```

| Trường | Ý nghĩa |
|---|---|
| `tookMs` | Số nguyên ms server đo quanh phần truy vấn (`performance.now`) — không phải thời gian mạng |
| `cacheHit` | `true` **chỉ khi** body phục vụ từ cache ứng dụng (hiện chỉ `/places/suggestions` có cache TTL 60s + single-flight). Các route khác luôn `false` — HTTP cache (`max-age`) không tính |
| `totalResults` | `COUNT(*)` khớp bộ lọc (KHÔNG phải số item trong trang). `/places/map` giữ thêm trường cũ `total` cùng giá trị |
| `didYouMean` | Chỉ endpoint tìm kiếm: khi 0 kết quả và `q` dài ≥ 3 → tên quán gần nhất theo `pg_trgm` (similarity ≥ 0.45, tên ≥ 5 ký tự chuẩn hoá, loại ứng viên trùng đúng query), ngược lại `null` |

`/places/suggestions` giữ shape `{suggestions}` và **bổ sung** `meta` cùng nghĩa
(`totalResults` = số gợi ý trả về).

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
| `PATCH` | `/me` | ✔ | `{name?, bio?, location?, privateProfile?, avatarUrl?, coverUrl?}` — `avatarUrl`/`coverUrl` `null` = xoá ảnh, bỏ trống = giữ nguyên | `200 UserProfile` |
| `DELETE` | `/me` | ✔ | — | `200 {"deleted":true}` — xoá mềm, ẩn danh hoá handle/email + thu hồi mọi phiên |
| `GET` | `/me/notification-prefs` | ✔ | — | `200` cấu hình nhận thông báo (`dm`, `room`, `social`, `placeSuggestion`) |
| `PATCH` | `/me/notification-prefs` | ✔ | `{dm?, room?, social?, placeSuggestion?}` | `200` cấu hình đã cập nhật |
| `GET` | `/auth/providers` | — | — | `200 {"providers": ["google"?]}` — danh sách SSO khả dụng |
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
| GET | `/places/daily-picks` | — | `{date, items: [{place, reason, why}], next: null, meta}` — 3 quán job `daily-picks` chọn cho hôm nay (Asia/Ho_Chi_Minh); chưa có picks → `items: []` (200) |
| GET | `/places/recommended` | — | `{items: Place[], next: null, meta: {tookMs, cacheHit, totalResults, strategy, seedCount}}` — nhận `?limit=` (1–20, mặc định 6) và `?anonId=`; trả gợi ý cá nhân hoá (affinity) hoặc DES cold-start |
| GET | `/places/suggestions?q=&limit=` | — | `{suggestions: PlaceSuggestion[]}`; caption < 8 ký tự → rỗng; `limit` 1–10 (mặc định 3) |
| GET | `/places/saved` | ✔ | `Page<Place>` gộp mọi bộ sưu tập của chính mình, loại trùng |
| GET | `/places/:id` | — | `Place`; 404 nếu chưa publish/đã xoá |
| GET | `/places/:id/posts` | — | `Page<Post>` chỉ bài gắn địa điểm, cursor keyset; 404 nếu place chưa publish |
| GET | `/places/:id/reviews` | — | `{items: Review[], next: null}` mới nhất trước |
| POST | `/places/:id/reviews` | ✔ | upsert 1 user 1 review (A7.4) → `201 Review` |
| DELETE | `/places/:id/reviews` | ✔ | Xoá mềm đánh giá của chính mình tại địa điểm → `204 No Content` |
| POST | `/places/:id/reports` | ✔ | `201 PlaceReport`; unique (place, reason, reporter) |

### 4.1. Tham số lọc của `/places` và `/places/map`

| Tham số | Kiểu | Hành vi |
|---|---|---|
| `q` | string | Tìm kiếm nâng cao (mục 4.1b): tách token AND, khớp cả chuỗi dính chữ, mở rộng từ đồng nghĩa; 0 kết quả → `meta.didYouMean` |
| `category` | CSV | Danh sách loại hình cần có; `all` = bỏ lọc |
| `district` | CSV | Danh sách quận |
| `priceMax` | 1–3 | Ngoài khoảng/không phải số → **bỏ lọc** (không lỗi) |
| `excludeCategory` | CSV | Loại trừ loại hình |
| `excludeDistrict` | CSV | Loại trừ quận |
| `includeKeyword` | CSV | Phải có ĐỦ mọi từ khoá (AND) |
| `excludeKeyword` | CSV | Có bất kỳ từ khoá nào là loại (OR) |
| `bbox` | `minLng,minLat,maxLng,maxLat` | Chỉ áp dụng khi đủ 4 số hữu hạn |
| `sort` | `newest` \| `rating` \| `distance` | Kiểu sắp xếp kết quả; giá trị lạ/thiếu → `newest`. **Chỉ áp dụng cho `/places`** — `/places/map` bỏ qua (`sort` không đổi thứ tự pin) |
| `lat`, `lng` | số thực (−90..90 / −180..180) | Toạ độ người dùng cho `sort=distance`; thiếu/không hữu hạn → `sort=distance` **rơi về `newest`** (không lỗi) |
| `cursor` | string | Cursor trang kế |

**Sắp xếp (`sort`)** — khoá keyset tương ứng, cursor mang tag `kind`:

| `sort` | ORDER BY | Cursor |
|---|---|---|
| `newest` (mặc định) | `created_at DESC, id DESC` | `{kind:"newest", createdAt, id}` |
| `rating` | `COALESCE(rating,0) DESC, review_count DESC, created_at DESC, id DESC` | `{kind:"rating", rating, reviewCount, createdAt, id}` |
| `distance` | Haversine tới `lat/lng` ASC, `id ASC`; quán thiếu toạ độ xếp cuối (`NULLS LAST`) | `{kind:"distance", distance, id}` (`distance: null` = dòng cuối thiếu toạ độ) |

- Cursor **cũ** (không tag, dạng `created_at|id`) vẫn đọc được và hiểu là `newest`.
- Cursor hợp lệ nhưng `kind` khác `sort` hiện tại (người dùng đổi sort, link cũ) → **trả trang đầu**, không 400.
- Cursor hỏng (base64 sai, thiếu phần, id sai dạng) → `400 {"message":"Cursor không hợp lệ"}`.

### 4.1b. Tìm kiếm nâng cao (`q`)

Truy vấn được chuẩn hoá không dấu (bỏ dấu, `đ`→`d`, dấu câu → khoảng trắng) rồi
xử lý theo 3 tầng, mỗi tầng chỉ chạy khi tầng trước không đủ:

1. **Token AND**: `q` tách thành các token; một place khớp khi haystack
   (name + address + city + district + tags, đã chuẩn hoá) chứa ĐỦ mọi token —
   `?q=caphe trung` khớp "Cà phê Trung".
2. **Chuỗi dính chữ**: mỗi token còn được so trên haystack ĐÃ BỎ khoảng trắng —
   `?q=caphe` khớp "Ca Phe Trung" (→ `caphetrung`).
3. **Từ đồng nghĩa** (`backend/src/lib/search-synonyms.ts`, map tiếng Việt không
   dấu, có test): cụm nguyên bản có trong map thì OR thêm các biến thể —
   `quan ngon` → `quan an`/`nha hang`/`quan nhau`; `an dem` → `quan nhau`/`nuong`/`lau`;
   `ca phe` → `cafe`/`coffee`; `an sang` → `pho`/`banh mi`/`bun`/`chao`;
   `hai san` → `hai san`/`seafood`; `chay` → `chay`/`vegetarian`. Từ khoá gốc
   luôn được giữ (chỉ mở rộng, không thay thế).

**Sai chính tả nhẹ**: khi 0 kết quả và `q` dài ≥ 3, server dùng `similarity()`
của `pg_trgm` trên tên đã chuẩn hoá (ngưỡng ≥ 0.45, tên ≥ 5 ký tự, loại ứng viên trùng đúng
query — tránh "gợi ý lại chính từ người dùng vừa gõ"; lấy ứng viên gần nhất) và trả
`meta.didYouMean` = tên quán gợi ý (`null` nếu không có ứng viên đủ gần).

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

### 4.3. `why` của daily-picks

Mỗi item của `/places/daily-picks` kèm `why` — server tính từ chính breakdown
điểm của thuật toán chọn quán, client KHÔNG tự tính lại:

```json
{
  "why": {
    "matchPercent": 78,
    "district": "Hải Châu",
    "distanceKm": null,
    "openNow": true,
    "signals": ["Có ảnh thật", "Nhiều đánh giá"]
  }
}
```

- `matchPercent`: điểm chuẩn hoá `score/maxScore × 100` (số nguyên, 0–100) —
  mẫu số là điểm tối đa lý thuyết của công thức (≥ 5 đánh giá + quán mới + có ảnh).
- `district`: quận của quán (vắng mặt khi không có dữ liệu).
- `distanceKm`: luôn `null` ở endpoint này (không có toạ độ người xem).
- `openNow`: parse `opening_hours` chuẩn OSM theo giờ Asia/Ho_Chi_Minh
  (24/7, khung ngày, qua nửa đêm); `null` = không parse được — không suy diễn.
- `signals`: các lý do thật dùng để chọn (ảnh thật, nhiều đánh giá, quán mới),
  tối đa 3.

### 4.4. Đánh giá (A7.4) và báo cáo (A7.5)

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
| DELETE | `/comments/:id` | ✔ | Chỉ tác giả (403); xoá mềm + cascade reply → `200 {"deleted":true}` |

Rate limit (theo tài khoản, `byUser`): `POST /posts` 30/giờ; like bài/bình luận 30/phút;
`POST /posts/:id/comments` 10/phút; follow/unfollow 20/phút. Vượt → `429` + `Retry-After`.

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
| GET | `/collections/liked` | ✔ | `Page<CollectionSummary>` bộ sưu tập công khai đã thích (lọc trực tiếp ở Postgres) |
| POST | `/collections` | ✔ | `{name, description?, isPrivate?}` → `201 Collection` |
| GET | `/collections/:id` | — | `Collection`; private của người khác → `404` |
| PATCH | `/collections/:id` | ✔ | Chỉ owner (403); cập nhật một phần |
| DELETE | `/collections/:id` | ✔ | Chỉ owner (403) → `200 true` |
| PATCH | `/collections/:id/places` | ✔ | `{placeId, member?: boolean}` — thêm đẩy cuối, idempotent |
| PATCH | `/collections/:id/places/:placeId` | ✔ | `{note}` — cập nhật ghi chú riêng cho địa điểm trong bộ sưu tập |
| PATCH | `/collections/:id/reorder` | ✔ | `{placeIds}` — sắp xếp lại thứ tự địa điểm |
| GET / POST / DELETE | `/collections/:id/collaborators` (`/:targetUserId`) | ✔ | Quản lý cộng tác viên chỉnh sửa bộ sưu tập |
| POST | `/collections/:id/like` | ✔ | Idempotent; tự like → `400` |
| DELETE | `/collections/:id/like` | ✔ | Idempotent |

`name`: 1–80 ký tự; `description` ≤ 400. `Collection.placeIds` giữ đúng thứ tự thêm
(`collection_places.position`).

## 8. Trang cá nhân, theo dõi và chặn

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/users?q=&cursor=` | — | `Page<UserProfile>` 20/trang, `q` khớp không dấu + bỏ dấu câu |
| GET | `/users/suggestions` | ✔ | `{ items: { user: UserProfile, reason: string }[] }` tối đa 5; loại chính mình + người đã theo dõi; rỗng = `200 { items: [] }` (không 404); `no-store`. Khai TRƯỚC `/users/:handle` |
| GET | `/users/:handle` | — | `UserProfile`; 404 nếu không có |
| GET | `/users/:handle/posts?tab=posts\|saved\|pinned&cursor=` | — | Tab `saved`/`pinned` của người khác → trang RỖNG (không 403) |
| GET | `/users/:handle/collections` | — | `Page<CollectionSummary>`; ẩn private trừ chính chủ |
| GET | `/users/:handle/reviews` | — | Danh sách đánh giá công khai của người dùng |
| POST | `/users/:handle/follow` | ✔ | Idempotent; tự follow → `400`; trả `UserProfile` mới |
| DELETE | `/users/:handle/follow` | ✔ | Idempotent; trả `UserProfile` mới |
| POST / DELETE | `/users/:handle/block` | ✔ | Chặn hoặc bỏ chặn người dùng (tự chặn → `400`, xóa theo dõi hai chiều) |

## 9. Phòng nhóm cộng tác (`/rooms/*`)

**Danh tính:** khách tham gia bằng tên và nhận token bí mật qua cookie HttpOnly
`rendez_room_<code>` (`Path=/api/v1/rooms/<code>`, `SameSite=Lax`, TTL 24h). DB chỉ lưu
HMAC-SHA256(token, BETTER_AUTH_SECRET). Mọi mutation xác thực actor từ phiên đăng nhập hoặc cookie token (`resolveRoomActor`).

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/rooms/mine` | ✔ | Danh sách các phòng hiện tại mà người dùng đang tham gia |
| POST | `/rooms` | ✔ | `{name?}` → `201 Room + guestToken`; mã 6 ký tự base32 Crockford (bỏ I/L/O/U), `crypto.randomInt` |
| GET | `/rooms/:code` | — | `Room` (`isMe` tính theo caller); mã sai → `404`; rate limit 240/phút/IP |
| POST | `/rooms/:code/join` | — | `{displayName}` → `{room, memberId, joined, guestToken?}`; trùng tên không token → `409`; rate limit 20/phút/IP |
| PATCH | `/rooms/:code/me/location` | — | `{lat, lng}` — cập nhật tọa độ pin thành viên trên bản đồ nhóm (xóa tọa độ nếu gửi null) |
| POST | `/rooms/:code/candidates` | — | `{placeId}` — đề xuất quán ứng viên cho nhóm; hệ thống tính khoảng cách tới từng thành viên |
| DELETE | `/rooms/:code/candidates/:candidateId` | — | Gỡ ứng viên khỏi phòng |
| POST / DELETE | `/rooms/:code/proposals` (`/:proposalId`) | — | Gửi hoặc xóa đề xuất tiêu chí cá nhân (`category`, `district`, `priceMax`, `keyword`) |
| POST | `/rooms/:code/proposals/:id/apply` | — | `{room, summary}`; CAS theo phiên bản phòng; tranh chấp → `409` |
| POST | `/rooms/:code/proposals/:id/dismiss` | — | Đánh dấu bỏ qua tiêu chí |
| POST | `/rooms/:code/voting/start`, `/votes`, `/voting/finalize` | ✔ / Thành viên | Khởi động bỏ phiếu, ghi phiếu bầu (`FOR UPDATE`) và chốt kết quả |
| DELETE | `/rooms/:code/members/:memberId` | — | Rời phòng hoặc chủ phòng xóa thành viên khác (tự rời → xóa cookie token) |
| GET | `/rooms/:code/events` | — | SSE trung tính: `event: room-updated` + `{"version":n}`, `event: ping` mỗi 15s |

## 9b. Tin nhắn trực tiếp (`messages.ts`)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/messages/events` | ✔ | Luồng SSE đẩy tin nhắn mới và trạng thái đọc theo thời gian thực |
| GET | `/messages/conversations?folder=primary\|requests` | ✔ | Danh sách hội thoại (Kysely CTE + `distinctOn`), tách Hộp thư chính và Tin nhắn chờ |
| GET | `/messages/with/:handle` | ✔ | Lịch sử tin nhắn với người dùng và tự động đánh dấu đã đọc |
| POST | `/messages/with/:handle` | ✔ | `{body, attachment?}` — gửi tin nhắn kèm thẻ địa điểm/bộ sưu tập/phòng nhóm (chặn gửi khi có `UserBlock`) |

## 9c. Đánh giá 4 mức & Đóng góp địa điểm (`reviews.ts`, `submissions.ts`)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/places/:id/reviews` | ✔ | Đánh giá 4 mức (`must_try`, `good`, `ok`, `not_for_me`), món đề xuất và tối đa ảnh thực tế |
| POST | `/reviews/:id/helpful` | ✔ | Bật/tắt bình chọn đánh giá hữu ích (`review_helpful_votes`) |
| POST | `/places/submissions` | ✔ | Cộng đồng gửi đề xuất địa điểm mới (tên, địa chỉ, quận, loại hình, mức giá, tọa độ, giờ mở cửa) |
| GET | `/me/submissions` | ✔ | Lịch sử các địa điểm đã đề xuất |
| GET / PATCH | `/admin/submissions` (`/:id`) | `admin` / `moderator` | Danh sách chờ duyệt và phê duyệt (tự sinh bản ghi `places` mới) hoặc từ chối |

## 10. Upload ảnh (Phase 7)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/media` | ✔ | `{folder: "posts"\|"places"\|"avatars"\|"covers", contentType}` → `201 {uploadUrl, publicUrl, key, expiresAt, headers}` |

- Chỉ nhận `image/jpeg|png|webp|avif`; khoá object do server sinh
  (`<folder>/<userId>/<uuid>.<ext>`), không dùng tên client gửi.
- Presigned PUT sống 600 giây, ký SigV4 (region `auto`). Rate limit 10 request/giờ/tài khoản (`byUser`).
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

## 10c. Sự kiện tương tác (`/events`) & Client Telemetry (`/telemetry`)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| POST | `/events` | — | Nhận batch `{ events: [{ eventId?, eventType, placeId?, postId?, query?, context?, sessionId?, anonId? }] }` (1–20 event); rate limit 120 req/phút/IP; kiểm `placeId` tồn tại (400 nếu không tồn tại); dedupe 5 phút qua Redis `SET NX EX 300` (fallback in-memory); bulk `INSERT` 1 query (`unnest`); trả `202 { accepted, recorded }` |
| POST | `/telemetry` | — | Nhận batch `{ items: [{ kind: "error" \| "web-vital", ... }] }` (1–15 item); rate limit 60 req/phút/IP; ghi `client_error` & `web_vital` (`LCP`, `INP`, `CLS`) ra Pino JSON stdout + ring buffer `obs:events`; trả `202 { accepted }` |

## 10d. Giám sát Admin (`/admin/observability`)

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/admin/observability` | `admin` | Hỗ trợ `?kind=all\|slow_request\|server_error\|client_error\|web_vital&q=...`. Trả về `latency` (`p50/p95/p99`, `byEndpoint`), `webVitals` ($p_{75}$), `slowSql` (top 10 từ `pg_stat_statements`), `behavior24h` (`interaction_events`), `summary` (`errorCount`, `slowCount`) và `events` từ ring buffer `obs:events`. |

- **Trace Correlation**: Client gửi `X-Request-Id` và W3C `traceparent`; API kế thừa `trace_id` hợp lệ, gắn `X-Request-Id` vào response header và mọi Canonical Log Line.

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
| `GET /users/:handle` | `private, no-cache` | `followedByMe` phụ thuộc người xem; buộc revalidate (ETag/304) |
| `GET /me`, `PATCH /me` | `no-store` | dữ liệu riêng tư |
| `GET /users/suggestions` | `no-store` | gợi ý cá nhân hoá hoàn toàn (`followedByMe` + thứ tự theo người xem) |
| `GET /notifications`, `PATCH /notifications*` | `no-store` | thay đổi liên tục |
| `GET /places/suggestions` | — | cache ứng viên 60s trong tiến trình + single-flight; invalidate khi publish place |
