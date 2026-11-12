# Thiết kế: Cache HTTP, phiên đăng nhập và rate limit

> Trạng thái: bản thiết kế v1 — mô tả cơ chế **đã có trong code**, không đề xuất thay đổi.
> Phạm vi: chính sách `Cache-Control`/ETag ở backend, interceptor 401 ở frontend, đồng bộ phiên giữa các tab, và rate limit theo tài khoản. Nguồn sự thật: `backend/src/lib/http-cache.ts`, `backend/src/lib/rate-limit.ts`, `frontend/src/lib/axios.ts`.

## 1. Bối cảnh và vấn đề

Ba lớp lỗi khác nhau nhưng cùng gốc: **server trả lời đúng, nhưng client (trình duyệt, CDN, tab khác) giữ lại một phiên bản cũ của sự thật**.

### (a) Dữ liệu riêng tư bị cache sau khi người dùng tương tác

`jsonWithCache` từng gắn `max-age=15` cho cả dữ liệu phụ thuộc người xem (hồ sơ có `followedByMe`, danh sách có `likedByMe`). Trình duyệt lưu body 15 giây; người dùng bấm "Theo dõi" (DB đã có row) rồi quay lại trong 15 giây → refetch trả **body cũ từ disk cache**, nút không đổi trạng thái (V3-01). Với like cũng vậy: like xong quay lại vẫn thấy trạng thái cũ.

**Vì sao không sửa bằng cách tăng/giảm `max-age`:** bất kỳ `max-age > 0` nào cũng tạo cửa sổ sai lệch; `max-age=0` vẫn cho phép dùng lại khi offline. Cần tách **quyền lưu** khỏi **quyền dùng lại mà không hỏi server** — đó là hai chế độ `public` / `private` của `jsonWithCache`.

### (b) 401 của các GET "dò" đá khách khỏi trang công khai

Trang công khai (`/discover`, `/search`, `/collections`) bắn nhiều GET phụ thuộc phiên: `/me`, `/notifications`, `/places/saved`. Khách chưa đăng nhập nhận 401 ở tất cả — đó là **câu trả lời bình thường**, không phải mất phiên. Bản đầu của interceptor điều hướng `/login?next=` theo mọi 401, nên khách vừa mở `/discover` đã bị đá sang trang đăng nhập (F3).

### (c) Logout ở tab A, tab B vẫn tưởng còn đăng nhập

Cookie phiên dùng chung giữa các tab, nhưng state React Query trong tab B không biết gì. Tab B vẫn hiện avatar, vẫn cho bấm like; mọi mutation 401 im lặng → người dùng tưởng app hỏng (V8-07).

## 2. Chính sách cache theo loại dữ liệu

Nguồn sự thật duy nhất là `backend/src/lib/http-cache.ts`. Ba helper:

| Helper | Header | Dùng cho |
| --- | --- | --- |
| `jsonWithCache(c, data, { maxAge })` | `public, max-age=<n>` + `ETag` | Dữ liệu giống nhau với mọi người |
| `jsonWithCache(c, data, { maxAge, scope: "private" })` | `private, no-cache` + `ETag` | Dữ liệu phụ thuộc người xem |
| `noStore(c, data)` | `no-store` | Dữ liệu riêng tư / thời gian thực |

ETag là `sha256` của chính body đã serialize (base64url, có nháy kép) — tự đổi khi dữ liệu đổi nên **không cần invalidate thủ công**, và không phụ thuộc thứ tự cột DB. `matchesEtag` chấp nhận danh sách `If-None-Match` và tiền tố yếu `W/`.

| Route | Chế độ | `maxAge` | Vì sao |
| --- | --- | --- | --- |
| `GET /places/map` | public | 30s | Pin bản đồ, đổi chậm; 30s đủ gánh thao tác kéo/zoom |
| `GET /places/:id` | public | 60s | Chi tiết địa điểm đã publish |
| `GET /places/daily-picks` | public | 300s | "Gợi ý hôm nay" do job chọn mỗi ngày — 5 phút ngắn hơn chu kỳ đổi dữ liệu |
| `GET /places` | *(không cache)* | — | Danh sách có `sort`/filter phụ thuộc ngữ cảnh người xem (giá tối đa cá nhân, toạ độ) — xem D-058; cache HTTP chung sẽ trả body của người khác |
| `GET /places/suggestions` | *(không cache HTTP)* | — | Cache nằm ở **tầng ứng dụng**: TTL 60s + single-flight qua `createTtlCache`, invalidate ngay khi publish place |
| `GET /users/:handle` | private | 15s | Có `followedByMe` — phụ thuộc người xem |
| `GET /users/suggestions` | no-store | — | Cá nhân hoá hoàn toàn; `private, no-cache` vẫn cho trình duyệt lưu body |
| `GET /me` | no-store | — | Dữ liệu phiên |
| `GET /notifications` (+ danh sách đầy đủ) | no-store | — | Thay đổi liên tục, riêng tư |

