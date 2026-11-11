# Agent 2 — Nội dung & tương tác xã hội

> Phạm vi: vòng lặp nội dung — đăng bài/check-in, chất lượng caption, gắn địa điểm,
> bình luận/trả lời, chia sẻ ra ngoài, theo dõi người khác, feed theo người theo dõi.
> Không chạm vào: gamification, khám phá/bản đồ/tìm kiếm, review/chấm sao, bộ sưu tập,
> hệ thống thông báo (trừ khi một đề xuất tận dụng dữ liệu đã có của khu vực đó).
>
> Ghi chú phương pháp: công cụ search web không khả dụng trong phiên này (lỗi tool),
> nên phân tích dựa trên logic sản phẩm + so sánh với mô hình đã biết của Instagram /
> Threads / Foursquare / Zalo chứ không có trích dẫn web.

## Hiện trạng (bằng chứng code)

- **Soạn bài chỉ là một textarea trống.** `src/features/social/components/post-composer.tsx:85-92`
  — không có gợi ý cấu trúc caption, không nhắc "món gì / giá bao nhiêu / có đáng quay lại".
  Chỉ có placeholder một dòng và bộ đếm ký tự (`:179-181`).
- **Ảnh bài đăng là ảnh seed xoay vòng, không phải ảnh thật.** `post-composer.tsx:27,170-177`
  và `src/features/places/components/check-in-dialog.tsx:28,122-130` — nút "Đổi ảnh" chỉ tăng
  index trong mảng `IMAGE_SEEDS`.
- **Gắn địa điểm chỉ qua gợi ý server dựa trên nội dung caption.** `post-composer.tsx:47-52`
  (debounce 450ms, `usePlaceSuggestions` chỉ bật khi caption ≥ 8 ký tự —
  `src/features/places/hooks/use-place-suggestions.ts:19`); **không có cách chọn tay** địa điểm
  nếu server không gợi ý ra. Bài không gắn được thì chỉ chờ: "Chưa gắn địa điểm — hệ thống sẽ
  đề xuất cho bạn" (`post-card.tsx:78-82`), tức vòng khép kín phụ thuộc hoàn toàn vào server.
- **Check-in bắt buộc gõ caption mới gửi được.** `check-in-dialog.tsx:49`
  (`canSubmit = caption.trim().length >= 3`) — không có đường "chỉ check-in, không viết gì".
- **Feed chỉ có 4 filter: all / unplaced / mine / saved.** `src/features/social/types/post.ts:24`,
  `src/features/social/pages/social-page.tsx:23-28`, `src/mocks/server.ts:841-851`.
  **Không có filter "Đang theo dõi"** dù dữ liệu follow đã tồn tại.
- **Follow đã hoạt động nhưng là ngõ cụt về nội dung.** Toggle theo dõi ở
  `src/features/profile/components/profile-header.tsx:49-56`, mock
  `src/mocks/server.ts:644-654,1019-1030` — follow chỉ tăng `followerCount`, không ảnh hưởng
  feed nào. Số "Người theo dõi / Đang theo dõi" (`profile-header.tsx:72-96`) **không click được**,
  không xem được danh sách ai.
- **Không có chia sẻ bài đăng.** Footer bài chỉ có thích / bình luận / lưu
  (`post-card.tsx:84-108`, `post-detail-page.tsx:128-168`). Component chia sẻ dùng chung đã có
  sẵn (`src/components/shared/share-button.tsx`, `src/lib/share.ts` — Web Share API + fallback
  clipboard) nhưng chỉ được dùng cho bộ sưu tập
  (`src/features/collections/pages/collection-detail-page.tsx:191`).
- **Bình luận là danh sách phẳng, reply chỉ đánh dấu bằng `@handle`.**
  `src/features/social/components/comment-list.tsx:20` ("Danh sách bình luận phẳng…"),
  `comment-item.tsx:53-58`. Có trả lời qua `parentId` (`comment-composer.tsx:32-33`) nhưng
  không nhóm cha–con theo trực quan.
- **Bug nhỏ ở placeholder trả lời:** `comment-composer.tsx:62-64` dùng template literal nhưng
  thiếu `$` — hiển thị nguyên văn `Trả lời @{replyTo.author.handle}…` thay vì tên thật.
