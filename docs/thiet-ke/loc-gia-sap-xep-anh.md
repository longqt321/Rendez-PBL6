# Thiết kế: Lọc theo giá + Sắp xếp kết quả + Ảnh responsive (srcset WebP)

> Trạng thái: bản thiết kế v1.1 — đã xử lý PASS-CÓ-ĐIỀU-KIỆN của review (M1–M7, ghi chú "bắt buộc" tại các mục tương ứng). **Tài liệu này KHÔNG sửa code, KHÔNG sửa dataset.**
> Phạm vi: bộ lọc khoảng giá + sắp xếp kết quả trên `/discover` và `/map`; giảm dung lượng tải ảnh của `/discover` bằng srcset WebP.
> Quy mô: S–M. Không thêm dependency nặng, không thêm hạ tầng mới.

**Đính chính so với đề bài:** DB của backend dùng **Prisma + Postgres** (`backend/prisma/schema.prisma`), không phải Drizzle. Mọi tham chiếu schema/index bên dưới theo Prisma.

## 1. Mục tiêu & giá trị người dùng

**Vấn đề (đo được, từ `docs/BACKLOG.md` vòng 2 & vòng 6):**
- `V2-02`: popover Lọc chỉ có Từ khoá + Loại hình — **không có lọc giá, không có sắp xếp**. 343 quán luôn hiện theo `created_at DESC`, người dùng không có cách nào ưu tiên "quán ngon" hay "gần tôi".
- `V6-04` / `V2-05`: cold transfer `/discover` **3,80 MB**; ảnh 1200×900 **JPEG 76–445 KB** (trung vị ~271 KB) — riêng 1 file PNG 2,1 MB (`noi-cafe-gm-1.png`); không `srcset`, lãng phí 60–95% pixel (card mobile chỉ rộng ~171 CSS px).

**Giá trị:** (1) bộ lọc giá hoàn thiện hợp đồng API đã có (`priceMax` đã chạy ở backend và phòng lọc nhóm) — chỉ thiếu UI; (2) sắp xếp cho phép người dùng chọn tiêu chí, đồng thời sửa lỗi "Gần đây" chỉ sắp xếp trong 9 quán đã tải; (3) ảnh responsive cắt ~2,5–3 MB khỏi lần tải đầu — cải thiện trực tiếp LCP/chi phí băng thông, không đổi giao diện.

**Chỉ số thành công — cách đo, không bịa số:**

| Chỉ số | Mục tiêu | Cách đo |
|---|---|---|
| Cold transfer `/discover` (9 card đầu) | **< 1,5 MB** (từ 3,80 MB) | Playwright: `page.evaluate` đọc `performance.getEntriesByType("resource")` và cộng `transferSize` của entry `initiatorType === "img"` (không dùng `page.on("response")` — không có `transferSize`); chạy trên **`vite preview` (build production)**, không phải dev server; đối chiếu DevTools → Network (Disable cache) |
| Tỉ lệ ảnh tải đúng biến thể | 100% request ảnh card là `.webp`, không có bản gốc | DevTools filter `Img`, kiểm `Content-Type` + tên file |
| Kích thước ảnh card thực tế | ≤ 60 KB/ảnh ở DPR 1–2 | Network panel, cột Size |
| `GET /places?sort=rating` p95 | < 150 ms (343 dòng) | log `pino` sẵn có (request id + duration), hoặc `EXPLAIN ANALYZE` một lần |
| Số request API khi đổi sort | 1 (reset về trang đầu), không tải lại toàn bộ | Network panel |

Không đặt mục tiêu kiểu "tăng 20% click" — chưa có baseline.

## 2. Hành vi người dùng kỳ vọng

### 2.1 Lọc theo giá

1. Trong popover **Lọc** (cạnh Từ khoá, Loại hình) có thêm nhóm **"Mức giá"**: `Tất cả` · `₫` · `₫₫` · `₫₫₫` — nghĩa là **"tối đa"** (khớp `priceMax` ≤ của backend), không phải "đúng mức".
2. Chọn → ghi `?priceMax=2` lên URL (dùng chung `/discover` và `/map` như các filter khác), danh sách reset về trang đầu.
3. Chip đếm `activeFilterCount` + nhãn "Quận:" hiện có cộng thêm 1 khi có `priceMax`; nút "Xoá tất cả bộ lọc" xoá luôn.
4. Khi đang ở trong **phòng lọc nhóm**, filter giá cá nhân bị ẩn/không áp dụng (giữ nguyên hành vi hiện tại: phòng quyết định `priceMax`).

### 2.2 Sắp xếp

Điều khiển **"Sắp xếp"** đặt bên phải toolbar (cạnh toggle Lưới/Bản đồ), dạng `Select` nhỏ (mobile: icon + nhãn ngắn), ghi `?sort=` lên URL:

