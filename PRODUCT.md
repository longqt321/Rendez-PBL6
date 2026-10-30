# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Sinh viên & Học viên:** Người học tại các trường đại học/cao đẳng tại Đà Nẵng cần tìm không gian học nhóm, ôn thi có bàn rộng, nhiều ổ cắm điện, giá đồ uống vừa phải và không bị giới hạn thời gian ngồi.
2. **Người làm việc tự do & Từ xa (Freelancers / Remote Workers / Digital Nomads):** Chuyên gia công nghệ, người làm sáng tạo nội dung cần không gian làm việc ban ngày có Wi-Fi tốc độ cao ổn định, độ ồn thấp, ánh sáng tự nhiên tốt và điều hòa mát mẻ.
3. **Du khách & Người khám phá địa phương:** Người muốn tìm kiếm những quán cà phê mang phong cách kiến trúc đặc trưng của Đà Nẵng (view biển, view sông Hàn, sân vườn xanh mát) để chụp ảnh, thư giãn và trải nghiệm văn hóa cà phê bản địa.
4. **Chủ cơ sở quán cà phê:** Những người muốn giới thiệu không gian thực tế, các góc làm việc và tiện ích cụ thể của quán đến đúng tệp khách hàng tiềm năng mà không bị phụ thuộc vào các thuật toán quảng cáo tính phí.

## Product Purpose

Rendez được xây dựng nhằm giải quyết triệt để sự thất vọng khi tìm quán cà phê qua các ứng dụng truyền thống (vốn bị chi phối bởi ảnh quảng cáo đã chỉnh sửa quá đà, menu giá ảo và thiếu thông tin về tiện ích không gian thực tế).

Mục đích của Rendez là trở thành nền tảng số hóa không gian cà phê tại Đà Nẵng: giúp người dùng "thấy tận mắt" góc ngồi, ánh sáng, ổ điện và cảm giác không gian qua những bức ảnh thực tế chân thực nhất kết hợp bản đồ trực quan, từ đó chọn đúng quán cho đúng nhu cầu trước khi bước chân ra đường.

## Positioning

Khác biệt cốt lõi của Rendez:
- **Trải nghiệm thị giác thực tế (Visual-First):** Lưới ảnh Masonry tự động thích ứng với tỉ lệ khung hình gốc của ảnh chụp, tái hiện chân thực không gian quán mà không bị cắt cúp (crop) hay làm méo ảnh.
- **Không gian số Local-First:** Tích hợp sâu dữ liệu bản đồ địa phương OpenStreetMap và dịch vụ gạch Esri, hoạt động mượt mà, định vị chính xác và tra cứu trực quan.
- **Trung thực, phi thương mại:** Không có banner quảng cáo gây phiền toái, không đẩy quán trả tiền lên đầu danh sách, tập trung hoàn toàn vào tiện ích thực tế và ảnh chụp chân thực từ cộng đồng.

## Operating Context

- **Tình huống sử dụng trên Di động (Mobile Web):** Người dùng đang di chuyển trên đường hoặc vừa hạ cánh tại Đà Nẵng, cần định vị GPS tức thời và tìm kiếm nhanh các quán trong bán kính 1–3km có điều hòa và mở cửa muộn.
- **Tình huống sử dụng trên Máy tính (Desktop Web):** Sinh viên, lập trình viên lên kế hoạch làm việc nhóm từ sáng hôm trước, duyệt qua lưới ảnh để chọn góc ngồi có ổ cắm điện, sau đó xem bản đồ chỉ đường hoặc chia sẻ link cho bạn bè.
- **Môi trường hoạt động:** Ứng dụng web đáp ứng (Responsive SPA) tương thích mọi kích thước màn hình từ di động đến máy tính để bàn, hỗ trợ tốt trên mạng Wi-Fi và 4G/5G.

## Capabilities and Constraints

