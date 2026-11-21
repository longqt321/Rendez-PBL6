# Thiết kế: Tìm người + gợi ý theo dõi

> Trạng thái: đã triển khai (2026-11-12) — lưu làm tài liệu thiết kế tham chiếu.
> Phạm vi: hoàn chỉnh trải nghiệm tìm người ở tab "Người" của `/search` + gợi ý người nên theo dõi.

## 1. Mục tiêu & giá trị người dùng

**Vấn đề:** `GET /users?q=` đã thật (F3), nhưng tab "Người" chỉ là danh sách tên — **không có nút theo dõi ngay trong kết quả** (phải bấm vào hồ sơ rồi mới follow), và **không có cách nào tìm người khi không biết tên** (BACKLOG V3-02: "không có user directory"; V6-03: guest bấm theo dõi không có phản hồi). Feed "Đang theo dõi" rỗng thì chỉ có empty state trống trơn (BACKLOG mục "Feed following chưa gợi ý người để theo dõi").

**Giá trị:** biến tab "Người" từ danh sách tra cứu thành bề mặt *kết nối*: theo dõi ngay trong kết quả, và khi không biết tìm ai thì hệ thống gợi ý người dựa trên tín hiệu dữ liệu sẵn có (quán chung, bạn chung, hoạt động gần đây).

**Chỉ số thành công — cách đo, không bịa số:**

| Chỉ số | Cách đo | Nguồn |
|---|---|---|
| Tỉ lệ phiên tab "Người" có bấm "Theo dõi" | log FE console `follow_from_search_click` (không cần backend analytics vòng này) | FE |
| Số follow thực hiện từ kết quả tìm kiếm vs từ trang hồ sơ | so sánh log FE hai sự kiện | FE |
| Thời gian đáp ứng `GET /users/suggestions` | log `pino` sẵn có | backend log |
| Tỉ lệ gợi ý bị bỏ qua (hiện nhưng không bấm) | log `suggestion_shown` / `follow_from_suggestion_click` | FE |

## 2. Hành vi người dùng kỳ vọng

**Tab "Người" của `/search?q=…` (đã đăng nhập):**

1. Mỗi kết quả có **nút "Theo dõi"/"Đang theo dõi"** ở cột phải (thay icon `UsersIcon` tĩnh hiện tại). Bấm là follow ngay, không rời trang; nút đổi trạng thái tức thì (optimistic), bấm lại là unfollow.
2. Bản thân (`isMe`) **không** có nút — giữ nguyên text "(bạn)".
3. Trên danh sách kết quả có khối **"Gợi ý theo dõi"** (tối đa 5 người, hàng ngang cuộn được trên mobile, grid trên desktop). Khối chỉ hiện khi có gợi ý; tìm kiếm vẫn là nội dung chính.
4. **Kết quả rỗng** → empty state có CTA: nếu có gợi ý thì hiện luôn khối gợi ý kèm dòng "Không tìm thấy ai tên này — thử những người này"; nếu chưa đăng nhập thì CTA "Đăng nhập để xem gợi ý".

**Guest (chưa đăng nhập):**

5. Tab "Người" vẫn tìm được (endpoint công khai). Nút "Theo dõi" **vẫn hiện**; bấm → điều hướng `/login?next=/search?q=…` (khắc phục luôn V6-03 — hành vi rõ ràng thay vì im lặng). Khối gợi ý không hiện cho guest (endpoint cần đăng nhập), thay bằng dòng mời đăng nhập trong empty state.

**Trạng thái phụ (khối gợi ý):**

- Loading: 3 skeleton hàng user (khớp skeleton tab Người đã có).
- Lỗi / rỗng / guest: **thu gọn im lặng** — gợi ý là tính năng "thêm", không được phá trang tìm kiếm.
- Đang theo dõi hết những ai được gợi ý → khối tự biến mất (endpoint lọc sẵn).

**Không có:** "không gợi ý người này nữa" (dismiss), trang user directory riêng, gợi ý trong feed — xem mục 8.

## 3. Thiết kế API

### 3a. Endpoint mới `GET /api/v1/users/suggestions`

