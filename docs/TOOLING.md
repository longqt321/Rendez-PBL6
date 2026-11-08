# TOOLING — phần còn "tự chế" và công cụ cần tải thêm

Tài liệu này trả lời câu hỏi: **sau khi chuẩn hoá (D-025), còn chỗ nào phải tự viết vì dự án chưa
cài công cụ tương ứng, và nên tải thêm gì?**

Mọi số liệu dưới đây đọc từ `bun pm view --json <pkg>` trên chính máy này, không phải từ trang chủ.

## 1. Đã giải quyết trong D-025

| Trước (tự chế) | Nay dùng | Ghi chú |
| --- | --- | --- |
| `use-user-location.ts` tự gọi `navigator.geolocation` | `useGeolocation` — `@uidotdev/usehooks@2.4.1` | MIT, 6,7 kB gzip, peer `react>=18` |
| `use-infinite-scroll.ts` với `addEventListener("scroll")` | `useIntersectionObserver` — cùng package | trả callback ref |
| `use-debounced-value.ts` với `setTimeout` | `useDebounce` — cùng package | |
| Banner cảnh báo tự dựng bằng `div` + `amber-*` | `Alert` + `AlertTitle` + `AlertDescription` | shadcn registry |
| Nút bật/tắt `<Button aria-pressed>` | `Toggle` / `ToggleGroup` | `@base-ui/react/toggle` đã cài |
| `<label>` + `<input>` thô | `Field` + `FieldLabel` + `FieldError` | shadcn registry |
| `"₫".repeat(priceLevel)` ở 4 nơi | `priceLevelLabel()` / `priceLevelAriaLabel()` | `places/lib/price-level.ts` |
| `toFixed(1)`, `toLocaleDateString`, `Intl.*` rải rác | `formatRating` / `formatDate` / `formatCoordinate` | `lib/format.ts` |
| 13 chỗ `rounded-[0.25/0.2/0.15rem]` | `rounded-surface` / `rounded-control` / `rounded-thumb` | token trong `index.css` |
| `amber-400` cho sao đánh giá | `text-star` / `fill-star` | token `--star` ở cả 4 skin |

## 2. Còn tự chế — không có package nào thay thế hợp lý

| Chỗ | Vì sao giữ | Đã kiểm |
| --- | --- | --- |
| `places/lib/danang-districts.ts` → `calculateDistanceKm` | 12 dòng Haversine. `@turf/distance` (MIT, 14,2 kB) làm được nhưng kéo thêm `@turf/helpers`, `@turf/invariant`, `@types/geojson`, `tslib` — 4 gói cho 1 phép tính. Leaflet có `L.latLng(a).distanceTo(b)` nhưng kéo cả Leaflet vào lưới `/discover` nơi không cần bản đồ. | `@types/leaflet` dòng 148 có `distanceTo`; `@turf/distance` unpacked 14.215 B |
| `lib/share.ts` | Web Share API + Clipboard API là API trình duyệt, không cần gói. `react-share` (MIT, 578 kB) là bộ nút mạng xã hội, không dùng được cho "share link hệ điều hành". | `react-share@6.1.0` unpacked 578.540 B |
| `lib/format.ts` → `formatRelativeTime` | `Intl.RelativeTimeFormat` đã lo toàn bộ phần chữ; vòng lặp chỉ chọn đơn vị lớn nhất. `date-fns` (≈ 30 kB cho `formatRelative`) không thay được vì cần locale tiếng Việt đầy đủ. | đang chạy `Intl` gốc |
| `components/shared/seed-image.tsx` | Chỉ là `<img>` + URL picsum tất định. Sẽ bị xoá khi backend trả `coverUrl`. | — |
| `places/lib/category-meta.ts` | Bảng nhãn 6 dòng, là dữ liệu nghiệp vụ chứ không phải logic. | — |
| `L.divIcon({ html })` trong `places-map.tsx` / `place-mini-map.tsx` | Leaflet **bắt buộc** nhận HTML string cho `divIcon`; không có API JSX. Cách đúng là `renderToStaticMarkup(<Icon />)` từ `react-dom/server` (đã có sẵn trong `react-dom@19.3.1`) thay vì copy path SVG bằng tay. | đã chạy thử `renderToStaticMarkup` |
| `rating-stars.tsx` | Không có component `rating` trong registry shadcn (`bunx shadcn view rating` → lỗi). Đã chuyển phần nhập điểm sang `RadioGroup` + `RadioGroupItem` (đã cài) để giữ bàn phím + trình đọc màn hình; icon sao vẫn là `StarIcon`. | `shadcn@4.23.0 view rating` → "Something went wrong" |
| `use-search-query-sync.ts` | Đồng bộ ô tìm kiếm với `?q=`. `nuqs` (MIT, 480 kB) làm được và **có adapter `react-router/v8`** nhưng thêm 480 kB + `@standard-schema/spec` cho một ô nhập. Xem mục 3 nếu sau này có nhiều tham số URL. | `nuqs@2.10.2` có `./adapters/react-router/v8` |

## 3. Nên tải thêm — khi nào và vì sao

