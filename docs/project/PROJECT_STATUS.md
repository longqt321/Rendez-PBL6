# Rendez — Hiện Trạng Dự Án & Lộ Trình Kỹ Thuật (Project Status)

Tài liệu này cung cấp bức tranh trung thực về hiện trạng triển khai của toàn bộ các tính năng trong hệ thống Rendez, phân định rõ ràng giữa những gì đã được kiểm chứng bằng mã nguồn, những gì đang dở dang, những vấn đề đang chờ quyết định và nợ kỹ thuật tồn đọng.

---

## 1. Ma Trận Trạng Thái Tính Năng Cốt Lõi (Feature Status Matrix)

| Nhóm Tính Năng | Mô Tả Chức Năng | Trạng Thái Phân Loại | Bằng Chứng / Vị Trí Mã Nguồn |
|---|---|---|---|
| **Xác thực & Phiên** | Đăng ký, đăng nhập session, bảo vệ CSRF, đổi mật khẩu | **Đã Triển Khai (Implemented)** | `apps.accounts`, `test_auth_flow.py` |
| **Xác minh Email** | Xác nhận quyền sở hữu hộp thư khi đăng ký | **Chưa Triển Khai (Unimplemented)** | Tài khoản kích hoạt ngay không qua email token |
| **Quản lý Địa điểm** | Mô hình Place, Category, slug, giờ mở cửa có cấu trúc | **Đã Triển Khai (Implemented)** | `apps.places.models.Place`, `Category` |
| **Trạng thái Đóng cửa** | Trạng thái cơ sở đóng cửa kinh doanh (`closed`) | **Chưa Triển Khai (Unimplemented)** | Hệ thống chỉ có soft-delete `deleted_at` |
| **Lưới ảnh Masonry** | Bố cục đa cột thích ứng, giữ 100% tỷ lệ khung hình thật | **Đã Triển Khai (Implemented)** | `frontend/src/app/masonry.tsx` |
| **Bản đồ Tương tác** | MapLibre GL đồng bộ URL `bbox`, marker tương tác | **Đã Triển Khai (Implemented)** | `frontend/src/app/map.tsx`, `PlaceMapView` |
| **Gạch Bản đồ Nền** | Tự chủ hoàn toàn gạch raster bản đồ nền (Local-first) | **Bán Phần (Partially Implemented)** | Đang tải từ Esri (`server.arcgisonline.com`) |
| **Vector Bản đồ Nội bộ**| Dữ liệu đường phố vector nội bộ Đà Nẵng | **Đã Triển Khai (Implemented)** | `frontend/public/map/region.geojson` |
| **Bộ lọc Đặc tính** | Lọc theo đặc tính thị giác (ổ cắm, máy lạnh, yên tĩnh) | **Đã Triển Khai (Implemented)** | `apps.photos.models.VisualAttribute`, `FeedView` |
| **Geocoding Gợi ý** | Tự động gợi ý tọa độ từ địa chỉ (Photon/Nominatim/Esri)| **Đã Triển Khai (Implemented)** | `apps.places.geocoding.py` |
| **Nộp Ảnh Tư Liệu** | Nộp 1–5 ảnh, bóc tách EXIF, cam kết `photo-rights-v2` | **Đã Triển Khai (Implemented)** | `apps.photos.services.submit()`, `test_upload_safety.py` |
| **Duyệt Đề Xuất Quán** | Kiểm duyệt hàng chờ `VenueProposal` trước khi đăng | **Chờ Quyết Định (Decision Pending)** | Model có trong DB nhưng code bỏ qua, đăng thẳng |
| **Tự Động Xuất Bản** | Tự động tạo Place và xuất bản ảnh ngay khi nộp | **Đã Triển Khai (Implemented)** | `test_auto_publication.py` |
| **Ảnh Bị Rút (Withdrawn)**| Rút ảnh vi phạm, ghi log `PhotoAudit`, hủy cờ ảnh bìa | **Đã Triển Khai (Implemented)** | `services.change_publication()` |
| **Ảnh Lịch Sử (Archived)**| Giữ ảnh cũ sau khi quán cải tạo làm tư liệu lịch sử | **Chờ Quyết Định (Decision Pending)** | Khái niệm đã thống nhất; chưa có DB schema & UI |
| **Tương tác Xã hội** | Thích ảnh, bình luận, lưu quán yêu thích (`/saved`) | **Đã Triển Khai (Implemented)** | `PhotoLike`, `PhotoComment`, `Favorite` |
| **Hồ sơ Tác giả Ảnh** | Trang cá nhân `/creators/:id` hiển thị ảnh đóng góp | **Đã Triển Khai (Implemented)** | `apps.accounts.views.CreatorDetail` |
| **Kiểm duyệt Admin** | Giao diện Django Admin gán nhãn đặc tính và rút ảnh | **Đã Triển Khai (Implemented)** | `admin:photos_review`, `check_reviewer()` |
| **Sao lưu & Phục hồi** | Kịch bản sao lưu nén dump PostgreSQL và thư mục media | **Đã Triển Khai (Implemented)** | `scripts/backup-local.sh`, `restore-local.sh` |
| **Độ Phủ Dữ Liệu** | Phủ sóng dữ liệu quán trên toàn bộ địa bàn Đà Nẵng | **Bán Phần (Partially Implemented)** | Mới có 12 quán hạt giống tại khu vực Liên Chiểu |
| **Đánh giá Chi tiết** | Hệ thống chấm điểm sao và viết bài đánh giá dài | **Kế Hoạch (Planned)** | Chưa triển khai |
| **Đặt Bàn / Gọi Món** | Đặt chỗ trước, gọi món trực tuyến, tích hợp ví | **Ngoài Phạm Vi (Out of Scope)** | Tuyệt đối không phát triển |