Đặt trong `backend/src/routes/users.ts`, **đứng trước `/users/:handle`** (Hono khớp theo thứ tự khai báo — `suggestions` khai sau sẽ bị nuốt bởi `:handle`).

Lý do không mở rộng `GET /users?q=`: tìm kiếm và gợi ý là hai nghiệp vụ khác nhau (khác tham số, khác hợp đồng, khác cache, khác điều kiện đăng nhập) — trộn vào một route vi phạm "một nghiệp vụ một nơi". `GET /users?q=` **giữ nguyên không đổi**. Khai báo route trước `/users/:handle` — cùng pattern đã dùng cho `/places/suggestions` (đứng trước `/places/:id`, comment ngay tại đó trong `backend/src/routes/places.ts`).

### Request

Không tham số. Yêu cầu đăng nhập (`requireAuth`) — gợi ý phụ thuộc người xem; guest gọi → 401 chuẩn (FE không gọi khi guest nên không gặp trong thực tế).

### Response (zod — thêm vào `packages/schema/src/profile.schema.ts`)

```ts
export const userSuggestionSchema = z.object({
  user: userProfileSchema,   // dùng nguyên userProfileSchema — FE tái dùng mọi thứ
  reason: z.string(),        // "Cùng quan tâm 2 quán" | "Có 1 người theo dõi chung" | ...
})
export const userSuggestionsSchema = z.object({
  items: z.array(userSuggestionSchema).max(5),
})
```

Dùng `userProfileSchema` đầy đủ (có `followedByMe`, `followerCount`, `initials`) để render đúng nút follow mà không cần gọi thêm gì.

### Cache policy

- `followedByMe` phụ thuộc người xem → dùng **`noStore(c, body)`** có sẵn trong `backend/src/lib/http-cache.ts` (đã xác minh: helper này set `Cache-Control: no-store`), **không** dùng `jsonWithCache` — kể cả `scope: "private"` vẫn cho trình duyệt lưu body (`private, no-cache`), đúng bài học V3-01 nên không áp dụng cho dữ liệu cá nhân hoá hoàn toàn như gợi ý. Integration test assert **chính xác** header `Cache-Control: no-store`.
- Server-side: 1 batch query gom số đếm thô (mục 5) — không cần cache tầng ứng dụng với corpus hiện tại (42 users).

### Rate limit

Không áp dụng — GET đọc-only, đăng nhập, chi phí một batch query nhỏ, tương đương `GET /users?q=` (cũng không có limit). Follow/unfollow đã có `FOLLOW_RATE_LIMIT` 20/phút sẵn (V8-04 đã xử lý).

### Lỗi

- Chưa đăng nhập: 401 shape chuẩn (D6).
- Không có gợi ý (corpus quá nghèo / đã follow hết): `200 { items: [] }` — **không phải 404**; FE coi rỗng = thu gọn khối.
- Lỗi DB: 500 shape chuẩn — FE thu gọn im lặng.

## 4. Thiết kế dữ liệu

**Không cần bảng mới, không cần migration.** Toàn bộ tín hiệu đã có sẵn:

| Tín hiệu | Bảng | Index sẵn có |
|---|---|---|
| Quán chung đã đánh giá | `reviews` (`place_id`, `author_id`) | `reviews_place_id_created_at_idx` |
| Quán chung đã lưu (collection **công khai**) | `collection_places` JOIN `collections` (`is_private = false AND deleted_at IS NULL`) | `collection_places_collection_id_position_idx`, `collections_owner_id_created_at_idx` |
| Quán chung qua bài đăng | `posts` (`place_id IS NOT NULL AND deleted_at IS NULL`) | `posts_place_id_idx`, `posts_author_id_created_at_idx` |
| Bạn chung | `follows` (PK `(follower_id, following_id)` + `follows_following_id_idx`) | đủ cho cả hai chiều |
| Hoạt động gần đây | `posts` (`author_id`, `created_at`), `reviews` | `posts_author_id_created_at_idx`, `reviews_place_id_created_at_idx` |

