# Agent 3 — Niềm tin & hỗ trợ quyết định

> Phạm vi nghiên cứu: thứ giúp người dùng **tin** thông tin trên trang chi tiết quán và **chốt** quyết định đi ăn. Không đụng tới gamification/badge, khám phá/bản đồ, đăng bài/feed, bộ sưu tập, thông báo (agent khác phụ trách).
>
> Ghi chú: công cụ search web lỗi trong phiên làm việc này (2 lần thử đều fail), nên phần tham chiếu app thành công (Google Maps, TripAdvisor, Foody, Tabelog) là phân tích thuần logic sản phẩm, chưa đối chiếu nguồn.

## Hiện trạng (bằng chứng code)

- **Review chỉ có sao + text.** `src/features/places/types/review.ts:9-18` — `Review` chỉ có `rating`, `content`, `createdAt`, `isMine`. Không có ảnh, món đã gọi, giá. JSDoc tại `review.ts:6` khẳng định form "không có ảnh hay file đính kèm"; server cũng từ chối trường đính kèm (`src/mocks/server.ts:410-429`).
- **Không có giờ mở cửa, không có dữ liệu tin cậy nào ngoài rating.** `src/features/places/types/place.ts:4-23` — `Place` chỉ có `address`, `city`, `rating`, `reviewCount`, `priceLevel`. Không có `openingHours`, không có trạng thái đang mở/đóng.
- **Trang chi tiết chỉ hiện con số thô.** `src/features/places/pages/place-detail-page.tsx:110-119` — điểm trung bình + tổng số đánh giá + mức giá. Không có phân bố sao, không biết review mới hay cũ.
- **Review item tối giản.** `src/features/places/components/review-item.tsx:16-48` — avatar, tên, handle, sao, thời gian tương đối, text. Không có nút "hữu ích", không có bối cảnh người review (họ đã review bao nhiêu chỗ).
- **Danh sách review chỉ sắp mới-nhất, không lọc/sắp lại được, không phân trang.** `src/mocks/server.ts:290-296` (sort cố định theo `createdAt` giảm dần) và `src/mocks/server.ts:780-786` (trả toàn bộ, `next: null`).
- **Form review chỉ hỏi 2 thứ.** `src/features/places/components/review-form.tsx:25-35` — zod schema chỉ có `rating` (số nguyên 1–5) và `content` (≤ 1000 ký tự, `MAX_REVIEW_CONTENT_LENGTH` tại `src/lib/constants.ts`).
- **Lời khẳng định tin cậy chung chung.** `place-detail-page.tsx:252-258` — tab Tổng quan chỉ nói "được cộng đồng đăng và được kiểm duyệt trước khi xuất hiện", không có bằng chứng cụ thể nào cho người dùng.
- **App đã có năng lực ảnh (dạng seed) ở chỗ khác.** `src/features/places/components/check-in-dialog.tsx:27,63,129` — check-in chọn ảnh seed, tức khái niệm "ảnh gắn địa điểm" đã tồn tại trong hệ thống, chỉ là review chưa được nối vào.

## Đề xuất

### DX-3.1: Phân bố sao + nhịp review gần đây

- **Vấn đề người dùng:** "4.8 sao" không nói lên nhiều — 4.8 từ 3.410 review cách đây 2 năm khác hoàn toàn 4.8 từ 12 review tuần trước. Người dùng không biết quán đang "còn ngon" hay đã xuống cấp.
- **Hiện trạng:** chỉ hiện `formatRating(place.rating)` + `formatCount(place.reviewCount)` (`place-detail-page.tsx:111-115`); danh sách review sắp mới-nhất nhưng không có tổng hợp nào về thời gian (`server.ts:290-296`).
- **Đề xuất:** dưới dòng rating ở header, thêm (1) thanh phân bố 5 mức sao (5★ ▓▓▓▓▓ 68% … 1★ ▓ 2%) và (2) một dòng ngắn "12 đánh giá trong 30 ngày qua". Cả hai tính được thuần FE từ danh sách review client đã tải (`usePlaceReviews`).
- **Giá trị thực:** người dùng nhìn 3 giây biết quán được yêu thích đều hay chỉ "tốt thời điểm cũ", và biết số sao trung bình có còn phản ánh hiện tại không. Đây là tín hiệu niềm tin số 1 của Google Maps/TripAdvisor.
- **Phạm vi:** FE-only (mock đã trả đủ danh sách review). Ước lượng **S**.
- **Rủi ro / điều kiện cần:** với `reviewCount` thật lớn (3.410) phân bố từ mock chỉ có vài review sẽ trông lệch — cần chấp nhận hiển thị "dựa trên N đánh giá hiển thị" hoặc chờ backend tổng hợp. Không đổi luồng dữ liệu, chỉ render thêm.

