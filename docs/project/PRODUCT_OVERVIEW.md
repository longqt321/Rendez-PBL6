# Rendez — Tổng Quan Sản Phẩm (Product Overview)

Tài liệu này trình bày mục đích cốt lõi, chân dung người dùng, các hành trình trải nghiệm chính, phạm vi địa lý hiện tại và các ranh giới chức năng của sản phẩm Rendez.

---

## 1. Định Danh Sản Phẩm (Product Identity)

### 1.1. Rendez Là Gì?
**Rendez** là nền tảng số hóa dữ liệu không gian cà phê và làm việc tại Đà Nẵng. Hệ thống tập trung cung cấp tư liệu hình ảnh chân thực chụp thực địa kết hợp bản đồ tương tác cục bộ, giúp người dùng "thấy tận mắt" không gian thực tế trước khi lựa chọn điểm đến.

### 1.2. Vấn Đề Sản Phẩm Giải Quyết
Các ứng dụng gợi ý ẩm thực và bản đồ phổ biến trên thị trường thường gây thất vọng lớn cho người tìm không gian làm việc hoặc học tập:
- **Ảnh tiếp thị sai lệch (Marketing Distortion):** Ảnh trên mạng xã hội thường được chỉnh sửa màu quá đà, dùng ống kính góc rộng bẻ cong không gian, hoặc sử dụng ảnh 3D/ảnh studio không phản ánh thực tế.
- **Mù mờ về tiện ích vật lý (Lack of Spatial Context):** Người dùng đến nơi mới nhận ra quán không có ổ cắm điện, bàn quá thấp không ngồi làm việc được, điều hòa quá yếu, hoặc tiếng ồn xung quanh quá lớn.
- **Thương mại hóa thuật toán (Commercial Bias):** Các nền tảng ưu tiên các quán chi trả quảng cáo hoặc đẩy voucher giảm giá, thay vì không gian tĩnh tại phù hợp nhu cầu học tập/làm việc.

Rendez giải quyết vấn đề này bằng triết lý **Visual Truth (Chân thực thị giác)**: chỉ hiển thị hình ảnh thực tế phản ánh đúng không gian, giữ nguyên tỷ lệ khung hình tự nhiên, và phân loại theo các đặc điểm thị giác nhìn thấy trực tiếp (Visual Attributes).

---

## 2. Người Dùng Mục Tiêu (Target Users)

Theo tài liệu sản phẩm chuẩn mực (`PRODUCT.md` § Users), Rendez phục vụ 4 nhóm người dùng chính:

1. **Sinh viên & Học viên:**
   - *Nhu cầu:* Tìm không gian học nhóm, ôn thi có bàn rộng, nhiều ổ cắm điện, giá đồ uống sinh viên và không bị giới hạn thời gian ngồi.
   - *Hành vi chính:* Lọc nhanh theo thuộc tính `Bàn học & Ổ cắm`, kiểm tra ảnh góc bàn để xem khoảng cách ổ điện.
2. **Người làm việc tự do & Từ xa (Freelancers / Digital Nomads):**
   - *Nhu cầu:* Không gian làm việc ban ngày có Wi-Fi ổn định, độ ồn thấp, ánh sáng tự nhiên tốt, ghế ngồi có tựa lưng và máy lạnh mát mẻ.
   - *Hành vi chính:* Xem ảnh ban ngày, kiểm tra khu vực làm việc yên tĩnh (`Làm việc yên tĩnh`), lưu vào danh sách cá nhân (`/saved`).
3. **Du khách & Người khám phá địa phương:**
   - *Nhu cầu:* Tìm kiếm quán cà phê mang phong cách kiến trúc đặc trưng tại Đà Nẵng (view sông Hàn, gần biển Mỹ Khê/Phạm Văn Đồng, sân vườn thoáng mát) để thư giãn và chụp ảnh kỷ niệm.
   - *Hành vi chính:* Duyệt bản đồ tương tác, di chuyển khung nhìn để tìm quán quanh vị trí khách sạn/điểm du lịch.