| Lựa chọn | `sort` | Ý nghĩa |
|---|---|---|
| Mới nhất (mặc định) | `newest` (bỏ trống) | `created_at DESC, id DESC` — hành vi hiện tại |
| Đánh giá cao | `rating` | `rating DESC, review_count DESC, created_at DESC, id DESC` |
| Gần tôi | `distance` | Haversine tới vị trí người dùng, tăng dần |

- Chọn **"Gần tôi"** = bật luôn chế độ "Gần đây" hiện có (xin quyền vị trí, có `locationGate`/`locationError` sẵn). Không có vị trí → quay về `newest` + alert lỗi định vị hiện có.
- Đổi sort reset về trang đầu (cursor cũ không còn hợp lệ vì khoá sắp xếp khác) — infinite scroll tiếp tục từ trang 1.
- `/map`: sort **không** đổi thứ tự pin (bản đồ không có thứ tự), nhưng vẫn giữ trên URL để chuyển Lưới ↔ Bản đồ không mất lựa chọn. Ghi chú UI: ẩn điều khiển sort ở chế độ bản đồ nếu gây hiểu nhầm — quyết định ở bước triển khai, mặc định **giữ hiển thị** cho nhất quán bộ lọc.

### 2.2.1 `nearby=1` và `sort=distance` — MỘT nguồn sự thật (bắt buộc)

Hiện `use-discover-view.ts` (L85–109) tự `.sort()` theo `distanceKm` **phía client** khi `filters.isNearbyActive` bật. Nếu chỉ xoá đoạn sort đó, mọi link `?nearby=1` đang tồn tại (bookmark, link chia sẻ, tab đang mở) sẽ **mất sắp xếp** — danh sách quay về `created_at DESC` dù UI vẫn hiện "Gần đây" đang bật. Phải quy định rõ:

- **Nguồn sự thật duy nhất là `sort`.** `isNearbyActive` trở thành **giá trị suy ra**: `isNearbyActive === (sort === "distance")`. Không còn hai state song song.
- **Đọc URL (tương thích ngược):** `?nearby=1` không có `sort` → hiểu là `sort=distance`; `?nearby=1&sort=rating` (URL rác do sửa tay) → `sort` thắng, `nearby` bị bỏ. Chuẩn hoá ngay khi mount bằng `setParams(..., { replace: true })` để URL sạch: `nearby` bị xoá, ghi `sort=distance`.
- **Ghi URL:** toggle "Gần đây" bật → `patch({ sort: "distance" })`; tắt → `patch({ sort: null })` (về `newest`). Select "Gần tôi" và toggle "Gần đây" gọi **cùng một hàm** `setSort("distance" | "newest")` — không có hai đường ghi.
- **Tắt "Gần đây" → sort về `newest`** (không nhớ sort trước đó): giữ một luật đơn giản, tránh state ẩn "sort cũ là gì".
- `resetAll` xoá cả `sort` lẫn `nearby` (dọn luôn URL cũ).
- Hệ quả: `nearby` trở thành **alias chỉ-đọc** trong `useDiscoverFilters`; comment trong hook ghi rõ để người sau không thêm lại state thứ hai.

### 2.3 Trạng thái thiếu dữ liệu (dữ liệu thật: 343 quán, `price_level = 1` toàn bộ, gần như 0 rating/review)

Đây là phần quan trọng nhất — UI không được "giả vờ" có tính năng.

| Tình huống | Hành vi |
|---|---|
| Chưa có quán nào `priceLevel > 1` trong dữ liệu đã tải | Nhóm "Mức giá" **vẫn hiện nhưng disabled**, kèm chú thích nhỏ `aria-describedby`: "Chưa có dữ liệu phân mức giá — sẽ bật khi quán được cập nhật giá." Tự bật ngay khi có ≥ 1 quán `priceLevel > 1` (heuristic client, không cần API mới, tự lành khi corpus được làm giàu — `V2-03`). |
| Đã có dữ liệu giá, chọn `priceMax` mà rỗng | Empty state hiện có đã đúng; bổ sung câu gợi ý "Thử chọn mức giá cao hơn" khi `priceMax` là nguyên nhân duy nhất. |
| Chưa có quán nào `reviewCount > 0` trong dữ liệu đã tải | Option "Đánh giá cao" **disabled** + tooltip "Chưa có đánh giá nào". Không cho chọn rồi trả về đúng thứ tự "Mới nhất" (gây hiểu nhầm là sort hỏng). |
| Có rating nhưng nhiều quán 0 review | Server xếp quán chưa có đánh giá **xuống cuối** (`review_count = 0` sau các quán có đánh giá), trong nhóm đó theo `created_at DESC`. Không trộn quán 0 review lên đầu chỉ vì `rating = 0`. |
| "Gần tôi" khi chưa cấp quyền vị trí | Giữ nguyên luồng hiện có: `locationGate` + `locationError`; sort không đổi cho tới khi có toạ độ. |
| Quán thiếu `lat/lng` khi sort `distance` | Xếp cuối (giống logic client hiện tại: `distanceKm === undefined` → cuối). |

