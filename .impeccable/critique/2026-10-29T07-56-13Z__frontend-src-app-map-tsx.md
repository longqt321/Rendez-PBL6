---
target: frontend/src/app/map.tsx
total_score: 21
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 2
target_identity: "file:/home/longtran/Projects/rendez-web/frontend/src/app/map.tsx"
target_fingerprint: "sha256:3e1c409c91c18b66d25775a795dcb9fd8b0890a66ebe3d419c1cacc7a684dbf0"
target_path: /home/longtran/Projects/rendez-web/frontend/src/app/map.tsx
timestamp: 2026-10-29T07-56-13Z
slug: frontend-src-app-map-tsx
closed: true
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:---:|-----------|
| 1 | Visibility of System Status | 2 | Chọn pin trên di động (<768px) không có phản hồi thị giác trong màn hình (khối chi tiết bị đẩy xuống dưới 430px). |
| 2 | Match System / Real World | 2 | Thông báo trạng thái trống ghi "Dữ liệu mẫu đồ án hiện tập trung tại Bách Khoa", lộ rõ chất đồ án học tập. |
| 3 | User Control and Freedom | 2 | Không có nút một chạm "Đặt lại góc nhìn toàn Đà Nẵng"; xem trước quán choán thanh bên và khó thoát. |
| 4 | Consistency and Standards | 2 | Chế độ Compact trong bản đồ loại bỏ hoàn toàn ô tìm kiếm tên quán; tồn tại CSS lặp và mã màu hex viết cứng. |
| 5 | Error Prevention | 3 | Giới hạn khung nhìn `maxBounds` chặt chẽ, chống cuộn bản đồ trôi ra biển hoặc mất định hướng. |
| 6 | Recognition Rather Than Recall | 1 | 12 marker đồng nhất hoàn toàn (icon ghim đơn điệu), tên quán bị ẩn khi chưa bấm; hover danh sách không sáng pin trên bản đồ. |
| 7 | Flexibility and Efficiency | 2 | Thiếu thanh tìm kiếm trực tiếp và các bộ lọc nhanh 1 chạm (ổ cắm, yên tĩnh, mở muộn). |
| 8 | Aesthetic and Minimalist Design | 2 | Hộp thoại xem trước nhồi nhét 4 nút bấm lớn xếp chồng trong cột hẹp 350px gây quá tải thị giác. |
| 9 | Error Recovery | 3 | Cơ chế thử lại gạch bản đồ (`tileError`) với bộ đếm thế hệ hoạt động tin cậy; nút bay về Bách Khoa hữu ích. |
| 10 | Help and Documentation | 2 | Thanh hướng dẫn đơn điệu ("Di chuyển bản đồ để xem địa điểm"), chưa giải thích mối liên kết giữa ảnh và vị trí. |
| **Total** | | **21/40** | **Acceptable (20–32 / Trung bình khá, nhiều điểm nghẽn trải nghiệm)** |

---

### Design Specificity Verdict

**LLM Assessment:**
Giao diện bản đồ hiện tại mang dáng dấp của một khung hiển thị POI kho hàng / cửa hàng thương mại chung chung (Store Locator shell), khoác lên lớp vỏ địa danh Đà Nẵng chứ chưa thực sự phản ánh bản sắc **Visual-First** mà Rendez cam kết trong `PRODUCT.md`:
1. **Hội chứng Pin đơn điệu (Generic Pin Syndrome):** Các điểm ghim sử dụng icon giọt nước Lucide trơn, hoàn toàn không biểu đạt thông tin tiện ích không gian (ổ điện, Wi-Fi, độ yên tĩnh) hay thumbnail ảnh thực tế.
2. **Vi phạm nguyên tắc tỷ lệ khung hình:** Ảnh xem trước trong bản đồ bị ép cứng `height: 160px; object-fit: cover;`, trực tiếp phá vỡ quy chuẩn thiết kế *"tuyệt đối không dùng thuộc tính ép buộc tỷ lệ cố định làm cắt xén mất góc ngồi thực tế"* trong `DESIGN.md`.
3. **Ảo ảnh địa lý thủ công:** Việc cắm các marker chữ `LIÊN CHIỂU`, `HẢI CHÂU`, `BIỂN ĐÔNG` trực tiếp bằng thẻ DOM đè lên bản đồ gây rối loạn khi zoom và che lấp các quán cà phê thực tế.

**Deterministic Scan (`impeccable detect`):**
- Kết quả quét file `frontend/src/app/map.tsx`: **0 vi phạm** (mã nguồn sạch, cấu trúc component tuân thủ cú pháp chuẩn MapLibre GL).
- File liên quan `contributions.tsx:18`: phát hiện 1 cảnh báo `broken-image` nhưng được xác định là False Positive (do gán URL qua DOM ref trong `useEffect`).