---

## 2. Các Thành Phần Đã Bị Loại Bỏ (Cleaned / Deprecated Components)

Trong quá trình tiến hóa của dự án, các thành phần sau đã được loại bỏ hoàn toàn:

1. **Ứng dụng Quản lý Giá & Hóa đơn (`apps.pricing`):**
   - Đã xóa bỏ toàn bộ models, migrations và mã nguồn liên quan đến bảng giá menu, hóa đơn chi tiêu. Dự án tập trung 100% vào tư liệu không gian thị giác.
2. **Ứng dụng Đóng góp Cũ (`apps.contributions`):**
   - Đã xóa bỏ và hợp nhất luồng nộp ảnh vào `apps.photos.services.submit()`.
3. **Cơ sở dữ liệu SQLite cục bộ:**
   - Đã loại bỏ hoàn toàn; chuyển toàn bộ sang PostgreSQL 17 + PostGIS.
4. **Container Database Cổng 55432 Cũ:**
   - Đã ngưng sử dụng; chuyển sang container `rendez-local-db-1` trên cổng `55433` với volume `.local/postgres`.

---

## 3. Nợ Kỹ Thuật & Các Khoảng Trống Triển Khai (Technical Debt & Gaps)

### 3.1. Mô Hình `VenueProposal` Bị Bỏ Qua (Orphan Model)
- **Vấn đề:** Model `apps.photos.models.VenueProposal` vẫn tồn tại trong database schema và các migration, nhưng hàm `submit()` trong `services.py` hoàn toàn không ghi bản ghi vào bảng này mà tạo thẳng `Place(status="published")`.
- **Hệ quả:** Dư thừa cấu trúc bảng; cần quyết định dứt điểm trong Decision Pending #2 để xóa bảng hoặc khôi phục quy trình duyệt.

### 3.2. Không Có Trạng Thái Đóng Cửa Kinh Doanh
- **Vấn đề:** Model `Place` hiện chỉ có trường `deleted_at` (soft-delete kỹ thuật) và các trạng thái hiển thị `status` (`draft`, `published`, `hidden`). Khi một quán đóng cửa vĩnh viễn ngoài đời thực, hệ thống chưa có trạng thái `closed` hoặc `permanently_closed` để phản ánh đúng thực tế mà không cần xóa mềm bản ghi.

### 3.3. Ràng Buộc Số Lượng Ảnh Tối Thiểu
- **Vấn đề:** Ràng buộc mỗi lần gửi nộp tối thiểu 1 ảnh chỉ được kiểm tra ở tầng API Serializer (`PhotoUploadSerializer`). Tầng cơ sở dữ liệu chỉ chặn cận trên qua ràng buộc kiểm tra `sort_order <= 4`, không tự bảo đảm cận dưới tối thiểu 1 ảnh ở tầng SQL.

### 3.4. Hồ Sơ Tác Giả Mở Rộng Cho Mọi Tài Khoản
- **Vấn đề:** Tuyến đường `/creators/:id` mở công khai cho bất kỳ tài khoản User nào đang hoạt động, kể cả tài khoản có `photo_count = 0` chưa từng đóng góp bức ảnh nào. Khái niệm Persona "Creator" (người sáng tạo nội dung thực thụ) chưa được áp đặt ràng buộc kỹ thuật trong mã nguồn.

---

## 4. Lộ Trình Phát Triển Tiếp Theo (Next Technical Steps)

1. **Giải quyết 3 điểm chờ quyết định nghiệp vụ (Decision Pending #1, #2, #3):**
   - Thống nhất quy tắc tách Place khi chuyển địa điểm / đại tu không gian.
   - Chốt phương án xử lý `VenueProposal` (xóa bỏ hẳn hay kích hoạt hàng duyệt).
   - Thiết kế Product Spec và schema cho tính năng hiển thị ảnh dòng thời gian (`Archived Photo`).
2. **Mở rộng độ phủ dữ liệu hạt giống:**
   - Thu thập và kiểm chứng thực địa thêm các quán cà phê đặc trưng tại quận Hải Châu (view sông Hàn, Bạch Đằng), Sơn Trà (bán đảo, cà phê ngắm biển), Ngũ Hành Sơn.
3. **Tiến tới tự chủ hoàn toàn tài nguyên gạch bản đồ (Data Sovereignty):**
   - Nghiên cứu giải pháp tự host tile server nội bộ (sử dụng OpenMapTiles / Martin / PMTiles) để thay thế hoàn toàn lớp gạch nền phụ thuộc ngoài của Esri.