**Không** ẩn hẳn bộ lọc giá: hợp đồng API đã có, phòng lọc nhóm đã dùng `priceMax`; ẩn đi sẽ làm hai màn hình lệch nhau. Disabled + chú thích là trung thực và rẻ nhất.

## 3. Thiết kế API

### 3.1 `GET /places` — thêm `sort`, `lat`, `lng`

Giữ nguyên toàn bộ tham số cũ (`q, category, district, priceMax, exclude*, include*, cursor, bbox`). Thêm:

| Tham số | Giá trị | Validation (theo đúng phong cách `parsePlaceFilters`: **giá trị lạ → bỏ qua, không 400**) |
|---|---|---|
| `sort` | `newest` \| `rating` \| `distance` | Không thuộc 3 giá trị → `newest` |
| `lat`, `lng` | số thực, −90..90 / −180..180 | Thiếu hoặc không hữu hạn → `sort=distance` **rơi về `newest`** (không lỗi) |

`sort=distance` **không** dùng `bbox` (hai khái niệm khác nhau: `bbox` lọc theo khung nhìn bản đồ, `distance` sắp theo vị trí người dùng).

`/places/map` **không** nhận `sort` — bản đồ trả pin theo khung nhìn, thứ tự không có nghĩa. Nếu client gửi `sort` lên `/places/map`, bỏ qua (giữ `created_at DESC` như hiện tại).

### 3.2 Cursor keyset theo từng kiểu sắp xếp

`backend/src/lib/cursor.ts` hiện encode `{ createdAt, id }`. Mở rộng thành cursor **có tag kiểu** để không trộn khoá giữa các sort:

```ts
type Cursor =
  | { kind: "newest"; createdAt: string; id: string }
  | { kind: "rating"; rating: number; reviewCount: number; createdAt: string; id: string }
  | { kind: "distance"; distance: number; id: string }
```

- Cursor cũ (không có `kind`) đọc thành `newest` — **tương thích ngược**, link/infinite-scroll đang mở không vỡ.
- Cursor có `kind` khác `sort` hiện tại → coi như không có cursor (trả trang đầu). **Lưu ý lệch với nguyên tắc hiện có của `cursor.ts`** ("decode sai → `null` để route trả 400 thay vì lặng lẽ trả trang đầu"): ở đây cursor **hợp lệ về hình thức** nhưng thuộc khoá sắp xếp khác — trả 400 sẽ làm vỡ trang với một hành động hợp lệ của người dùng (đổi sort), còn trả trang đầu chỉ tốn một request thừa. FE luôn reset cursor khi đổi sort nên trường hợp này chỉ xảy ra với link cũ hoặc race request; trả trang đầu là hạ cánh an toàn có chủ đích. **Khi triển khai phải cập nhật comment của `cursor.ts`** để ghi nhận ngoại lệ này (nguyên tắc "không lặng lẽ" áp cho cursor decode SAI; kind ≠ sort là decode ĐÚNG nhưng ngữ cảnh đổi).
- `distance` trong cursor là khoảng cách (km, float) của dòng cuối — server tính lại Haversine với cùng `lat/lng` nên so sánh ổn định; kèm `id` để phá hoà.

### 3.3 SQL sắp xếp (trong `backend/src/lib/places.ts`)

- `newest`: giữ nguyên `ORDER BY p.created_at DESC, p.id DESC`.
- `rating`: `ORDER BY COALESCE(r.rating, 0) DESC, r.review_count DESC, p.created_at DESC, p.id DESC` — dùng lại LATERAL aggregate đã có trong `SELECT_PLACES` (không thêm subquery, không N+1). Điều kiện keyset tương ứng trên cùng biểu thức.
- `distance`: tính khoảng cách bằng Haversine trong SQL, **một biểu thức duy nhất** dùng cho cả `ORDER BY` lẫn keyset:

```sql
-- hằng số 6371 (km); toạ độ truyền qua Prisma.sql (không nối chuỗi)
(6371 * acos(least(1, greatest(-1,
  cos(radians($lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians($lng))
  + sin(radians($lat)) * sin(radians(p.lat))
))))
```

`p.lat`/`p.lng` NULL → xếp cuối (`ORDER BY ... NULLS LAST`).

**Keyset với distance NULL (bẫy SQL):** điều kiện `(distance, id) < ($d, $id)` với `distance = NULL` cho kết quả `NULL` → WHERE coi là FALSE → quán thiếu toạ độ **không bao giờ xuất hiện ở trang 2+**. Điều kiện phân trang phải tách nhánh:

```sql
(
  (distance IS NOT NULL AND (distance, id) < ($last_distance, $last_id))
  OR
  (distance IS NULL AND id < $last_id)
)
```