**Visual Overlays:**
Bỏ qua (môi trường máy chủ không có giao diện đồ họa headless, không có phiên trình duyệt CDP đang chạy).

---

### Overall Impression
Bản đồ tương tác vận hành ổn định về mặt kỹ thuật (đồng bộ URL hai chiều, giới hạn biên giới Đà Nẵng chính xác, tải gạch mượt mà), nhưng lại đánh mất "linh hồn" thị giác của Rendez: người dùng không cảm nhận được vẻ đẹp không gian quán qua chiếc ghim bản đồ vô hồn, và trải nghiệm trên di động bị đứt gãy nghiêm trọng khi thông tin quán bị ẩn sâu dưới chân trang.

---

### What's Working
1. **Đồng bộ trạng thái URL chuẩn mực:** Tọa độ `lat`, `lng`, mức `zoom` và mã địa điểm được phản ánh 2 chiều tức thời lên thanh địa chỉ, giúp chia sẻ vị trí và lưu bookmark hoàn hảo.
2. **Khả năng tự phục hồi và ranh giới an toàn:** Kiểm soát nghiêm ngặt biên giới bản đồ (`maxBounds`), tự động phát hiện lỗi gạch bản đồ và cung cấp nút thử lại kèm bộ đếm thế hệ thông minh.
3. **Chuyển đổi màu ghim đậm chất bản sắc:** Hiệu ứng chuyển từ Xanh thông (`#234e40`) sang Đỏ đất nung (`#c45c3d`) cùng nhịp đập nhẹ (`pulseMarker`) khi một quán được chọn thể hiện đúng ngôn ngữ thương hiệu.

---

### Priority Issues

#### [P0] Đứt gãy trải nghiệm di động: Khối xem trước quán nằm khuất dưới màn hình
- **Vấn đề:** Trên màn hình di động (<768px), bố cục bản đồ chuyển sang cột dọc. Khi bấm vào bất kỳ điểm ghim nào, thông tin quán (`marker-preview`) được hiển thị bên dưới khung bản đồ 430px, hoàn toàn ngoài tầm mắt người dùng.
- **Tại sao quan trọng:** Người dùng bấm vào ghim nhưng không thấy bất kỳ thông tin nào xuất hiện trên màn hình, tưởng rằng ứng dụng bị đơ hoặc lỗi.
- **Cách khắc phục:** Thiết kế ngăn kéo tương tác trượt từ đáy (Interactive Bottom Sheet / Peek Card) nổi trực tiếp trên nền bản đồ (chiều cao ~140px ở chế độ thu gọn, có thể vuốt lên xem chi tiết).
- **Lệnh đề xuất:** `/impeccable layout`

#### [P1] "Mù tìm kiếm" trên trang Bản đồ: Ô nhập từ khóa bị ẩn hoàn toàn
- **Vấn đề:** Thành phần `Filters` trong trang bản đồ gọi cờ `compact`, khiến ô input tìm kiếm bị thay bằng `<input type="hidden" name="q" />`.
- **Tại sao quan trọng:** Người dùng muốn tìm một quán quen (ví dụ: "43 Factory", "The Alley") hoặc một con đường (ví dụ: "Bạch Đằng") không thể gõ tìm kiếm mà phải quay ngược về trang Khám phá.
- **Cách khắc phục:** Tái lập thanh tìm kiếm nổi (Floating Search Bar) phía trên bản đồ, hỗ trợ gợi ý nhanh tên quán và địa chỉ.
- **Lệnh đề xuất:** `/impeccable layout`

#### [P1] Hội chứng Ghim bản đồ đơn điệu làm mất tính trực quan
- **Vấn đề:** Các marker là icon giọt nước giống hệt nhau, ẩn tên quán đến khi hover/click, không biểu đạt tiện ích không gian.
- **Tại sao quan trọng:** Người dùng phải bấm từng ghim một cách mù quáng để xem quán nào có bàn làm việc, quán nào có view đẹp.
- **Cách khắc phục:** Thiết kế lại pin thành dạng micro-badge hiển thị nhãn tiện ích chính (icon ổ điện, biểu tượng yên tĩnh) hoặc ảnh thumbnail tròn nhỏ kèm tên quán vắn tắt.
- **Lệnh đề xuất:** `/impeccable clarify`