Xếp theo mức độ chắc chắn có nhu cầu. **Chưa cài gói nào trong mục này** — mỗi gói cần một mục
`DECISIONS.md` riêng theo quy định dự án.

### 3.1. Cần ngay khi có nhiều địa điểm trên bản đồ — `react-leaflet-cluster`

Hiện `places-map.tsx` render **một `Marker` cho mỗi địa điểm**. Với 30 địa điểm thì ổn; với dữ liệu
thật của một thành phố (hàng trăm quán) marker sẽ chồng lên nhau và DOM phình.

| | |
| --- | --- |
| Version | `4.1.3` |
| License | MIT (file `LICENSE`: "MIT License, Copyright (c) 2021 A. Kürşat Uzun") |
| Unpacked | 14.667 B + `leaflet.markercluster@1.5.3` |
| Peer | `react-leaflet ^5.0.0` ✅ (đang dùng 5.0.0), `leaflet ^1.9.0` ✅, `react ^19.0.0` ✅ |
| Cách dùng | `<MarkerClusterGroup>{markers}</MarkerClusterGroup>` |

Phương án khác: `supercluster@9.1.0` (ISC, 73.440 B) là thuật toán thuần, phải tự vẽ cụm.

### 3.2. Khi làm kéo thả sắp xếp bộ sưu tập — `@dnd-kit`

Đã ghi ở `BACKLOG.md` (mục "Nhóm Core Engagement"). Hiện chỉ có nút xoá từng địa điểm.

| | |
| --- | --- |
| Gói | `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` |
| License | MIT (cả hai) |
| Unpacked | 1.066.148 B + 234.022 B |
| Peer | `react >=16.8` ✅ |
| Vì sao | Là bộ DnD chuẩn de-facto cho React, hỗ trợ bàn phím + trình đọc màn hình (điều tự viết pointer handling rất khó làm đúng) |

### 3.3. Khi có nhiều tham số lọc trên URL — `nuqs`

`/discover` đã có `?q=`, `?district=`, `?category=`, `?nearby=`. Hiện mỗi tham số tự đọc/ghi bằng
`useSearchParams` + `useEffect`. `nuqs` gom thành `useQueryState("district", parseAsString)`.

| | |
| --- | --- |
| Version | `2.10.2` |
| License | MIT |
| Unpacked | 480.252 B |
| Peer | `react-router ^5 \|\| ^6 \|\| ^7 \|\| ^8` ✅ (đang dùng 8.5.1) |
| Export đã kiểm | `./adapters/react-router/v8` tồn tại trong `package.json` |
| Điều kiện nên cài | Khi số tham số URL ≥ 4 hoặc cần `parseAsInteger`/`parseAsArrayOf`/`parseAsBoolean` cho từng tham số |

### 3.4. Khi danh sách dài cần ảo hoá — `@tanstack/react-virtual`

`/notification` render toàn bộ, `/social` render 10 bài. Chưa cần. Khi có hàng nghìn hàng:

| | |
| --- | --- |
| Version | `3.14.26` |
| License | MIT |
| Unpacked | 63.729 B (+ `@tanstack/virtual-core`) |
| Peer | `react ^16.8 \|\| ^17 \|\| ^18 \|\| ^19` ✅ |

### 3.5. Component có sẵn trong registry shadcn, chưa cài vì chưa cần

Đã kiểm bằng `bunx shadcn@4.23.0 view <name>`; tất cả đều tồn tại với style `base-nova`:

| Component | Dependency kéo theo | Khi nào cần |
| --- | --- | --- |
| `table` | không (chỉ `cn`) | bảng quản trị, danh sách dạng bảng |
| `pagination` | `button` (đã có) | phân trang kiểu số trang |
| `carousel` | `embla-carousel-react` (MIT, 50.629 B) | thư viện ảnh nhiều ảnh/bài |
| `command` | `cmdk` | bảng lệnh ⌘K, autocomplete địa điểm |
| `chart` | `recharts@3.8.0` | thống kê, biểu đồ |
| `resizable` | `react-resizable-panels` | bố cục 2 cột kéo được |

Cài bằng:

```bash
bunx shadcn@4.23.0 add table pagination carousel command chart resizable --yes
```

Nhớ xoá `"use client"` ở đầu file mới sinh (dự án đặt `rsc: false`).

### 3.6. Không nên cài

| Gói | Lý do loại |
| --- | --- |
| `react-use@17.6.1` | Unlicense, 453.840 B, không có `useGeolocation` tách được `watchPosition` |
| `@reactuses/core` | peer `qrcode ^1.5` không dùng đến |
| `react-share@6.1.0` | 578.540 B cho bộ nút mạng xã hội; Web Share API đã đủ |
| `react-rating-stars-component@2.2.0` | ISC, 179.283 B, không có peer React 19, không accessible bằng bàn phím |
| `@smastrom/react-rating@1.5.0` | MIT, 75.333 B, peer `react>=18` ✅ — **phương án dự phòng** nếu `RadioGroup` + `StarIcon` không đủ; hiện chưa cần vì `RadioGroup` đã cho bàn phím + `aria-checked` |
| `date-fns` | `Intl` đã đủ; thêm locale tiếng Việt đầy đủ mới dùng được `formatRelative` |
