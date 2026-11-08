# Agent 6 — Lập kế hoạch ngày

> Góc nghiên cứu: biến danh sách quán thành **lịch trình một ngày có mốc thời gian** —
> sáng/trưa/chiều/tối, mỗi chặng có giờ dự kiến, thời lượng, khoảng cách tới chặng trước,
> cảnh báo trùng giờ / không kịp. Người Việt đi ăn nhóm thường lệch giờ, nên kế hoạch phải
> **chịu được "trễ 30 phút"** mà không vỡ.
>
> Ranh giới: KHÔNG đụng chia hóa đơn, nhóm/sở thích nhóm, nhiều ngày (agent khác phụ trách).
> Chỉ nghiên cứu, không sửa code.

## Kế thừa từ đợt trước (không lặp lại)

Đã có trong [TONG-HOP.md](./TONG-HOP.md) và [agent-4-tien-ich.md](./agent-4-tien-ich.md), các đề
xuất này **không đề xuất lại**, chỉ kế thừa làm nền:

- **DX-4.1** bản đồ nhiều điểm cho bộ sưu tập (marker đánh số, `PlacesMap` đã hỗ trợ nhiều điểm).
- **DX-4.2** "Mở chỉ đường cả tuyến" — deep link Google Maps nhiều waypoint.
- **DX-4.3** sắp thứ tự đi (kéo thả / Lên-Xuống) + "Sắp theo quãng đường" (nearest-neighbor).
- **DX-4.4** ghi chú + "Đã đi" cho từng địa điểm.
- **DX-4.5** tab "Địa điểm" ở `/saved`.
- **DX-A** giờ mở cửa + trạng thái "Đang mở".

Vị trí của agent 6: DX-4.3 cho **thứ tự**, DX-4.2 cho **đường đi** — nhưng vẫn thiếu **thời gian**.
Thứ tự không trả lời được "9h ăn bánh xèo xong, 11h30 lên Sơn Trà kịp không?". Đó là phần agent 6 thêm.

## Hiện trạng (bằng chứng code)

**1. Không có bất kỳ khái niệm thời gian nào trong dữ liệu địa điểm/bộ sưu tập.**

- Grep toàn `src/` không thấy `itinerary|timeline|dayplan|startTime|durationMin` (chỉ trùng chữ
  "lịch trình" trong docs). `Collection` chỉ có `placeIds: string[]` —
  [collection.ts:10-24](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L10-L24).
- `Place` không có `openingHours`, không có `avgVisitMinutes` —
  [place.ts:4-23](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L4-L23).
  DX-A mới chỉ đề xuất `openingHours`, chưa ai đề xuất thời lượng ghé.

**2. Hạ tầng tính khoảng cách và hiển thị đã đủ để dựng timeline, không cần thư viện mới.**

- Haversine `calculateDistanceKm` —
  [danang-districts.ts:17-34](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L17-L34),
  kèm comment giải thích vì sao cố ý không dùng Leaflet.
