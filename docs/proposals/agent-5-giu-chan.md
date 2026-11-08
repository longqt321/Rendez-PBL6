# Agent 5 — Giữ chân người dùng bằng giá trị thật

> Phạm vi: giữ chân người dùng **không bằng gamification** (cấm điểm/xp/badge/huy hiệu/streak/bảng xếp hạng). Chỉ nhận cơ chế dựa trên **giá trị nội dung** và **tiện ích thật**. Ranh giới: "feed theo người theo dõi" thuộc Agent 2; review thuộc Agent 3; bộ sưu tập thuộc Agent 4; khám phá/bản đồ thuộc Agent 1.

> Ghi chú phương pháp: công cụ tìm kiếm web trong phiên này báo lỗi nên không tra cứu được bài viết tham chiếu. Phân tích dưới đây dựa trên đọc codebase + suy luận sản phẩm, đối chiếu với các mẫu đã biết (Letterboxd/Goodreads/Substack dùng digest định kỳ và hồ sơ như danh mục giá trị — nêu dưới đây như nguyên tắc, không trích dẫn URL).

## Hiện trạng (bằng chứng code)

- **Feed chỉ có 3 filter tĩnh, mặc định "all"**: `src/features/social/pages/social-page.tsx:13` (`useState<PostFeedFilter>("all")`), tabs `all / unplaced / mine` ở dòng 23–29. Server lọc thuần tuý theo filter + từ khoá caption, **không có xếp hạng theo khẩu vị hay theo người theo dõi**: `src/mocks/server.ts:840–853` (`GET /posts` chỉ filter `unplaced/mine/saved` + `q`).
- **Thông báo chỉ 4 loại**: `like / comment / follow` (`src/features/notification/types/notification.ts:24–31`), `place-suggestion` (dòng 16–22), `system` (dòng 33–37). Trang thông báo có 2 tab `all / suggestions` (`src/features/notification/pages/notification-page.tsx:200–204`), đọc tất cả ở dòng 168–180.
- **Thông báo hệ thống là dữ liệu tĩnh, một lần**: `src/mocks/fixtures/notifications.ts:43–50` (notif-04 "Bản đồ địa điểm vừa được cập nhật") — không có cơ chế định kỳ, không có digest.
- **Place-suggestion không có lối thoát**: `src/mocks/server.ts:172–198` (`syncPlaceSuggestions`) sinh thông báo cho bài chưa gắn địa điểm; `notifiedPostIds` (dòng 53) chống sinh trùng, nhưng nếu người dùng **không muốn gắn** thì thông báo nằm đó vĩnh viễn, chỉ có thể "Đã gắn" (`src/features/notification/components/place-suggestion-card.tsx:110–125`), không có nút bỏ qua. Banner ở feed chỉ là text tĩnh: `social-page.tsx:82–87`.
- **Trang cá nhân chỉ là bộ đếm**: stats `Bài đăng / Người theo dõi / Đang theo dõi` (`src/features/profile/components/profile-header.tsx:72–97`), tabs `posts / pinned / saved / collections` (`src/features/profile/components/profile-tabs.tsx:33–38`). Không có thông tin nào cho biết **người này đáng theo dõi vì viết về gì**.
- **Theo dõi tồn tại nhưng "vô hình"**: `Toggle` theo dõi ở `profile-header.tsx:49–56`, API `POST/DELETE /users/:handle/follow` (`src/mocks/server.ts:1017–1038`). Theo dõi xong không nhận được gì thêm ngoài bài của người đó lẫn vào feed "all".
- **Cài đặt chưa có mục thông báo**: `src/features/settings/pages/settings-page.tsx:23–28` chỉ có `name/bio/location/privateProfile`; `privateProfile` hardcode `false` (dòng 43) và submit chỉ toast giả (dòng 56–60, ghi chú "PATCH /me chưa có ở mock server").

## Đề xuất

### DX-5.1: Feed "all" xếp hạng theo khẩu vị (taste-aware ranking)