> [!IMPORTANT]
> **Không dùng `post_saves` và collection riêng tư làm tín hiệu.** Lưu bài/collection là hành vi riêng tư — dùng nó để suy ra "hai người cùng quan tâm quán X" là rò rỉ dữ liệu riêng tư (BLOCKER B1 của review). `sharedPlaces` chỉ đếm từ nguồn công khai: `reviews`, `collection_places` thuộc collection `isPrivate = false AND deleted_at IS NULL`, và `posts` gắn địa điểm (bài chưa xoá). Unit test bắt buộc: candidate chỉ có tín hiệu từ `post_saves`/collection riêng tư → `sharedPlaces = 0`, reason không phải "Cùng quan tâm".

> [!NOTE]
> Dự án dùng **Prisma** (không phải Drizzle) — migration/schema thao tác qua `backend/prisma/schema.prisma` và `$queryRaw` với `Prisma.sql`.

Lưu ý đã kiểm chứng: `follows` chỉ có index `@@index([followingId])`, nhưng **PK `(follower_id, following_id)` tự phủ prefix `follower_id`** — query "những người tôi theo dõi" và "bạn chung" dùng được, không cần thêm index. Với 42 users thì mọi query đều là quét nhỏ; index chỉ là biên phòng cho tương lai, không thêm gì vòng này (tránh overengineering).

## 5. Thuật toán gợi ý

### Dữ liệu thật (đã query DB 2026-11-12, `rendez-postgres`)

- **42 users, 1 follow, 1 review, 4 posts, 1 post_save, 2 collection_places.**
- 343 quán (từ báo cáo của "Gợi ý hôm nay"), gần như không review thật.

⇒ **Mọi tín hiệu cá nhân hoá hiện gần như = 0 với mọi cặp người dùng.** Thuật toán phải *suy giảm duyên dáng* (graceful degradation): khi tín hiệu đủ thì cá nhân hoá, khi thiếu thì trả về thứ tự ổn định, hợp lý, không trống trơn.

### Công thức (hàm `suggestUsersToFollow(viewerId)` — module mới `backend/src/lib/user-suggestions.ts`)

Ứng viên: mọi user `deleted_at IS NULL`, **loại**: chính mình, người mình đã theo dõi. (Người theo dõi mình nhưng mình chưa follow lại *vẫn đủ điều* — đây là gợi ý tốt nhất.)

Bước 1 — **Điểm tín hiệu** (mỗi ứng viên, tính trong TS):

```
score = 3.0 × sharedPlaces          // số quán chung từ nguồn CÔNG KHÁI (mục 4): tôi review/gắn place X, họ cũng vậy
      + 2.0 × mutualFollows         // số người tôi follow mà cũng follow họ
      + 1.5 × ln(1 + recentActivity) // posts + reviews của họ trong 30 ngày qua
      + 0.5 × isNew                 // tham gia trong 30 ngày qua
```

Trọng số chọn theo độ tin cậy: hành vi trùng quán (chủ đích, hiếm) > bạn chung (xã hội) > hoạt động gần đây (mức độ sống động) > tài khoản mới. Các hệ số là hằng số named const trong module — **không cấu hình qua env** (không có nhu cầu chỉnh runtime).

Bước 2 — **Tiebreak ổn định có biến tấu:** khi điểm bằng nhau (trường hợp hiện tại: gần như luôn), sắp theo `md5(viewerId || userId || today)` tăng dần — hash seeded theo ngày nên:

- cùng ngày refetch nhiều lần → cùng thứ tự (không nhảy loạn giữa các request — đây là query on-demand, phải ổn định trong ngày);
- ngày mai → thứ tự đổi nhẹ, người dùng thấy "có gì mới" khi quay lại;
- khác viewer → khác thứ tự (ai cũng thấy góc riêng, không ai là "đứng đầu vĩnh viễn").

`today` chốt là **UTC `YYYY-MM-DD`** (từ `new Date().toISOString().slice(0, 10)` — một dòng, không cần Intl; múi giờ của tiebreak không cần khớp Asia/Ho_Chi_Minh vì chỉ dùng để xoay thứ tự, không có ý nghĩa nghiệp vụ).