với `$last_distance` là khoảng cách của dòng cuối trang trước. Tương tự, keyset của `rating` phải dùng `COALESCE(r.rating, 0)` ở **cả** ORDER BY lẫn điều kiện keyset (biểu thức phải giống hệt nhau, nếu khác là trùng/sót dòng ở biên). Test bắt buộc: dataset có quán thiếu toạ độ phải đi hết được các trang khi `sort=distance`.

**Haversine phải khớp công thức client** (`calculateDistanceKm` trong `frontend/src/features/places/lib/danang-districts.ts`) để số hiển thị trên card không lệch với thứ tự. Kiểm bằng test so 2 implementation trên cùng cặp toạ độ (sai số < 0,01 km).

### 3.4 Index DB

Với **343 dòng**, cả 3 kiểu sort đều là seq scan + sort trong RAM (~1–3 ms) — **không thêm index ở vòng này**. Đây là quyết định có chủ đích, không phải bỏ sót:

| Sort | Index hiện có | Kết luận |
|---|---|---|
| `newest` | chưa có `(created_at, id)` trên `places` | Chấp nhận seq scan; thêm `@@index([createdAt(sort: Desc), id(sort: Desc)])` khi corpus > ~5.000 dòng (ghi vào BACKLOG) |
| `rating` | không thể index (aggregate `reviews`) | Chấp nhận; nếu chậm, denormalize `rating_avg`/`review_count` lên `places` + index — **ngoài phạm vi** |
| `distance` | `@@index([lat, lng])` có sẵn (dùng cho bbox) | Không giúp `ORDER BY` biểu thức; chấp nhận |
| `priceMax` | chưa có index `price_level` | 343 dòng, không cần |

Bắt buộc: chạy `EXPLAIN ANALYZE` 3 query một lần và ghi kết quả vào PR — nếu bất ngờ > 50 ms thì mở lại quyết định index.

### 3.5 Cache

`GET /places` hiện **không** dùng `jsonWithCache` (phân trang + cursor). Giữ nguyên. `GET /places/map` đang `maxAge: 30` — giữ nguyên, `sort` không ảnh hưởng.

## 4. Thiết kế UI

### 4.1 Bộ lọc giá (`discover-toolbar.tsx`)

- Thêm `Field` "Mức giá" trong `PopoverContent`, dùng `ToggleGroup` giống "Loại hình" (`size="sm"`, `aria-label="Lọc theo mức giá"`), 4 nút: Tất cả / ₫ / ₫₫ / ₫₫₫.
- `useDiscoverFilters`: thêm `priceMax: 1 | 2 | 3 | "all"` đọc từ `params.get("priceMax")` (validate 1–3, lạ → `"all"`), `setPriceMax`, tính vào `activeFilterCount`, `resetAll` xoá `priceMax`.
- `placesQueryParams`: `priceMax: room?.priceMax ?? (filters.priceMax === "all" ? undefined : filters.priceMax)` — phòng vẫn thắng filter cá nhân (giữ nguyên thứ tự ưu tiên hiện có).
- Disabled + chú thích khi dữ liệu chưa phân mức: dùng `hasPriceVariety` suy ra từ `view.placesWithDistance` (`some(p => p.priceLevel > 1)`); khi `false` render `ToggleGroup` với `disabled` + `aria-describedby` trỏ tới dòng chú thích `text-xs text-muted-foreground`.

### 4.2 Sắp xếp (`discover-toolbar.tsx`)

- `Select` (component `ui/select` sẵn có) 3 option; giá trị đọc/ghi URL qua `useDiscoverFilters` (`sort`), mặc định `"newest"`.
- Chọn `distance` → `setSort("distance")` (mục 2.2.1: cùng một hàm với toggle "Gần đây", hook `useUserLocation` xử lý quyền); tắt "Gần đây" → `setSort("newest")`. `isNearbyActive` là giá trị suy ra, không còn state riêng.
- Option `rating` disabled khi `!hasRatings` (suy ra từ dữ liệu đã tải: `some(p => p.reviewCount > 0)`).
- A11y: `Select` có `aria-label="Sắp xếp kết quả"`; option disabled kèm mô tả lý do (không chỉ tooltip — tooltip không tiếp cận được bằng bàn phím/đọc màn hình).

### 4.3 Bỏ sắp xếp khoảng cách phía client

Hiện `use-discover-view.ts` tự `.sort()` theo `distanceKm` sau khi tải trang → chỉ đúng trong 9 quán đã tải. Khi có `sort=distance` ở server:

- `useDiscoverView` truyền `sort` + toạ độ vào `serverFilters`; **xoá đoạn `.sort()` client**, chỉ giữ tính `distanceKm` để hiển thị trên card.
- `placesWithDistance` vẫn giữ nguyên shape để `PlaceCard` không đổi.
- `/map` không dùng sort nhưng vẫn hiển thị `distanceKm` như cũ.

### 4.3.1 Query key phải chứa sort + toạ độ + priceMax (bắt buộc)