- **Vấn đề người dùng**: ngày đầu app hay vì mọi thứ mới; ngày thứ hai mở feed "all" thấy đúng danh sách bài cũ theo thời gian — không có lý do tin rằng "mở app lên sẽ thấy thứ mình thích".
- **Hiện trạng**: `GET /posts` trả bài theo thứ tự lưu trữ, không chấm điểm (`src/mocks/server.ts:840–853`); UI chỉ có 3 tab tĩnh (`social-page.tsx:23–29`).
- **Đề xuất**: server chấm điểm bài trong filter `all` theo tín hiệu khẩu vị của người dùng hiện tại (thể loại/quận của địa điểm trong bài ≈ thể loại/quận của địa điểm họ đã đăng, lưu bài, và xem trang địa điểm). Mỗi card thêm một dòng nhỏ "Vì sao bạn thấy bài này: bạn hay xem quán ăn Sơn Trà". Không tạo tab mới — vẫn là tab "all", chỉ đổi thứ tự + dòng giải thích. Đây **không phải** feed theo người theo dõi (thuộc Agent 2); đây là xếp hạng cùng một feed "all".
- **Giá trị thực**: lý do quay lại số 1 của mọi app nội dung là "feed hiểu mình". Với app mới có ít người theo dõi, khẩu vị là tín hiệu khả dụng duy nhất và nó đã có sẵn trong dữ liệu mock (like/save/post có `placeId`).
- **Phạm vi**: cần backend (chấm điểm + nhúng `reason` vào Post hoặc endpoint riêng); FE **S** (thêm dòng giải thích vào `PostCard`, không đổi luồng dữ liệu).
- **Rủi ro / điều kiện cần**: thiếu dữ liệu (user mới) → phải có fallback về thứ tự thời gian, không được feed trống; dòng "vì sao" phải do server cung cấp, frontend không tự suy luận (giữ nguyên tắc một nguồn sự thật như D-011).

### DX-5.2: Tóm tắt định kỳ "Tuần này Đà Nẵng có gì mới"

- **Vấn đề người dùng**: không có nhịp nào kéo người quay lại vào một thời điểm **dễ dự đoán**; thông báo hiện chỉ đến khi _người khác_ tương tác — người ít được tương tác sẽ không bao giờ có thông báo.
- **Hiện trạng**: thông báo `system` duy nhất là dữ liệu tĩnh một lần (`src/mocks/fixtures/notifications.ts:43–50`); trang thông báo không có khối tóm tắt (`notification-page.tsx:206–216`).
- **Đề xuất**: mỗi tuần (server job) sinh **một** thông báo `system` loại digest, nội dung chỉ gồm dữ liệu thật: "Tuần này có N địa điểm mới được cộng đồng xác nhận, trong đó 2 quán hợp khẩu vị mặn của bạn", "3 bài từ người bạn theo dõi", "1 đề xuất địa điểm đang chờ bạn xử lý". Mỗi mục là link sâu tới đúng trang (discover có filter tương ứng / thông báo / bài đăng). Render như một `SystemRow` nổi bật đầu trang thông báo, không cần trang mới.
- **Giá trị thực**: đây đúng mô hình giữ chân của Substack/Letterboxd — digest định kỳ biến "mở app" thành một việc có hẹn và có nội dung đã chuẩn bị sẵn, kể cả cho user thụ động. Giá trị nằm ở nội dung tổng hợp, không ở phần thưởng.
- **Phạm vi**: cần backend (job tuần + nội dung digest); FE **S** (digest là `SystemNotification` sẵn có, chỉ cần style nổi bật + link sâu).
- **Rủi ro / điều kiện cần**: nếu không đủ dữ liệu tuần đó thì **không gửi** (tiêu chí "không spam" là bắt buộc); tần suất cố định 1 lần/tuần, không tăng theo hoạt động.

### DX-5.3: Biến đề xuất địa điểm thành "việc cần làm" có lối thoát