**Vì sao `private` dùng `no-cache` chứ không `no-store`:** `private, no-cache` vẫn cho trình duyệt **lưu** body để tiết kiệm băng thông nhưng **buộc revalidate** mỗi lần đọc → sau mutation, lần refetch kế tiếp luôn thấy dữ liệu mới, mà vẫn giữ được lợi ích 304 + ETag. `no-store` sẽ mất luôn 304.

**Vì sao `public` mới được `max-age`:** chỉ dữ liệu giống nhau với mọi người mới an toàn để dùng lại body mà không hỏi server.

### Tầng nginx

`frontend/nginx.conf` **chỉ** bật `proxy_cache` cho hai route OG public (server-render thẻ meta cho bot):

- `proxy_cache_path /var/cache/nginx/og ... keys_zone=og_cache:1m`
- `@og_place` và `@og_post`: `proxy_cache og_cache`, `proxy_cache_valid 200 10m`, `proxy_cache_valid 404 1m`
- `location /api/` **không** cache; riêng SSE (`/api/v1/(notifications|rooms/[^/]+)/events`) đặt `proxy_cache off` + buffering off.
- `/assets/` dùng `public, max-age=31536000, immutable` (tên file có hash).

**Vì sao không cache API ở nginx:** cache đôi (nginx + `Cache-Control` của app) tạo hai nguồn sự thật, và nginx không biết dữ liệu nào phụ thuộc viewer → dễ trả body của người khác.

## 3. Interceptor 401 thông minh (frontend)

Nguyên tắc: **mặc định KHÔNG điều hướng.** 401 chỉ được coi là "mất phiên" khi request do người dùng chủ động gây ra.

`isSessionProbeRequest(config)` quyết định "đây là phép dò, bỏ qua im lặng":

| Trường hợp | Kết quả | Lý do |
| --- | --- | --- |
| Path bắt đầu `/auth/`, hoặc `/register`, hoặc `/session` | luôn là probe | 401 ở đây là kết quả nghiệp vụ (sai mật khẩu, token sai) — điều hướng sẽ tạo vòng lặp ngay trên trang đăng nhập |
| `GET`/`HEAD` không có `authRequired: true` | probe | Khách nhận 401 là bình thường (badge ẩn, danh sách rỗng) |
| `GET`/`HEAD` có `authRequired: true` | **không** probe | Trang bảo vệ chủ động yêu cầu phiên |
| Mutation (`POST`/`PATCH`/`DELETE`…) | **không** probe | Like/follow/comment 401 = không có phiên hợp lệ |

Cờ `authRequired` được khai báo bằng module augmentation cho `AxiosRequestConfig`, mặc định không đặt.

Khi xác định mất phiên, `handleUnauthorizedResponse` gọi `clearSessionAndRedirect`:

1. `toast.error(...)` — thông điệp chia hai trường hợp dựa trên `sessionActive` (cập nhật từ kết quả `GET /me`): khách chưa đăng nhập được **mời** ("Đăng nhập để tiếp tục"), người vừa hết hạn được **báo** ("Phiên đăng nhập đã hết hạn").
2. Nếu đang ở `/login` thì dừng — tránh vòng lặp.
3. `sessionRedirect.to(loginRedirectUrl(current))` sau `sessionRedirect.delayMs = 1200` ms.

**Vì sao trễ 1200ms:** nếu điều hướng ngay, toast biến mất trước khi người dùng đọc được.

**Vì sao điều hướng CẢ TRANG (`window.location.assign`) chứ không SPA:** tải lại xoá sạch cache query trong bộ nhớ → (a) không còn dữ liệu riêng tư của phiên cũ, (b) trang đăng nhập không thấy `["me"]` cũ rồi đá ngược người dùng về trang cũ.