**Phân tầng SQL/TS (MAJOR M1 của review):** SQL chỉ làm việc *gom số đếm thô* — một batch query (CTE) trả về mỗi ứng viên: `id, sharedPlaces, mutualFollows, followsMe, recentActivity, createdAt` (JOIN/LEFT JOIN đếm trên `reviews`, `collection_places` qua collection công khai, `posts`, `follows` hai chiều). **Toàn bộ score, reason, tiebreak md5 và `LIMIT 5` tính trong hàm thuần TS** (`rankSuggestions(candidates, viewerId, today)` trong `user-suggestions.ts`, dùng `createHash("md5")` của `node:crypto` — không thêm dependency). Nhờ vậy unit test thuần hàm ở dưới chạy thật trên dữ liệu giả mà không cần DB, và logic nghiệp vụ không nằm rải trong chuỗi SQL khó test. Sau khi chọn 5 người, dùng pattern đếm GROUP BY sẵn có của `GET /users` để lấy `postCount`/`followerCount`/`followingCount`/`followedByMe` cho cả trang (không N+1 — A6.9).

Bước 3 — **`reason` trung thực** (dựng từ dữ liệu có thật, không bịa):

| Điều kiện | reason |
|---|---|
| `sharedPlaces >= 1` | `Cùng quan tâm N quán` |
| `mutualFollows >= 1` | `Có N người theo dõi chung` |
| họ follow tôi, tôi chưa follow lại | `Theo dõi bạn` |
| `recentActivity >= 1` | `Đang hoạt động gần đây` |
| `isNew` | `Mới tham gia Rendez` |
| còn lại | `Gợi ý cho bạn` |

Lấy reason có độ ưu tiên cao nhất khớp (thứ tự như bảng). Bài học từ V3-04 (gợi ý địa điểm lộ chuỗi nội bộ): reason chỉ nói về dữ liệu công khai, **không nhúng tên người dùng khác** ("Có 2 người theo dõi chung", không phải "Có dung, long theo dõi chung").

Bước 4 — **Giới hạn:** trả tối đa 5 người (chọn trong `rankSuggestions` sau khi sắp điểm + tiebreak).

### Kiểm thử thuật toán

Unit test `backend/test/user-suggestions.test.ts` (thuần hàm `rankSuggestions(candidates, viewerId, today)` — nhận mảng số đếm thô, không cần DB):

1. Cùng `(candidates, viewerId, today)` → kết quả giống hệt (deterministic).
2. Khác `today` → thứ tự tiebreak đổi (chạy 30 ngày giả lập).
3. Khác `viewerId` → thứ tự tiebreak có thể khác.
4. `sharedPlaces` cao hơn được xếp trên `recentActivity` cao hơn (đúng trọng số).
5. reason khớp bảng ưu tiên (mỗi nhánh một case).
6. Corpus rỗng tín hiệu (mọi score = 0) → vẫn trả đủ 5 người theo hash, không crash.
7. **B1:** candidate chỉ có tín hiệu từ `post_saves`/collection riêng tư → `sharedPlaces = 0`, reason không phải "Cùng quan tâm" (test ở tầng query: seed 1 post_save chung, không có review/collection công khai → sharedPlaces = 0).
8. Candidate `deleted_at IS NOT NULL` bị loại khỏi kết quả.
9. Reason không chứa name/handle của bất kỳ user nào khác (assert chuỗi không chứa tên seed).

Integration test trong `backend/test/users.test.ts` (Postgres thật, pattern sẵn có): seed 2 users + 1 follow + 1 review chung → `GET /users/suggestions` trả đúng shape, loại chính mình và người đã follow, reason đúng, header **chính xác `Cache-Control: no-store`** (assert chuỗi nguyên vẹn, không chỉ "không có max-age"), 401 guest.

## 6. Thiết kế UI

### Vị trí

Trong `frontend/src/features/search/pages/search-page.tsx`, tab `people`:

```
[TabsList]
[SuggestionsSection]  ← mới: "Gợi ý theo dõi" + tối đa 5 hàng user
[danh sách kết quả / skeleton / empty + CTA]
```

Khối gợi ý render **độc lập với trạng thái kết quả** (kể cả khi kết quả loading/lỗi), ẩn khi: guest, rỗng, lỗi.