### DX-3.2: Khối "Giờ mở cửa & kiểm tra trước khi đi"

- **Vấn đề người dùng:** quyết định lớn nhất trước khi đi là "quán có mở không, mở đến mấy giờ?" — quán street-food Đà Nẵng hay nghỉ bất định. Hiện app im lặng hoàn toàn về thông tin này, trong khi địa chỉ lại hiển thị đầy đủ (`place-detail-page.tsx:105-108`).
- **Hiện trạng:** `Place` không có trường giờ mở cửa (`place.ts:4-23`); tab Tổng quan chỉ có bản đồ + 1 đoạn giới thiệu chung chung (`place-detail-page.tsx:246-258`).
- **Đề xuất:** thêm khối "Giờ mở cửa" vào tab Tổng quan (hoặc dưới địa chỉ): giờ theo từng ngày trong tuần + trạng thái "Đang mở · đóng 21:00" / "Đã đóng · mở 06:30" tính theo giờ máy. Khi thiếu dữ liệu, hiện rõ ràng "Chưa có thông tin giờ mở cửa" thay vì giấu — im lặng còn phá niềm tin hơn là thừa nhận thiếu.
- **Giá trị thực:** trực tiếp trả lời câu hỏi chốt quyết định "đi bây giờ có được không", và trạng thái thiếu-dữ-liệu-khả-kiến tăng độ trung thực của app.
- **Phạm vi:** cần backend (thêm trường `openingHours` vào hợp đồng `Place`) + cần dữ liệu thật (mock chỉ thêm được seed tĩnh). Ước lượng **M**.
- **Rủi ro / điều kiện cần:** dữ liệu giờ mở cửa tự khai dễ sai — cần quy trình cập nhật/cờ "dữ liệu từ <thời điểm>" để không biến thành niềm tin giả. FE không được tự suy trạng thái mở/đóng khi thiếu giờ.

### DX-3.3: Review có cấu trúc — ảnh thật, món đã gọi, giá đã trả

- **Vấn đề người dùng:** "ngon, giá hợp lý" là review không thể hành động. Để quyết định, người dùng cần biết: món nào đáng gọi, giá từng món bao nhiêu, quán nhìn thế nào hôm nay. Đây là khoảng trống lớn nhất giữa app hiện tại và Foody/Tabelog.
- **Hiện trạng:** review chỉ sao + text (`review.ts:9-18`, `review-form.tsx:25-35`); trong khi bài check-in (posts) lại có ảnh — nghĩa là năng lực ảnh đã có trong hệ thống nhưng không nối vào review (`check-in-dialog.tsx`, `server.ts:410-452` từ chối đính kèm).
- **Đề xuất:** mở rộng form review thành 3 phần: (1) ảnh (tối đa ~3, tái dùng cơ chế seed/ảnh của post), (2) danh sách món đã gọi kèm giá tuỳ chọn (mỗi món: tên + giá VNĐ), (3) sao + nhận xét như cũ. Ở `ReviewItem`, render ảnh dạng thumbnail bấm xem lớn, và mục "Đã gọi: Bánh xèo 30k · Nem lụi 40k" dưới text.
- **Giá trị thực:** đây là tính năng tạo niềm tin mạnh nhất — ảnh thật của người dùng thường là yếu tố quyết định bấm "đi thôi" (TripAdvisor, Tabelog đều đặt ảnh người dùng lên trên ảnh đại diện quán). Giá do người dùng báo còn giúp đối chiếu `priceLevel` của quán.
- **Phạm vi:** cần backend (mở rộng hợp đồng `Review` + route POST) + cần dữ liệu thật (ảnh). Ước lượng **L**.
- **Rủi ro / điều kiện cần:** mở rộng form làm tăng ma sát khi viết review — nên để ảnh/món là tuỳ chọn, sao+text vẫn bắt buộc để không giảm số review. Cần quy tắc validate giá (số nguyên ≥ 0, giới hạn hằng số mới trong `@/lib/constants`).

### DX-3.4: Sắp xếp / lọc review + đánh dấu "hữu ích"