`loginRedirectUrl` dùng lại `safeRedirectPath` (`frontend/src/features/auth/lib/safe-redirect.ts`) — nguồn duy nhất cho logic chống open redirect: chỉ nhận path relative bắt đầu `/`, từ chối `//evil.com`, `/\evil.com`, ký tự điều khiển `\u0000-\u001f`/`\u007f`, và các path auth (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`) để không quay lại chính nó.

Cờ `sessionExpiryHandled` đảm bảo mỗi tab chỉ toast + điều hướng **một lần** dù nhiều request 401 cùng lúc; `resetSessionExpiry()` chạy khi `POST /session` (đăng nhập) thành công.

## 4. Đồng bộ đa tab

`SESSION_CHANNEL = "rendez-session"` (`BroadcastChannel`), tạo lazy qua `getSessionChannel()`; môi trường không hỗ trợ (trình duyệt cũ, jsdom) trả `null` — khi đó chỉ mất tính năng đồng bộ tab, không lỗi.

| Sự kiện | Có broadcast? | Ghi chú |
| --- | --- | --- |
| `DELETE /session` (đăng xuất) | ✅ `{ type: "logout" }` | `isSessionEndingRequest` nhận diện |
| `DELETE /me` (xoá tài khoản) | ✅ `{ type: "logout" }` | Cùng nhánh xử lý |
| Đăng nhập (`POST /session`) | ❌ | **Quyết định có chủ đích** |

**Vì sao chỉ broadcast đăng xuất:** đăng xuất là sự kiện **mất quyền** — tab khác phải phản ứng ngay, nếu không UI hiện trạng thái đăng nhập giả và mọi thao tác 401 im lặng (V8-07). Ngược lại, đăng nhập ở tab A **không** tự lan sang tab B: tab B có thể đang là khách có chủ đích (người dùng mở link công khai ở tab riêng), và việc tự đổi state ở tab khác sẽ ghi đè cache query `["me"]`, `["notifications"]` mà không có hành động của người dùng. Tab B sẽ tự biết khi nó gọi `GET /me` kế tiếp.

Tab nhận `logout` gọi `handleRemoteLogout()` → `clearSessionAndRedirect` với thông điệp riêng ("Bạn đã đăng xuất ở tab khác").

**Hạn chế cần biết:**

- Chỉ hoạt động **cùng origin** — tab khác origin (subdomain, `localhost` khác port) không nhận được.
- Không thay thế session server: cookie đã bị server vô hiệu hoá là nguồn sự thật; BroadcastChannel chỉ là tín hiệu UI.
- Không chống được tab bị treo/ngủ đông; khi tỉnh dậy tab đó vẫn phải dựa vào 401 của request kế tiếp.
- Không phải cơ chế bảo mật — chỉ là đồng bộ trải nghiệm.

## 5. Rate limit theo tài khoản (`byUser`)

Cơ chế: bảng `rate_limits(key, window_start, count)` trong Postgres, khoá ghép `scope:identity`. Mỗi request là một `INSERT ... ON CONFLICT DO UPDATE ... RETURNING count` — nguyên tử ở mức hàng nên nhiều tiến trình đếm đúng. Cửa sổ cố định (fixed window); cửa sổ cũ của cùng key bị xoá ngay sau đó để bảng không phình. Không thêm Redis/`unstorage` (D-055 mục 27).

`identity` = `user:<userId>` khi `byUser: true` **và** đã có `userId`; ngược lại rơi về IP (`clientIp`). IP lấy từ `remoteAddress` của socket, chỉ tin `X-Forwarded-For` khi socket nằm trong `TRUSTED_PROXIES` (chống giả mạo header).

| Scope | Giới hạn | Cửa sổ | `byUser` | Route |
| --- | --- | --- | --- | --- |
| `posts-create` | 30 | 1 giờ | ✅ | `POST /posts` |
| `like` | 30 | 1 phút | ✅ | Like/unlike |
| `comment` | 10 | 1 phút | ✅ | `POST` bình luận |
| `follow` | 20 | 1 phút | ✅ | Follow/unfollow |
| `media` | 10 | 1 giờ | ✅ | Cấp URL upload |
| `auth-session` | 20 | 1 phút | ❌ (IP) | `POST /auth/...` đăng nhập |
| `auth-register` | 20 | 1 phút | ❌ (IP) | Đăng ký |
| `rooms-join` | 20 | 1 phút | ❌ (IP) | `POST /rooms/:code/join` |
| `rooms-read` | 240 | 1 phút | ❌ (IP) | `GET /rooms/:code` |

**Vì sao `byUser` cho hành động có đăng nhập:** một IP có thể là văn phòng, trường học, NAT của nhà mạng — hàng chục người dùng thật chung IP. Đếm theo IP sẽ khiến người này chặn người kia (một người like nhiều làm cả văn phòng không like được). Đếm theo `userId` đo đúng **hành vi của một tài khoản**, đúng mục tiêu chống spam. Ngược lại, các route **chưa có danh tính** (đăng nhập, đăng ký, join phòng bằng guest token, đọc phòng) buộc phải đếm theo IP — đó là lớp chống brute-force.

**Vì sao ngưỡng cao:** ngưỡng đặt cao hơn thao tác bình thường nhiều lần, chỉ chặn spam thật (vòng 8 đo được 10 click liên tiếp vẫn lọt nếu ngưỡng quá thấp).

**Vượt ngưỡng:** trả `429 { message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" }` kèm `Retry-After` (giây, làm tròn lên, tối thiểu 1). Response được trả **trực tiếp** bằng `c.json(..., 429, headers)` thay vì `throw ApiError`: `onError` của app dựng lại Response từ `HTTPException` nên header đặt trên context bị rơi, client không nhận được `Retry-After`.

## 6. Đo lường và kiểm thử

Các test thật đang bảo vệ cơ chế này:

| File | Số test | Nội dung chính |
| --- | --- | --- |
| `backend/test/http-cache.test.ts` | 9 | TTL/single-flight/`clear()`/`maxEntries`; `public` → `max-age`; `private` → `no-cache` không `max-age` (V3-01); `private` vẫn 304; body đổi → ETag đổi → 200 body mới |
| `backend/test/rate-limit-social.test.ts` | 3 | like: 30 request đầu 200, thứ 31 → 429 + `Retry-After`; comment: 10 đầu 201, thứ 11 → 429; follow: 20 đầu 200, lần 21 → 429 |
| `backend/test/rate-limit-ip.test.ts` | 6 | `clientIp`: không `remoteAddress` → `X-Forwarded-For`; socket ngoài `TRUSTED_PROXIES` → bỏ qua XFF giả; CIDR tin cậy → lấy IP đầu; proxy khai chính xác; không header → `unknown`; `X-Real-IP` fallback |
| `backend/test/rate-limit-user.test.ts` | 1 | `/media`: user vượt 10 URL/giờ → 429; **user khác cùng IP vẫn dùng được** (chứng minh `byUser` tách bộ đếm) |
| `frontend/src/lib/axios.test.ts` | 25 | `toApiError`, `isSessionProbeRequest`, `handleUnauthorizedResponse`, `loginRedirectUrl`, `safeRedirectPath`, đồng bộ tab, `resetSessionExpiry` |

Điểm đáng chú ý: test `rate-limit-user` khẳng định đúng lý do tồn tại của `byUser` (hai user cùng IP không chặn nhau), còn test `http-cache` khẳng định `private` **không** có `max-age` — chính là hồi quy V3-01.

## 7. Quyết định liên quan

| Mã | Nội dung liên quan |
| --- | --- |
| D-055 (mục 27) | Cache G2: `/places/:id` public 60s, `/places/map` public 30s, `/users/:handle` private 15s vì `followedByMe`; `/me` + `/notifications` `no-store`; ETag sha256 từ body nên không cần invalidate thủ công; TTL cache trong tiến trình cho `/places/suggestions` + single-flight, không thêm `lru-cache`; nhiều instance vẫn đúng nhưng mỗi instance tự nạp |
| D-055 (mục 28) | Thông báo dùng polling 60s thay vì SSE — chạy được sau proxy/restart, không cần hạ tầng thêm; ảnh hưởng trực tiếp tới việc `/notifications` phải `no-store` |
| D-055 (mục 29) | `TRUSTED_PROXIES` + `remoteAddress` — nền tảng để `clientIp` không bị giả mạo `X-Forwarded-For`, tức rate limit theo IP mới đáng tin |
| D-052 | Cache bản đồ theo vùng: khoá TanStack Query = bbox làm tròn lưới 0,01° + nới 20%; đây là cache **phía client**, không chồng chéo với `Cache-Control` của `/places/map` |
| D-056 | Bắt buộc xác thực email trước đăng nhập — làm 401/`/auth/*` có thêm nhánh nghiệp vụ, củng cố quy tắc loại trừ `/auth/*` khỏi điều hướng |
| D-057 | Ảnh responsive WebP — `Cache-Control` immutable cho `/assets/` ở nginx; không liên quan cache API |
| D-058 | `sort` là nguồn sự thật duy nhất — query key phải chứa `sort`, ảnh hưởng cache phía client của `/places` |

## 8. Chưa xác minh

- **CDN thật:** chưa có CDN trước backend trong môi trường hiện tại; hành vi `public, max-age` mới chỉ kiểm qua header và test, chưa đo cache-hit thật ở edge.
- **Nhiều instance backend:** rate limit đúng ở mức hàng Postgres (đã thiết kế cho đa tiến trình) nhưng chưa chạy thử 2+ instance thật; `createTtlCache` là cache trong tiến trình nên mỗi instance tự nạp (đã ghi ở D-055, chuyển Redis khi scale ngang nằm trong BACKLOG).
- **SSE sau proxy:** `proxy_cache off` + buffering off đã cấu hình cho `/api/v1/(notifications|rooms/[^/]+)/events` nhưng chưa đo hành vi khi có load balancer/timeout trung gian.
- **BroadcastChannel trên trình duyệt cũ:** nhánh `null` đã xử lý, chưa test trên trình duyệt thật không hỗ trợ.
- **jsdom:** test axios thay `sessionRedirect` bằng object giả nên chưa xác minh điều hướng cả trang thật trong trình duyệt.