### Component & hook mới

- `frontend/src/features/search/components/user-suggestions-section.tsx`:
  - `h2` nhìn thấy được "Gợi ý theo dõi" (bài học V6: không dùng heading sr-only).
  - Hàng user: tái dùng cấu trúc `Item variant="outline"` của tab Người (avatar + tên + @handle + nút follow) — **không viết card mới**.
  - Mobile: `grid grid-cols-1` (5 hàng ngắn, không cần carousel); desktop: `grid-cols-2 lg:grid-cols-3` gọn chiều cao.
- `frontend/src/features/search/api/get-user-suggestions.ts` — pattern `get-users.ts` (axios chung, AbortSignal).
- `frontend/src/features/search/hooks/use-user-suggestions.ts` — `useQuery({ queryKey: ["users", "suggestions"], enabled: !!me, staleTime: 60_000, retry: 1 })` (không nhét `me?.id` vào key — dữ liệu đã `no-store`, không thể ăn cache chéo giữa các tài khoản; key gọn để invalidate theo prefix `["users"]`); lỗi/rỗng → component return `null`.
- `frontend/src/features/search/components/follow-button.tsx` — nút follow dùng chung cho kết quả tìm kiếm + khối gợi ý; variant `sm`; xử lý guest bằng **`loginRedirectUrl()` có sẵn** trong `frontend/src/lib/axios.ts` (đã encode `next`, chặn `//evil.com` — có unit test riêng) + `useNavigate`, không tự dựng chuỗi `/login?next=`.

### Nút follow trong danh sách — tái dùng mutation có sẵn

`useSetFollow(handle)` hiện chỉ patch cache `profileQueryKey(handle)`. **Sửa tối thiểu** hook này (không tạo abstraction song song — "một nghiệp vụ một nơi"):

- `onSettled` thêm `invalidateQueries({ queryKey: ["users"] })` — làm mới cả kết quả tìm kiếm lẫn gợi ý (cùng prefix key `["users", …]`).
- Optimistic patch **hai shape riêng** (duyệt theo từng shape, không viết một hàm chung cứng — pattern `patch-post-in-cache.ts`):
  - Kết quả tìm kiếm: cache là `InfiniteData<Page<UserProfile>>` → patch `followedByMe`/`followerCount` trong `pages.flatMap(p => p.items)` rồi trả lại object mới;
  - Gợi ý: cache là object phẳng `{ items: UserSuggestion[] }` → patch trực tiếp `items`.

Nút trong kết quả tìm kiếm gọi `useSetFollow(user.handle)` — mỗi hàng một instance hook là chấp nhận được (danh sách ≤ 20 hàng, đúng pattern component hóa hiện có).

### Trạng thái

| Trạng thái | Tab Người hiển thị |
|---|---|
| Loading kết quả | skeleton như hiện tại |
| Lỗi kết quả | `ErrorState` như hiện tại (gợi ý vẫn hiện nếu tải được) |
| Kết quả rỗng | `Empty` hiện tại + dòng phụ: gợi ý (nếu có) đã nằm phía trên; guest → link "Đăng nhập để xem gợi ý theo dõi" |
| Guest bấm follow | điều hướng `/login?next=<path hiện tại + query>` |
| Follow thành công | nút đổi "Đang theo dõi" (optimistic), đếm follower +1 |

### A11y & dark mode

- Nút follow là `<button>` thật có nhãn văn bản (không icon trần); trạng thái "Đang theo dõi" đổi cả text — không chỉ màu.
- Khối gợi ý là `section` có `h2`; danh sách `ul > li` như lưới hiện tại.
- Màu kế thừa token theme (`variant="outline"`, `text-muted-foreground`), không hardcode.

## 7. Kế hoạch triển khai

Chia 3 bước nhỏ, mỗi bước typecheck/lint/test xanh riêng:

| Bước | Việc | File chạm |
|---|---|---|
| 1. Backend | Module gợi ý + endpoint + schema zod + test | `backend/src/lib/user-suggestions.ts` (mới), `backend/src/routes/users.ts`, `packages/schema/src/profile.schema.ts`, `backend/test/user-suggestions.test.ts` (mới), `backend/test/users.test.ts`, `docs/backend/API.md` |
| 2. FE data | API + hook + sửa `useSetFollow` + test | `frontend/src/features/search/api/get-user-suggestions.ts` (mới), `hooks/use-user-suggestions.ts` (mới), `frontend/src/features/profile/hooks/use-set-follow.ts` |
| 3. FE UI | Component + chèn vào trang + mock + e2e | `components/user-suggestions-section.tsx` (mới), `components/follow-button.tsx` (mới), `pages/search-page.tsx`, `frontend/src/mocks/server.ts`, `frontend/e2e/search.spec.ts` (mới hoặc thêm vào spec có sẵn) |

**Tổng: ~2 file sửa backend + ~5 file mới FE + 2 file sửa FE + 2 file test backend + 1 spec e2e. Không migration.**

Test cần viết:

- Backend unit: thuật toán (6 case mục 5).
- Backend integration (Postgres thật): shape endpoint, loại self/đã-follow, reason, header chính xác `Cache-Control: no-store`, 401 guest.
- FE unit: `use-user-suggestions` (mock MSW) — rỗng/lỗi → không render; `useSetFollow` — patch đúng cả hai shape cache (`InfiniteData` của search + `{items}` của suggestions).
- E2E mock (`search.spec.ts`): tab Người có nút follow, bấm đổi trạng thái sang "Đang theo dõi"; **bấm lại → về "Theo dõi" (unfollow)**; khối "Gợi ý theo dõi" hiện với mock; mock trả rỗng → khối biến mất; guest bấm follow → về `/login`.

**Rủi ro & cách giảm:**

| Rủi ro | Mức | Giảm |
|---|---|---|
| Gợi ý vô nghĩa khi corpus nghèo (hiện tại: 42 users, ~0 tín hiệu) | Cao | Thuật toán suy giảm duyên dáng: fallback hash seeded theo ngày + reason trung thực "Gợi ý cho bạn"; đo `follow_from_suggestion_click` để biết gợi ý có giá trị thật trước khi đầu tư thêm tín hiệu |
| Route `suggestions` bị nuốt bởi `/users/:handle` | Thấp | Khai báo route trước `/users/:handle` (pattern đã dùng cho `/places/suggestions`); test integration gọi đúng endpoint |
| Nút follow trong danh sách patch cache sai (nút đứng im) | Trung bình | Tái dùng đúng `useSetFollow` + invalidate prefix `["users"]`; e2e mock bấm follow → assert nút đổi text |
| Guest bấm follow vẫn im lặng (V6-03 tái diễn) | Trung bình | `follow-button.tsx` là điểm duy nhất xử lý guest — điều hướng `/login?next=`; e2e case riêng |
| Query gợi ý đắt khi users tăng (JOIN nhiều bảng) | Thấp | 1 batch CTE gom số đếm thô + chọn 5 trong TS; corpus hiện 42 users; nếu sau này chậm, thêm materialized/ttl cache — ghi BACKLOG, không làm trước |
| Reason lộ thông tin người khác (V3-04) | Thấp | reason chỉ đếm số, không nhúng tên; unit test chặn |

## 8. Ngoài phạm vi (không làm vòng này)

- **Khối "Gợi ý theo dõi" trong empty state của feed "Đang theo dõi"** (`/social`) — BACKLOG mục riêng; sau khi endpoint gợi ý ổn, chỉ cần chèn component — làm vòng sau.
- Trang user directory (`/people`) không cần từ khoá.
- Nút "không gợi ý người này nữa" (dismiss/persist).
- Gợi ý theo nội dung bài viết (từ khóa caption) — cần corpus bài viết lớn hơn nhiều (4 bài hiện tại).
- Chặn/block người dùng (chưa có bảng).
- Follow request cho hồ sơ riêng tư (`privateProfile` hiện chỉ ẩn tab saved/pinned — giữ nguyên ngữ nghĩa).
- Analytics backend (bảng event) — vòng này chỉ log FE console.
- Sửa `GET /users?q=` (thêm filter/sort) — đã đủ cho tìm theo tên/username.