`discoverQueryKey` hiện là `["places", category, district, query, room]` — **không chứa** `sort`, `priceMax` (cá nhân), toạ độ. Với `useInfiniteQuery`, key không đổi thì react-query giữ nguyên `pages` đã có và nối trang mới vào — đổi sort/toạ độ mà key cũ thì request trang 1 bị **nối vào pages cũ → card nhân đôi, thứ tự sai**. Phải thêm vào key:

- `filters.sort`
- `filters.priceMax` (cá nhân — hiện chỉ `room.priceMax` nằm trong `room`, nên key chưa đổi khi bật filter giá)
- toạ độ **làm tròn 4 chữ số thập phân** (`lat.toFixed(4)` ≈ 11 m) — chống GPS jitter: mỗi lần `watchPosition` nhích vài mét không được tạo key mới (mất cache + refetch), nhưng đổi khu vực (~100 m+) thì phải.

Hệ quả phụ: đổi sort/toạ độ tạo key mới → query cũ nằm trong cache (`staleTime` của `useDiscoverPlaces`) — quay lại sort cũ trả kết quả tức thì, chấp nhận được. Cập nhật `use-discover-places.test.ts` để khoá key theo các trường mới.

## 5. Chiến lược ảnh responsive

### 5.1 Hiện trạng (đã kiểm trong repo)

- Ảnh cold-start là **file tĩnh** trong `frontend/data/cold-start/images/venues/`: **29 file (28 JPEG 76–445 KB, trung vị ~271 KB + 1 PNG 2,1 MB)**, tổng ~9,8 MB; 20/491 quán có ảnh. Được `scripts/copy-cold-start-images.mjs` chép sang `public/data/cold-start/images/` lúc `predev`/`prebuild`. Deploy: nginx phục vụ static, Caddy/nginx phía trước — **không có image transform**.
- `PlaceCard` → `CoverImage` (`<img src>` đơn, `loading="lazy"`, `decoding="async"`), không `srcset`, không `sizes`. Hero trang chi tiết cũng dùng `CoverImage` (nên cũng `lazy` — `V2-05`).
- R2 chỉ dùng cho ảnh người dùng đăng (`POST /media` presigned PUT, `publicUrl` = `R2_PUBLIC_BASE_URL`). **R2 không có resize/transform mặc định**; bucket public qua `r2.dev` cũng không transform.

### 5.2 So sánh phương án

| Phương án | Cách làm | Ưu | Nhược | Kết luận |
|---|---|---|---|---|
| **A. Sinh biến thể lúc build, commit vào repo** (chọn) | Script sinh **2 biến thể `400`/`800`** WebP từ ảnh gốc → `frontend/data/cold-start/images/variants/...`; `copy-cold-start-images.mjs` chép luôn; FE dựng `srcset` theo quy ước tên; **ảnh gốc giữ làm ứng viên lớn nhất của srcset** (descriptor `1200w` — descriptor là chiều rộng hiển thị, không cần file cùng định dạng) | Không dependency runtime/build; Docker hiện tại không cần thêm gì; ảnh tĩnh đổi rất ít; `srcset` thuần; hero không bị mờ vì vẫn có bản gốc | Repo tăng ~4,5–5,5 MB (29 ảnh × 2 biến thể, ước lượng theo median JPEG 271 KB gốc); phải nhớ chạy lại khi thêm ảnh (có test chặn) | ✅ |
| B. Cloudflare Image Resizing (`/cdn-cgi/image/width=…`) | Bật transform trên zone Cloudflare cho domain ảnh | Không sinh file, tự động mọi kích thước | **Tính năng trả phí** của Cloudflare; ảnh cold-start hiện phục vụ từ nginx chứ không qua Cloudflare; cần trỏ domain ảnh qua CF → đổi hạ tầng | ❌ vòng này |
| C. Cloudflare Worker resize on-the-fly | Worker đọc R2 → resize → cache | Linh hoạt, không sinh file | Thêm Worker + cache + chi phí; ảnh cold-start không nằm trên R2; phức tạp cho 29 ảnh | ❌ |
| D. Sinh nhiều size **lúc upload** lên R2 | Client upload N bản / server resize sau PUT | Đúng cho ảnh người dùng | Presigned PUT hiện chỉ 1 URL; cần endpoint resize hậu kỳ + job; ảnh cold-start không đi qua luồng upload | ❌ (ghi BACKLOG cho ảnh user) |
| E. Chỉ đổi PNG → WebP một kích thước | Convert tại chỗ, không srcset | Rẻ nhất | Vẫn tải 1200px cho card 171px — không đạt mục tiêu < 1,5 MB | ❌ |

**Chọn A.** Lý do: ảnh cold-start là **dataset tĩnh, 29 file, đổi vài lần/năm** — sinh biến thể một lần là đủ, không cần hạ tầng transform. Đúng tinh thần "không overengineering, không thêm dependency nặng".

### 5.3 Quy ước biến thể & cách sinh