- **Chức năng đã xác nhận:**
  - Lưới ảnh Masonry giữ tỷ lệ khung hình thật (`aspect-ratio`).
  - Bản đồ tương tác MapLibre GL đồng bộ hai chiều với tham số URL và khung nhìn (`bbox`).
  - Bộ lọc không gian theo danh mục và thuộc tính trực quan (ổ điện, yên tĩnh, điều hòa, view thoáng, mở cửa 24/7).
  - Tự động định vị Geocoding đa nguồn (Photon, Nominatim, Esri) khi nhập địa chỉ mới.
  - Tương tác cộng đồng: Thích ảnh, bình luận, lưu quán yêu thích (`/saved`), xem hồ sơ tác giả ảnh (`/creators/:id`).
  - Trang quản trị Django Admin cho người kiểm duyệt (`/admin/`).
- **Ranh giới và Hướng phát triển:**
  - Giai đoạn hiện tại tập trung tối ưu trải nghiệm khám phá không gian và lưới ảnh; mở rộng độ phủ dữ liệu ra toàn địa bàn các quận tại Đà Nẵng (Hải Châu, Sơn Trà, Thanh Khê, Ngũ Hành Sơn).
  - Các tính năng đánh giá chấm điểm (Ratings & Reviews chi tiết) và đặt chỗ (Table Reservation) được quy hoạch phát triển sau khi hệ thống đạt độ phủ dữ liệu toàn thành phố.
  - Tạm thời ngoài phạm vi: Gọi món trực tuyến (Food ordering) và tích hợp cổng thanh toán ví điện tử.

## Brand Commitments

- **Tên sản phẩm:** Rendez (bắt nguồn từ *Rendezvous* — điểm hẹn, không gian gặp gỡ).
- **Ngôn ngữ & Giọng văn:** Tiếng Việt tự nhiên, ngắn gọn, chuẩn xác, khiêm tốn và tôn trọng sự thật không gian.
- **Bản sắc thị giác:** Tối giản, thanh lịch, màu sắc nhã nhặn tôn vinh vẻ đẹp chân thực của ảnh chụp; giao diện trung tính hỗ trợ người dùng tập trung vào nội dung ảnh và bản đồ.

## Evidence on Hand

- **Dữ liệu hạt giống thực tế:** 12 địa điểm quán cà phê đã kiểm chứng thực địa tại Đà Nẵng (`data/danang.json`).
- **Tư liệu hình ảnh:** 36 tệp ảnh không gian thực tế chụp trực tiếp tại các cơ sở (`data/photos/`).
- **Tài nguyên bản đồ địa phương:** Dữ liệu vector đường bộ quận Liên Chiểu (`frontend/public/map/region.geojson`) và bản quyền phông chữ tiếng Việt Noto Sans Regular (`public/map/FONT-LICENSE.txt`).
- **Hệ thống kiểm thử xác thực:** 173 bài kiểm thử backend Pytest và 56 bài kiểm thử frontend Vitest đạt tỷ lệ vượt qua 100%.

## Product Principles

1. **Thị giác là bằng chứng tối thượng (Visual Truth over Hype):** Mọi quyết định thiết kế phải ưu tiên hiển thị góc nhìn thực tế của không gian; không dùng ảnh cắt cúp giả tạo hoặc hiệu ứng làm sai lệch cảm giác không gian thật.
2. **Bản địa và Độc lập (Local-First Autonomy):** Tối đa hóa khả năng tự chủ dữ liệu, ưu tiên giải pháp mã nguồn mở và không áp đặt chi phí dịch vụ bên ngoài bắt buộc lên người dùng hay đơn vị vận hành.
3. **Hiệu năng và Ổn định giao diện (Layout Stability):** Lưới ảnh và bản đồ không được gây giật khung hình (zero layout shifts), tải nhanh ngay cả trong điều kiện mạng di động yếu.
4. **Tôn trọng người dùng và Sự riêng tư (Privacy by Default):** Tự động bóc tách mọi siêu dữ liệu nhạy cảm (EXIF, GPS cá nhân) trên ảnh tải lên trước khi xuất bản ra cộng đồng.

## Accessibility & Inclusion

- Tuân thủ tiêu chuẩn tiếp cận Web Content Accessibility Guidelines (WCAG) 2.1 AA.
- Cung cấp văn bản thay thế (`alt` text) có ý nghĩa cho ảnh chụp không gian.
- Tương phản màu sắc đảm bảo tối thiểu 4.5:1 cho văn bản thông thường.
- Hỗ trợ đầy đủ trạng thái focus bằng bàn phím và nhãn ARIA cho các nút bấm điều khiển bản đồ và bộ lọc.
