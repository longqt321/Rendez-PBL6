# Tổng hợp đề xuất phát triển — 2026-11-08

> **Agent chính** rà soát 5 báo cáo nghiên cứu độc lập, kiểm chứng từng khẳng định với code,
> khử trùng lặp và xếp lộ trình. **Không có dòng code nào bị sửa trong đợt này.**
>
> Nguồn: [agent-1-kham-pha.md](./agent-1-kham-pha.md) · [agent-2-noi-dung-xa-hoi.md](./agent-2-noi-dung-xa-hoi.md) ·
> [agent-3-niem-tin.md](./agent-3-niem-tin.md) · [agent-4-tien-ich.md](./agent-4-tien-ich.md) ·
> [agent-5-giu-chan.md](./agent-5-giu-chan.md)

## 0. Phương pháp & giới hạn

- 5 agent nghiên cứu **độc lập theo 5 góc rời nhau** (khám phá · nội dung xã hội · niềm tin ·
  lập kế hoạch · giữ chân), mỗi agent chỉ ghi 1 file, không sửa code.
- **Ràng buộc đã áp**: không gamification/badge/điểm/streak/bảng xếp hạng. Cả 5 agent đều có mục
  "Không đề xuất và lý do" — 33 ý tưởng bị loại, ghi rõ lý do trong từng file.
- **Giới hạn cần biết**: công cụ search web lỗi trong cả 5 phiên → mọi so sánh với Google Maps /
  Yelp / TripAdvisor / Letterboxd / Wanderlog là **phân tích logic sản phẩm**, không có trích dẫn
  nguồn. Không agent nào chạy app thật trong trình duyệt.

## 1. Kết quả kiểm chứng chéo của agent chính

Tôi đọc lại code và xác minh từng khẳng định "hiện trạng" quan trọng. **Không có khẳng định nào sai**,
nhưng có 1 cặp đề xuất trùng và 2 bug phát hiện thêm.