- **Vấn đề người dùng**: đề xuất địa điểm hiện là thông báo một chiều — hoặc gắn, hoặc chịu đựng nó nằm vĩnh viễn ở tab "Đề xuất địa điểm" với badge "Mới" không bao giờ tắt.
- **Hiện trạng**: `syncPlaceSuggestions` sinh thông báo một lần rồi thôi (`server.ts:172–198`); card chỉ có nút "Chọn"/"Đã gắn" (`place-suggestion-card.tsx:110–125`), không có hành động "không phải quán này"; banner feed là text tĩnh (`social-page.tsx:82–87`).
- **Đề xuất** (cải tiến tính năng có sẵn, không đụng phần khám phá/bản đồ):
  1. Thêm nút **"Không phải quán này"** trên mỗi suggestion → đánh dấu đã xử lý (cần `PATCH` mới, xem rủi ro). Sau khi xử lý hết, mục "Đề xuất địa điểm" rút gọn thành một dòng tóm tắt thay vì danh sách card dài.
  2. Đổi banner tĩnh ở feed thành một hàng có số đếm thật ("2 bài của bạn đang chờ gắn địa điểm →") link sâu vào tab suggestions — biến text trang trí thành lối vào có nghĩa.
- **Giá trị thực**: việc dang dở rõ ràng, nhỏ, có điểm kết thúc là một trong số ít cơ chế đưa người quay lại mà không cần thưởng — người dùng quay lại để **hoàn tất việc của chính họ**, và kết quả (địa điểm lên Khám phá) là giá trị thật cho cộng đồng.
- **Phạm vi**: cần backend (hành động "bỏ qua" + đếm số chưa xử lý); FE **M** (sửa `PlaceSuggestionCard`, `SuggestionSection`, banner ở `SocialPage`).
- **Rủi ro / điều kiện cần**: phải tôn trọng lựa chọn "bỏ qua" — nếu server tiếp tục sinh lại suggestion cho cùng bài thì tính năng thành spam; `notifiedPostIds` hiện đã chống sinh trùng, backend thật cần giữ hành vi này.

### DX-5.4: Trang cá nhân như danh mục giá trị — khối "Khẩu vị"

- **Vấn đề người dùng**: quyết định theo dõi hiện mù — chỉ thấy số bài/số follower, không biết theo dõi xong sẽ nhận được nội dung gì; trang cá nhân của chính mình cũng không tóm tắt được "tôi là food-blogger kiểu gì".
- **Hiện trạng**: header chỉ có 3 số đếm (`profile-header.tsx:72–97`); tabs chỉ có lưới bài/bộ sưu tập (`profile-tabs.tsx:33–38`); `UserProfile` không có trường nào về nội dung (`src/features/profile/types/profile.ts`).
- **Đề xuất**: thêm một khối "Khẩu vị" dưới stats (cả trang mình lẫn trang người khác): 2–3 thể loại/quận người này viết nhiều nhất + số **địa điểm khác nhau** đã từng đăng (khác với postCount — "8 bài nhưng chỉ 2 quán" và "8 bài ở 8 quán" là hai người rất khác). Với trang người khác, khối này thay cho lời mời theo dõi kiểu "Theo dõi để nhận bài về cà phê Sơn Trà". Không tạo tab mới, không đụng bộ sưu tập (Agent 4).
- **Giá trị thực**: theo dõi chỉ hữu ích khi người dùng biết mình theo dõi để nhận **cái gì** — đây là điều khiến nút Theo dõi (`profile-header.tsx:49–56`) từ "một cú click xã giao" thành một quyết định có thông tin; trang cá nhân trở thành trang người khác chủ động quay lại xem như danh mục tham khảo.
- **Phạm vi**: cần backend (aggregate từ bài đăng của user, nhúng vào `GET /users/:handle` hoặc `GET /me`); FE **S** (một khối hiển thị dưới stats).
- **Rủi ro / điều kiện cần**: user có 0–1 bài thì ẩn khối, đừng hiện "Chưa có khẩu vị" gây cảm giác bị chấm điểm (sát ranh giới gamification); dữ liệu phải từ server, frontend không tự đếm từ danh sách bài (tránh nguồn sự thật thứ hai).

