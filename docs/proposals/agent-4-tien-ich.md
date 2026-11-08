# Agent 4 — Lập kế hoạch & tiện ích thực tế

> Góc nhìn: biến "đã lưu" thành "đã đi". Không gamification, không feed/review, không thông báo,
> không bản đồ khám phá chung (thuộc agent khác). Ranh giới của agent này: **bản đồ nhiều điểm của
> một bộ sưu tập / lịch trình**, thứ tự đi, chỉ đường, ghi chú, trạng thái đã đi.

## Hiện trạng (bằng chứng code)

**1. Bộ sưu tập chỉ là một danh sách id, không có gì hơn.**

- `Collection` chỉ có `name`, `description`, `isPrivate`, `owner`, `placeIds`, `createdAt`,
  `likeCount`, `likedByMe` — [collection.ts:10-24](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L10-L24).
  Không có trường nào cho ghi chú, ngày đi, thứ tự tự đặt hay trạng thái "đã đi".
- Thứ tự `placeIds` là thứ tự thêm: server `push` xuống cuối khi thêm
  ([server.ts:585](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L585)), lọc bỏ khi bớt
  ([server.ts:587](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L587)). Comment type
  cũng nói rõ "thứ tự do người dùng (thêm mới đẩy xuống cuối)"
  ([collection.ts:6-8](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L6-L8)).
