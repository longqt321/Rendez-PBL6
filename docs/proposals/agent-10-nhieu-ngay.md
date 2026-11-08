# Agent 10 — Kế hoạch nhiều ngày cho khách du lịch

> Góc nhìn: khách đến Đà Nẵng 2–4 ngày (thành phố du lịch — phần lớn người dùng app là khách,
> không phải người địa phương) cần chia quán/địa điểm **theo ngày**, gắn với nơi ở và giờ đến/đi,
> không đi vòng, và biết "hôm nay ăn gì ở khu mình đang ở".
>
> Khác DX-6 (một ngày, timeline theo giờ) ở chỗ: **nhiều ngày**, có **điểm neo**
> (khách sạn/sân bay), có **ngân sách theo bậc giá**, có **món phải thử**.
> Không đụng: chia hóa đơn (agent 8), sở thích nhóm (agent 7), phiên nhóm (agent 9).

## Kế thừa từ đợt trước (không lặp lại)

| Kế thừa                                                                  | Dùng lại ở đâu trong đề xuất này                                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **DX-4.1** bản đồ nhiều điểm (`PlacesMap`, marker đánh số)               | DX-10.2 dùng lại nguyên bản đồ của một ngày, không viết bản đồ mới                                                               |
| **DX-4.2** chỉ đường cả tuyến (deep link Google Maps, tối đa 9 waypoint) | DX-10.2 gọi per-day thay vì per-collection; giới hạn 9 waypoint tự nhiên hợp với 1 ngày                                          |
| **DX-4.3** sắp thứ tự đi (kéo thả / Lên-Xuống / sắp theo quãng đường)    | DX-10.2 tái dùng cho thứ tự **trong một ngày**; thứ tự giữa các ngày là việc riêng của chuyến đi                                 |
| **DX-4.4** ghi chú + "Đã đi" per địa điểm                                | DX-10.3 hiển thị lại trạng thái "Đã đi" trên thẻ của ngày hôm nay; không làm lại logic                                           |
| **DX-4.5** tab "Địa điểm" ở `/saved`                                     | DX-10.1 đặt tab "Chuyến đi" cạnh nó, cùng pattern `Tabs`                                                                         |
| **DX-A** giờ mở cửa + trạng thái "Đang mở"                               | DX-10.3 phụ thuộc: lọc "đang mở quanh đây" chỉ có nghĩa khi DX-A có dữ liệu                                                      |
| **DX-6** kế hoạch NGÀY (timeline theo giờ, một ngày)                     | DX-10.2/10.3 chỉ tổ chức **theo ngày**, không dựng timeline giờ; DX-6 là tầng bên trong một ngày của DX-10.1 nếu cả hai cùng làm |

## Hiện trạng (bằng chứng code)

**1. Không có khái niệm "chuyến đi" hay "ngày" nào trong app.**