### DX-5.5: Mục "Thông báo" trong Cài đặt — quyền kiểm soát chống spam

- **Vấn đề người dùng**: khi app bắt đầu gửi digest (DX-5.2) và nhiều loại thông báo hơn, không có cách tắt từng loại = người dùng không tin hệ thống thông báo, và tắt toàn bộ bằng cách bỏ mở app (mất giữ chân).
- **Hiện trạng**: `settings-page.tsx:23–28` chỉ có 4 trường hồ sơ + riêng tư; không có bất kỳ tuỳ chọn thông báo nào; riêng tư đang hardcode `false` (dòng 43) và lưu là toast giả (dòng 56–60).
- **Đề xuất**: thêm `FieldSet` "Thông báo" với `Switch` cho từng loại (`like`, `comment`, `follow`, `place-suggestion`, `digest tuần`) — đúng khuôn mẫu `Controller` + `Switch` đã dùng cho `privateProfile` (`settings-page.tsx:116–126`). Gộp luôn việc sửa lưu thật cho cả mục Riêng tư. Server lọc theo tuỳ chọn này khi sinh thông báo.
- **Giá trị thực**: kiểm soát là điều kiện để thông báo "đúng lúc" thực sự được tin tưởng; người dùng chịu quay lại app có thông báo vì biết mình quyết định loại nào đến.
- **Phạm vi**: cần backend (`PATCH /me` — mock chưa có route, chính comment trong code đã ghi nhận); FE **S** (mở rộng form có sẵn, không tạo form mới).
- **Rủi ro / điều kiện cần**: nếu backend chưa có `PATCH /me` thì đây chỉ là UI chết — cần làm cùng lượt thay vì để nút lưu giả thêm một lần nữa; mặc định bật hết, không bật hộ (opt-out, không ép opt-in từng loại).

## Không đề xuất và lý do

- **Điểm / XP / huy hiệu / streak / bảng xếp hạng / "chuỗi ngày mở app"** — bị cấm bởi định phạm nhiệm vụ; ngoài ra với app địa điểm, thưởng nỗ lực tạo hành vi đăng rác thay vì đăng thật.
- **"Wrapped"/recap cuối năm kiểu Spotify** — bản chất là nội dung một lần/năm, chi phí lớn, không giữ chân ngày thứ 2; digest tuần (DX-5.2) phủ đúng nhu cầu này với chi phí thấp hơn nhiều.
- **Feed theo người theo dõi (tab "Đang theo dõi")** — thuộc phạm vi Agent 2, không đề xuất trùng.
- **Đề xuất địa điểm mới từ nội dung bài (discovery engine)** — tính năng đã có sẵn (`syncPlaceSuggestions`), phần khám phá/bản đồ thuộc Agent 1; chỉ cải tiến phần thông báo/lối vào (DX-5.3).
- **Push notification ngoài app (email/web-push)** — chưa có hạ tầng, rủi ro spam cao nhất trong mọi kênh; cần chứng minh giá trị thông báo in-app trước (DX-5.2, DX-5.5) rồi mới nói đến kênh ngoài.
- **"Người bạn có thể biết" / gợi ý theo dõi hàng loạt** — tăng số follow nhưng không tăng giá trị nội dung; với dữ liệu mock 6 user, gợi ý sẽ lặp và gây mất tin.
- **Nhắc "quán bạn lưu sắp đóng cửa" / dữ liệu thời gian thực** — cần dữ liệu thật ngoài hệ thống (giờ mở cửa, trạng thái quán), vượt phạm vi dữ liệu hiện có; ghi nhận là ý tưởng dài hạn chứ không phải đề xuất kỳ này.
- **Popup "quay lại sau X ngày" / win-back campaign** — cơ chế can thiệp tiếp thị, không phải giá trị nội dung; nếu 4 đề xuất trên làm tốt thì không cần.