- Đường dẫn: `images/venues/<tên>.<ext>` → `images/variants/<tên>-400.webp`, `-800.webp` (giữ cấu trúc thư mục con). **Chỉ 2 biến thể** — đơn giản hoá có chủ đích: card không bao giờ cần > 800 CSS px thực (3 cột × max-w-6xl ≈ 370 px → DPR2 = 740), hero dùng ảnh gốc.
- Script: `frontend/scripts/generate-image-variants.sh` (hoặc `.go` theo quy ước script của dự án) dùng **ImageMagick** (`magick`, đã có trên máy dev — đã kiểm `magick -version`) với `-resize <w>x> -quality 78 -define webp:method=6`; **không chạy trong Docker build** (output commit sẵn). Nếu chọn Go: dùng `image` + encoder WebP pure-Go, phải xác minh thư viện trước khi code (không bịa API).
- `copy-cold-start-images.mjs`: giữ nguyên cơ chế walk toàn bộ `data/cold-start/images` → tự động chép cả `variants/` (không sửa logic, chỉ thêm file nguồn).
- **Test chặn lệch**: `frontend/scripts/check-image-variants.mjs` (chạy trong `test`/CI) — với mỗi ảnh gốc phải tồn tại đủ **2** biến thể; thiếu → fail kèm hướng dẫn chạy script. Tránh "quên sinh lại" âm thầm.
- Kích thước mục tiêu: 400w ≈ 25–45 KB, 800w ≈ 60–110 KB (WebP q78). Ước tổng output ~4,5–5,5 MB cho 29 ảnh × 2. Đo thực tế sau khi sinh, ghi vào PR.

### 5.4 `<img srcset>` — sửa một chỗ

`CoverImage` (dùng chung cho card, hero chi tiết, popup map) nhận thêm 2 prop tuỳ chọn:

```ts
/** Quy ước biến thể; trả undefined khi ảnh không thuộc dataset cold-start (vd. R2). */
function coldStartSrcSet(src: string): { srcSet: string; sizes: string } | undefined
```

- Chỉ áp dụng khi `src` khớp tiền tố `/data/cold-start/images/` (hoặc URL tuyệt đối cùng path) — ảnh R2 giữ nguyên `src`, không `srcset` (không có biến thể).
- `srcSet` = `"<tên>-400.webp 400w, <tên>-800.webp 800w, <ảnh gốc> 1200w"`. **Ảnh gốc là ứng viên lớn nhất** (hero/desktop DPR2 chọn nó), đồng thời là `src` fallback cho trình duyệt cũ — không cần biến thể 1200w riêng.
- `src` (fallback) = **ảnh gốc**; `type` không cần vì WebP hỗ trợ rộng (Chrome/FF/Safari 14+).
- `sizes` mặc định theo ngữ cảnh: card `(min-width: 768px) 33vw, 50vw`; hero `100vw`. Truyền qua prop `sizes` từ `PlaceCard` / trang chi tiết, không hardcode trong `CoverImage`.
- Hero trang chi tiết (`V2-05`): thêm `fetchpriority="high"` + `loading="eager"` khi `priority` prop bật (một dòng, cùng file) — sửa luôn vì cùng bề mặt ảnh và cùng mục tiêu LCP.
- Giữ nguyên `onError` → `PlacePlaceholder` (`D-050`), `decoding="async"`, `loading="lazy"` cho card.

### 5.5 Ước tính & cách đo lại

9 card đầu: trước ~3,5 MB ảnh (JPEG 1200×900 trung vị 271 KB) → sau 9 × ~30–45 KB (400w WebP ở DPR1; DPR2 lấy 800w ~60–110 KB) ≈ **0,3–1,0 MB**; tổng cold transfer (JS/CSS/font ~0,3 MB) ước **< 1,3 MB** → đạt mục tiêu < 1,5 MB.

Đo lại (bắt buộc, ghi số thật vào báo cáo):
1. `frontend/e2e/` thêm spec `image-budget.spec.ts`, chạy trên **`vite preview` (build production)** — dev server có HMR/mock nên số đo không đại diện. Dùng `page.evaluate` đọc `performance.getEntriesByType("resource")` (`PerformanceResourceTiming.transferSize`) và cộng các entry `initiatorType === "img"`, assert `< 1.5 MB` (không dùng `page.on("response")` — response không có `transferSize`); assert mọi ảnh card là `.webp` và `srcset` có ≥ 2 ứng viên.
2. DevTools → Network → **Disable cache**, reload `/discover`, đọc "Transferred" ở dòng tổng; lọc `Img` kiểm tên file.
3. Lighthouse mobile (tuỳ chọn) trước/sau để có số LCP — chỉ ghi nhận, không đặt ngưỡng mới.

## 6. File cần sửa / tạo

