# Agent 1 — Khám phá & tìm kiếm địa điểm

> Phạm vi: hành trình "tìm chỗ ăn NGAY HÔM NAY" — bản đồ, bộ lọc, xếp hạng kết quả,
> từ khoá, khám phá theo khu vực, giờ mở cửa, khoảng cách, so sánh nhanh.
> KHÔNG đụng: gamification, đăng bài/bình luận, review/độ tin cậy, bộ sưu tập, thông báo.

> Lưu ý phương pháp: công cụ search web không khả dụng trong phiên này (lỗi tool),
> nên phần tham chiếu app lớn (Google Maps, Yelp, ShopeeFood…) là phân tích logic
> sản phẩm dựa trên pattern đã biết, không kèm link nguồn.

## Hiện trạng (bằng chứng code)

| #   | Nhận định                                                                                                                                                                                                                | Bằng chứng                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `/discover` chỉ có 4 bộ điều khiển: loại hình, quận, từ khoá, "Gần đây". **Không có bất kỳ control sắp xếp nào** (điểm cao, gần tôi, giá…).                                                                              | `src/features/places/pages/discover-page.tsx:45-51` (state: `category`, `district`, `query`, `viewMode`, `isNearbyActive` — không có state sort); `src/features/places/api/get-places.ts:5-9` (`DiscoverFilters` không có field sort) |
| H2  | Server trả kết quả **theo thứ tự fixture**, không chấm điểm liên quan: `listPublishedPlaces` chỉ filter rồi map, không sort.                                                                                             | `src/mocks/server.ts:125-150`; dữ liệu fixture xếp theo cụm quận (`src/mocks/fixtures/places.ts:14` "QUẬN HẢI CHÂU" đứng đầu, 12/27 quán đã publish ở Hải Châu) → trang 1 của lưới gần như toàn Hải Châu                              |
| H3  | Phân trang 9 quán/trang → **chế độ bản đồ chỉ vẽ số quán đã tải** (tối đa 9 ở lần tải đầu), không phải toàn bộ kết quả khớp bộ lọc.                                                                                      | `src/mocks/server.ts:38` (`PLACES_PAGE_SIZE = 9`); `src/features/places/pages/discover-page.tsx:362-368` (`PlacesMap places={sortedPlaces}` — chỉ các page đã fetch)                                                                  |
| H4  | "Gần đây" **chỉ sắp xếp các quán đã tải về client**, không gửi toạ độ lên server; quán gần nhất có thể nằm ở trang chưa tải.                                                                                             | `src/features/places/pages/discover-page.tsx:73-97` (sort client-side trên `rawPlaces`); `src/features/places/api/get-places.ts:21-27` (params chỉ có cursor/category/district/q)                                                     |
| H5  | "Gần đây" chỉ đổi **thứ tự**, không lọc bán kính — bật xong vẫn thấy quán cách 15 km ở Sơn Trà khi đang đứng Hải Châu, và không có cách thu hẹp "trong vòng X km".                                                       | `src/features/places/pages/discover-page.tsx:92-96` (chỉ sort tăng dần theo khoảng cách, không có ngưỡng)                                                                                                                             |
| H6  | `Place` **không có dữ liệu giờ mở cửa**; toàn codebase không có khái niệm "đang mở/đã đóng" hay lọc theo giờ.                                                                                                            | `src/features/places/types/place.ts:4-23` (interface `Place`); grep toàn `src/` cho `openingHours                                                                                                                                     | openNow | giờ mở` → 0 kết quả |
| H7  | Ô tìm kiếm topbar là form submit thuần, **không có gợi ý khi gõ** (autocomplete); trang `/search` chỉ đọc `?q=`.                                                                                                         | `src/components/layout/app-shell.tsx:146-167`; `src/features/search/hooks/use-search-query-sync.ts:54-57`                                                                                                                             |
| H8  | Endpoint `/places/suggestions` hiện chỉ phục vụ **composer bài đăng** (cần caption ≥ 8 ký tự), không dùng được cho tìm kiếm.                                                                                             | `src/mocks/server.ts:751-756`; `src/mocks/server.ts:158` (`caption.trim().length < 8 → []`); consumer duy nhất là `src/features/social/components/post-composer.tsx:48`                                                               |
| H9  | Tìm kiếm server là **substring không dấu** trên name/address/city/district/tags — không khớp nhãn loại hình ("cà phê" không match `category: "cafe"` nếu tag không chứa), không có xử lý lỗi chính tả hay từ đồng nghĩa. | `src/mocks/server.ts:143-148`; `src/mocks/text.ts:9-16` (`normalizeText`)                                                                                                                                                             |
| H10 | `PlacesMap` đã có sẵn prop chọn quán 2 chiều (`selectedPlaceId`, `onSelectPlace`) nhưng `/discover` **không truyền gì** → bấm marker không highlight được thẻ, thẻ đang xem không được nhảy tới trên bản đồ.             | `src/features/places/components/places-map.tsx:21-29` (props); `src/features/places/pages/discover-page.tsx:364-368` (chỉ truyền `places`, `userCoordinates`, `height`)                                                               |
| H11 | Kết quả 0 quán ở `/search` chỉ có 1 câu "Thử từ khoá khác hoặc ngắn hơn" — không có lối thoát (thử bỏ dấu, nới lọc, gợi ý quận).                                                                                         | `src/features/search/pages/search-page.tsx:161-172`                                                                                                                                                                                   |
| H12 | Khoảng cách đã có hạ tầng dùng lại được: Haversine client-side + `formatDistance` + toạ độ fallback tâm Đà Nẵng.                                                                                                         | `src/features/places/lib/danang-districts.ts:15-31`; `src/lib/format.ts:91-95`; `src/hooks/use-user-location.tsx:20-31`                                                                                                               |