| Khẳng định                                                                          | Kết quả  | Bằng chứng                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /places` không sắp xếp, trả theo thứ tự fixture                                | **ĐÚNG** | `listPublishedPlaces` chỉ `filter().map()`, không `sort()` — [server.ts:125-150](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L125-L150)                                                                    |
| Chỉ tải 9 quán/trang nên bản đồ chỉ vẽ 9 điểm                                       | **ĐÚNG** | `PLACES_PAGE_SIZE = 9` — [server.ts:38](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L38)                                                                                                                   |
| `/discover` không truyền `selectedPlaceId`/`onSelectPlace` dù `PlacesMap` đã hỗ trợ | **ĐÚNG** | [discover-page.tsx:364-368](file:///home/longtran/Projects/frontend/src/features/places/pages/discover-page.tsx#L364-L368)                                                                                                 |
| Feed không có filter "Đang theo dõi"                                                | **ĐÚNG** | `PostFeedFilter = "all" \| "unplaced" \| "mine" \| "saved"` — [post.ts:40](file:///home/longtran/Projects/frontend/src/features/social/types/post.ts#L40)                                                                  |
| `ShareButton` chỉ dùng cho bộ sưu tập                                               | **ĐÚNG** | 1 kết quả grep duy nhất — [collection-detail-page.tsx:191](file:///home/longtran/Projects/frontend/src/features/collections/pages/collection-detail-page.tsx#L191)                                                         |
| Check-in bắt buộc caption ≥ 3 ký tự                                                 | **ĐÚNG** | [check-in-dialog.tsx:49](file:///home/longtran/Projects/frontend/src/features/places/components/check-in-dialog.tsx#L49)                                                                                                   |
| Review chỉ nhận `rating` + `content`, server từ chối đính kèm                       | **ĐÚNG** | [server.ts:412-429](file:///home/longtran/Projects/frontend/src/mocks/server.ts#L412-L429)                                                                                                                                 |
| Cài đặt: `privateProfile` hardcode `false`, lưu là toast giả                        | **ĐÚNG** | [settings-page.tsx:43](file:///home/longtran/Projects/frontend/src/features/settings/pages/settings-page.tsx#L43), [:56-60](file:///home/longtran/Projects/frontend/src/features/settings/pages/settings-page.tsx#L56-L60) |
| Place-suggestion không có nút bỏ qua                                                | **ĐÚNG** | Chỉ có "Chọn"/"Đã gắn" — [place-suggestion-card.tsx:110-125](file:///home/longtran/Projects/frontend/src/features/notification/components/place-suggestion-card.tsx#L110-L125)                                             |
| Không có API đổi thứ tự địa điểm trong bộ sưu tập                                   | **ĐÚNG** | `PATCH /collections/:id/places` chỉ nhận `{ placeId, member }` — [collections.ts:59-70](file:///home/longtran/Projects/frontend/src/features/collections/api/collections.ts#L59-L70)                                       |
| Tab "Địa điểm" ở `/saved` là Empty vô điều kiện                                     | **ĐÚNG** | [saved-page.tsx:61-77](file:///home/longtran/Projects/frontend/src/features/saved/pages/saved-page.tsx#L61-L77)                                                                                                            |
| Mini-map dùng `maps/search` chứ không phải chỉ đường theo tuyến                     | **ĐÚNG** | [place-mini-map.tsx:69-71](file:///home/longtran/Projects/frontend/src/features/places/components/place-mini-map.tsx#L69-L71)                                                                                              |

### 1.1. Trùng lặp phải hợp nhất

**DX-1.4 ≡ DX-3.2 — giờ mở cửa.** Agent 1 đề xuất từ góc "lọc đang mở khi tìm quán", agent 3 từ góc
"khối thông tin đáng tin trên trang chi tiết". Đây là **cùng một tính năng, cùng một trường dữ liệu
`openingHours`**. Gộp thành **DX-A** (xem §2). Nếu làm riêng sẽ tạo hai nguồn logic `isOpenAt` — vi
phạm quy tắc "một nghiệp vụ một chỗ xử lý".

### 1.2. Bug phát hiện thêm (ghi BACKLOG, không sửa trong đợt này)

| Bug                                                                                                        | Bằng chứng                                                                                                                        | Mức độ                     |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Placeholder trả lời bình luận hiển thị nguyên văn `@{replyTo.author.handle}` do template literal thiếu `$` | [comment-composer.tsx:62-64](file:///home/longtran/Projects/frontend/src/features/social/components/comment-composer.tsx#L62-L64) | Thấp, sửa 1 ký tự          |
| Fixture thông báo hệ thống ghi "Khu vực **Quận 1** có thêm 12 địa điểm mới" — Đà Nẵng không có Quận 1      | [notifications.ts:41](file:///home/longtran/Projects/frontend/src/mocks/fixtures/notifications.ts#L41)                            | Thấp, sai dữ liệu hiển thị |

## 2. Danh sách sau hợp nhất — 24 đề xuất

Ký hiệu phạm vi: **FE** = chỉ frontend · **BE** = cần thêm route/logic ở mock rồi backend thật ·
**DATA** = cần dữ liệu thật chưa tồn tại.

### Làn sóng 1 — Quick win, không cần backend (làm được ngay)

| ID          | Đề xuất                                                                                    | Phạm vi  | Nguồn |
| ----------- | ------------------------------------------------------------------------------------------ | -------- | ----- |
| **DX-2.3**  | Nút **Chia sẻ bài đăng** (dùng lại `ShareButton`/`shareLink` đã có)                        | FE · S   | A2    |
| **DX-3.1**  | **Phân bố 5 mức sao + "N đánh giá trong 30 ngày"** trên trang quán                         | FE · S   | A3    |
| **DX-1.3a** | **Đồng bộ bản đồ ↔ danh sách**: truyền `selectedPlaceId`/`onSelectPlace` (props đã có sẵn) | FE · S   | A1    |
| **DX-4.2**  | **"Mở chỉ đường cả tuyến"** — deep link Google Maps nhiều điểm dừng                        | FE · S   | A4    |
| **DX-2.5**  | **Nháp bài đăng / check-in tự lưu** vào localStorage                                       | FE · S   | A2    |
| **DX-1.5a** | **Gợi ý khi gõ** ở ô tìm kiếm topbar (dùng `GET /places?q=`)                               | FE · S   | A1    |
| **DX-1.5c** | **Lối thoát khi 0 kết quả** (bỏ dấu, xoá lọc, "có thể bạn muốn tìm")                       | FE · S   | A1    |
| **DX-3.4a** | **Sắp xếp / lọc review theo số sao** (thuần FE trên dữ liệu đã tải)                        | FE · S   | A3    |
| **DX-4.5a** | **Tab "Địa điểm" ở `/saved`** giai đoạn 1: gộp `placeIds` từ các bộ sưu tập                | FE · S/M | A4    |
| **DX-2.4a** | **Sửa bug placeholder** trả lời bình luận                                                  | FE · S   | A2    |

### Làn sóng 2 — Cần mở rộng mock server (hợp đồng API đã rõ)

| ID          | Đề xuất                                                                        | Phạm vi  | Nguồn |
| ----------- | ------------------------------------------------------------------------------ | -------- | ----- |
| **DX-1.1**  | **Sắp xếp kết quả**: `Liên quan / Điểm cao / Gần tôi` + chấm điểm theo từ khoá | BE · M   | A1    |
| **DX-1.2**  | **"Gần đây" thật**: gửi `lat/lng/radiusKm` lên server, chip bán kính 1/3/5 km  | BE · M   | A1    |
| **DX-2.1**  | **Tab feed "Đang theo dõi"** + Empty gợi ý người để theo dõi                   | BE · S   | A2    |
| **DX-2.2**  | **Chọn tay địa điểm khi soạn bài** (place picker)                              | BE · M   | A2    |
| **DX-2.4b** | **Chip câu hỏi nhanh + nhóm trả lời trực quan** trong bình luận                | FE · S   | A2    |
| **DX-4.1**  | **Bản đồ nhiều điểm cho bộ sưu tập**, marker đánh số thứ tự                    | FE · S/M | A4    |
| **DX-4.3**  | **Sắp thứ tự đi**: kéo thả hoặc nút Lên/Xuống + "Sắp theo quãng đường"         | BE · M   | A4    |
| **DX-5.3**  | **Đề xuất địa điểm có lối thoát**: nút "Không phải quán này" + banner đếm thật | BE · M   | A5    |

### Làn sóng 3 — Cần dữ liệu thật / backend thật

| ID         | Đề xuất                                                                                        | Phạm vi     | Nguồn |
| ---------- | ---------------------------------------------------------------------------------------------- | ----------- | ----- |
| **DX-A**   | **Giờ mở cửa + trạng thái "Đang mở"** (khối thông tin + chip lọc) — _hợp nhất DX-1.4 + DX-3.2_ | DATA · M    | A1+A3 |
| **DX-3.3** | **Review có cấu trúc**: ảnh thật + món đã gọi + giá đã trả                                     | DATA · L    | A3    |
| **DX-3.5** | **Bối cảnh người review**: "24 đánh giá · 18 quán" (số liệu thô, không badge)                  | BE · M      | A3    |
| **DX-4.4** | **Ghi chú cá nhân + trạng thái "Đã đi"** cho từng địa điểm trong bộ sưu tập                    | BE · M      | A4    |
| **DX-5.1** | **Feed "all" xếp hạng theo khẩu vị** + dòng "vì sao bạn thấy bài này"                          | BE · S (FE) | A5    |
| **DX-5.2** | **Digest tuần "Tuần này Đà Nẵng có gì mới"**                                                   | BE · S (FE) | A5    |
| **DX-5.4** | **Khối "Khẩu vị" trên trang cá nhân** (thể loại/quận hay viết)                                 | BE · S (FE) | A5    |
| **DX-5.5** | **Mục "Thông báo" trong Cài đặt** (Switch từng loại) + sửa lưu thật cho Riêng tư               | BE · S (FE) | A5    |

## 3. Top 5 ưu tiên toàn dự án

Chọn theo **giá trị người dùng / chi phí**, và ưu tiên cái đang **sai** hơn cái đang **thiếu**.

1. **DX-1.1 — Sắp xếp kết quả khám phá.** Hiện trang 1 gần như toàn quán Hải Châu vì thứ tự fixture,
   và không có cách nào nói "quán ngon nhất". Đây không phải thiếu tính năng mà là **trải nghiệm đang
   sai**. Nó cũng là gốc cho DX-1.2 (cùng param `sort`/`lat,lng`).
2. **DX-2.1 — Feed "Đang theo dõi".** Follow đã chạy đầy đủ (toggle, route, `followerCount`) nhưng
   là **ngõ cụt**: theo dõi xong không nhận được gì. Chi phí S vì dữ liệu và endpoint đã có.
3. **DX-4.2 — Chỉ đường cả tuyến.** Từ "danh sách 5 quán" đến "đang trên đường" bằng 1 cú bấm, không
   cần backend, không cần dependency. Tỉ lệ giá trị/chi phí cao nhất trong 24 đề xuất.
4. **DX-3.1 — Phân bố sao + nhịp review gần đây.** "4,8 sao" hiện không phân biệt được 3.410 review
   cách đây 2 năm với 12 review tuần trước. Thuần FE, sửa đúng điểm yếu niềm tin lớn nhất.
5. **DX-2.3 — Chia sẻ bài đăng.** Hạ tầng `ShareButton` đã hoàn chỉnh và đang chỉ dùng cho bộ sưu tập;
   thêm vào bài đăng là kênh tăng trưởng từ chính người dùng, chi phí gần bằng 0.

## 4. Điều kiện chặn & rủi ro cần chốt trước khi làm

- **Hợp đồng API**: DX-1.1/DX-1.2/DX-2.1/DX-2.2/DX-4.3/DX-5.x đều **thêm hoặc đổi param** của
  `GET /places`, `GET /posts`, `PATCH /collections/:id/places`. Theo quy ước dự án phải ghi vào
  `DECISIONS.md` (D-011 là hợp đồng API hiện tại) **trước** khi implement.
- **DX-4.4 là breaking change lớn nhất**: `Collection.placeIds: string[]` → `places: CollectionPlace[]`.
  Chạm `saved-page`, `collection-detail-page`, `save-to-collection-dialog`, `useSetCollectionPlace`.
  Nên làm sau DX-4.1/DX-4.2 và giữ `placeIds` trong giai đoạn chuyển tiếp.
- **DX-4.3 kéo thả**: nếu chọn `@dnd-kit/*` phải có mục `DECISIONS.md` (license MIT, ~1,3 MB
  unpacked — đã khảo sát trong `TOOLING.md`). Phương án không cần dependency: nút "Lên/Xuống"
  trong menu item.
- **DX-4.1 bundle**: `/collections/:id` hiện không import Leaflet → phải `lazy()` `PlacesMap`, nếu
  không sẽ kéo Leaflet vào lần tải đầu.
- **DX-A (giờ mở cửa)**: dữ liệu tự khai rất dễ sai. Chỉ hiển thị trạng thái, không cam kết; quán
  thiếu giờ vẫn phải hiển thị được (chỉ bị loại khi bật lọc "Đang mở").
- **DX-5.2 digest**: bắt buộc có tiêu chí "không đủ dữ liệu thì không gửi", nếu không sẽ thành spam —
  và spam là cách nhanh nhất giết giữ chân.
- **Ranh giới gamification**: DX-3.5 và DX-5.4 phải trình bày dạng **số liệu trung tính**. Nếu UI
  bắt đầu có huy hiệu/cấp độ cho reviewer thì đã vượt ràng buộc.

## 5. Việc không nên làm (đồng thuận giữa các agent)

- Điểm/XP/huy hiệu/streak/bảng xếp hạng/"Wrapped" cuối năm — bị cấm, và với app địa điểm thì thưởng
  nỗ lực tạo hành vi đăng rác.
- Tự vẽ tuyến đường trong app — đã có lối thoát Google Maps, cần dữ liệu đường.
- Upload ảnh thật ở giai đoạn mock — cần hạ tầng lưu trữ; ghi backlog cho giai đoạn có backend.
- Bản đồ heat-map / "khu ẩm thực nổi bật" với 27 quán mock — chỉ là trang trí.
- Ngân sách chuyến đi, checklist theo món — dữ liệu hiện chỉ có `priceLevel: 1|2|3` và `tags` thô,
  dựng lên sẽ tạo cảm giác chính xác giả.
- Push notification ngoài app — chưa có hạ tầng, rủi ro spam cao nhất; phải chứng minh giá trị
  thông báo in-app trước.
- AI tóm tắt review — chưa có backend/model; tóm tắt sai một câu là mất niềm tin cả trang.

## 6. Chưa xác minh

- **Không có xác minh nào bằng trình duyệt/thiết bị thật** cho 24 đề xuất — toàn bộ dựa trên đọc code.
- **Không có nguồn tham chiếu web**: công cụ search lỗi trong cả 5 phiên agent, nên mọi so sánh với
  Google Maps / Yelp / TripAdvisor / Letterboxd / Wanderlog là suy luận, không phải dẫn chứng.
- **Chưa kiểm chứng giả định "người dùng cần"**: không có dữ liệu hành vi thật, không có phỏng vấn
  người dùng. Thứ tự ưu tiên ở §3 là suy luận từ hiện trạng code, không phải từ số liệu sử dụng.
- **DX-4.2**: chưa thử URL `maps/dir/?api=1&waypoints=` trên mobile thật; Google Maps có thể chặn
  universal link trong một số trình duyệt in-app.
- **DX-1.2**: chưa đo ảnh hưởng của việc tính khoảng cách phía server khi số quán tăng.
- **DX-A**: chưa có nguồn dữ liệu giờ mở cửa nào; kế hoạch nhập tay vào fixture chưa được thử.