| # | File | Việc |
|---|---|---|
| 1 | `backend/src/lib/places.ts` | `parsePlaceFilters` thêm `sort/lat/lng`; `listPlaces` ORDER BY + keyset theo sort; hằng Haversine dùng chung |
| 2 | `backend/src/lib/cursor.ts` | Cursor có `kind`, tương thích ngược; **cập nhật comment** ghi ngoại lệ "kind ≠ sort → trang đầu" (M4) |
| 3 | `backend/src/routes/places.ts` | Truyền sort/toạ độ; cursor sai kind → trang đầu |
| 4 | `packages/schema/src/place.schema.ts` | (nếu cần) type `PlaceSort` dùng chung FE/BE — chỉ thêm type, không đổi `placeSchema` |
| 5 | `frontend/src/features/places/api/get-places.ts` | `DiscoverFilters` thêm `priceMax`, `sort`, `coords`; `placesQueryParams` map ra query |
| 6 | `frontend/src/features/places/hooks/use-discover-filters.ts` | Đọc/ghi `priceMax`, `sort` trên URL; `nearby` thành alias chỉ-đọc; `activeFilterCount`, `resetAll` |
| 7 | `frontend/src/features/places/hooks/use-discover-view.ts` | Truyền sort/toạ độ xuống server; **xoá sort client**; `isNearbyActive` suy ra từ `sort` |
| 7b | `frontend/src/features/places/hooks/use-discover-places.ts` | `discoverQueryKey` thêm `sort`, `priceMax`, toạ độ làm tròn 4 chữ số |
| 8 | `frontend/src/features/places/components/discover-toolbar.tsx` | Nhóm "Mức giá" + `Select` "Sắp xếp" + trạng thái disabled/chú thích |
| 9 | `frontend/src/components/shared/cover-image.tsx` | `srcset`/`sizes`/`priority` (một chỗ cho mọi bề mặt ảnh) |
| 10 | `frontend/src/features/places/components/place-card.tsx` | Truyền `sizes` cho card |
| 11 | `frontend/src/features/places/pages/place-detail-page.tsx` | Truyền `sizes` + `priority` cho hero |
| 12 | `frontend/scripts/generate-image-variants.sh` (mới) | Sinh biến thể WebP (chạy tay khi dataset ảnh đổi) |
| 13 | `frontend/scripts/check-image-variants.mjs` (mới) | Chặn thiếu biến thể trong CI/test |
| 14 | `frontend/data/cold-start/images/variants/**` (mới) | Output commit (29 × 2 file WebP, ~4,5–5,5 MB) |
| 15 | `frontend/src/mocks/server.ts` | Hỗ trợ `sort` (+ `lat/lng`) để dev không backend vẫn thử được |
| 16 | `docs/backend/API.md`, `docs/DECISIONS.md` | Ghi params mới + quyết định quy ước biến thể ảnh |

**Không cần migration** (không đổi schema, không thêm cột/bảng). **Không sửa dataset.**

## 7. Test

**Backend (unit + integration Postgres thật):**
- `sort` lạ/thiếu → `newest`; `sort=distance` thiếu `lat/lng` → `newest` (không 400).
- `sort=rating`: quán 0 review xuống cuối; thứ tự ổn định khi rating bằng nhau (theo `created_at`, `id`).
- `sort=distance`: thứ tự tăng dần; quán thiếu toạ độ cuối; Haversine SQL khớp `calculateDistanceKm` (sai số < 0,01 km).
- Keyset: đi hết các trang của mỗi sort không trùng/không sót (so với 1 query không phân trang); cursor `kind` khác sort → trả trang đầu; cursor cũ không `kind` vẫn đọc được.
- **Keyset `distance` với dòng cuối trang thiếu toạ độ**: dataset test có ≥ 1 quán `lat/lng = NULL`; đi hết trang 1 → 2 → … phải thấy đủ quán NULL (bắt nhánh `distance IS NULL AND id < $id`). Nếu chỉ dùng `(distance, id) < (...)` thì test này fail.
- `priceMax` vẫn đúng hành vi cũ (test sẵn có phải xanh, không sửa).

**Frontend (vitest + MSW):**
- `useDiscoverFilters`: `?priceMax=2&sort=rating` → state đúng; giá trị rác → mặc định; `resetAll` xoá cả hai.
- **Tương thích `?nearby=1`**: URL cũ → `sort === "distance"`, `isNearbyActive === true`, `nearby` bị xoá khỏi URL sau chuẩn hoá; `?nearby=1&sort=rating` → `sort === "rating"`.
- Tắt "Gần đây" → `sort === "newest"` (không nhớ sort cũ).
- `discoverQueryKey`: đổi `sort`/`priceMax`/toạ độ (khác ≥ 4 chữ số) → key khác; toạ độ nhích < 0,0001° → key **không** đổi.
- `placesQueryParams`: phòng có `priceMax` thắng filter cá nhân.
- Toolbar: `hasPriceVariety=false` → nhóm giá disabled + có `aria-describedby`; `hasRatings=false` → option "Đánh giá cao" disabled.
- `coldStartSrcSet`: URL cold-start → đúng 3 ứng viên (400/800/gốc 1200w); URL R2 → `undefined`.