4. **Chủ cơ sở quán cà phê (Place Owners - External):**
   - *Nhu cầu:* Giới thiệu không gian thực tế, các góc ngồi và tiện ích của quán đến đúng tệp khách hàng tiềm năng mà không bị phụ thuộc vào các thuật toán quảng cáo tính phí.
   - *Hiện trạng:* Đóng vai trò đối tượng thụ hưởng ngoài đời thực; hiện chưa có tính năng claim hay quản trị riêng trên hệ thống.

---

## 3. Các Hành Trình Trải Nghiệm Chính (User Journeys)

### Hành trình 1: Khám phá không gian qua Lưới ảnh Masonry (Visual Discovery)
1. Người dùng truy cập trang chủ (`/`).
2. Hệ thống tải feed ảnh tư liệu công khai xếp theo bố cục Masonry đa cột, giữ trọn 100% tỷ lệ khung hình thật (`aspect-ratio`).
3. Người dùng chọn một danh mục (ví dụ: *Cà phê*, *Làm việc*) hoặc bấm vào chip thuộc tính thị giác (ví dụ: *Bàn học & Ổ cắm*).
4. Hệ thống cập nhật danh sách ảnh tương ứng thông qua truy vấn API `/api/v1/feed/?attributes=...`.
5. Người dùng bấm vào một ảnh để mở modal chi tiết (`PhotoViewer`), xem tên quán, địa chỉ, khoảng cách, tác giả ảnh và các góc chụp liên quan tại cơ sở đó.

### Hành trình 2: Khám phá không gian trên Bản đồ Tương tác (Map Discovery)
1. Người dùng chuyển sang tab Bản đồ (`/map`) hoặc bật chế độ xem song song.
2. Bản đồ MapLibre GL tải các điểm ghim (markers) tương ứng với các quán nằm trong khung nhìn địa lý hiện tại (`bbox=west,south,east,north`).
3. Khi người dùng kéo thả bản đồ (pan) hoặc phóng to/thu nhỏ (zoom), tọa độ `bbox` trên URL tự động cập nhật và gọi lại API `/api/v1/places/map/`.
4. Người dùng bấm vào một marker trên bản đồ: cửa sổ xem nhanh (Popup Card) xuất hiện hiển thị tên quán, ảnh bìa, địa chỉ và nút chỉ đường.

### Hành trình 3: Đóng góp tư liệu ảnh thực tế (Photo Contribution)
1. Thành viên đã đăng nhập bấm nút `Đóng góp ảnh` (nút `+` trên thanh điều hướng).
2. Người dùng chọn một địa điểm có sẵn hoặc nhập tên địa điểm mới (kèm địa chỉ, tọa độ được tự động gợi ý qua Geocoding).
3. Người dùng tải lên từ 1 đến 5 ảnh thực tế (JPEG/PNG).
4. Người dùng bắt buộc phải tích chọn cam kết bản quyền ảnh tư liệu (`photo-rights-v2`).
5. Khi nộp thành công, hệ thống xử lý ảnh (bóc tách EXIF, nén phái sinh) và xuất bản ảnh ngay lập tức lên feed công khai (`status="published"`).

### Hành trình 4: Tương tác Xã hội & Lưu trữ Cá nhân (Social & Bookmarks)
1. Người dùng bấm nút **Lưu (Bookmark)** tại thẻ ảnh hoặc chi tiết quán để đưa quán vào danh sách `/saved`.
2. Người dùng bấm **Thích (Like)** góc ảnh không gian đẹp.
3. Người dùng viết bình luận dưới ảnh để trao đổi thêm về trải nghiệm chỗ ngồi, thời điểm yên tĩnh trong ngày.
4. Người dùng bấm vào tên người chụp để xem trang hồ sơ tác giả (`/creators/:id`) và các bộ sưu tập ảnh họ đã đóng góp.

---

## 4. Phạm Vi Địa Lý & Độ Phủ Dữ Liệu Hiện Tại

Cần phân biệt rõ ràng giữa **Tầm nhìn sản phẩm (Product Scope)** và **Độ phủ dữ liệu hạt giống thực tế (Verified Data Coverage)**:

| Khía cạnh | Phạm vi sản phẩm (Product Scope) | Dữ liệu hạt giống thực tế (Verified Seed Data) |
|---|---|---|
| **Khu vực địa lý** | Toàn bộ thành phố Đà Nẵng | Khu vực hẹp thuộc quận Liên Chiểu cũ (quanh các trục đường Tôn Đức Thắng, Nguyễn Lương Bằng, Ngô Văn Sở...) |
| **Số lượng cơ sở** | Hàng trăm quán trên toàn thành phố | **Đúng 12 cơ sở** đã được kiểm chứng thực địa trong tệp `data/danang.json` |
| **Số lượng ảnh** | Đóng góp cộng đồng liên tục | **Đúng 36 tệp ảnh** thực tế lưu trong thư mục `data/photos/` |
| **Dữ liệu bản đồ vector** | Toàn thành phố | Tệp vector đường bộ cục bộ `frontend/public/map/region.geojson` (tập trung tại Liên Chiểu) |
| **Lớp gạch raster nền** | Tự chủ hoàn toàn (Local-First) | Tạm thời tải trực tiếp từ dịch vụ gạch ngoài Esri (`server.arcgisonline.com`) |

> [!WARNING]
> Không mặc định rằng hệ thống đã có dữ liệu toàn diện về các quận Hải Châu, Sơn Trà, Ngũ Hành Sơn. Tên các quận xuất hiện trong bộ lọc giao diện là các **Legacy District-name Tokens** được trích xuất từ chuỗi địa chỉ để phục vụ tìm kiếm nhanh, chưa phải là cơ sở dữ liệu địa giới hoàn chỉnh.

---

## 5. Ranh Giới Chức Năng (Boundaries & Scope)

### 5.1. Chức năng ĐÃ TRIỂN KHAI & XÁC THỰC (Verified & Implemented)
- Hệ thống xác thực người dùng bằng Session/CSRF (`apps.accounts`).
- Danh mục địa điểm (`apps.places.models.Place`) và loại địa điểm (`Category`).
- Lưới ảnh Masonry tự động thích ứng chiều cao theo `aspect-ratio` tự nhiên (`frontend/src/app/masonry.tsx`).
- Bản đồ tương tác MapLibre GL đồng bộ hai chiều với tham số URL và khung nhìn địa lý `bbox` (`frontend/src/app/map.tsx`).
- Bộ lọc kết hợp: Danh mục (`category`) + Thuộc tính thị giác (`attributes`) + Tìm kiếm văn bản tiếng Việt có dấu.
- Dịch vụ Geocoding đa nguồn (Photon, Nominatim, Esri) phục vụ gợi ý tọa độ khi nhập địa chỉ mới (`apps.places.geocoding.py`).
- Đóng góp ảnh cộng đồng (1–5 ảnh/lần) với pipeline chuẩn hóa ảnh, bóc tách EXIF, nén WebP/JPEG (`apps.photos.services.submit`).
- Tương tác xã hội: Thích ảnh (`PhotoLike`), Bình luận (`PhotoComment`), Lưu quán yêu thích (`Favorite` / `/saved`).
- Hồ sơ tác giả ảnh công khai (`/creators/:id`).
- Báo cáo vi phạm nội dung (`ContentReport`) và giao diện kiểm duyệt Django Admin cho Staff (`/admin/`).

### 5.2. Chức năng ĐÃ LẬP KẾ HOẠCH (Planned)
- Mở rộng độ phủ dữ liệu thực địa ra toàn bộ địa bàn các quận Hải Châu, Sơn Trà, Thanh Khê, Ngũ Hành Sơn.
- Hệ thống đánh giá chấm điểm chi tiết (Detailed Reviews & Ratings).
- Hệ thống bộ sưu tập ảnh theo chủ đề (Curated Collections).

### 5.3. Ranh Giới TẠM THỜI NGOÀI PHẠM VI (Explicitly Out of Scope)
- **Đặt chỗ trước (Table Reservation):** Không hỗ trợ đặt bàn hoặc giữ chỗ online.
- **Gọi món & Giao hàng (Food / Beverage Ordering):** Không tích hợp menu gọi món, giỏ hàng hoặc tích hợp giao hàng.
- **Cổng thanh toán & Ví điện tử:** Không có tính năng nạp tiền, thanh toán ví điện tử hoặc thương mại điện tử.
- **Dự đoán chất lượng dịch vụ bằng AI:** Tuyệt đối không dùng AI để suy đoán điểm đánh giá hay chất lượng dịch vụ từ ảnh chụp.