- Hợp đồng API chỉ có thêm/bớt thành viên, **không có đổi thứ tự**:
  `PATCH /collections/:id/places` với `{ placeId, member }`
  ([collections.ts:59-70](file:///home/longtran/Projects/frontend/src/features/collections/api/collections.ts#L59-L70),
  route ở [server.ts:836](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L836)).

**2. Trang chi tiết bộ sưu tập chỉ có lưới ảnh, không có bản đồ, không có thứ tự hiển thị rõ.**

- Render `collection.placeIds.map(...)` thành lưới `PlaceCard` 1/2/3 cột
  ([collection-detail-page.tsx:232-243](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L232-L243)).
  Không có số thứ tự, không có khoảng cách giữa các điểm, không có bản đồ.
- Thanh hành động chỉ có thích / chia sẻ / sửa / xoá
  ([collection-detail-page.tsx:189-214](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L189-L214)).

**3. Bản đồ hiện có chỉ phục vụ một điểm, và chỉ đường cũng chỉ một điểm.**

- `PlaceMiniMap` nhận đúng một `place`, vẽ một marker, và nút "Mở chỉ đường Google Maps" dựng URL
  `maps/search/?api=1&query=<tên + địa chỉ>` — tức là **tìm kiếm**, không phải chỉ đường theo tuyến
  ([place-mini-map.tsx:69-71](file:///home/longtran/Projects/frontend/src/features/places/components/place-mini-map.tsx#L69-L71),
  [place-mini-map.tsx:89-97](file:///home/longtran/Projects/frontend/src/features/places/components/place-mini-map.tsx#L89-L97)).
- Ngược lại, `PlacesMap` **đã** làm được bản đồ nhiều điểm: nhận `places: Place[]`, `fitBounds` theo
  tất cả điểm, marker có popup, hỗ trợ `selectedPlaceId`, `onSelectPlace`, `userCoordinates`
  ([places-map.tsx:21-29](file:///home/longtran/Projects/frontend/src/features/places/components/places-map.tsx#L21-L29),
  [places-map.tsx:31-69](file:///home/longtran/Projects/frontend/src/features/places/components/places-map.tsx#L31-L69)).
  Nó chỉ đang được dùng ở `/discover`, chưa dùng cho bộ sưu tập.

**4. Tab "Địa điểm" ở `/saved` là Empty cứng — không có khái niệm "địa điểm đã lưu" độc lập.**

- [saved-page.tsx:61-77](file:///home/longtran/Projects/frontend/src/features/saved/pages/saved-page.tsx#L61-L77)
  render `Empty` vô điều kiện, dù người dùng đã lưu địa điểm vào bộ sưu tập. Địa điểm chỉ tồn tại
  **bên trong** bộ sưu tập; không có endpoint "địa điểm tôi đã lưu".
- `useCollections({ placeId })` chỉ trả `containsPlace` cho một địa điểm đang mở
  ([collection.ts:36-37](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L36-L37)),
  không trả danh sách địa điểm.

**5. Đã có sẵn hạ tầng để làm lịch trình mà không cần thư viện mới.**

- Haversine `calculateDistanceKm` đã có, kèm comment giải thích vì sao không dùng Leaflet
  ([danang-districts.ts:10-35](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L10-L35)).
- `DANANG_DISTRICTS` (6 quận) và `Place.district` đã có
  ([danang-districts.ts:1-6](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L1-L6),
  [place.ts:9-10](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L9-L10)),
  `/discover` đã lọc theo quận bằng `ToggleGroup`
  ([discover-page.tsx:139-156](file:///home/longtran/Projects/frontend/src/features/places/pages/discover-page.tsx#L139-L156)).
- `useUserLocation()` trả `coordinates` + `requestLocation()` + `locationGate`, chỉ hỏi quyền khi
  người dùng chủ động ([use-user-location.tsx:20-66](file:///home/longtran/Projects/frontend/src/hooks/use-user-location.tsx#L20-L66)).
- `formatDistance`, `formatDate`, `formatCoordinate` đã có
  ([format.ts:60-96](file:///home/longtran/Projects/frontend/src/lib/format.ts#L60-L96)).
- Chia sẻ link đã có `shareLink` + `ShareButton`
  ([share.ts:24-43](file:///home/longtran/Projects/frontend/src/lib/share.ts#L24-L43),
  dùng ở [collection-detail-page.tsx:191-194](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L191-L194)).

**6. "Đã đi" hiện chỉ tồn tại gián tiếp qua check-in.**

- `CheckInDialog` tạo bài đăng gắn sẵn `placeId`
  ([check-in-dialog.tsx:33-40](file:///home/longtran/Projects/frontend/src/features/places/components/check-in-dialog.tsx#L33-L40));
  `Post` có `author` + `placeId`
  ([post.ts:13-19](file:///home/longtran/Projects/frontend/src/features/social/types/post.ts#L13-L19)).
  Nghĩa là "tôi đã từng ở đây" **suy ra được** từ bài đăng của tôi, nhưng chưa màn hình nào dùng.

**Tham chiếu sản phẩm:** Wanderlog (được người dùng thật khen nhiều nhất ở 3 điểm: _optimize route_,
_itinerary theo ngày_, _đẩy chỉ đường sang Google Maps khi đang đi_; xem trang chủ wanderlog.com,
mục review) và Google Maps Lists (lưu được nhiều điểm nhưng không có thứ tự đi, không có "đã đi",
không có ghi chú theo ngữ cảnh chuyến). Điểm chung: giá trị nằm ở **thứ tự + chỉ đường + ghi chú**,
không nằm ở việc lưu nhiều hơn.

## Đề xuất

### DX-4.1: Bản đồ nhiều điểm cho bộ sưu tập, có đánh số thứ tự

- **Vấn đề người dùng:** "Tôi lưu 8 quán ở Đà Nẵng rồi, nhưng nhìn lưới ảnh tôi không biết chúng
  nằm rải ở đâu, có gần nhau không, đi trong một buổi có kịp không." Hiện tại phải mở từng quán để
  xem mini-map, 8 lần.
- **Hiện trạng:** [collection-detail-page.tsx:232-243](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L232-L243)
  chỉ có lưới; `PlacesMap` đã hỗ trợ nhiều điểm nhưng chưa được dùng ở đây
  ([places-map.tsx:124-131](file:///home/longtran/Projects/frontend/src/features/places/components/places-map.tsx#L124-L131)).
- **Đề xuất:**
  - Thêm cặp `ToggleGroup` (một-trong-nhiều) "Lưới | Bản đồ" ở đầu danh sách địa điểm, giống cách
    `/discover` đang chuyển chế độ. Mặc định "Lưới" để không đổi trải nghiệm hiện có.
  - Chế độ bản đồ dùng lại `PlacesMap` với `places` = các `Place` đã resolve từ `placeIds`, thêm
    prop `labelMode="order"` (hoặc một lớp marker riêng) để marker hiện **số thứ tự** thay vì tên +
    giá: 1, 2, 3… theo đúng thứ tự trong bộ sưu tập. Bấm marker → `selectedPlaceId` → panel nhỏ dưới
    bản đồ hiện tên, quận, khoảng cách tới điểm trước, nút "Xem quán".
  - Bật `userCoordinates` bằng `useUserLocation()` với nút "Bắt đầu từ vị trí của tôi"; khi bật thì
    hiện thêm khoảng cách từ tôi tới từng điểm (đã có sẵn logic trong `PlacesMap`).
- **Giá trị thực:** người dùng quyết định được "đi trong một buổi hay chia hai buổi" ngay trên trang
  bộ sưu tập, thay vì mở 8 tab. Đây cũng là nền cho DX-4.2 và DX-4.3 (cùng một nguồn thứ tự).
- **Phạm vi:** FE-only — S/M. Rủi ro chính là bundle Leaflet: trang `/collections/:id` hiện **không**
  import Leaflet, nên phải `lazy()` `PlacesMap` để không kéo Leaflet vào lần tải đầu (xem
  BACKLOG mục "Bundle 650 kB… chưa code-split theo route").
- **Rủi ro / điều kiện cần:** `Place.lat/lng` là optional — phải xử lý địa điểm thiếu toạ độ (đếm và
  báo "3 địa điểm chưa có toạ độ, không hiện trên bản đồ"), không được im lặng bỏ qua. Bộ sưu tập
  chỉ có 1 điểm thì `fitBounds` phải chuyển sang `setView` (đã xử lý trong `MapBoundsUpdater`).

### DX-4.2: "Mở chỉ đường cả tuyến" — deep link Google Maps nhiều điểm dừng

- **Vấn đề người dùng:** "Tôi có danh sách 5 quán, giờ phải copy từng địa chỉ sang Google Maps, 5
  lần, và tự nhớ thứ tự." Đây đúng là điểm yếu lớn nhất của Google Maps Lists.
- **Hiện trạng:** nút chỉ đường hiện tại là `maps/search/?api=1&query=<tên + địa chỉ>` cho **một**
  điểm ([place-mini-map.tsx:69-71](file:///home/longtran/Projects/frontend/src/features/places/components/place-mini-map.tsx#L69-L71)),
  không có URL tuyến nào trong toàn bộ codebase (không có `dir/?api=1`, không có `waypoints`).
- **Đề xuất:**
  - Trên trang bộ sưu tập (cả chế độ lưới và bản đồ), thêm nút "Mở chỉ đường cả tuyến" cạnh nút
    Chia sẻ. Bấm → mở tab mới `https://www.google.com/maps/dir/?api=1&origin=<điểm đầu>&destination=<điểm cuối>&waypoints=<các điểm giữa, phân cách bằng |>&travelmode=driving`.
  - Toạ độ dùng `lat,lng` (định dạng quốc tế, không dấu phẩy thập phân) khi có, fallback sang
    `tên + địa chỉ` khi thiếu — đúng tinh thần comment ở
    [format.ts:77-85](file:///home/longtran/Projects/frontend/src/lib/format.ts#L77-L85).
  - Nếu bật "Bắt đầu từ vị trí của tôi" (DX-4.1) thì `origin` = toạ độ người dùng.
  - Giới hạn: Google Maps chỉ nhận tối đa 9 waypoint (10 điểm dừng). Quá ngưỡng thì chia tuyến theo
    ngày/khu vực (DX-4.5) hoặc báo rõ "tuyến có 12 điểm, Google Maps chỉ nhận 10 — đang lấy 10 điểm
    đầu". Không cắt im lặng.
  - Trên mobile, nếu `navigator.share` có sẵn thì dùng `shareLink` để chia sẻ URL tuyến cho người
    cùng đi thay vì mở tab (tận dụng `share.ts`, không viết mới).
- **Giá trị thực:** từ "danh sách 5 quán" đến "đang trên đường" giảm từ ~5 phút copy-paste xuống 1
  cú bấm. Đây là tính năng có tỉ lệ dùng/chi phí cao nhất trong cả 5 đề xuất.
- **Phạm vi:** FE-only — S. Không cần backend, không cần API key, không thêm dependency.
- **Rủi ro / điều kiện cần:** URL scheme của Google Maps là hợp đồng bên ngoài, có thể đổi; phải coi
  đây là "best effort" và luôn có fallback mở `maps/search` cho từng điểm. Cần test trên mobile thật
  (app Google Maps có thể chặn universal link trong một số trình duyệt trong app).

### DX-4.3: Sắp xếp thứ tự địa điểm — kéo thả và "Sắp theo quãng đường"

- **Vấn đề người dùng:** "Thứ tự trong bộ sưu tập là thứ tự tôi lưu, không phải thứ tự tôi sẽ đi.
  Quán lưu sau cùng lại nằm cuối, dù nó gần quán đầu tiên." Muốn đi theo một vòng hợp lý thì phải
  tự nhẩm khoảng cách.
- **Hiện trạng:** thứ tự do server ấn định lúc thêm, không có API đổi thứ tự
  ([server.ts:574-595](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L574-L595),
  [collections.ts:59-70](file:///home/longtran/Projects/frontend/src/features/collections/api/collections.ts#L59-L70)).
  UI không có tay nắm kéo, không có số thứ tự.
- **Đề xuất:**
  - Mỗi `PlaceCard` trong bộ sưu tập (khi `isMine`) có tay nắm kéo + số thứ tự ở góc. Kéo thả đổi
    thứ tự, lưu ngay khi thả (optimistic, rollback nếu lỗi — cùng pattern `useSetCollectionLike` ở
    [use-collections.ts:94-132](file:///home/longtran/Projects/frontend/src/features/collections/hooks/use-collections.ts#L94-L132)).
  - Nút "Sắp theo quãng đường": tính bằng nearest-neighbor trên `calculateDistanceKm` có sẵn, điểm
    xuất phát = vị trí người dùng (nếu đã bật) hoặc điểm đầu danh sách. Hiện kết quả dưới dạng
    "xem trước" kèm tổng quãng đường trước/sau ("12,4 km → 7,1 km") và nút "Áp dụng" — không tự
    ghi đè thứ tự người dùng đã đặt tay.
  - Thêm nút "Sắp theo quận" (nhóm theo `Place.district`) cho người đi theo khu vực, không cần GPS.
- **Giá trị thực:** giảm quãng đường di chuyển thực tế và biến danh sách thành lộ trình. Với Đà Nẵng
  (các quán Hải Châu / Sơn Trà cách nhau 3–8 km), sắp lại thường cắt được 30–40% quãng đường.
- **Phạm vi:** cần backend — M. Hợp đồng đề xuất: `PATCH /collections/:id/place-order` với
  `{ placeIds: string[] }` (server validate: đúng tập thành viên hiện tại, không thiếu không thừa).
  Mock cần thêm route + field `order`, và `setCollectionPlaces` phải tôn trọng thứ tự mới.
- **Rủi ro / điều kiện cần:** kéo thả trên mobile dễ xung đột với scroll dọc; nếu không muốn thêm
  thư viện DnD thì dùng nút "Lên / Xuống" trong menu của item (đủ dùng, không cần dependency mới).
  Nearest-neighbor chỉ là xấp xỉ — phải gọi đúng tên là "sắp gần nhau" trong UI, không hứa "tối ưu".

### DX-4.4: Ghi chú cá nhân + trạng thái "Đã đi" cho từng địa điểm trong bộ sưu tập

- **Vấn đề người dùng:** "Tôi lưu quán này vì món bánh xèo, nhưng 3 tuần sau mở ra chỉ thấy ảnh và
  địa chỉ — quên mất lý do. Và tôi không nhớ mình đã đi quán nào rồi." Ghi chú hiện chỉ có ở cấp bộ
  sưu tập (mô tả), không có ở cấp từng quán.
- **Hiện trạng:** `Collection.description` là chỗ duy nhất để ghi
  ([collection.ts:13](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L13));
  không có metadata theo cặp (bộ sưu tập, địa điểm). "Đã đi" chỉ suy ra được từ bài check-in của
  tôi ([check-in-dialog.tsx:33-40](file:///home/longtran/Projects/frontend/src/features/places/components/check-in-dialog.tsx#L33-L40))
  nhưng không nơi nào hiển thị.
- **Đề xuất:**
  - Mỗi item trong bộ sưu tập có dòng ghi chú ngắn (1 dòng, "Món phải thử: bánh xèo, 45k") sửa tại
    chỗ bằng `Textarea` autosize + nút Lưu, hoặc mở `Dialog` nhỏ. Giới hạn ký tự khai ở
    `src/lib/constants.ts` (ví dụ `MAX_COLLECTION_NOTE_LENGTH = 200`) — theo đúng quy ước
    "mọi giới hạn ký tự khai ở đây" ([constants.ts:1-6](file:///home/longtran/Projects/frontend/src/lib/constants.ts#L1-L6)).
  - Nút `Toggle` "Đã đi" (icon `CheckIcon`, `aria-pressed`) trên từng item. Bật → item mờ nhẹ, gạch
    tên, và có bộ lọc "Chưa đi / Đã đi / Tất cả" ở đầu danh sách. Đây là `Toggle` đúng chuẩn, không
    phải `Button aria-pressed`.
  - Gợi ý "đã đi" tự động: nếu người dùng đã có bài check-in tại địa điểm đó thì hiện badge "Bạn đã
    check-in ở đây" kèm ngày, dựa trên bài đăng của chính mình (dữ liệu đã có trong `Post`).
  - Ghi chú **chỉ chủ sở hữu thấy** — không đưa vào response công khai của bộ sưu tập.
- **Giá trị thực:** biến bộ sưu tập từ "bookmark" thành "sổ tay". Đây là thứ Google Maps Lists làm
  kém nhất và là lý do người dùng quay lại app trước khi đi ăn.
- **Phạm vi:** cần backend — M. Hợp đồng đề xuất: mở rộng `PATCH /collections/:id/places` nhận thêm
  `{ note?: string, visited?: boolean }` cho một `placeId`, hoặc `PATCH /collections/:id/places/:placeId`.
  Response `Collection` đổi `placeIds: string[]` → `places: CollectionPlace[]` (kèm `note`, `visited`,
  `order`) — **breaking change**, cần version hoặc giữ `placeIds` trong giai đoạn chuyển tiếp.
- **Rủi ro / điều kiện cần:** đây là thay đổi shape lớn nhất trong 5 đề xuất, chạm type dùng ở
  `saved-page`, `collection-detail-page`, `save-to-collection-dialog`, `useSetCollectionPlace`. Nên
  làm sau DX-4.1/DX-4.2 để có giá trị sớm trước khi đổi hợp đồng. Cần chốt: ghi chú có bị xoá khi
  bỏ địa điểm khỏi bộ sưu tập rồi thêm lại không (đề xuất: xoá, giống hành vi hiện tại của `placeIds`).

### DX-4.5: Tab "Địa điểm" ở `/saved` — tổng hợp mọi địa điểm đã lưu, kèm trạng thái đã đi

- **Vấn đề người dùng:** "Tôi biết mình đã lưu quán đó, nhưng không nhớ lưu vào bộ sưu tập nào. Tab
  'Địa điểm' báo tôi chưa lưu gì — trong khi tôi đã lưu 6 quán." Đây là màn hình đang **nói sai** với
  người dùng.
- **Hiện trạng:** tab render `Empty` vô điều kiện
  ([saved-page.tsx:61-77](file:///home/longtran/Projects/frontend/src/features/saved/pages/saved-page.tsx#L61-L77)).
  Không có endpoint "địa điểm tôi đã lưu"; `GET /collections` chỉ trả `CollectionSummary` có
  `previewPlaceIds` (3 id đầu) — [collection.ts:27-39](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L27-L39),
  nên không thể dựng danh sách đầy đủ chỉ từ danh sách rút gọn.
- **Đề xuất:**
  - Giai đoạn 1 (FE-only): gọi `GET /collections` rồi `GET /collections/:id` cho từng bộ sưu tập của
    tôi, hợp nhất `placeIds` (dedupe, giữ thứ tự xuất hiện đầu), resolve `Place` qua cache `usePlace`.
    Mỗi dòng là một `Item`: ảnh nhỏ, tên, quận, số bộ sưu tập chứa nó ("trong 2 bộ sưu tập"), badge
    "Đã đi" nếu có check-in của tôi, nút mở chỉ đường. Có ô tìm nhanh theo tên và `ToggleGroup` lọc
    theo quận (dùng `DANANG_DISTRICTS`).
  - Giai đoạn 2 (khi có backend): thay bằng `GET /me/saved-places` trả danh sách đã gộp sẵn, có
    `collectionIds` và `visitedAt`. Không đổi UI.
  - Nếu số bộ sưu tập lớn, giai đoạn 1 sẽ N+1 request — chấp nhận được với mock (4 bộ sưu tập) nhưng
    phải ghi rõ trong code là tạm thời, và không dùng cách này khi có backend.
- **Giá trị thực:** sửa một màn hình đang sai sự thật, đồng thời tạo "hộp thư đến" của việc ăn uống:
  một chỗ để xem tất cả quán đã lưu mà không phải nhớ chúng nằm ở bộ sưu tập nào.
- **Phạm vi:** FE-only (giai đoạn 1) — S/M; cần backend (giai đoạn 2) — S.
- **Rủi ro / điều kiện cần:** N+1 request ở giai đoạn 1; cần `Skeleton` cho trạng thái tải và `Empty`
  riêng cho "chưa lưu địa điểm nào" (khác với "đang tải"). Không được dùng tab này để thay thế bộ sưu
  tập — nó là chế độ xem phẳng, bộ sưu tập vẫn là nơi tổ chức.

## Không đề xuất và lý do

- **Điểm thưởng / huy hiệu / chuỗi ngày đi ăn** — ngoài phạm vi được giao (gamification thuộc agent
  khác) và không giải quyết vấn đề "làm sao đi được nhiều quán hơn trong một buổi".
- **Ngân sách chuyến đi (như Wanderlog)** — dữ liệu hiện chỉ có `priceLevel: 1 | 2 | 3`
  ([place.ts:15](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L15)),
  không có giá món. Dựng ngân sách trên dữ liệu này sẽ tạo cảm giác chính xác giả.
- **Checklist mua/ăn thử theo món** — `Place.tags` quá thô (`#hải sản`, `#bánh xèo`), không có danh
  mục món. Cần dữ liệu thật trước; ghi chú tự do ở DX-4.4 phủ được 80% nhu cầu với 0 dữ liệu mới.
- **Lịch trình theo giờ + nhắc nhở** — cần backend lịch và hệ thống thông báo (agent khác phụ
  trách). DX-4.3 + DX-4.4 đã đủ để "lên kế hoạch một buổi" mà không cần giờ cụ thể.
- **Cộng tác chỉnh sửa bộ sưu tập (nhiều người cùng sửa)** — mock chỉ có một người dùng `ME`; cần
  backend thời gian thực, không kiểm chứng được trong phạm vi hiện tại.
- **Xuất PDF / đồng bộ Notion / in lịch trình** — overengineering cho quy mô hiện tại; `ShareButton`
  - deep link Google Maps (DX-4.2) đã đủ để chia sẻ tuyến cho người đi cùng.
- **Bản đồ khám phá chung, feed, đánh giá, thông báo** — thuộc agent khác, ghi ở đây để rõ ranh giới.
- **Tự động thêm địa điểm gợi ý vào lịch trình bằng AI** — cần dữ liệu + backend + chi phí; và chất
  lượng gợi ý hiện tại đã do server xếp hạng (`PlaceSuggestion`), không nên nhân đôi nguồn quyết định.