- Toàn bộ route: `/discover`, `/social`, `/post/:id`, `/notification`, `/discover/:id`, `/search`,
  `/saved`, `/collections/:id`, `/profile`, `/u/:handle`, `/settings`, `/design` —
  [routes.tsx:23-47](file:///home/longtran/Projects/frontend/src/app/router/routes.tsx#L23-L47).
  Không có `/trip`, không có trang nào nhận tham số ngày.
- Grep toàn `src/` cho `trip|budget|openingHours` → **0 kết quả**.

**2. Bộ sưu tập — nơi gần nhất với "kế hoạch" — không có ngày, không có điểm neo.**

- `Collection` chỉ có `name`, `description`, `isPrivate`, `owner`, `placeIds`, `createdAt`,
  `likeCount`, `likedByMe` — [collection.ts:10-24](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L10-L24).
  Không có `date`, không có `days`, không có "tôi ở đâu".
- Fixture có 4 bộ sưu tập, nhiều nhất 3 quán, 2 cái thuộc `ME` —
  [collections.ts:26-71](file:///home/longtran/Projects/frontend/src/mocks/fixtures/collections.ts#L26-L71).
  Tức là "chuyến đi 3 ngày" không thể dựng trên `Collection` mà không phá shape của nó.

**3. Dữ liệu địa điểm đủ để chia theo ngày theo khu — nhưng thiếu dữ liệu thời gian.**

- `Place` có `district?` và `lat?/lng?` optional —
  [place.ts:9-10, 19-22](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L9-L22).
  Không có `openingHours` (grep 0 kết quả).
- Fixture 27 quán đã duyệt (`p-01`…`p-27`), **cả 27 đều có `lat`/`lng`**, phủ đủ 6 quận:
  Hải Châu 9, Sơn Trà 5, Ngũ Hành Sơn 4, Thanh Khê 3, Cẩm Lệ 3, Liên Chiểu 3 —
  [places.ts:13-495](file:///home/longtran/Projects/frontend/src/mocks/fixtures/places.ts#L13-L495).
  3 quán chưa duyệt `p-28`…`p-30` — [places.ts:497-551](file:///home/longtran/Projects/frontend/src/mocks/fixtures/places.ts#L497-L551).
- `DANANG_DISTRICTS` (6 quận) — [danang-districts.ts:1-8](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L1-L8);
  Haversine `calculateDistanceKm` — [danang-districts.ts:17-34](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L17-L34);
  `priceLevelLabel`/`priceLevelAriaLabel` —
  [price-level.ts:9-16](file:///home/longtran/Projects/frontend/src/features/places/lib/price-level.ts#L9-L16);
  `formatDate`/`formatDistance`/`formatRelativeTime` —
  [format.ts:61, 93, 29](file:///home/longtran/Projects/frontend/src/lib/format.ts#L61);
  `useUserLocation` — [use-user-location.tsx:20-27](file:///home/longtran/Projects/frontend/src/hooks/use-user-location.tsx#L20-L27).

**4. Persistence phía FE có tiền lệ nhưng chưa có helper dùng chung.**

- `skin-provider.tsx` tự đọc/ghi `window.localStorage` với `STORAGE_KEY` riêng —
  [skin-provider.tsx:8, 23](file:///home/longtran/Projects/frontend/src/app/providers/skin-provider.tsx#L8).
  Đây là mẫu duy nhất; chưa có module `storage.ts` hay hook `useLocalStorage`.

**5. Tab `/saved` có sẵn 3 tab — chỗ tự nhiên cho "Chuyến đi".**

- `TabsList`: "Bài đăng | Địa điểm | Bộ sưu tập" —
  [saved-page.tsx:24-29](file:///home/longtran/Projects/frontend/src/features/saved/pages/saved-page.tsx#L24-L29).

**6. Tags fixture chứa đúng tên món đặc sản → làm được "món phải thử" thuần FE.**

- Ví dụ: `"bánh xèo"`, `"mì quảng"`, `"bún chả cá"`, `"cà phê muối"`, `"bánh tráng thịt heo"`,
  `"bánh canh cá nục"`, `"bê thui"`, `"gà nướng lu"`, `"ốc hút"` —
  [places.ts:24, 41, 58, 75, 92, 215, 270, 359, 414](file:///home/longtran/Projects/frontend/src/mocks/fixtures/places.ts#L24).
  Tức là danh sách món phải thử có thể map **chính xác** sang quán qua `tags`, không cần dữ liệu mới.

## Đề xuất

### DX-10.1: Chuyến đi (Trip) — khung ngày + điểm neo

- **Vấn đề:** khách 3 ngày lưu 15 quán vào một bộ sưu tập, mở ra là một đống phẳng; không biết
  ngày nào đi đâu, và app không biết "tôi hôm nay là ngày 2/3, đang ở khu Mỹ Khê".
- **Hiện trạng:** không có khái niệm Trip (bằng chứng 1, 2 ở trên). Bộ sưu tập là danh sách phẳng
  không thời gian.
- **UX:**
  - Tab "Chuyến đi" mới trong `/saved` (cạnh 3 tab hiện có — bằng chứng 5). Rỗng → `Empty` với
    một nút "Tạo chuyến đi" duy nhất.
  - Tạo chuyến đi: chọn ngày đến / ngày đi (2 input date, mặc định hôm nay → +3 ngày), khu neo
    (chọn 1 trong 6 quận từ `DANANG_DISTRICTS`, optional), nhãn nơi ở tuỳ chọn
    ("Khách sạn ABC, Mỹ Khê"). Số ngày tự suy ra, không cho nhập tay.
  - Trang chuyến đi: dải ngang các thẻ "Ngày 1 … Ngày 4" (kèm ngày dương lịch qua `formatDate`),
    ngày có lịch trình thì đếm số điểm, ngày trống hiện "trống".
  - Giờ đến/đi (sân bay) chỉ dùng để **gắn nhãn ngày**: "Ngày 1 — đến lúc 14:00, buổi chiều ngắn"
    và "Ngày 3 — bay 18:00, đừng xếp quán xa sân bay". Không dựng timeline giờ (đó là DX-6).
- **Mô hình dữ liệu:**

  ```ts
  interface Trip {
    id: string
    name: string // "Đà Nẵng 11–14/11"
    startDate: string // ISO date "2026-11-11"
    endDate: string // ISO date "2026-11-14"
    arrivalAt?: string // ISO datetime — giờ đến (sân bay)
    departureAt?: string // ISO datetime — giờ đi
    baseDistrict?: string // 1 giá trị của DANANG_DISTRICTS
    baseLabel?: string // "Khách sạn ABC, Mỹ Khê" — nhãn tự do
    days: TripDay[] // sinh sẵn từ startDate..endDate
  }
  interface TripDay {
    date: string // "2026-11-11"
    district?: string // khu neo của ngày (mặc định kế thừa baseDistrict)
    placeIds: string[] // thứ tự đi trong ngày
    note?: string
  }
  ```

- **Giá trị thực:** đây là **container** cho mọi đề xuất còn lại; một mình nó đã biến "15 quán
  phẳng" thành "4 ngày có khung". Khách du lịch nghĩ theo ngày, không theo bộ sưu tập.
- **Phạm vi:** FE + localStorage — **S/M**. Chỉ có 1 người dùng `ME`, không cần backend ở giai đoạn
  này; khi có backend thì `GET/PUT /me/trips` thay localStorage, shape giữ nguyên.
- **Rủi ro:** đổi ngày đến/đi sau khi đã xếp quán → ngày bị cắt phải xử lý rõ (quán ở ngày bị xoá
  chuyển vào "chưa xếp", không mất im lặng). Key localStorage phải version (`danang-trip-v1`).

### DX-10.2: Mỗi ngày = một khu — xếp quán theo quận và cảnh báo "đi vòng"

- **Vấn đề:** khách xếp sáng nay Sơn Trà, trưa Cẩm Lệ, chiều Liên Chiểu — Đà Nẵng trải ngang
  ~15 km, đi vậy là mất cả ngày trên đường. Không ai nhắc họ.
- **Hiện trạng:** `Place.district` có sẵn, `calculateDistanceKm` có sẵn
  (bằng chứng 3); DX-4.3 sắp thứ tự **trong một danh sách** nhưng không có khái niệm "ngày nào
  nên gom quanh khu nào".
- **UX:**
  - Trong thẻ "Ngày N": chọn khu của ngày (ToggleGroup 6 quận, dùng lại pattern lọc quận của
    `/discover` — [discover-page.tsx:139-156](file:///home/longtran/Projects/frontend/src/features/places/pages/discover-page.tsx#L139-L156)
    theo trích dẫn của agent 4).
  - Khi thêm quán vào ngày: nếu quán thuộc quận khác khu của ngày → chip cảnh báo vàng
    "Quán này ở Sơn Trà, ngày này đang neo Hải Châu (cách 6,2 km)" — vẫn cho thêm, không chặn.
  - Nút "Gợi ý khu cho ngày này": đếm quán đã xếp theo quận, khu nào nhiều nhất thì đề xuất làm
    khu của ngày (thuần đếm, không AI).
  - Cảnh báo ngày "dàn trải": ngày có ≥ 3 quận khác nhau → dòng cảnh báo "Ngày này trải 3 khu,
    tổng quãng đường tối thiểu ~18 km" (tính bằng `calculateDistanceKm` theo thứ tự hiện có).
  - Bản đồ + chỉ đường cả tuyến của **một ngày** = kế thừa DX-4.1 + DX-4.2, chỉ đổi nguồn dữ liệu
    từ `Collection.placeIds` sang `TripDay.placeIds`.
- **Mô hình dữ liệu:** không thêm gì — dùng `TripDay.district` + `TripDay.placeIds` của DX-10.1.
- **Giá trị thực:** đây chính là "tối ưu để không đi vòng" mà khách du lịch cần nhất; với dữ liệu
  mock, Hải Châu ↔ Sơn Trà cách ~3–5 km nhưng Sơn Trà ↔ Liên Chiểu ~11 km — chênh lệch thật, đủ
  để cảnh báo có ý nghĩa.
- **Phạm vi:** FE + localStorage — **M** (phần lớn chi phí là UI thẻ ngày + bản đồ lazy).
- **Rủi ro:** `district` là optional trên `Place` — quán thiếu quận phải hiển thị được ở mọi ngày
  mà không tham gia cảnh báo, và phải nói rõ "1 quán chưa rõ quận" thay vì bỏ im lặng. Cảnh báo
  quãng đường là đường chim bay — phải ghi chú trong UI là "xấp xỉ".

### DX-10.3: "Hôm nay ăn gì quanh đây" — thẻ ngày đang diễn ra

- **Vấn đề:** khách mở app giữa chuyến đi phải tự nhớ "hôm nay ngày mấy, mình đang ở khu nào, kế
  hoạch hôm nay là gì", rồi còn phải tự lọc quán quanh mình.
- **Hiện trạng:** mọi màn hình đều tĩnh theo dữ liệu, không có gì biết "hôm nay là ngày mấy của
  chuyến đi"; `useUserLocation` đã có nhưng chỉ dùng cho `/discover` (bằng chứng 3).
- **UX:**
  - Khi có chuyến đi đang diễn ra, trang chủ `/discover` chèn 1 khối trên cùng: "Ngày 2/3 · khu
    Mỹ Khê" + các quán **chưa đi** của ngày hôm nay (kế thừa "Đã đi" của DX-4.4 để biết quán nào
    đã xong), sắp theo thứ tự trong `TripDay.placeIds`.
  - Nút "Quanh tôi": bật `useUserLocation`, sắp lại theo khoảng cách tới tôi
    (`formatDistance` có sẵn) — chỉ sắp lại thứ tự hiển thị, **không** ghi đè thứ tự kế hoạch.
  - Ngày trống → nút "Xem gợi ý khu này" dẫn sang `/discover` với filter quận đã chọn sẵn (param
    query, không cần API mới).
  - Ngoài khoảng ngày → trạng thái trung tính: "Chuyến đi bắt đầu sau 2 ngày" /
    "Chuyến đi đã kết thúc" (`formatRelativeTime`), không hiện khối kế hoạch.
- **Mô hình dữ liệu:** không thêm gì; suy ra từ `Trip` + `Date.now()`.
- **Giá trị thực:** đây là lý do khách mở app **hàng ngày trong chuyến đi** — chuyển từ app "tra
  một lần trước chuyến" thành app dùng hằng ngày, đúng mục tiêu giữ chân (agent 5) mà không cần
  notification.
- **Phạm vi:** FE + localStorage — **S/M**. Phần "lọc đang mở" phụ thuộc DX-A (DATA).
- **Rủi ro:** múi giờ — phải so ngày theo múi giờ địa phương (`Asia/Ho_Chi_Minh`), không so ISO
  UTC trực tiếp, nếu không ngày sẽ lệch nửa ngày. Không tự suy "Đã đi" từ check-in một cách ngầm:
  dùng đúng nguồn DX-4.4 quy định.

### DX-10.4: Món phải thử ở Đà Nẵng — checklist gắn với ngày

- **Vấn đề:** khách lần đầu đến Đà Nẵng không biết "phải ăn mì Quảng, bánh xèo, bún chả cá, cà phê
  muối"; họ lưu quán theo brand hay ảnh đẹp, về mới phát hiện chưa ăn món đặc trưng.
- **Hiện trạng:** `tags` của fixture chứa đúng tên món (bằng chứng 6) — nhưng không màn hình nào
  dùng tags làm checklist; tags chỉ hiển thị dạng chip trên trang quán.
- **UX:**
  - Khối "Món phải thử" trong trang chuyến đi: danh sách **curated tĩnh** ~10 món đặc trưng Đà
    Nẵng (mì Quảng, bánh xèo, bún chả cá, bánh tráng thịt heo, cà phê muối, hải sản biển, bánh
    canh cá nục, chè, ốc, gà nướng lu) khai ở `src/lib/constants.ts` dạng
    `MUST_TRY_DISHES: { label, tag }[]`.
  - Mỗi món: "Đã có trong kế hoạch ✓ (Ngày 1 — Bánh Xèo Bà Dưỡng)" hoặc "Chưa có — Xem quán có
    món này" → lọc `/discover` theo tag (server đã hỗ trợ tìm theo từ khoá qua `GET /places?q=`
    — cùng hợp đồng DX-1.5a kế thừa).
  - Thêm nhanh: từ kết quả, chọn ngày → đẩy vào `TripDay.placeIds` cuối ngày đó.
  - Không đếm %, không progress bar, không badge — chỉ checklist trung tính (ràng buộc
    gamification của dự án).
- **Mô hình dữ liệu:** không thêm gì — suy ra bằng cách match `MUST_TRY_DISHES[].tag` với
  `Place.tags` trên các quán đã có trong `Trip`.
- **Giá trị thực:** giải đúng nhu cầu "món phải thử ở Đà Nẵng" của khách du lịch lần đầu; và là
  cách **tái sử dụng dữ liệu tags đang bỏ phí** thay vì thêm dữ liệu mới.
- **Phạm vi:** FE + localStorage — **S**.
- **Rủi ro:** match theo tag là exact-match, quán mô tả món bằng từ khác sẽ không khớp — chấp nhận
  (hiển thị "chưa có", không bao giờ khẳng định sai "đã có"). Danh sách món phải do con người curated,
  không sinh tự động từ tần suất tag (sẽ trôi theo dữ liệu mock).

### DX-10.5: Ngân sách theo bậc giá — "hôm nay ăn tiết kiệm hay thoải mái"

- **Vấn đề:** khách du lịch tự đặt trần mỗi ngày (ví dụ "1 bữa thoải mái, còn lại bình dân") nhưng
  không công cụ nào nhắc; đến cuối chuyến mới chốt sổ.
- **Hiện trạng:** dữ liệu giá chỉ có `priceLevel: 1 | 2 | 3` —
  [place.ts:15](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L15),
  nhãn hiển thị `₫/₫₫/₫₫₫` —
  [price-level.ts:9-11](file:///home/longtran/Projects/frontend/src/features/places/lib/price-level.ts#L9-L11).
  Tổng hợp đề xuất đã **loại** "ngân sách chuyến đi" vì dựng số VND trên dữ liệu này là chính xác
  giả ([TONG-HOP.md §5](file:///home/longtran/Projects/frontend/docs/proposals/TONG-HOP.md), dòng
  143-144). Đề xuất này **không** tái khởi nguyên bản bị loại: bỏ con số tiền, giữ đúng thứ dữ
  liệu có thật — **bậc giá**.
- **UX:**
  - Mỗi ngày chọn 1 "mức hôm nay": Bình dân (1) / Vừa (2) / Thoải mái (3) — `ToggleGroup`
    một-trong-nhiều, mặc định không chọn.
  - Dòng kiểm tra trung tính trên thẻ ngày: "Ngày này có 2 quán mức ₫₫₫" khi mức chọn thấp hơn —
    chỉ **mô tả**, không chặn, không tính tiền.
  - Tổng cả chuyến: "5/9 quán mức ₫₫₫" — số đếm bậc, không quy đổi VND.
- **Mô hình dữ liệu:** thêm 1 trường vào `TripDay`: `budgetTier?: 1 | 2 | 3` (tái dùng kiểu
  `Place["priceLevel"]`).
- **Giá trị thực:** khách kiểm soát nhịp chi theo ngày bằng chính thước đo app đã có, không tạo
  cảm giác chính xác giả — giải quyết đúng lý do bản gốc bị loại.
- **Phạm vi:** FE + localStorage — **S**.
- **Rủi ro:** nếu sau này có giá món thật (DX-3.3) thì nâng cấp thành số tiền; giờ không được viết
  sẵn hàm quy đổi `priceLevel → VND` nào. Ranh giới với chia hóa đơn (agent 8): đây là kế hoạch
  **trước** khi đi, không phải chia tiền **sau** khi ăn.

## Cách thử với mock hiện tại

- **DX-10.1/10.2/10.3/10.5:** chạy thuần FE. Thêm `src/features/trip/` (types, lib, pages) + route
  `/saved` tab "Chuyến đi" + khối trên `/discover`. Lưu `Trip` vào `localStorage` key
  `danang-trip-v1` (tiền lệ `skin-provider`). Dữ liệu quán resolve qua `GET /places` hiện có
  (27 quán đã duyệt, đủ 6 quận, đủ toạ độ — bằng chứng 3).
- **DX-10.4:** thêm `MUST_TRY_DISHES` vào `src/lib/constants.ts`; match với `tags` có sẵn trong
  fixture (bằng chứng 6). Không cần route mới.
- **Kịch bản thử tay:** tạo chuyến 11–14/11, khu neo Hải Châu; xếp p-01, p-04 vào Ngày 1 (Hải Châu);
  thêm p-09 (Sơn Trà) vào Ngày 1 → phải thấy cảnh báo quận; bật "Quanh tôi" ở Ngày 2 → thứ tự
  hiển thị đổi theo GPS nhưng `placeIds` không đổi; thêm quán tag "mì quảng" → mục "Món phải thử"
  chuyển sang đã có.
- **Không cần sửa `src/mocks/**`** cho cả 5 đề xuất ở giai đoạn này — đây là điểm phân biệt với
  các đề xuất làn sóng 2 của tổng hợp.

## Không đề xuất và lý do

- **Ngân sách bằng số tiền VND** — `priceLevel` là dữ liệu bậc, không phải giá; quy đổi là chính
  xác giả (đã bị loại ở [TONG-HOP.md §5](file:///home/longtran/Projects/frontend/docs/proposals/TONG-HOP.md),
  giữ nguyên quyết định; DX-10.5 là phiên bản trung thực hoá).
- **Timeline theo giờ trong từng ngày** — trùng ranh giới DX-6 (agent khác); DX-10.1 chỉ gắn nhãn
  ngày đến/đi, không dựng trục giờ.
- **Tự động tối ưu tuyến nhiều ngày (TSP / "day optimizer")** — với 27 quán mock và không có giờ
  mở cửa, kết quả tối ưu là ảo; DX-10.2 dùng cảnh báo + gợi ý đếm thô là mức trung thực tối đa.
- **Đặt chỗ / giữ chỗ / mua vé** — không có backend, không có đối tác dữ liệu; ngoài phạm vi app
  khám phá.
- **Theo dõi vị trí liên tục để tự động check-off "đã đi"** — cần GPS chạy nền, tốn pin, vấn đề
  quyền riêng tư; "Đã đi" giữ nguyên là hành động chủ động (DX-4.4).
- **Nhiều người dùng cùng một chuyến đi / mời bạn bè** — mock chỉ có `ME`
  ([users.ts:97](file:///home/longtran/Projects/frontend/src/mocks/fixtures/users.ts#L97)); phiên
  nhóm đã thuộc agent 9, không nhân đôi.
- **Dữ liệu khách sạn / sân bay thật (tìm nơi ở, giờ bay)** — cần dữ liệu thật chưa tồn tại
  (DATA); DX-10.1 chỉ cho người dùng **tự khai** nhãn và giờ, không tra cứu hộ.
- **Xuất lịch trình ra PDF/ảnh/iCal** — overengineering; chia sẻ đã có `ShareButton` + deep link
  Google Maps (DX-4.2).
- **Gợi ý chuyến đi mẫu "3 ngày 2 đêm" sinh tự động** — trông hấp dẫn nhưng với dữ liệu mock sẽ
  lặp quán và sai giờ mở cửa; nếu làm phải chờ DX-A + dữ liệu thật, và nên do server đề xuất
  (nguyên tắc "server xếp hạng, client render" của `PlaceSuggestion` —
  [place.ts:43-52](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L43-L52)).

## Chưa xác minh

- Toàn bộ dựa trên đọc code; **không chạy app trong trình duyệt**, không thử UI thật của tab mới.
- So sánh với Wanderlog/Google Maps là phân tích sản phẩm, kế thừa ghi chú của agent 4 — không có
  trích dẫn nguồn web trong phiên này.
- Giả định "phần lớn người dùng là khách du lịch 2–4 ngày" là premise của đề bài, chưa có số liệu
  hành vi thật để kiểm chứng.
- Hành vi của Google Maps deep link trên mobile thật (kế thừa cảnh báo của DX-4.2) chưa thử.