- **Không có nháp bài đăng.** Đóng composer/dialog là mất nội dung đã gõ
  (`check-in-dialog.tsx:51-54` chủ động xoá caption khi đóng).

## Đề xuất

### DX-2.1: Tab feed "Đang theo dõi" + gợi ý người để theo dõi

- **Vấn đề người dùng:** người dùng bấm "Theo dõi" một người có gu ăn giống mình nhưng
  chẳng nhận được gì — feed vẫn là đống bài toàn cục, bài của người mình theo dõi chìm giữa
  hàng chục bài của người lạ. Follow trở thành hành động vô nghĩa.
- **Hiện trạng:** `src/features/social/types/post.ts:24` (filter không có "following");
  `src/mocks/server.ts:846-848` (server chỉ lọc unplaced/mine/saved);
  `src/mocks/server.ts:644-654` (`followedByMe` đã nằm trên user, sẵn sàng dùng).
- **Đề xuất:** thêm tab "Đang theo dõi" vào `TabsList` của `/social`
  (`social-page.tsx:23-28`), gửi `filter=following` cho server; mock lọc
  `MOCK_USERS[author].followedByMe === true`. Khi tab rỗng (chưa follow ai), thay Empty
  mặc định bằng Empty có **danh sách gợi ý người dùng** (lấy từ `GET /users` — `server.ts:970` đã có) kèm nút "Theo dõi" dùng lại `useSetFollow` — người dùng
  mới không bị rơi vào màn hình chết.
- **Giá trị thực:** người dùng thật sẽ **đọc được đúng bài của những người mình quan tâm**
  ngay khi mở app, và có lý do cụ thể để bấm theo dõi (follow đổi lấy một feed riêng).
  Đây là vòng lặp "theo dõi → nội dung tốt hơn → theo dõi thêm" mà app đang thiếu.
- **Phạm vi:** FE + mock server (thêm 1 nhánh filter + endpoint `/users` đã có sẵn). **S**.
- **Rủi ro / điều kiện cần:** cần thống nhất semantics "following" gồm cả bài của chính mình
  hay không (khuyến nghị: gồm, như Threads); khi chuyển backend thật cần endpoint lọc theo
  quan hệ follow — hiện mock chỉ có `followedByMe` trên từng user, đủ dùng cho mock.

### DX-2.2: Chọn tay địa điểm khi soạn bài (place picker)

- **Vấn đề người dùng:** người viết "quán này ngon quá" mà không nhắc tên quán thì **không
  thể gắn địa điểm bằng bất kỳ cách nào** — phải chờ server "đề xuất cho bạn" ở Thông báo
  (`post-card.tsx:78-82`). Bài hay mà mờ nguồn gốc quán = giá trị cho người đọc giảm mạnh.
- **Hiện trạng:** `post-composer.tsx:47-52,114-154` — địa điểm chỉ đến từ gợi ý server sinh
  theo caption (debounce 450ms, tối thiểu 8 ký tự — `use-place-suggestions.ts:19`);
  `check-in-dialog.tsx` thì ngược lại, khoá cứng địa điểm.
- **Đề xuất:** nút "Gắn địa điểm" mở `Popover`/`Dialog` chứa ô tìm kiếm + danh sách kết quả
  (tái dùng `usePlaceSuggestions` với chuỗi tìm kiếm do người dùng gõ, thay vì caption) và
  một mục "Gần đây" (các placeId của bài đã đăng của tôi — có sẵn qua `/users/:handle/posts`).
  Chọn xong hiển thị chip như `selectedPlace` hiện tại (`post-composer.tsx:95-112`).
  Giữ nguyên luồng gợi ý tự động như một đường phụ.
- **Giá trị thực:** người dùng thật sẽ **gắn đúng quán trong vài giây ngay khi đăng**,
  bài xuất hiện ngay ở tab "Bài đăng" của quán (`server.ts:955-961`) thay vì treo ở trạng thái
  "chờ hệ thống đề xuất" vô thời hạn.
- **Phạm vi:** FE + mock (nếu cần endpoint tìm kiếm địa điểm theo chuỗi tuỳ ý; `/places`
  hiện có thể đã có — cần kiểm tra trước khi làm). **M**.