- **Vấn đề người dùng:** với quán nhiều review, người dùng muốn đọc review gần đây nhất hoặc review 1★ để biết rủi ro — hiện danh sách cứng theo thời gian, không thao tác được.
- **Hiện trạng:** `server.ts:290-296` sort cố định mới-nhất; `server.ts:780-786` trả hết một lần, `next: null`; `ReviewItem` không có tương tác nào ngoài nút sửa của chính mình (`review-item.tsx:32-37`).
- **Đề xuất:** thanh công cụ trên danh sách: sắp xếp (Mới nhất / Điểm cao / Điểm thấp) + lọc theo sao (chip 1★–5★, nhiều chọn) — làm thuần FE trên dữ liệu đã tải. Kèm nút "Hữu ích (n)" trên mỗi review; bấm tăng số đếm và đẩy review hữu ích lên đầu khi sort mặc định.
- **Giá trị thực:** "hữu ích" là cơ chế cộng đồng tự nâng review đáng tin lên (TripAdvisor, Google Maps đều dùng); lọc 1★/2★ là cách nhanh nhất để kiểm tra rủi ro trước khi chốt.
- **Phạm vi:** sort/filter là FE-only (**S**); "hữu ích" cần backend (đếm + chống spam 1 người 1 lần) (**M**). Có thể tách làm 2 nhịp.
- **Rủi ro / điều kiện cần:** lọc/sort FE trên toàn bộ review chỉ đúng khi số review nhỏ; khi review thật lên hàng trăm cần backend phân trang + sort server-side (hiện route đã trả `Page` nên hợp đồng sẵn sàng).

### DX-3.5: Bối cảnh người review — "người này ăn uống kiểu gì"

- **Vấn đề người dùng:** review 5★ của người mới tạo tài khoản và 5★ của người đã review 40 quán ăn Đà Nẵng có trọng số khác nhau, nhưng hiện tất cả hiển thị như nhau (`review-item.tsx:24-31` chỉ có tên + handle).
- **Hiện trạng:** không có bất kỳ tín hiệu kinh nghiệm nào của tác giả; `Author` chỉ có `id/name/handle/initials` (`review.ts:1`, import từ `@/features/social/types/post`).
- **Đề xuất:** dưới tên tác giả thêm 1 dòng meta: "24 đánh giá · 18 quán ăn/đồ uống" (số review tổng + số địa điểm distinct đã review), và tên bấm được để xem các review khác của họ. Chỉ số liệu thô, **không** badge/huy hiệu/cấp độ.
- **Giá trị thực:** người dùng tự trọng số hoá độ tin cậy: review của "người quen ăn Đà Nẵng" đáng tin hơn reviewer một lần. Đây đúng trọng tâm "review của người có kinh nghiệm" mà không rơi vào gamification.
- **Phạm vi:** cần backend (endpoint đếm review theo author, hoặc nhúng `reviewCount` vào `Author`). Ước lượng **M**.
- **Rủi ro / điều kiện cần:** phải trình bày dạng số liệu trung tính để không biến thành cấp độ/badge (ngoài phạm vi được giao). Cần backend đếm chính xác, FE không tự đoán từ dữ liệu client.

## Không đề xuất và lý do

- **Badge / huy hiệu / cấp độ reviewer (Top Reviewer, Elite…):** ngoài phạm vi được giao (mục nghiên cứu cấm gamification); số liệu thô ở DX-3.5 đã đủ tạo tín hiệu kinh nghiệm mà không cần hệ thống cấp bậc.
- **Tính năng khám phá, bản đồ, lọc theo vị trí:** agent khác phụ trách; DX-3.2 chỉ chạm "giờ mở cửa" vì đó là dữ liệu tin cậy, không phải tính năng khám phá.
- **Đăng bài / bình luận / social feed:** agent khác phụ trách. Đề xuất chỉ tái dùng cơ chế ảnh đã có của post trong review, không đụng luồng feed.
- **Bộ sưu tập:** agent khác phụ trách.
- **Thông báo:** agent khác phụ trách.
- **Xác thực "quán chính chủ" / tick xanh:** cần quan hệ đối tác và quy trình pháp lý ngoài tầm FE + mock; khẳng định "đã kiểm duyệt" hiện có (`place-detail-page.tsx:255-257`) nên thay bằng bằng chứng cụ thể (ảnh + review thật của DX-3.3) thay vì thêm một lời hứa mới.
- **AI tóm tắt review:** không có backend/model; tóm tắt sai một câu là mất niềm tin toàn bộ trang — chưa đủ điều kiện cần.
