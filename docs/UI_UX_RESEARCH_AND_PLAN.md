# Rendez — Nghiên cứu & Kế hoạch Cải tiến Toàn diện Giao diện UI/UX (UI/UX Research & Redesign Plan)

Tài liệu này tổng hợp cơ sở lý thuyết thiết kế UI/UX, phân tích đối chiếu các ứng dụng hàng đầu thế giới (Pinterest, Airbnb, Instagram/Threads, Unsplash, Google Maps), đánh giá hiện trạng giao diện Rendez và lập kế hoạch sửa đổi, nâng cấp toàn diện phần giao diện người dùng (không thay đổi logic nghiệp vụ và backend).

---

## 1. Nghiên cứu Lý thuyết Thiết kế UI/UX & Công thái học (Ergonomics)

### 1.1. Các Định luật Thiết kế Trải nghiệm Người dùng (Laws of UX)
1. **Định luật Fitts (Fitts's Law):**
   * *Nguyên lý:* Thời gian để chạm tới một mục tiêu phụ thuộc vào khoảng cách và kích thước của mục tiêu đó.
   * *Ứng dụng vào Rendez:*
     * Mọi nút bấm, tab điều hướng, chip danh mục trên thiết bị di động phải đạt kích thước tối thiểu **44x44px** (vùng chạm touch target an toàn của Apple HIG và Android Material Design).
     * Đưa các hành động quan trọng nhất (Bottom Navigation Bar, nút Thích/Lưu trên thẻ ảnh, nút Đăng ảnh) vào vùng **Thumb Zone** (vùng ngón tay cái dễ với tới nhất ở nửa dưới màn hình điện thoại).
2. **Định luật Hick (Hick's Law):**
   * *Nguyên lý:* Thời gian đưa ra quyết định tăng theo số lượng và độ phức tạp của các lựa chọn.
   * *Ứng dụng vào Rendez:*
     * Tinh giản số lượng tab danh mục chính thành một hàng cuộn ngang mượt mà (Horizontal Scrollable Pills), chia rõ 6 nhóm nhu cầu cốt lõi (`Học bài`, `24/7`, `Mộc mạc`, `Sân vườn`, `Sống ảo`, `Cóc vỉa hè`).
     * Gom cụm bộ lọc nâng cao (Visual Attributes) vào drawer thu gọn có chỉ số đếm số lượng đang chọn (`Badge count`), tránh gây choáng ngợp thị giác.
3. **Định luật Jakob (Jakob's Law):**
   * *Nguyên lý:* Người dùng dành phần lớn thời gian trên các ứng dụng khác, do đó họ mong muốn ứng dụng của bạn hoạt động theo cách họ đã quen thuộc.
   * *Ứng dụng vào Rendez:*
     * Giữ cấu trúc thanh điều hướng kinh điển: Desktop dùng **Left Rail Sidebar** (tương tự Linear, Pinterest, Twitter/X Web); Mobile dùng **Bottom Tab Bar** 5 biểu tượng chuẩn (Khám phá, Bản đồ, Đăng ảnh, Đã lưu, Cá nhân).
4. **Ngưỡng Doherty (Doherty Threshold):**
   * *Nguyên lý:* Năng suất tăng vọt khi máy tính và người dùng tương tác với tốc độ < 400ms.
   * *Ứng dụng vào Rendez:*
     * Sử dụng **Skeleton Loaders** (hiệu ứng shimmer) thay vì văn bản "Đang tải..." thô cứng khi nạp ảnh và danh sách.
     * Cung cấp phản hồi xúc giác vi mô (Micro-interactions): hiệu ứng scale nhẹ (`transform: scale(0.97)`) khi nhấn nút bấm.

### 1.2. Nguyên lý Tâm lý học Thị giác Gestalt
* **Nguyên lý Gần nhau (Proximity):** Nhóm tên quán, địa chỉ và badge danh mục thành một cụm thông tin chặt chẽ; tách biệt rõ ràng với cụm tương tác (Nút Lưu, Nút Xem ảnh).
* **Nguyên lý Vùng chung (Common Region):** Sử dụng các thẻ bo góc (Card container) với viền mỏng (`border: 1px solid var(--line)`) và nền đổ bóng êm dịu để cô lập từng bức ảnh trong bố cục Masonry, tránh rối mắt khi các bức ảnh có tỷ lệ khung hình khác nhau.
* **Nguyên lý Tương phản (Visual Hierarchy):** Phân cấp kiểu chữ theo quy tắc Gutenberg: Tên quán (Heading 2, semi-bold, màu mực đậm) > Danh mục (Capsule badge, màu sắc dịu) > Địa chỉ (Màu xám cỏ cây `muted`, icon định vị nhỏ).

---

## 2. Nghiên cứu & Đối chiếu Thiết kế từ Các Ứng dụng Nổi tiếng

| Ứng dụng | Điểm xuất sắc có thể học hỏi | Điểm Rendez sẽ áp dụng cải tiến |
| :--- | :--- | :--- |
| **Pinterest** | Lưới Masonry tối ưu hiển thị ảnh dọc/ngang; Nút Lưu nổi trên ảnh; hiệu ứng zoom ảnh nhẹ khi hover. | Bo góc 16px cho thẻ ảnh; nút Bookmark kính mờ (`backdrop-blur`) ở góc trên; hover transition mượt mà không giật layout. |
| **Airbnb** | Thanh cuộn danh mục dạng con nhộng (Pills) với viền mỏng; Thẻ địa điểm tối giản nhấn mạnh không gian thật; Card bản đồ nổi dạng carousel. | Thiết kế lại `.category-tabs` thành thanh pill ngang tràn viền tự nhiên, trạng thái active đậm nét với font số rõ ràng; popup bản đồ bo tròn tinh tế. |
| **Instagram / Threads** | Tối giản tối đa thanh công cụ xung quanh để tôn vinh bức ảnh; thiết kế khu vực bình luận phân cấp trực quan; avatar bo tròn rõ nét. | Thiết kế lại modal chi tiết ảnh 2 cột cân xứng: Ảnh tỷ lệ chuẩn bên trái, panel tác giả & bình luận có thanh cuộn độc lập bên phải. |
| **Unsplash** | Ghi nhận bản quyền và tác giả nhiếp ảnh gia thanh lịch; lớp phủ dải màu chuyển (Gradient Scrim) tinh tế dưới đáy ảnh. | Hiển thị credit tác giả và ngày chụp thực địa bằng typography thanh thoát, tôn vinh người chụp ảnh thật quanh ĐH Bách Khoa. |
| **Google / Apple Maps** | Các nút điều khiển nổi (Floating action buttons) góc bản đồ; bảng danh sách quán dạng Bottom Sheet có tay nắm kéo vuốt trên mobile. | Bổ sung thanh tay nắm kéo (Grab handle bar) cho ngăn kéo bản đồ mobile; thiết kế lại marker quán thành điểm ghim hiện đại có pulse animation khi chọn. |

---

## 3. Đánh giá Hiện trạng & Những Điểm Yếu Cần Khắc Phục Trên Giao Diện Rendez

1. **Hệ thống Token & Bảng Màu (Color & Typography):**
   * *Hiện trạng:* Bộ màu xanh rêu (`#285548`) và nền ngà (`#fbfaf7`) khá ấm cúng nhưng độ tương phản viền thẻ và nút phụ còn mờ nhạt. Bộ chọn CSS toàn cục áp `width: 100%` lên thẻ `button` gây vỡ bố cục một số nút inline nếu không có override.
   * *Giải pháp:* Chuẩn hóa biến CSS tokens:
     * Nền chính: `--canvas: #faf8f5` (tone giấy ấm thư thái)
     * Thẻ bề mặt: `--surface: #ffffff`
     * Màu mực chính: `--ink: #1a2e26` (xanh thông rừng đậm quý phái)
     * Màu thương hiệu: `--green: #234e40`, `--green-hover: #1b3d32`
     * Màu điểm nhấn: `--accent: #c45c3d` (màu ngói đất nung Đà Nẵng ấm áp)
     * Đường viền tinh tế: `--line: #e8e9e2`
     * Đổ bóng mềm: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-floating`
2. **Thanh Điều Hướng (Navigation & App Shell):**
   * *Desktop:* Rail Sidebar 82px cố định bên trái cần làm nổi bật hơn trạng thái active của từng tab (vạch chỉ thị màu xanh hoặc viên thuốc nền mềm). Logo `r.rendez` cần có hiệu ứng hover tinh nghịch.
   * *Mobile:* Đảm bảo Bottom Bar có nền kính mờ (`backdrop-filter: blur(16px)`), icon kích thước 24px với khoảng cách ngón tay bấm thoải mái, ẩn thanh tìm kiếm dài trên topbar để nhường không gian cho trải nghiệm ảnh.
3. **Thanh Tìm Kiếm & Tabs Danh Mục (Search & Category Pills):**
   * Biến thanh tìm kiếm thành dạng capsule bo tròn hiện đại với icon kính lúp mềm mại.
   * Hàng nút danh mục (`category-tabs`) cần hỗ trợ cuộn cảm ứng mượt mà (`-webkit-overflow-scrolling: touch`), ẩn thanh cuộn thô thiển (`scrollbar-width: none`), có hiệu ứng viền phát sáng nhẹ khi được chọn.
4. **Thẻ Ảnh & Lưới Masonry (Photo Card & Feed):**
   * Thẻ ảnh cần có viền mỏng tinh xảo, bo tròn 16px (`border-radius: 16px; overflow: hidden;`).
   * Ảnh có transition phóng to nhẹ `scale(1.025)` khi di chuột vào mà không làm tràn khung.
   * Nút Lưu (Bookmark) chuyển thành nút tròn kính mờ nổi bật (`backdrop-filter: blur(8px)`), thao tác bấm nảy mượt mà.
   * Nhãn địa chỉ và tên quán bên dưới ảnh có khoảng cách nhịp nhàng (8pt grid), bổ sung icon định vị và badge loại quán thanh nhã.
5. **Modal Chi Tiết Ảnh (Photo Detail Modal):**
   * Chia cột 2 nửa rõ ràng trên màn hình lớn: Cột ảnh chiếm 60% có nền tối nhẹ hoặc dải màu trung tính tôn ảnh; cột thông tin chiếm 40% cố định chiều cao với thanh cuộn riêng cho phần bình luận.
   * Cụm nút tương tác xã hội (Thích, Lưu, Chia sẻ, Báo cáo) gom thành hàng ngang đều đặn với số đếm lượt thích rõ ràng.
   * Khối bình luận: Avatar chữ cái đầu tròn trịa, khung nhập bình luận có nút gửi tích hợp bên trong, nút xóa bình luận kín đáo kèm xác nhận.
6. **Bản Đồ Tương Tác & Thẻ Ghim (Interactive Map View):**
   * Điều khiển bản đồ: Nút định vị vị trí và nút zoom nổi dạng đĩa tròn thanh lịch.
   * Thẻ ghim quán (Marker): Thiết kế marker hiện đại hình giọt nước có viền trắng, đổi màu cam đất khi được chọn kèm vòng sóng lan tỏa (pulse animation).
   * Popup xem nhanh: Card nhỏ gọn bo góc 14px với ảnh thumbnail và nút "Xem chi tiết" dẫn vào trang quán.

---

## 4. Kế hoạch Triển khai Sửa đổi Chi tiết (Implementation Plan)

### Giai đoạn 1: Nâng cấp Hệ Thống Token, Biến & Typography (`theme.css`)
- [ ] Bổ sung bảng màu tokens hiện đại với các cấp độ màu xám, xanh rừng thông, màu ngói đất nung và bóng đổ đa tầng.
- [ ] Xóa bỏ selector cưỡng bức `button { width: 100%; min-height: 48px; }` làm ảnh hưởng đến các nút nhỏ. Chuẩn hóa nút bấm thông qua class `.button` và component `Button`.
- [ ] Bổ sung hiệu ứng chuyển động vi mô (Transitions, Shimmer Keyframes, Button Press Scale).

### Giai đoạn 2: Tái thiết Kế Khung Layout & Điều Hướng (`layout.css`)
- [ ] Hoàn thiện Desktop Left Rail: Icon sắc nét, active indicator dạng pill nền xanh ngọc dịu nhẹ, logo `r.rendez` thanh thoát.
- [ ] Hoàn thiện Mobile Bottom Navigation: Chiều cao chuẩn 64px, hiệu ứng glassmorphism, chạm xúc giác nhạy.
- [ ] Tối ưu hóa Topbar Header: Giảm bớt độ cao cồng kềnh, thanh tìm kiếm bo cong mềm mại với phím tắt nhanh và dropdown tài khoản tinh gọn.

### Giai đoạn 3: Nâng cấp Bộ Lọc, Masonry Card & Feed (`components.css`)
- [ ] Nâng cấp `.category-tabs`: Hàng capsule cuộn ngang không lộ thanh cuộn, hiệu ứng active nổi bật, bo tròn 9999px.
- [ ] Tinh chỉnh `.photo-card`: Bo góc 16px, nút lưu kính mờ góc trên, hiệu ứng hover mượt mà với transform translateY(-4px).
- [ ] Thiết kế lại Skeleton Shimmer Placeholder khi ảnh hoặc dữ liệu đang tải.
- [ ] Tinh chỉnh form Đăng ảnh (`/submissions/new`) đa bước: Thanh tiến trình (Step Indicator) hiện đại, vùng kéo thả ảnh (Drag & Drop zone) trực quan.

### Giai đoạn 4: Hoàn thiện Modal Chi Tiết Ảnh & Bình Luận (`components.css`)
- [ ] Nâng cấp modal chi tiết ảnh: Cột trái hiển thị ảnh rộng rãi, cột phải chứa thông tin quán, hồ sơ tác giả, cụm nút Thích/Lưu/Chia sẻ và luồng bình luận sạch sẽ.
- [ ] Trau chuốt danh sách bình luận: Bong bóng nhẹ nhàng, phân biệt rõ người bình luận và tác giả ảnh, nút xóa tinh tế.
- [ ] Tối ưu hóa giao diện Trang Tác giả (`/creators/:id`): Banner thông tin tác giả chuẩn mực, lưới ảnh đóng góp đồng bộ.

### Giai đoạn 5: Tối ưu Bản Đồ Số & Marker Tương Tác (`map.css`)
- [ ] Làm đẹp thanh danh sách quán cạnh bản đồ (Desktop split view) và ngăn kéo Bottom Sheet (Mobile view).
- [ ] Thiết kế lại Marker ghim quán: Biểu tượng ghim giọt nước đổ bóng nổi, hiển thị số thứ tự hoặc biểu tượng danh mục, hiệu ứng pulse khi click.
- [ ] Nâng cấp popup xem nhanh địa điểm trên bản đồ.

### Giai đoạn 6: Kiểm thử Giao diện Toàn diện & Xác thực
- [ ] Kiểm tra tính responsive trên 5 dải kích thước màn hình: Mobile nhỏ (360px–390px), Mobile lớn (414px–480px), Tablet (768px–1024px), Desktop (1280px–1440px), Màn hình rộng (1920px+).
- [ ] Kiểm tra khả năng truy cập (Accessibility / WCAG): Phím Tab điều hướng, nhãn `aria-label`, độ tương phản màu chữ.
- [ ] Chạy toàn bộ test suite (`bun run --cwd frontend test`, `bun run --cwd frontend build`) đảm bảo không ảnh hưởng đến bất kỳ tính năng nào.