- **Rủi ro / điều kiện cần:** không thay thế luồng gợi ý hiện có (giữ hành vi, chỉ thêm đường);
  phải dùng đúng component có sẵn (`Popover`, `Command`-style list bằng `ItemGroup`) theo
  `CONVENTIONS.md` §1; cẩn thận không tạo nguồn sự thật thứ hai cho dữ liệu place.

### DX-2.3: Chia sẻ bài đăng ra ngoài app

- **Vấn đề người dùng:** người dùng muốn gửi cho bạn bè "quán này, xem bài này đi" nhưng
  không có nút nào — phải tự copy URL thanh địa chỉ (trên mobile gần như không làm được).
  Nội dung hay không lan ra ngoài được → app không có kênh tăng trưởng từ chính người dùng.
- **Hiện trạng:** footer bài đăng chỉ có thích/bình luận/lưu (`post-card.tsx:84-108`);
  trang chi tiết cũng vậy (`post-detail-page.tsx:128-168`). Trong khi hạ tầng chia sẻ đã
  hoàn chỉnh và đã dùng cho bộ sưu tập: `src/components/shared/share-button.tsx`,
  `src/lib/share.ts` (Web Share API + fallback copy clipboard + toast).
- **Đề xuất:** thêm `ShareButton` (icon-only, `aria-label="Chia sẻ bài đăng"`) vào footer của
  `PostCard` và `PostActions` của trang chi tiết, truyền `url={/post/${post.id}}`,
  `title={Bài đăng của ${post.author.name} trên Rendez}`. Nếu bài có gắn địa điểm,
  title kèm tên quán để người nhận hiểu ngữ cảnh ngay từ preview tin nhắn.
- **Giá trị thực:** người dùng thật sẽ **gửi bài cho bạn bè trong 1 chạm**; người nhận mở
  deep-link `/post/:id` → vào thẳng nội dung + quán. Chi phí cực thấp vì toàn bộ hạ tầng có sẵn.
- **Phạm vi:** FE-only. **S** (nhỏ nhất trong danh sách, nên làm đầu tiên).
- **Rủi ro / điều kiện cần:** gần như không có; chỉ cần đặt nút không làm footer chật trên
  mobile (đang có 3 nút — có thể đưa share vào `DropdownMenu` "Tuỳ chọn" nếu chật).

### DX-2.4: Bình luận dễ hơn — nhóm trả lời, chip câu hỏi nhanh, sửa placeholder

- **Vấn đề người dùng:** người xem bài muốn hỏi "giá bao nhiêu?", "có chỗ để xe không?" nhưng
  phải tự nghĩ câu từ trước ô trống — rào cản lớn nhất của bình luận. Người được hỏi thì
  khó theo dõi mạch hội thoại vì reply trộn lẫn trong danh sách phẳng.
- **Hiện trạng:** danh sách phẳng `comment-list.tsx:20`; reply chỉ là `@handle` trong text
  (`comment-item.tsx:53-58`); composer trống hoàn toàn (`comment-composer.tsx:57-75`).
  Bug: placeholder trả lời hiển thị nguyên văn `@{replyTo.author.handle}` do thiếu `$`
  (`comment-composer.tsx:62-64`).
- **Đề xuất:**
  1. Sửa placeholder thành `` `Trả lời @${replyTo.author.handle}…` `` (bug, sửa trước).
  2. Thêm 3 chip câu hỏi nhanh dưới composer khi **bài có gắn địa điểm**: "Giá ổn không?",
     "Có chỗ để xe không?", "Mấy giờ đông?" — bấm là chèn câu vào textarea, người dùng
     chỉnh rồi gửi (không tự gửi, tránh spam).
  3. Nhóm trực quan cha–con: reply của một bình luận thụt lề nhẹ ngay sau cha
     (dữ liệu `parentId`/`replyTo` đã có, chỉ đổi cách render trong `CommentList`).
- **Giá trị thực:** người dùng thật sẽ **bình luận nhiều hơn** vì không phải viết từ đầu,
  và **đọc theo dõi hội thoại dễ hơn** — bình luận là nơi quyết định "quán này đáng tin"
  cho người đọc bài.