- `formatDistance` (m/km kiểu Việt) —
  [format.ts:93-96](file:///home/longtran/Projects/frontend/src/lib/format.ts#L93-L96).
  **Lỗ hổng**: `format.ts` chưa có formatter giờ trong ngày (chỉ có `formatDate` ngày tuyệt đối,
  [format.ts:61-65](file:///home/longtran/Projects/frontend/src/lib/format.ts#L61-L65)) — cần thêm
  1 hàm `formatClock` ở đúng một chỗ này khi làm.
- `PlaceCategory` gồm `cafe | restaurant | street-food | bakery | dessert | bar` —
  [place.ts:1](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L1),
  đủ để suy khung giờ ăn (cafe/bakery → sáng, restaurant → trưa/tối, bar → tối).
- `PlacesMap` nhận `places`, `selectedPlaceId`, `onSelectPlace`, `userCoordinates` —
  [places-map.tsx:14-24](file:///home/longtran/Projects/frontend/src/features/places/components/places-map.tsx#L14-L24),
  tái dùng được cho chế độ xem bản đồ của timeline.
- `useUserLocation()` chỉ hỏi quyền khi người dùng chủ động —
  [use-user-location.tsx:20-66](file:///home/longtran/Projects/frontend/src/hooks/use-user-location.tsx#L20-L66).

**3. Thứ tự hiện tại là "thứ tự thêm", không phải thứ tự đi — và chưa có nơi nào hiển thị giờ.**

- Server `push` xuống cuối khi thêm —
  [server.ts:574-595](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L574-L595);
  API chỉ có thêm/bớt —
  [collections.ts:59-70](file:///home/longtran/Projects/frontend/src/features/collections/api/collections.ts#L59-L70).
- Trang chi tiết render lưới `PlaceCard` không số thứ tự, không giờ —
  [collection-detail-page.tsx:232-243](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L232-L243).

**4. Có tiền lệ lưu trạng thái người dùng vào `localStorage` (không qua mock server).**

- Skin provider đọc/ghi `window.localStorage` trực tiếp —
  [skin-provider.tsx:8,23](file:///home/longtran/Projects/frontend/src/app/providers/skin-provider.tsx#L8).
  Đây là pattern sẵn có để lưu `DayPlan` ở giai đoạn FE-only.
- Mock server chỉ có 1 user `ME` (`db.collections` clone từ `MOCK_COLLECTIONS`,
  [server.ts:48](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L48)) — thêm route mock
  cho kế hoạch là việc nhỏ, không vướng auth.
- Giới hạn ký tự/tuỳ chọn phải khai ở `src/lib/constants.ts` (header file quy định rõ) —
  [constants.ts:1-6](file:///home/longtran/Projects/frontend/src/lib/constants.ts#L1-L6).

## Đề xuất

> Quy ước thời gian dùng chung cho cả 5 đề xuất: giờ trong ngày lưu dạng
> **số phút từ nửa đêm** (`startTime: number`, 540 = 9:00) thay vì chuỗi ISO — tránh lệch múi giờ,
> cộng/trừ phút chính là cộng/trừ số nguyên, và "kế hoạch qua nửa đêm" (bar sau 0h) chỉ là một
> quy ước hiển thị. Hiển thị giờ qua hàm `formatClock(minutes)` thêm vào `src/lib/format.ts`
> (một nghiệp vụ một chỗ).

### DX-6.1: Chế độ "Lịch trình" trên bộ sưu tập — timeline một ngày có giờ và thời lượng

- **Vấn đề người dùng:** "Tôi có 6 quán trong bộ sưu tập, thứ tự cũng sắp rồi (DX-4.3), nhưng vẫn
  phải tự nhẩm: mấy giờ ăn sáng, ăn trưa ở đâu, mỗi chỗ ngồi bao lâu, có kịp đi hết trong một ngày
  không." Danh sách có thứ tự vẫn chưa phải là lịch trình.
- **Hiện trạng:** trang bộ sưu tập chỉ có lưới
  [collection-detail-page.tsx:232-243](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L232-L243);
  không có trường giờ nào trong `Collection`
  ([collection.ts:10-24](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L10-L24)).
- **Đề xuất UX:** thêm cặp chế độ xem thứ ba cạnh "Lưới | Bản đồ" (kế thừa DX-4.1): **"Lịch trình"**.
  Render dạng timeline dọc: mỗi chặng một `Item` gồm — giờ bắt đầu (`formatClock`), tên quán,
  thời lượng ghé (chỉnh bằng stepper 15/30/45/60/90/120 phút), khoảng cách + thời gian di chuyển tới
  chặng trước (`formatDistance` + ước lượng), và thanh phân cách giữa hai chặng ghi
  "~15 phút di chuyển". Chặng đầu có nút chọn "Bắt đầu từ: vị trí của tôi (useUserLocation) / quán
  đầu tiên". Trên mobile timeline là chế độ mặc định khi người dùng đã bật lịch trình.
- **Mô hình dữ liệu cần thêm:**
  ```ts
  interface DayPlanStop {
    placeId: string
    startTime: number
    durationMin: number
  }
  interface DayPlan {
    id: string
    collectionId: string
    stops: DayPlanStop[]
    updatedAt: string
  }
  ```
  Giai đoạn FE: lưu `localStorage` theo `collectionId`. Giai đoạn BE: `GET/PUT /me/day-plans/:collectionId`
  (1 kế hoạch ngày cho mỗi bộ sưu tập — không multi-day).
- **Giá trị thực:** chuyển đổi cốt lõi từ "danh sách" sang "kế hoạch" — đúng trọng tâm góc nghiên
  cứu. Là nền cho cả DX-6.2/6.3/6.4 (cùng một nguồn dữ liệu `DayPlan`).
- **Phạm vi:** FE-first (localStorage) → cần backend (đồng bộ thiết bị) — **M**.
- **Rủi ro:** sửa giờ từng chặng dễ làm lệch toàn tuyến → mọi thay đổi phải chạy lại "dồn giờ"
  (DX-6.2) và hiển thị kết quả thay vì im lặng. Chặng qua nửa đêm (bar 23:30–1:00) cần quy ước
  hiển thị rõ, không để hiện "25:30".

### DX-6.2: Kiểm tra khả thi — cảnh báo trùng giờ, không kịp di chuyển, vượt giới hạn Google Maps

- **Vấn đề người dùng:** người dùng tự xếp giờ hay mắc ba lỗi: (1) hai chặng chồng giờ, (2) khoảng
  cách 8 km mà chỉ chừa 10 phút di chuyển, (3) kế hoạch 12 điểm nhưng Google Maps (DX-4.2) chỉ nhận
  10 điểm dừng. Hiện không có gì kiểm tra — lỗi chỉ phát hiện khi đang đi.
- **Hiện trạng:** không có logic kiểm tra nào (grep `startTime|durationMin` = 0 kết quả trong `src/`).
  Khoảng cách đã tính được bằng `calculateDistanceKm`
  ([danang-districts.ts:17-34](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L17-L34))
  nhưng chỉ dùng để hiển thị, chưa dùng để đối chiếu thời gian.
- **Đề xuất UX:** một hàm thuần `validateDayPlan(plan, places)` chạy ngay khi mở chế độ Lịch trình,
  trả danh sách cảnh báo hiện dạng banner phía trên timeline (không chặn thao tác):
  - "Chặng 2 và 3 chồng nhau 20 phút" (overlap: `start_i + duration_i > start_{i+1}`).
  - "Từ Bánh xèo Bà Dư tới quán này ~4,2 km — cần ~25 phút đi máy, đang chỉ chừa 10 phút"
    (ước lượng: máy ~20 km/h, bộ ~4,5 km/h trong nội thành; hiển thị đúng là "ước lượng", không hứa).
  - "Kế hoạch có 12 điểm — Google Maps chỉ nhận 10 điểm dừng khi mở chỉ đường cả tuyến (DX-4.2)".
  - "Chuyến kết thúc 23:40" (chỉ thông tin, không phải cảnh báo).
- **Mô hình dữ liệu:** không thêm thực thể — hàm thuần trên `DayPlan` + `Place[]` đã có từ DX-6.1.
- **Giá trị thực:** đây là phần "thông minh" của lịch trình với chi phí gần bằng 0 (toán học thuần
  trên dữ liệu đã có). Ngăn lỗi đắt nhất (chồng giờ) ngay lúc lập kế hoạch chứ không phải trên đường.
- **Phạm vi:** FE-only — **S**.
- **Rủi ro:** ước lượng thời gian di chuyển từ Haversine là đường chim bay, thành phố thực có thể
  chậm hơn 1,5–2 lần → phải ghi "ước lượng" và dùng hệ số bảo thủ (nhân 1,5) thay vì số lạc quan.

### DX-6.3: "Sắp giờ gợi ý" — điền khung giờ theo loại quán và khoảng cách

- **Vấn đề người dùng:** tự điền giờ cho 6 chặng là việc nhàm, nhiều người sẽ bỏ tính năng vì lười
  nhập. Cần một điểm khởi đầu hợp lý để chỉ cần chỉnh.
- **Hiện trạng:** `PlaceCategory` đã có
  ([place.ts:1](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L1)),
  thứ tự đi sẽ có sau DX-4.3, khoảng cách có sẵn — nhưng không có chỗ nào kết hợp chúng thành giờ.
- **Đề xuất UX:** nút "Sắp giờ gợi ý" trên chế độ Lịch trình. Thuật toán: chặng đầu = 8:30 nếu quán
  đầu là `cafe`/`bakery`, 11:00 nếu `restaurant`/`street-food`, 17:30 nếu `bar`; thời lượng mặc định
  theo loại (cafe 45', restaurant 75', bar 90'); mỗi chặng sau = chặng trước + thời lượng + thời gian
  di chuyển ước lượng (dùng chung công thức của DX-6.2, một nguồn). Kết quả là **bản nháp có thể
  chỉnh** — hiện dòng "Đã điền giờ gợi ý, bạn chỉnh lại từng chặng được" và không tự ghi đè lần thứ
  hai nếu người dùng đã sửa tay (đánh dấu `stops` có `manual: true`).
- **Mô hình dữ liệu:** mở rộng `DayPlanStop` thêm `manual?: boolean` (đánh dấu chặng người dùng đã
  sửa tay, gợi ý không đè).
- **Giá trị thực:** biến tính năng từ "phải nhập liệu" thành "bấm một nút rồi chỉnh" — quyết định
  việc tính năng này có được dùng hay không.
- **Phạm vi:** FE-only — **S**.
- **Rủi ro:** heuristic theo loại quán sai với quán lai (cafe có cả đồ ăn) — chấp nhận vì đây chỉ là
  điểm khởi đầu; không gọi là "tối ưu" trong UI, đúng tinh thần DX-4.3 ("sắp gần nhau", không hứa).

### DX-6.4: Chế độ "Đang đi" — trễ bao nhiêu thì dồn lại, chặng nào phải bỏ

- **Vấn đề người dùng:** đi ăn nhóm **luôn trễ**. Kế hoạch in đá vào đá (9:00 là 9:00) sẽ vỡ ngay
  lần trễ đầu và người dùng bỏ dùng. Cần: trễ 30 phút → các chặng còn lại tự dồn, và nói thẳng
  chặng nào không còn kịp.
- **Hiện trạng:** không có khái niệm "đang đi"; "đã đi" chỉ suy ra được từ check-in của chính mình
  ([check-in-dialog.tsx:33-40](file:///home/longtran/Projects/frontend/src/features/places/components/check-in-dialog.tsx#L33-L40),
  đã nêu trong agent-4 §6) nhưng không gắn với kế hoạch.
- **Đề xuất UX:** nút `Toggle` "Đang đi kế hoạch này" (kèm `pressed`/`onPressedChange`, đúng chuẩn
  quy ước nút bật/tắt). Khi bật:
  - Chặng đang ở có nút "Đã xong — giờ bắt đầu thực tế" (mặc định = giờ hiện tại, chỉnh được).
  - Các chặng sau **tự dồn**: `start_{i+1} = max(giờ thực tế kết thúc chặng i, start_{i+1} cũ)`,
    giữ nguyên thứ tự và thời lượng — không tự xoá chặng.
  - Chặng nào dồn ra sau 21:30 (ngưỡng kết thúc ngày ăn uống) được đánh dấu "Có thể không kịp — cân
    nhắc bỏ" với nút "Bỏ chặng này" (xoá khỏi kế hoạch, không xoá khỏi bộ sưu tập).
  - Dòng tổng kết đầu timeline: "Trễ 30 phút so với kế hoạch · kết thúc dự kiến 21:10".
- **Mô hình dữ liệu:** mở rộng `DayPlanStop` thêm `actualStart?: number` (giờ thực tế, null khi chưa
  đi); trạng thái "đang đi" là field của `DayPlan` (`activeOn?: string` — ngày ISO, hoặc null).
- **Giá trị thực:** đây chính là yêu cầu "chịu được trễ 30 phút mà không vỡ kế hoạch". Phân biệt với
  DX-4.4 "Đã đi": DX-4.4 là trạng thái _tích luỹ_ (đã từng đi quán này), DX-6.4 là trạng thái _trong
  chuyến_ (chặng này xong lúc mấy giờ hôm nay) — hai dữ liệu khác nhau, không gộp.
- **Phạm vi:** FE-only (localStorage) — **S/M**.
- **Rủi ro:** dồn giờ tự động dễ trở thành "ma thuật khó hiểu" → phải luôn hiện dòng giải thích
  "đã dồn chặng 3–5 do bạn bắt đầu chặng 2 lúc 10:05"; không tự xoá chặng bao giờ, chỉ gợi ý bỏ.

### DX-6.5: Chia sẻ kế hoạch ngày dạng văn bản (copy / `navigator.share`)

- **Vấn đề người dùng:** đi ăn nhóm thì phải gửi lịch trình cho cả nhóm — qua Zalo/Messenger, không
  phải trong app (nhóm trong app thuộc agent khác). Hiện phải chụp màn hình hoặc gõ tay.
- **Hiện trạng:** hạ tầng chia sẻ đã có: `shareLink` + `ShareButton`
  ([share.ts:24-43](file:///home/longtran/Projects/frontend/src/lib/share.ts#L24-L43), dùng ở
  [collection-detail-page.tsx:191-194](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L191-L194))
  nhưng chỉ chia sẻ _link_, chưa có chia sẻ _nội dung_ kế hoạch.
- **Đề xuất UX:** nút "Sao chép lịch trình" trên chế độ Lịch trình → dựng text thuần:
  ```
  Lịch trình Đà Nẵng — Bộ sưu tập "Quán ngon 1 ngày"
  08:30  Cà phê X (45 phút) → ~15 phút di chuyển
  09:30  Bánh xèo Y (75 phút) → ~25 phút di chuyển
  ...
  Mở chỉ đường cả tuyến: <link DX-4.2>
  ```
  Copy vào clipboard; mobile có `navigator.share` thì mở sheet chia sẻ hệ thống (dùng pattern của
  `share.ts`, không viết cơ chế mới). Người nhận không cần cài app vẫn đọc được.
- **Mô hình dữ liệu:** không thêm gì — hàm thuần `dayPlanToText(plan, places): string`.
- **Giá trị thực:** chi phí S, giải quyết nhu cầu thực tế nhất của đi nhóm (mọi người cần biết giờ
  và địa điểm) mà không đụng vào phạm vi "tính năng nhóm" của agent khác.
- **Phạm vi:** FE-only — **S**.
- **Rủi ro:** format text là hợp đồng ngoài tầm kiểm soát (Zalo có thể xuống dòng khác) — chấp nhận,
  chỉ cần dễ đọc là đủ; không nhúng link ngắn hay QR (overengineering).

## Cách thử với mock hiện tại (1 user `ME`, không auth)

1. **Giai đoạn FE-only (không đụng mock server):** `DayPlan` lưu `localStorage` theo key
   `dayplan:<collectionId>`, pattern đã có sẵn ở
   [skin-provider.tsx:8,23](file:///home/longtran/Projects/frontend/src/app/providers/skin-provider.tsx#L8).
   Với mock 1 user, localStorage ≈ đúng ngữ nghĩa "cá nhân tôi" — không có user thứ hai để xung đột.
   TanStack Query vẫn là nguồn dữ liệu `Place`/`Collection` như hiện tại; `DayPlan` đọc/ghi trực
   tiếp, không cần route.
2. **Giai đoạn BE-mock (khi cần chứng minh hợp đồng API):** thêm route
   `GET/PUT /me/day-plans/:collectionId` vào `src/mocks/server.ts` (bảng `db.dayPlans` khởi từ
   fixture rỗng — "người dùng chưa có kế hoạch nào" là trạng thái mặc định đúng), validate
   `startTime` 0–1439, `durationMin` 15–240, `placeId` phải thuộc bộ sưu tập. Hợp đồng ghi vào
   `docs/DECISIONS.md` trước khi implement (theo quy ước D-011).
3. **Dữ liệu thử:** 4 bộ sưu tập fixture đã có
   (`placeIds` ở [fixtures/collections.ts:33-66](file:///home/longtran/Projects/frontend/src/mocks/fixtures/collections.ts#L33),
   ví dụ `p-04, p-05, p-06` đủ 3 chặng để thử cảnh báo trùng giờ bằng cách đặt `startTime` chồng
   nhau tay). 27 quán mock đều có `lat/lng` nên `calculateDistanceKm` chạy thật.
4. **Chưa thử được với mock:** thời gian di chuyển thực tế (chỉ có đường chim bay × hệ số), và hành
   vi "dồn giờ" trên thiết bị thật khi đang đi (cần người dùng thật đi thử).

## Không đề xuất và lý do

- **Kế hoạch nhiều ngày / chuyến đi nhiều ngày** — ngoài phạm vi được giao (agent khác phụ trách
  nhiều ngày); và một `DayPlan` gắn một bộ sưu tập đã phủ ca sử dụng "một buổi đi ăn".
- **Nhắc nhở / thông báo theo giờ (thông báo 15 phút trước chặng)** — cần hạ tầng push/notification
  theo thời gian, mock không có; và TONG-HOP §5 đã chốt không làm push ngoài app ở giai đoạn này.
- **Tối ưu tuyến thật (TSP, dữ liệu đường bộ, giờ cao điểm)** — cần dữ liệu đường và routing engine;
  nearest-neighbor trên Haversine (DX-4.3) + hệ số bảo thủ của DX-6.2 đã đủ cho quy mô Đà Nẵng.
  Dựng routing trong app cũng bị TONG-HOP §5 loại.
- **Đồng bộ Google Calendar / xuất .ics** — cần OAuth backend; và người đi ăn nhóm chia qua Zalo
  (DX-6.5) thực tế hơn là calendar. Overengineering cho giai đoạn mock.
- **AI gợi ý lịch trình theo khẩu vị** — cần backend/model; nguồn gợi ý đã có là `PlaceSuggestion`
  do server xếp hạng, nhân đôi nguồn quyết định chỉ tạo nhiễu (đồng ý với agent-4, mục Không đề xuất).
- **Dự báo thời tiết / mức đông theo giờ** — dữ liệu thật chưa tồn tại, sẽ tạo cảm giác chính xác giả.
- **Đặt bàn / giữ chỗ theo khung giờ** — không có dữ liệu nhà hàng, không có kênh nào gửi yêu cầu;
  tính năng sẽ luôn nói dối người dùng.
- **Chia sẻ kế hoạch realtime cho nhóm đi cùng (cùng xem/sửa một kế hoạch)** — thuộc phạm vi nhóm
  (agent khác) và cần backend thời gian thực; mock chỉ có 1 user nên không kiểm chứng được.
- **Sửa `Collection` để nhúng `DayPlan` vào bộ sưu tập** — cố ý **không** đề xuất đổi shape
  `Collection` (DX-4.4 đã là breaking change lớn nhất đợt trước). `DayPlan` là thực thể riêng gắn
  `collectionId`, tách vòng đời: xoá bộ sưu tập thì kế hoạch mất theo, nhưng kế hoạch có thể tồn tại
  độc lập khi thử FE-only.

## Chưa xác minh

- Toàn bộ dựa trên đọc code, chưa chạy app trong trình duyệt; chưa đo xem timeline dọc hiển thị thế
  nào với bộ sưu tập 10+ điểm.
- Ước lượng thời gian di chuyển (máy 20 km/h, bộ 4,5 km/h, hệ số 1,5) là suy luận kinh nghiệm, chưa
  đối chiếu với Google Maps cho các cặp điểm thật trong fixture.
- URL deep-link Google Maps trong ví dụ DX-6.5 kế thừa DX-4.2 — chưa thử trên thiết bị thật
  (TONG-HOP §6 cũng ghi chưa xác minh tương tự).