## Đề xuất

### DX-1.1: Sắp xếp kết quả — "Liên quan / Điểm cao / Gần tôi" + xếp hạng theo từ khoá

- **Vấn đề người dùng:** người dùng muốn "quán ngon nhất" hoặc "quán gần nhất" nhưng danh sách
  luôn hiện theo thứ tự dữ liệu; gõ từ khoá thì kết quả không ưu tiên quán khớp tên món.
  Hệ quả: quán 4.8/3410 review có thể nằm dưới quán 4.2/12 review chỉ vì thứ tự fixture.
- **Hiện trạng:** H1, H2.
- **Đề xuất:**
  - Thêm control sắp xếp (dropdown nhỏ cạnh nút "Lọc", hoặc 3 chip `ToggleGroup`):
    `Liên quan` (mặc định) · `Điểm cao` · `Gần tôi` (chỉ hiện khi đã có toạ độ).
  - Server: khi có `q`, chấm điểm liên quan — khớp tên quán > khớp tag món > khớp địa chỉ,
    tiebreak theo `rating` rồi `reviewCount` (tái dùng tư tưởng `rankPlaceSuggestions` ở
    `src/mocks/ranking.ts`); không có `q` thì mặc định sort theo `rating` giảm dần.
  - `GET /places` nhận thêm `sort=relevant|rating|distance` (+ `lat`,`lng` cho distance).
  - Card giữ nguyên; chỉ thêm dòng phụ đề nhỏ "Điểm cao trước" trong badge đếm kết quả
    (`discover-page.tsx:274-276`) để người dùng hiểu thứ tự.
- **Giá trị thực:** người dùng tìm "bánh xèo" sẽ thấy quán đúng món, điểm cao, lên đầu —
  quyết định chọn quán nhanh hơn, ít phải cuộn/lọc lại.
- **Phạm vi:** cần backend (mock làm được ngay trong `src/mocks/server.ts`) — **M**.
- **Rủi ro / điều kiện cần:** đổi hợp đồng API (thêm param `sort`) — phải ghi vào
  `docs/DECISIONS.md` D-011; sort "Gần tôi" phụ thuộc DX-1.2 gửi toạ độ lên server
  (hoặc tạm dùng sort client-side trên các page đã tải như hiện nay làm bước S đầu tiên).

### DX-1.2: "Gần đây" thật sự gần — gửi toạ độ lên server + lọc bán kính

- **Vấn đề người dùng:** bật "Gần đây" rồi quán gần nhất vẫn không lên đầu (nó ở trang chưa
  tải); và không có cách nói "chỉ cho tôi quán trong vòng 2 km".
- **Hiện trạng:** H3, H4, H5.
- **Đề xuất:**
  - `GET /places` nhận `lat`, `lng`, `radiusKm`; server tự tính khoảng cách (Haversine —
    copy logic từ `src/features/places/lib/danang-districts.ts:15-31` sang mock server),
    lọc theo bán kính và sort tăng dần.
  - Khi bật "Gần đây", hiện dải chip bán kính: `1 km · 3 km · 5 km · Tất cả` (mặc định 3 km,
    theo pattern bán kính mặc định của app bản đồ/food delivery). Chip dùng `ToggleGroup`
    có sẵn (`src/components/ui/toggle-group.tsx`).
  - Số quán trả về hiển thị kèm bán kính: "12 địa điểm trong vòng 3 km"
    (thay badge `discover-page.tsx:274-276` khi nearby bật).
  - Client bỏ sort thủ công ở `discover-page.tsx:73-97` (server lo), chỉ còn map
    `distanceKm` để `PlaceCard` hiển thị (đã có sẵn `place-card.tsx:67-72`).