- **Phạm vi:** (1) FE-only S; (2) FE-only S; (3) FE + có thể cần mock trả reply theo thứ tự
  cha–con ổn định (hiện đã "reply nằm sau cha" — `comment-list.tsx:20`, nên khả năng FE-only).
  Tổng: **M**.
- **Rủi ro / điều kiện cần:** chip câu hỏi phải chỉ hiện khi bài có `place` (câu hỏi về quán);
  không tự động gửi; phân cấp sâu > 1 mức không làm (giữ phẳng + indent 1 cấp như hiện trạng
  dữ liệu cho phép).

### DX-2.5: Nháp bài đăng và check-in tự lưu

- **Vấn đề người dùng:** người dùng đang gõ dở caption ở composer hoặc check-in thì lỡ tay
  đóng dialog / chuyển trang → **mất sạch nội dung đã viết**, và thường không viết lại.
  Mỗi lần mất nháp là mất một bài đăng tiềm năng.
- **Hiện trạng:** không có cơ chế nháp nào; `check-in-dialog.tsx:51-54` chủ động
  `setCaption("")` khi đóng; `post-composer.tsx` giữ state trong bộ nhớ component
  (`:40-41`) — mất khi unmount.
- **Đề xuất:** lưu nháp vào `localStorage` (key theo ngữ cảnh: `draft-post-social`,
  `draft-checkin-<placeId>`) với debounce bằng `useDebouncedValue` đã có
  (`@/hooks/use-debounced-value`); khi mở lại composer/dialog, nếu có nháp thì khôi phục
  kèm dòng nhỏ "Đã khôi phục nháp — Xoá". Nháp check-in nhớ cả `placeId` để khôi phục đúng quán.
- **Giá trị thực:** người dùng thật sẽ **không mất bài vì một cú đóng nhầm** — đây là một
  trong những lý do phổ biến nhất khiến người dùng bỏ dở việc đăng nội dung.
- **Phạm vi:** FE-only. **S**.
- **Rủi ro / điều kiện cần:** chỉ lưu caption + placeId (không lưu imageSeed — ảnh seed
  xoay vòng, giữ nguyên hành vi "Đổi ảnh"); xoá nháp sau khi đăng thành công; tuân thủ
  quy ước hook/không thêm dependency (dùng `localStorage` thô qua 1 hook nhỏ trong feature).

## Không đề xuất và lý do

- **Gamification: badge, điểm, streak, "check-in 7 ngày liền".** Ngoài phạm vi được giao
  (cấm đề xuất); ngoài ra trên app nội dung địa điểm, phần thưởng giả dễ làm nhiễu tín hiệu
  thật (bài đăng để lấy điểm thay vì chia sẻ thật).
- **Tải ảnh thật lên bài đăng / check-in.** Đây là đề xuất tự nhiên nhất khi nhìn
  `IMAGE_SEEDS` xoay vòng, nhưng: (a) cần backend lưu trữ ảnh thật (hiện toàn bộ là mock
  seed image), (b) chạm tới hạ tầng upload — vượt "FE + mock". Ghi vào backlog cho giai đoạn
  có backend thật thay vì đề xuất nửa vời.
- **Sửa luồng thông báo "đề xuất địa điểm".** Nút gắn địa điểm từ thông báo
  (`place-suggestion-card.tsx:18,34`) thuộc hệ thống thông báo — agent khác phụ trách.
  Đề xuất của tôi (DX-2.2) giải quyết cùng vấn đề từ phía composer, không đụng file đó.
- **Báo cáo bình luận / kiểm duyệt nội dung.** Cần backend + quy trình vận hành; với mock
  hiện tại không có chỗ để gắn, và chưa có bằng chứng người dùng cần ở giai đoạn này.
- **Tin nhắn trực ("Nhắn tin" hoạt động thật).** Nút "Nhắn tin" ở `profile-header.tsx:57`
  hiện là nút chết, nhưng hệ tin nhắn là một feature lớn độc lập, không nằm trong vòng lặp
  nội dung được giao; đề xuất ngắn hạn chỉ nằm ở DX-2.1 (gợi ý người theo dõi).
- **Feed thuật toán cá nhân hoá (ranking theo sở thích).** Cần dữ liệu hành vi thật và
  backend; với mock không thể xác minh, và là việc của backend/thuật toán chứ không phải
  vòng lặp nội dung FE.