**E2E (Playwright, chạy trên `vite preview`):**
- `discover.spec.ts`: chọn "Đánh giá cao" → URL `sort=rating`, request có `sort=rating`; chọn "Gần tôi" → `sort=distance` + `lat/lng`, toggle "Gần đây" ở trạng thái bật; mở link `?nearby=1` → danh sách vẫn sắp theo khoảng cách.
- `image-budget.spec.ts`: cold load `/discover` tổng `transferSize` ảnh < 1,5 MB, ảnh card là `.webp`.
- `map.spec.ts`: `?sort=distance` vẫn render pin bình thường (sort không phá bản đồ).

**Kiểm tay:** 5 breakpoint (như vòng 6) cho toolbar mới — popover không tràn, nút ≥ 44px trên mobile (lưu ý `V1-07`/`V2-04` là backlog riêng, không sửa ở đây).

## 8. Rủi ro & cách giảm

| Rủi ro | Mức | Giảm |
|---|---|---|
| Bộ lọc giá "không có tác dụng" với dữ liệu hiện tại → người dùng tưởng lỗi | **Cao** (chắc chắn xảy ra) | Disabled + chú thích rõ; tự bật khi có dữ liệu; empty state gợi ý đúng nguyên nhân |
| Sort "Đánh giá cao" trả về đúng thứ tự "Mới nhất" (0 rating) | Cao | Disabled khi chưa có review; khi có, đẩy quán 0 review xuống cuối |
| Sắp xếp khoảng cách server lệch công thức client → số trên card không khớp thứ tự | Trung bình | Dùng chung hằng số + test so 2 implementation; hiển thị vẫn là số client tính |
| Cursor đổi shape làm vỡ infinite scroll đang mở / link cũ | Trung bình | `kind` optional, mặc định `newest`; cursor kind ≠ sort → trang đầu; test tương thích |
| **Link `?nearby=1` cũ mất sắp xếp** khi xoá sort client | **Cao** | `nearby` thành alias chỉ-đọc → `sort=distance` (mục 2.2.1); E2E mở link cũ kiểm thứ tự |
| Query key thiếu `sort`/toạ độ → card nhân đôi khi đổi sort | **Cao** | Thêm vào `discoverQueryKey` (mục 4.3.1) + test khoá key; toạ độ làm tròn 4 chữ số chống jitter |
| Keyset `distance` bỏ sót quán thiếu toạ độ (NULL) | Trung bình | Nhánh `distance IS NULL AND id < $id` (mục 3.3) + test có quán NULL |
| Quên sinh lại biến thể khi thêm ảnh → ảnh mới không có srcset (vẫn chạy nhờ fallback `src`) | Trung bình | Script check trong CI fail; fallback luôn là ảnh gốc nên không vỡ ảnh |
| Repo tăng ~4,5–5,5 MB vì biến thể commit | Thấp | Chỉ 29 ảnh × 2; chấp nhận (repo đã có ~9,8 MB ảnh gốc) |
| Ảnh gốc PNG 2,1 MB vẫn tồn tại (fallback + ứng viên 1200w) | Thấp | Trình duyệt hiện đại chọn WebP ở card; hero desktop vẫn có thể tải PNG nếu DPR2 — cân nhắc nén ảnh gốc khi làm giàu corpus (`V2-03`) |
| Haversine + keyset float gây trùng/sót dòng ở biên | Thấp | `id` phá hoà; test đi hết trang so với query không phân trang |
| `/map` hiển thị sort nhưng không đổi thứ tự → hiểu nhầm | Thấp | Ghi chú UI hoặc ẩn ở chế độ bản đồ (quyết định khi triển khai); không đổi hành vi pin |

## 9. Ngoài phạm vi (KHÔNG làm vòng này)

- **Không** thêm index DB / denormalize `rating_avg` (chỉ khi corpus lớn — ghi BACKLOG).
- **Không** đổi schema, **không** migration, **không** sửa dataset hay `price_level`.
- **Không** Cloudflare Image Resizing / Worker / transform CDN (tốn phí, đổi hạ tầng).
- **Không** resize ảnh **lúc upload** lên R2 (ảnh người dùng) — ghi BACKLOG riêng; ảnh R2 tiếp tục dùng `src` gốc.
- **Không** AVIF (thêm bước encode, lợi ích biên so với WebP ở kích thước này).
- **Không** sửa `imageHeight` cố định / masonry theo breakpoint (`V2-04`) — việc riêng, ảnh hưởng layout.
- **Không** làm giàu corpus (tags/giá/giờ mở cửa — `V2-03`).
- **Không** thêm analytics/sự kiện đo hành vi lọc-sắp xếp.
- **Không** sửa tiêu đề `h1 sr-only` (`V2-01`), tap target (`V1-07`), hay các mục UX khác trong BACKLOG.
