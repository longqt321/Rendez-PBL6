# Rendez — Đăng Bạ Quyết Định Kỹ Thuật & Nghiệp Vụ (Decisions Register)

Tài liệu này ghi nhận toàn bộ các quyết định kiến trúc đã được chấp thuận (Architectural Decision Records - ADRs), các quyết định lịch sử đã bị thay thế, và đăng bạ chính thức các vấn đề nghiệp vụ đang chờ quyết định (Decision Pending Register).

---

## 1. Các Quyết Định Kiến Trúc Đã Chấp Thuận (Accepted ADRs)

### ADR-001: Lựa Chọn Mô Hình Clean Monolith Thay Vì Microservices
- **Trạng thái:** **Accepted & Verified**
- **Bối cảnh:** Nền tảng cần vận hành ổn định trong môi trường cục bộ, kiểm thử nhanh chóng và đơn giản hóa việc triển khai.
- **Quyết định:** Đóng gói toàn bộ Backend (Django 5.2), REST API (DRF 3.16), phục vụ Frontend build (WhiteNoise) và cơ sở dữ liệu quan hệ (PostgreSQL) trong một khối duy nhất. Không sử dụng kiến trúc microservices, không sử dụng hàng đợi ngoài như Celery/RabbitMQ, không sử dụng worker bất đồng bộ.
- **Hệ quả:**
  - *Tích cực:* Dễ bảo trì, môi trường phát triển nhất quán, tốc độ chạy toàn bộ 178 bài kiểm thử backend và 56 bài kiểm thử frontend chỉ mất chưa đầy 90 giây.
  - *Đánh đổi:* Mọi xử lý ảnh nặng (Pillow) được thực hiện đồng bộ trong tiến trình worker của Gunicorn (được bảo vệ bằng giới hạn kích thước tệp upload và tối đa 5 ảnh).

### ADR-002: Nâng Cấp PostgreSQL 17 + PostGIS Cổng 55433 Với Thư Mục Bind Mount
- **Trạng thái:** **Accepted & Verified**
- **Bối cảnh:** Hệ thống cần xử lý các truy vấn không gian phức tạp (`ST_MakeEnvelope`, `bbox`) và bảo toàn dữ liệu bền vững khi khởi động lại máy chủ.
- **Quyết định:** Sử dụng Docker container `rendez-local-db-1` chạy PostgreSQL 17 và PostGIS trên cổng `55433`. Thư mục dữ liệu được bind mount trực tiếp vào `.local/postgres` trên máy chủ host.
- **Hệ quả:** Triệt tiêu hoàn toàn rủi ro mất dữ liệu khi xóa container; cô lập cổng `55433` tránh xung đột với các phiên bản PostgreSQL hệ thống hoặc container cũ ở cổng `55432`.

### ADR-003: Xóa Bỏ Hoàn Toàn Các Mô-Đun Cũ `pricing` Và `contributions`
- **Trạng thái:** **Accepted & Verified**
- **Bối cảnh:** Các tính năng ban đầu về quản lý menu giá món nước và hóa đơn làm phân tán trọng tâm sản phẩm và gây phức tạp mã nguồn không cần thiết.
- **Quyết định:** Xóa bỏ hoàn toàn mã nguồn của hai ứng dụng `backend/apps/pricing/` và `backend/apps/contributions/`. Hợp nhất luồng đóng góp ảnh vào `backend/apps/photos/services.py:submit()`.
- **Hệ quả:** Hệ thống gọn gàng, tập trung 100% vào giá trị cốt lõi là tư liệu không gian thị giác.

### ADR-004: Lưới Ảnh Thích Ứng Giữ 100% Tỷ Lệ Thật Thay Vì Cắt Cúp Cố Định
- **Trạng thái:** **Accepted & Verified**
- **Bối cảnh:** Người dùng cần thấy trọn vẹn góc ngồi, độ cao bàn và trần nhà để đánh giá không gian làm việc.
- **Quyết định:** Triển khai lưới ảnh Masonry bằng CSS Grid với `grid-auto-rows: 8px` kết hợp `ResizeObserver` đo chiều cao thực tế. Tuyệt đối không sử dụng thuộc tính ép ảnh vào khung vuông `1:1` hay `16:9`.
- **Hệ quả:** Tôn trọng triệt để nguyên lý **Visual Truth**; hình ảnh đứng, ngang hoặc vuông đều được hiển thị tự nhiên.

### ADR-005: Cơ Chế Geocoding Đa Nguồn Dự Phòng (Multi-Provider Fallback)
- **Trạng thái:** **Accepted & Verified**
- **Bối cảnh:** Tính năng gợi ý tọa độ khi nộp địa chỉ mới cần hoạt động tin cậy mà không phải trả phí API thương mại đắt đỏ.
- **Quyết định:** Xây dựng module `apps.places.geocoding.py` với chuỗi fallback tự động: Nominatim (OpenStreetMap) $\rightarrow$ Photon $\rightarrow$ cơ sở dữ liệu OSM cục bộ, có bộ nhớ đệm 24 giờ và giới hạn 30 yêu cầu/phút. Khi mọi nguồn thất bại, hàm trả `success: false` thay vì gán tọa độ trung tâm thành phố.
- **Hệ quả:** Hoạt động ổn định, tự phục hồi khi một nhà cung cấp gặp sự cố, và không tạo ra địa điểm có tọa độ sai mà không ai phát hiện.

