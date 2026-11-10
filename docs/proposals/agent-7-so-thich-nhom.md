# Agent 7 — Sở thích nhóm & lọc theo nhóm

> Nghiên cứu read-only, ngày 2026-11-08. Chỉ ghi đúng 1 file này, không sửa code, không commit.
> Góc riêng: **mỗi thành viên khai mong muốn của mình → hệ thống hợp nhất thành danh sách quán
> phù hợp cả nhóm, giải thích được "vì sao" và "ai bị vi phạm"**.
> KHÔNG đụng: mời/tham gia phiên + chốt quyết định (agent 9), chia hóa đơn (agent 8),
> lịch trình theo giờ (agent 6), nhiều ngày (agent 10).

## Kế thừa từ đợt trước (không lặp lại)

Kế thừa và xây **trên nền** các đề xuất đã chốt trong [TONG-HOP.md](./TONG-HOP.md), không đề xuất lại:

- **DX-1.1** sắp xếp kết quả khám phá — bộ lọc nhóm ở dưới cần thứ tự có nghĩa; khi DX-1.1 có
  `sort`, danh sách nhóm sẽ tái dùng cùng param thay vì tự chế thứ tự riêng.
- **DX-1.2** "Gần đây" theo bán kính — thành viên nhóm khai "quận/khu vực" thay cho toạ độ;
  bán kính vẫn là việc của DX-1.2.
- **DX-A** giờ mở cửa — nhóm có "giờ rảnh" nhưng hợp nhất theo giờ mở cửa **không làm được** cho
  đến khi DX-A có dữ liệu `openingHours`. Xem DX-7.5 và mục "Không đề xuất".
- **DX-2.1** feed theo dõi, **DX-4.x** bộ sưu tập/lịch trình, **DX-5.4** khối "Khẩu vị" trên
  profile — DX-7.1 tái dùng đúng tinh thần DX-5.4 nhưng cho **nhóm**, không nhân bản khối UI.

## Hiện trạng (bằng chứng code + giới hạn dữ liệu)

### Dữ liệu địa điểm hiện có — chính xác là gì

[`Place`](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L4-L23) có:
`id, name, address, city, district?, category, tags[], rating, reviewCount, priceLevel (1|2|3),
imageSeed, imageHeight, lat?, lng?`.

**KHÔNG có**: giờ mở cửa, danh sách món, cờ ăn chay/không chay, dị ứng, wifi/giữ xe, không gian
(đi nhóm/đi một mình). Mọi tính năng "điểm theo sở thích" dưới đây chỉ được phép dựa trên
`category` + `tags` + `priceLevel` + `district` + `lat/lng` + `rating`.

Bằng chứng chi tiết:

| Thực tế                                                                                                   | Bằng chứng                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 loại hình duy nhất: cafe, restaurant, street-food, bakery, dessert, bar                                 | [`CATEGORY_META`](file:///home/longtran/Projects/frontend/src/features/places/lib/category-meta.ts#L13-L20)                                                                                                                       |
| `priceLevel` chỉ 3 mức; fixture phân bố 12×₫, 13×₫₫, 5×₫₫₫ (30 quán)                                      | [`place.ts:15`](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L15), `src/mocks/fixtures/places.ts` (đếm grep)                                                                                        |
| 6 quận trong fixture: Hải Châu 12, Sơn Trà 5, Ngũ Hành Sơn 4, Thanh Khê 3, Cẩm Lệ 3, Liên Chiểu 3         | [`DANANG_DISTRICTS`](file:///home/longtran/Projects/frontend/src/features/places/lib/danang-districts.ts#L1-L8) + grep fixture                                                                                                    |
| `GET /places` chỉ lọc `category`/`district`/`q`, **không nhận** `priceLevel`, không sort                  | [`listPublishedPlaces`](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L125-L150), route [server.ts:758-768](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L758-L768)                                  |
| `tags` là chuỗi thô tự do — chỉ 1 tag "rau rừng", không có tag nào nói về chay/dị ứng (grep toàn fixture) | `src/mocks/fixtures/places.ts`                                                                                                                                                                                                    |
| Chỉ 1 người dùng `ME` (`u-me`), chưa có auth; nhưng fixture đã có 5 user khác đầy đủ hồ sơ                | [`MOCK_USERS`](file:///home/longtran/Projects/frontend/src/mocks/fixtures/users.ts#L9-L94), [`ME`](file:///home/longtran/Projects/frontend/src/mocks/fixtures/users.ts#L97)                                                       |
| Bộ sưu tập là `placeIds: string[]` của **một** owner, không có khái niệm thành viên                       | [`Collection`](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L10-L24)                                                                                                                      |
| Server có sẵn khuôn "server chấm điểm + trả reason"                                                       | [`rankPlaceSuggestions`](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L157-L164) → `PlaceSuggestion.reason` ([place.ts:48-52](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L48-L52)) |

### Hệ quả cho góc nhóm

1. **Làm được ngay** với dữ liệu hiện có: hợp nhất theo loại hình, mức giá tối đa, quận, khoảng
   cách, từ khoá tránh, và chấm điểm theo `rating`. Đây là 5/6 chiều người dùng nêu.
2. **Cần bổ sung dữ liệu**: ăn chay/dị ứng (DX-7.5), giờ rảnh × giờ mở cửa (phụ thuộc DX-A),
   "đi xe gì / có chỗ để xe" (không có dữ liệu, không đề xuất).
3. Chưa có khái niệm "nhóm" ở bất kỳ đâu trong code — phải tạo mô hình mới, nhưng backend là mock
   nên chi phí thấp. Cần ghi hợp đồng API mới vào `DECISIONS.md` trước khi implement
   (theo quy ước D-011, như TONG-HOP §4 đã nhấn mạnh).

## Đề xuất

### DX-7.1: Hồ sơ mong muốn cá nhân — "Sở thích của tôi"

- **Vấn đề**: mỗi người một mong muốn (A thích rẻ, B chỉ đi Hải Châu, C ngán quán đông). Hiện
  không có chỗ nào để khai; mỗi lần đi nhóm phải nói lại bằng miệng.
- **Hiện trạng**: `UserProfile` (fixture `users.ts`) chỉ có bio/location; `GET /places` không nhận
  `priceLevel` ([server.ts:125-150](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L125-L150)).
- **UX**: một khối "Sở thích của tôi" trong profile (giản lược của DX-5.4, nhưng là **form chỉnh
  được**, không phải khối thống kê): chọn nhiều loại hình (ToggleGroup đa chọn), mức giá tối đa
  (1–3), nhiều quận, ô "không muốn" (từ khoá, ví dụ "hải sản"). Lưu bằng `PATCH /me/preferences`.
- **Mô hình dữ liệu**:
  ```ts
  interface MemberPreference {
    userId: string
    categories: PlaceCategory[] // rỗng = không chê loại nào
    priceMax: 1 | 2 | 3 // mức giá cao nhất chấp nhận
    districts: string[] // rỗng = đi đâu cũng được
    avoidKeywords: string[] // khớp vào name + tags, tối đa 5 từ khoá
  }
  ```
- **Quy tắc hợp nhất**: không có ở đây — đây là dữ liệu đầu vào, hợp nhất ở DX-7.2.
- **Giá trị thực**: dùng được cả khi đi **một mình** (nút "Lọc theo sở thích của tôi" trên
  /discover điền sẵn bộ lọc) — không phải tính năng chỉ dành cho nhóm, nên không lãng phí.
- **Phạm vi**: BE + FE · **S/M** (1 route mock + 1 form).
- **Rủi ro**: form trống làm người dùng nghĩ app "hỏi dư" — mặc định tất cả là "không chê",
  không bắt buộc điền.

### DX-7.2: Phiên nhóm + hợp nhất mong muốn thành danh sách "hợp cả nhóm"

- **Vấn đề**: ý tưởng người dùng gốc — "tạo nhóm để filter theo nhóm, vì mỗi người có 1 mong muốn
  khác nhau". Cần một danh sách duy nhất mà cả nhóm nhìn vào, thay vì 4 người lọc 4 kiểu.
- **Hiện trạng**: không có entity nào đại diện nhóm; `Collection` chỉ có 1 owner
  ([collection.ts:10-24](file:///home/longtran/Projects/frontend/src/features/collections/types/collection.ts#L10-L24)).
- **UX**: nút "Đi cùng nhóm" trên /discover → tạo phiên nhóm (mock: chọn thành viên từ
  `MOCK_USERS`), mỗi thành viên thấy được preference của mình (DX-7.1), bấm "Tìm quán hợp cả
  nhóm" → danh sách kết quả có badge số người phù hợp.
  **Ranh giới**: tạo/tham gia bằng link thật, bỏ phiếu, chốt quán là của agent 9 — ở đây chỉ có
  "hợp nhất preference → danh sách".
- **Mô hình dữ liệu**:
  ```ts
  interface GroupSession {
    id: string
    name: string
    memberIds: string[] // gồm cả ME
    preferences: Record<string, MemberPreference>
    createdAt: string
  }
  // GET /groups/:id/match → { items: GroupPlaceMatch[], next: null }
  interface GroupPlaceMatch {
    place: Place
    satisfiedUserIds: string[] // người mà quán này đáp ứng đủ mọi ràng buộc
    violatedUserIds: string[] // người bị vi phạm ít nhất 1 ràng buộc
  }
  ```
- **Quy tắc hợp nhất (chốt rõ, tránh mơ hồ)**:
  - **Giao cứng (hard intersection)** cho ràng buộc loại trừ: `priceMax` của quán ≤
    `min(priceMax)`? **Không** — dùng `max(priceMax)` của nhóm (người chịu đựng được ₫₫₫ không
    cấm người khác ăn ₫₫); quán phải thỏa `priceLevel ≤ max(priceMax)` của **từng** người tính
    vào `violatedUserIds`. `avoidKeywords` của bất kỳ ai khớp quán → quán bị loại hẳn (đây là
    "không muốn", tôn trọng tuyệt đối).
  - **Hợp mềm (soft union)** cho ràng buộc ưu tiên: `categories` và `districts` lấy **hợp** của
    các thành viên; quán nằm ngoài hợp → không loại, chỉ trừ điểm và ghi vào `violatedUserIds`
    của người có liên quan.
  - **Sắp xếp**: số `violatedUserIds` tăng dần → `rating` giảm dần (tái dùng tinh thần xếp hạng
    của `rankPlaceSuggestions`, [server.ts:157-164](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L157-L164)).
  - **Xung đột "A muốn chay, B muốn hải sản"**: với dữ liệu hiện tại **không phát hiện được**
    (không có cờ chay) — chỉ phát hiện được xung đột loại hình (A chỉ cafe, B chỉ bar → hợp
    `categories` rỗng về mặt giao nhưng hợp mềm vẫn trả kết quả, kèm cảnh báo ở DX-7.3). Xem
    DX-7.5 cho dietary.
- **Giá trị thực**: đây chính là tính năng người dùng yêu cầu; biến 4 màn hình lọc riêng thành 1
  danh sách chung có căn cứ.
- **Phạm vi**: BE (mock) + FE · **M**.
- **Rủi ro**: nhóm 5 người × 6 chiều ràng buộc có thể cho kết quả rỗng → bắt buộc có lối thoát
  (DX-7.4); không được để danh sách trống không giải thích.

### DX-7.3: Giải thích trên từng kết quả — "vì sao hợp" / "ai bị vi phạm"

- **Vấn đề**: danh sách hợp nhất không giải thích sẽ thành hộp đen; người bị "vi phạm" mong muốn
  (ví dụ quán xa quận của họ) sẽ không tin danh sách.
- **Hiện trạng**: app đã có khuôn giải thích sẵn — `PlaceSuggestion.reason` do server sinh
  ([place.ts:48-52](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L48-L52)),
  nên đây là mở rộng khuôn cũ, không phải cơ chế mới.
- **UX**: trên thẻ kết quả nhóm, một dòng nhỏ dạng: "Hợp 3/4 · Bảo: ₫₫₫ vượt mức bạn muốn · Hà:
  khác quận bạn hay đi". Bấm vào thấy chi tiết từng thành viên. Không màu mè, không badge — đúng
  ràng buộc trung tính của dự án.
- **Mô hình dữ liệu**:
  ```ts
  interface GroupPlaceMatchReason {
    placeId: string
    perMember: { userId: string; ok: boolean; violations: string[] }[]
    // violations: chuỗi tiếng Việt do server sinh, ví dụ "Mức giá ₫₫₫ > ₫₫ bạn chấp nhận"
  }
  ```
- **Quy tắc hợp nhất**: sinh từ chính phép so khớp ở DX-7.2 — một nghiệp vụ, một chỗ.
- **Giá trị thực**: niềm tin vào danh sách chung; đồng thời là dữ liệu cho cuộc thảo luận của
  nhóm ("Bảo chịu được không?") mà không đụng đến cơ chế chốt của agent 9.
- **Phạm vi**: BE + FE · **S/M** (phần lớn là format chuỗi từ dữ liệu DX-7.2 đã có).
- **Rủi ro**: chuỗi giải thích máy móc gây khó chịu — giới hạn 1 dòng trên thẻ, chi tiết nằm
  sau cú bấm.

### DX-7.4: Chế độ thỏa hiệp khi giao rỗng — "không có quán hoàn hảo, đây là 3 phương án"

- **Vấn đề**: ràng buộc cứng (avoidKeywords, priceMax từng người) dễ làm kết quả rỗng, đặc biệt
  với 30 quán mock. Danh sách trống không lối thoát = tính năng chết.
- **Hiện trạng**: Empty state của /discover chỉ gợi ý xoá bộ lọc chung chung
  ([discover-page.tsx:345-361](file:///home/longtran/Projects/frontend/src/features/places/pages/discover-page.tsx#L345-L361)),
  chưa có khái niệm "nới ràng buộc có chủ đích".
- **UX**: khi 0 kết quả, hiện 3 "phương án thỏa hiệp" kèm số quán dự kiến và **ai phải nhượng
  bộ**: (1) bỏ từ khoá tránh của X → 8 quán; (2) cho phép ₫₫₫ → 5 quán; (3) mở rộng quận → 12
  quán. Chọn một phương án là chạy lại phép hợp nhất với ràng buộc đã nới.
- **Mô hình dữ liệu**:
  ```ts
  interface CompromiseOption {
    kind: "relax-avoid" | "relax-price" | "relax-district"
    relaxedUserIds: string[] // người nhượng bộ — hiển thị công khai, không ngầm nới
    estimatedCount: number
  }
  // GET /groups/:id/match?compromise=<kind> — hoặc server trả kèm response khi items rỗng
  ```
- **Quy tắc hợp nhất**: nới **đúng một** chiều mỗi lần, ưu tiên chiều ít người nhượng bộ nhất;
  không bao giờ nới `avoidKeywords` ngầm — luôn phải qua nút bấm của người dùng.
- **Giá trị thực**: chuyển xung đột từ "bế tắc" thành "lựa chọn có thông tin" — đúng tinh thần
  "mỗi người một mong muốn" của yêu cầu gốc.
- **Phạm vi**: BE + FE · **M**.
- **Rủi ro**: đếm `estimatedCount` phải từ server (đúng dữ liệu), không đếm client-side trên 9
  quán đã tải ([PLACES_PAGE_SIZE = 9](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L38))
  — sẽ sai nếu nhóm mở rộng ngoài trang 1.

### DX-7.5: Chiều "ăn chay / dị ứng" — cần bổ sung dữ liệu trước (DATA)

- **Vấn đề**: "ăn chay/dị ứng" là ràng buộc **loại trừ** quan trọng nhất khi đi nhóm — sai một
  người là cả nhóm đổi quán. Nhưng dữ liệu hiện tại **không đủ** để làm.
- **Hiện trạng (bằng chứng)**: `Place` không có trường dietary
  ([place.ts:4-23](file:///home/longtran/Projects/frontend/src/features/places/types/place.ts#L4-L23));
  `tags` thô, toàn bộ 30 quán chỉ có 1 tag "rau rừng" và 2 tag "hải sản" — không suy ra được
  "có món chay" hay "không". Tự đoán từ tag sẽ tạo **chính xác giả** — đúng điều TONG-HOP §5
  đã cấm cho ngân sách/checklist.
- **UX (khi có dữ liệu)**: trong DX-7.1 thêm `dietary: ("vegetarian" | "seafood-free" | ...)[]`;
  trong DX-7.2 dietary là ràng buộc **giao cứng** — quán thiếu dữ liệu dietary bị đánh dấu
  "chưa rõ" thay vì loại (nguyên tắc giống DX-A: quán thiếu giờ vẫn hiển thị, chỉ bị loại khi
  bật lọc).
- **Mô hình dữ liệu**:
  ```ts
  // Bổ sung trên Place (breaking nhẹ, thêm trường tuỳ chọn):
  dietary?: ("vegetarian" | "has-vegetarian" | "seafood" | "nuts" | ...)[]  // chưa chốt danh sách
  ```
- **Quy tắc hợp nhất**: giao cứng giữa `dietary` của quán và `dietaryNeeds` của từng thành viên;
  quán `undefined` → `violatedUserIds` không tính, nhưng hiển thị nhãn "chưa rõ — hỏi quán".
- **Giá trị thực**: cao nhất trong các chiều ràng buộc, nhưng **không hứa trước khi có dữ liệu**.
- **Phạm vi**: **DATA · M** — cần nguồn: nhập tay vào fixture (như kế hoạch DX-A) hoặc khai
  thác từ review sau khi DX-3.3 (review có cấu trúc) có món đã gọi.
- **Rủi ro**: dữ liệu tự khai sai → người ăn chay ăn nhầm. Cần nhãn "theo cộng đồng khai báo,
  hãy xác nhận với quán" — trung thực về độ tin cậy.

## Cách thử với mock hiện tại (nhiều thành viên giả lập)

Backend chỉ có 1 người dùng thật (`ME`) nhưng fixture đã có 5 user hoàn chỉnh
([users.ts:24-93](file:///home/longtran/Projects/frontend/src/mocks/fixtures/users.ts#L24-L93)):

1. **Không cần auth**: `GroupSession.preferences` cho phép `ME` **soạn hộ** preference của các
   thành viên giả lập (màn hình "giả lập nhóm": chọn u-1..u-5, điền hộ mong muốn). Điều này thử
   được toàn bộ thuật toán hợp nhất mà không cần hệ thống mời (thuộc agent 9).
2. **Seed 2–3 nhóm mẫu** trong fixture với preference xung đột có chủ đích: nhóm "chay × hải sản"
   (để thử DX-7.4), nhóm "rẻ × ₫₫₫" (để thử priceMax), nhóm "Hải Châu × Sơn Trà" (để thử hợp
   quận). 30 quán đủ phân bố 6 quận × 3 mức giá để mọi phương án đều có kết quả khác nhau.
3. **Kiểm chứng bằng output server**: vì hợp nhất chạy trong mock adapter
   ([server.ts:28-36](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L28-L36)),
   có thể assert trực tiếp `satisfiedUserIds`/`violatedUserIds` trên từng quán — không cần chờ
   backend thật để biết thuật toán đúng hay sai.
4. **Trên UI**: một toggle "Xem với vai trò thành viên X" để đổi `ME` tạm thời khi render danh
   sách nhóm — chỉ phục vụ demo, không đụng `CURRENT_USER` thật của feed/review.

## Không đề xuất và lý do

| Ý tưởng bị loại                                             | Lý do                                                                                                                                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lọc nhóm theo **giờ rảnh × giờ mở cửa**                     | Phụ thuộc hoàn toàn DX-A (`openingHours` chưa tồn tại). Đề xuất bây giờ là hứa hão; ghi kế thừa: khi DX-A có dữ liệu, thêm 1 chiều ràng buộc vào DX-7.2.                                      |
| **"Đi xe gì / có chỗ để xe" / khoảng cách từng thành viên** | Không có dữ liệu phương tiện, không có toạ độ nhà thành viên; khoảng cách chỉ có nghĩa khi cả nhóm gặp nhau ở 1 điểm — đó là bài toán lịch trình (agent 6).                                   |
| **AI gợi ý "quán hợp nhất nhóm" bằng LLM**                  | Chưa có backend/model (TONG-HOP §5 đã loại AI tóm tắt review vì cùng lý do); phép hợp nhất rule-based ở DX-7.2 giải thích được — lợi thế hơn AI đen hộp cho đúng nhu cầu "giải thích vì sao". |
| **Bỏ phiếu / swipe chọn quán trong nhóm**                   | Thuộc cơ chế chốt quyết định — agent 9 phụ trách. Làm trùng sẽ tạo hai nguồn sự thật cho "quán nhóm đã chọn".                                                                                 |
| **Chia hóa đơn theo khẩu phần/ngân sách từng người**        | Agent 8 phụ trách; và `priceLevel` 1–3 không đủ chính xác để tính tiền thật (TONG-HOP §5).                                                                                                    |
| **Điểm "độ hợp nhóm" dạng số to/đỏ trên thẻ**               | Dễ trượt thành gamification/so sánh (bị cấm theo ràng buộc dự án). Chỉ dùng số người phù hợp + dòng giải thích trung tính (DX-7.3).                                                           |
| **Nhóm công khai / nhóm cộng đồng theo chủ đề**             | Chưa có auth, chưa có nhu cầu được chứng minh; nhóm ở đây là nhóm bạn đi ăn — mở rộng sang cộng đồng là overengineering khi phiên nhóm còn là mock.                                           |
| **Lưu "lịch sử nhóm đã đi"**                                | Chồng chéo với bộ sưu tập (DX-4.x) — nhóm đi xong nên lưu thành bộ sưu tập có sẵn, không cần entity lịch sử riêng.                                                                            |

## Chưa xác minh

- Toàn bộ dựa trên đọc code, chưa chạy app trong trình duyệt; chưa thử form "Sở thích của tôi"
  với người dùng thật để biết 5 chiều ràng buộc có quá nhiều hay không.
- Số liệu phân bố fixture (12×₫, 13×₫₫, 5×₫₫₫; 6 quận) là kết quả grep tại thời điểm viết —
  fixture có thể thay đổi sau này, thuật toán hợp nhất không được phụ thuộc con số này.
- Quy tắc hợp nhất (giao cứng cho loại trừ, hợp mềm cho ưu tiên) là thiết kế đề xuất của agent,
  chưa đối chiếu với hành vi của sản phẩm thật nào (Yelp/TripAdvisor không có nguồn do công cụ
  tìm kiếm web không dùng được trong phiên này).
- Chưa kiểm hiệu năng phép hợp nhất khi số quán lớn hơn 30 (hiện không đáng lo, nhưng chưa đo).