- **Giá trị thực:** "ăn ngay hôm nay" = đi bộ/xe máy tới được; bán kính + sort server-side
  biến "Gần đây" từ cosmetic thành công cụ chọn quán thật.
- **Phạm vi:** cần backend (mock làm được) — **M**.
- **Rủi ro / điều kiện cần:** fallback GPS đã dùng tâm Đà Nẵng khi lỗi quyền
  (`use-user-location.tsx:26-28`) — cần ghi chú rõ trong UI rằng khoảng cách lúc đó tính
  từ Cầu Rồng, tránh người dùng tưởng là vị trí thật của mình.

### DX-1.3: Bản đồ đồng bộ với danh sách + "Tìm trong vùng này"

- **Vấn đề người dùng:** chuyển sang bản đồ để nhìn tổng thể nhưng bản đồ chỉ vẽ 9 quán
  trang đầu; kéo bản đồ về Sơn Trà không thấy gì mới; bấm marker không biết quán đó nằm
  ở đâu trong danh sách.
- **Hiện trạng:** H3, H10.
- **Đề xuất:**
  - **Bước 1 (FE-only, S):** `/discover` truyền `selectedPlaceId` + `onSelectPlace` vào
    `PlacesMap` (props đã có sẵn, `places-map.tsx:21-29`): bấm marker → highlight + scroll
    tới thẻ tương ứng trong lưới; chọn thẻ → marker to + popup mở (logic popup đã có ở
    `places-map.tsx:147-154`).
  - **Bước 2 (cần backend, M):** ở chế độ bản đồ, fetch **toàn bộ** kết quả khớp bộ lọc
    (thêm `all=true` hoặc `pageSize` lớn cho GET /places — dữ liệu mock chỉ 27 quán, hợp lý)
    để bản đồ phản ánh đúng không gian; thêm nút nổi "Tìm trong vùng này" khi người dùng
    pan/zoom ra khỏi vùng kết quả hiện tại (pattern quen thuộc của Google Maps).
- **Giá trị thực:** bản đồ là công cụ chính để chọn quán theo vị trí (gần bãi biển, gần
  trung tâm); hiện nó đang nói dối về mật độ quán theo khu vực.
- **Phạm vi:** Bước 1 FE-only; Bước 2 cần backend — tổng thể **M**.
- **Rủi ro / điều kiện cần:** Bước 2 tăng payload; với dữ liệu thật (hàng nghìn quán) cần
  giới hạn theo viewport/bbox — để backend quyết, frontend chỉ gửi bbox map.

### DX-1.4: Giờ mở cửa + chip lọc "Đang mở"

- **Vấn đề người dùng:** khoảnh khắc dùng app cốt lõi là "bây giờ ăn được ở đâu?" —
  mà app không biết quán nào còn mở. Đà Nẵng đặc biệt: nhiều quán vỉa hè chỉ mở buổi sáng/
  chiều, đi tới mới biết đóng cửa là mất cả chuyến.
- **Hiện trạng:** H6 — `Place` không có field giờ mở cửa, không có khái niệm trạng thái mở
  ở bất kỳ đâu trong codebase.
- **Đề xuất:**
  - Dữ liệu: thêm `openingHours` vào `Place` — dạng mảng khung giờ theo ngày
    (`{ day: 0-6, open: "06:30", close: "21:30" }[]`, quán cả ngày = khung 00:00–23:59,
    quán không khai = `undefined` → không tham gia lọc).
  - UI: helper `isOpenAt(place, now)` (một nghiệp vụ một chỗ, đặt cạnh `price-level.ts`);
    hiển thị trên `PlaceCard` và trang chi tiết: "Mở đến 21:30" / "Đã đóng · mở 06:30".
  - Lọc: chip "Đang mở" trong popover Lọc (`discover-page.tsx:181-243`), gửi
    `openNow=true` lên server (server so theo giờ địa phương `Asia/Ho_Chi_Minh`).
- **Giá trị thực:** trả lời trực tiếp câu hỏi số 1 của người dùng trong khung giờ quyết định;
  giảm tỷ lệ "đến nơi rồi thấy đóng cửa" — thất vọng lớn nhất của trải nghiệm ăn uống.
- **Phạm vi:** cần dữ liệu thật (giờ mở cửa phải nhập tay vào fixture/mock trước) + backend — **M**.
- **Rủi ro / điều kiện cần:** dữ liệu giờ mở cửa dễ sai/hết hạn → chỉ hiển thị trạng thái,
  không cam kết; quán không khai giờ phải vẫn hiện được (chỉ bị loại khi lọc "Đang mở" bật).
  Múi giờ: client dùng `Date` local của người dùng có thể lệch nếu họ ở nước ngoài —
  server mock quyết theo giờ VN.