### ADR-006: Phục Vụ Tệp Phương Tiện Có Bảo Vệ Phân Quyền Qua DRF Views
- **Trạng thái:** **Accepted & Verified**
- **Bối cảnh:** Bảo vệ quyền riêng tư của ảnh cá nhân và ngăn chặn việc truy cập trái phép vào ảnh bị rút (`withdrawn`) hoặc tệp gốc chưa kiểm duyệt.
- **Quyết định:** Không phục vụ thư mục media qua web server tĩnh công khai. Mọi yêu cầu tải ảnh đều đi qua 3 view chuyên biệt: `PublicPhotoMediaView`, `PrivatePhotoMediaView` và `PrivatePhotoOriginalView`.
- **Hệ quả:** Kiểm soát phân quyền chính xác đến từng byte dữ liệu; ảnh bị rút sẽ lập tức trả về 404 trên toàn bộ hệ thống.

---

## 2. Đăng Bạ Các Điểm Chờ Quyết Định Nghiệp Vụ (Decision Pending Register)

> [!IMPORTANT]
> Đây là các vấn đề chưa có quyết định cuối cùng từ người chịu trách nhiệm sản phẩm. Kỹ sư và AI Agent **tuyệt đối không được tự ý đưa ra giả định** hoặc tự chuyển các mục này thành trạng thái "Accepted".

### Decision Pending #1: Quy Tắc Nhận Diện Danh Tính Cơ Sở Khi Đại Tu Toàn Diện Hoặc Chuyển Địa Điểm
- **Bối cảnh:** Khi một quán cà phê sửa sang toàn bộ nội thất (đứt gãy Visual Space) hoặc chuyển sang địa chỉ mới (thay đổi Physical Location).
- **Vấn đề cốt lõi:**
  - Có đóng Place cũ và tạo một Place mới hoàn toàn trong hệ thống không?
  - Tư liệu ảnh cũ của không gian trước cải tạo sẽ được xử lý như thế nào: gỡ bỏ hoàn toàn, chuyển sang kho lưu trữ lịch sử hay vẫn hiển thị lẫn lộn với ảnh mới?
- **Đề xuất hiện tại (Proposed):** Áp dụng nguyên tắc danh tính 3 thành phần (Physical Location + Business Identity + Visual Space). Nếu quán chuyển địa chỉ hoặc cơ sở mới tiếp quản mặt bằng cũ, bắt buộc đóng Place cũ và tạo Place mới.
- **Hệ quả nếu chưa quyết định:** Rủi ro dữ liệu hiển thị ảnh cũ của quán trước khi sửa, gây hiểu lầm cho khách hàng tìm chỗ ngồi làm việc.

### Decision Pending #2: Định Đoạt Luồng Xử Lý `VenueProposal` vs. Auto-Publication
- **Bối cảnh:** Model `VenueProposal` tồn tại trong schema cơ sở dữ liệu (`backend/apps/photos/models.py:21`), nhưng luồng nộp ảnh hiện tại (`services.py:submit`) bỏ qua model này và tự động tạo thẳng `Place(status="published")`.
- **Vấn đề cốt lõi:**
  - Duy trì luồng **Auto-Publication** (xuất bản ngay để khuyến khích cộng đồng đóng góp nhanh) và xóa bỏ model `VenueProposal` khỏi schema?
  - Hay khôi phục lại quy trình duyệt trước (Pre-moderation queue), đưa đề xuất quán mới vào `VenueProposal(status="pending_review")` chờ Staff phê duyệt rồi mới hiển thị công khai?
- **Hệ quả nếu chưa quyết định:** Mã nguồn tồn tại model dư thừa (orphan model); các tài liệu kỹ thuật có thể mô tả sai lệch quy trình nộp ảnh thực tế nếu không kiểm tra mã nguồn.

### Decision Pending #3: Ranh Giới Hiển Thị & Vòng Đời Của `Archived Photo`
- **Bối cảnh:** Khái niệm ảnh tư liệu lịch sử (ảnh chụp không gian cũ trung thực, không vi phạm nhưng không còn phản ánh hiện trạng của quán) đã được chấp thuận về mặt nghiệp vụ (Accepted Domain Concept).
- **Vấn đề cốt lõi:**
  - Chưa có Product Specification về giao diện hiển thị tư liệu lịch sử (dạng Timeline/Lịch sử không gian).
  - Chưa có trạng thái `archived` trong enum `PlacePhoto.status` và chưa có migration cơ sở dữ liệu tương ứng.
- **Hệ quả nếu chưa quyết định:** Trong implementation hiện tại, chưa có cơ chế biểu diễn riêng cho ảnh cũ hợp lệ nhưng đã lỗi thời. Nếu ảnh vẫn ở trạng thái `published`, nó có thể tiếp tục xuất hiện trong feed khám phá tức thời và gây sai lệch bối cảnh thực địa.

---

## 3. Các Quyết Định Lịch Sử Đã Bị Thay Thế (Superseded Decisions)

1. **Cơ sở dữ liệu SQLite trong giai đoạn thử nghiệm (Prototype):**
   - *Thay thế bởi:* PostgreSQL 17 + PostGIS (ADR-002) nhằm hỗ trợ đầy đủ các hàm không gian địa lý và locking dòng `select_for_update`.
2. **Container cơ sở dữ liệu cổng 55432 cũ:**
   - *Thay thế bởi:* Container `rendez-local-db-1` trên cổng 55433 để tránh xung đột cổng hệ thống trên máy trạm phát triển.
3. **Quy trình nộp đóng góp qua ứng dụng `contributions` cũ:**
   - *Thay thế bởi:* Tầng dịch vụ `apps.photos.services.submit()` nguyên tử, hỗ trợ cơ chế chống gửi trùng Idempotency và khóa dòng chống race condition ảnh bìa.