#### [P2] Văn bản "Đồ án học tập" phá vỡ tính chuyên nghiệp của sản phẩm
- **Vấn đề:** Dòng chữ thông báo rỗng: *"Dữ liệu mẫu đồ án hiện tập trung tại khu vực Bách Khoa — Liên Chiểu."*
- **Tại sao quan trọng:** Khiến ứng dụng trông giống bài tập lớn của sinh viên chưa hoàn thiện, làm giảm độ tin cậy của dịch vụ.
- **Cách khắc phục:** Thay bằng văn bản cộng đồng tự nhiên: *"Rendez đang khởi động dữ liệu đầu tiên tại khu vực Liên Chiểu. Mạng lưới các quận Hải Châu, Sơn Trà đang được cộng đồng cập nhật tiếp tục."*
- **Lệnh đề xuất:** `/impeccable polish`

#### [P2] Quá tải nút bấm trong cửa sổ xem trước (Button Cemetery)
- **Vấn đề:** Khung xem trước quán hiển thị 4 nút bấm to xếp chồng: "Lưu quán", "Chỉ đường", "Xem chi tiết", "Đóng xem trước".
- **Tại sao quan trọng:** Gây nhiễu thị giác và chiếm hết không gian quý giá của cột danh sách.
- **Cách khắc phục:** Tinh gọn thành 1 nút hành động chính "Khám phá không gian", đưa Chỉ đường và Lưu quán vào hàng icon phụ tinh tế, dùng nút "X" ở góc trên để đóng.
- **Lệnh đề xuất:** `/impeccable distill`

---

### Persona Red Flags

1. **Freelancer / Digital Nomad (Tìm quán yên tĩnh có ổ điện & Wi-Fi mạnh):**
   - *Hành trình:* Mở bản đồ từ Sơn Trà. Bản đồ trống trơn, thông báo dữ liệu chỉ có ở Bách Khoa. Bấm nút bay về Bách Khoa, thấy 12 ghim giống hệt nhau. Phải bấm từng cái một để tìm ổ điện. Xem ảnh thì bị cắt xén mất góc ngồi thực tế.
   - *Kết luận:* Thất vọng, rời bỏ trang web để dùng Google Maps.
2. **Sinh viên đại học (Tìm quán học nhóm bàn rộng gần trường):**
   - *Hành trình:* Mở điện thoại khi đang đứng ở cổng trường Bách Khoa. Chạm vào ghim quán gần nhất. Ghim đổi màu đỏ nhưng màn hình không hiển thị tên quán hay giá nước (vì thông tin bị đẩy xuống tít đáy trang dưới bản đồ).
   - *Kết luận:* Đứt gãy trải nghiệm tương tác trên thiết bị di động.
3. **Khách du lịch (Tìm quán ngắm cầu sông Hàn hoặc view biển):**
   - *Hành trình:* Tìm kiếm quán view biển Mỹ Khê. Thấy chữ `BIỂN ĐÔNG` to tướng cắm giữa biển. Không tìm thấy ô tìm kiếm để gõ chữ "Bạch Đằng" hay "Võ Nguyên Giáp".
   - *Kết luận:* Mất phương hướng vì các nhãn quận giả lập và thiếu bộ lọc trải nghiệm.

---

### Minor Observations
- Trùng lặp và thừa định nghĩa CSS trong `frontend/src/styles/map.css` (class `.map-error` và `.location-picker` bị khai báo 2 lần với các thuộc tính xung đột).
- Marker chữ `BIỂN ĐÔNG` đặt cứng ở tọa độ `[108.272, 16.041]` bằng thẻ React DOM thay vì đưa vào cấu hình vector tile style của bản đồ.
- Hover trên thẻ danh sách bên phải không có phản hồi kích hoạt ghim tương ứng trên bản đồ (Hover Disconnect).
- Một số mã màu hex (`#eff3e8`, `#9aae9b`, `#647c6b`) trong `map.css` viết cứng, chưa ăn khớp với token `theme.css`.

---

### Questions to Consider
1. *Tại sao Rendez không đưa ảnh thumbnail thực tế hoặc huy hiệu tiện ích (ổ điện, máy lạnh) trực tiếp lên điểm ghim, thay vì dùng icon ghim giọt nước từ thập kỷ trước?*
2. *Nếu giá trị cốt lõi của Rendez là "Visual Truth" (ảnh chụp chân thực không cắt cúp), tại sao cửa sổ xem trước trên bản đồ lại ép ảnh vào khung cố định 160px?*
3. *Liệu bố cục trên desktop có thể chuyển từ dạng chia đôi cứng nhắc thành bản đồ toàn màn hình (full-bleed) với các thẻ nổi bằng kính mờ tinh tế?*