### DX-1.5: Tìm kiếm thông minh hơn — gợi ý khi gõ và lối thoát khi 0 kết quả

- **Vấn đề người dùng:** gõ "banh xeo" hay "cafe view song han" phải bấm Enter rồi đọc cả
  trang kết quả; gõ sai chính tả hoặc dùng từ không có trong dữ liệu thì gặp màn hình trống
  không có lối ra.
- **Hiện trạng:** H7, H8, H9, H11.
- **Đề xuất:**
  - **Gợi ý khi gõ (S):** dropdown dưới ô tìm kiếm topbar — gợi ý từ chính dữ liệu
    `GET /places?q=` (tên quán, tag món) sau debounce 300 ms (đã có `useDebouncedValue`);
    Enter vẫn vào `/search` như hiện nay. Gợi ý chỉ là link nhanh, không tạo endpoint mới.
  - **Mở rộng so khớp (M):** server thêm nhãn loại hình và từ khoá món vào haystack tìm kiếm
    (`server.ts:144-148`) — tái dùng `CATEGORY_KEYWORDS` đã có sẵn ở `src/mocks/ranking.ts:28-35`
    (hiện chỉ phục vụ ranking composer); gõ "cà phê" phải ra quán `category: "cafe"`.
  - **Lối thoát 0 kết quả (S):** màn trống gợi ý cụ thể: "Thử bỏ dấu ('banh xeo' → 'bánh xèo')",
    nút "Xoá bộ lọc", và 3–5 quán điểm cao nhất cùng quận/tag gần nhất với từ khoá
    ("Có thể bạn muốn tìm").
- **Giá trị thực:** rút ngắn vòng "gõ → thấy → chọn" từ 2 bước xuống 1; biến màn hình chết
  (0 kết quả) thành điểm rẽ nhánh giữ người dùng.
- **Phạm vi:** gợi ý + lối thoát: FE-only (dùng GET /places có sẵn); mở rộng so khớp:
  cần backend — tổng thể **S–M**.
- **Rủi ro / điều kiện cần:** dropdown gợi ý phải đúng trợ năng (role listbox, điều hướng
  bàn phím, `aria-label` tiếng Việt theo convention hiện có); debounce đã có nên rủi ro
  spam request thấp.

## Không đề xuất và lý do

| Ý tưởng cân nhắc                                                     | Lý do loại                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **So sánh nhanh nhiều quán (compare mode, chọn 2–3 quán cạnh nhau)** | Trong phạm vi được giao nhưng giá trị thấp so với chi phí: người dùng so sánh thực tế bằng cách mở thẻ/bản đồ cạnh nhau; chưa có bằng chứng nhu cầu ở giai đoạn mock. Ưu tiên đã thuộc DX-1.1 (sắp xếp) giải quyết gốc rễ "chọn quán nào". Nếu sau này cần, ghi BACKLOG. |
| **Bản đồ heat-map / "khu ẩm thực nổi bật" theo mật độ bài đăng**     | Cần dữ liệu thật về mật độ; với 27 quán mock thì vẽ heat-map là trang trí. Thuộc rủi ro overengineering.                                                                                                                                                                 |
| **Badge "Mới mở" / "Thịnh hành" trên thẻ quán**                      | Sát ranh giới gamification (đã bị cấm) và cần dữ liệu thời gian thực; giá trị với người dùng thấp hơn giờ mở cửa (DX-1.4).                                                                                                                                               |
| **Lịch sử tìm kiếm / từ khoá gợi ý cá nhân hoá**                     | Rơi vào vùng profile/cá nhân hoá (agent khác phụ trách profile); ngoài ra cần lưu trạng thái người dùng — chưa có hạ tầng.                                                                                                                                               |
| **Đánh giá độ tin cậy / lọc theo review**                            | Trùng trọng tâm agent review (đã loại trừ trong phạm vi).                                                                                                                                                                                                                |
| **Lưu quán vào bộ sưu tập ngay từ thẻ discover**                     | Trùng agent bộ sưu tập/lập kế hoạch.                                                                                                                                                                                                                                     |
| **Chỉ đường trong app (routing tự vẽ)**                              | Đã có lối thoát chuẩn: Google Maps link ở `place-mini-map.tsx:69` và mục "Vị trí & Chỉ đường" (`place-detail-page.tsx:248`). Tự vẽ tuyến là overengineering, cần dữ liệu đường.                                                                                          |
