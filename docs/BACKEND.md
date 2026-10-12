# Backend hiện tại

Một ứng dụng Django, một database, lưu ảnh bằng Django storage. Django Admin là nơi quản lý quán, đặc điểm và quản lý nội dung đã đăng. Không có microservice, dịch vụ AI, worker, hàng đợi hoặc pipeline huấn luyện.

## API phục vụ frontend

| Màn hình/thao tác | API |
| --- | --- |
| Đăng ký, đăng nhập, đăng xuất, hồ sơ | `auth/csrf/`, `auth/register/`, `auth/login/`, `auth/logout/`, `auth/me/` |
| Loại quán và bộ lọc đặc điểm | `categories/`, `attributes/` |
| Khám phá ảnh và tìm kiếm | `feed/` với `q`, `category`, `attributes`, `sort`, `page` |
| Bản đồ | `places/map/` với bbox và bộ lọc |
| Chọn quán khi gửi ảnh | `places/` |
| Chi tiết quán và thư viện ảnh | `places/<id>/`, `places/<id>/photos/` |
| Xem ảnh | `photos/<id>/` |
| Lưu và bỏ lưu quán | `favorites/`, `favorites/<id>/` |
| Gửi ảnh, lịch sử và trạng thái | `photo-submissions/`, `photo-submissions/<id>/` |
| Báo cáo nội dung | `photos/<id>/report/`, `places/<id>/report/` |

Các đường dẫn API dùng tiền tố `/api/v1/`. Toàn bộ API nội dung, schema và docs yêu cầu đăng nhập; chỉ API xác nhận CSRF, đăng ký và đăng nhập mở cho khách. URL ảnh cũng kiểm tra phiên đăng nhập. Ảnh hợp lệ và quán mới được công khai ngay sau khi đăng, không cần người duyệt. Preview riêng tư chỉ dành cho người gửi hoặc người duyệt; ảnh gốc chỉ dành cho người duyệt. Các đặc điểm được gắn thủ công theo từng ảnh; nhiều đặc điểm trong bộ lọc phải khớp cùng một ảnh.

## Vai trò dữ liệu

Tất cả model có `id` để xác định đối tượng và liên kết. UUID được dùng cho đối tượng xuất hiện trong URL. Không lưu rating, giá, menu, hóa đơn, embedding hoặc dữ liệu dự đoán AI.

| Model | Các trường và vai trò ngay hiện tại |
| --- | --- |
| User | `email`, `password`: đăng nhập; `display_name`: giao diện và người gửi; `is_active`: chặn tài khoản; `is_staff`, `is_superuser`, `groups`, `user_permissions`: quyền Admin/kiểm duyệt; `last_login`, `date_joined`: theo dõi tài khoản trong Admin. `first_name`, `last_name` được giữ theo model Django để tương thích database hiện có; giao diện dùng `display_name`. |
| Category | `slug`: giá trị bộ lọc và API; `name`: tên loại quán; `is_active`: bật/tắt loại; `sort_order`: thứ tự tab. |
| Place | `name`, `description`, `address`, `category`: thẻ và chi tiết quán; `latitude`, `longitude`: bản đồ; `opening_hours_text`, `opening_hours_source`, `opening_hours_verified_at`: thông tin giờ mở cửa cùng nguồn và ngày kiểm tra; `status`, `deleted_at`: kiểm soát khả dụng; `published_at`: sắp xếp quán mới; `created_by`, `updated_by`, `created_at`, `updated_at`: người và thời điểm quản lý trong Admin; `is_demo`: loại dữ liệu thử khỏi API production. Slug được giữ để tương thích cột hiện có; frontend dùng UUID. |
| Favorite | `user`, `place`: quán mỗi người lưu; `created_at`: thứ tự danh sách đã lưu. |
| VisualAttribute | `code`: bộ lọc URL; `display_name_vi`, `description`: tên và giải thích; `active`: cho phép dùng nhãn; `is_searchable`: cho phép dùng trong bộ lọc. |
| VenueProposal | `submitted_by`, `created_at`: nguồn đề xuất; `name`, `address`, `category`, `latitude`, `longitude`: nội dung form đề xuất; `status`, `approved_place`, `reviewed_by`, `reviewed_at`: đọc các đề xuất lịch sử. Lượt đăng mới tạo Place trực tiếp, không tạo VenueProposal. |
| PhotoSubmission | `submitted_by`, `place`, `proposal`: người gửi và đích gửi; `caption`: mô tả gốc; `consent_version`, `consent_at`: xác nhận quyền đăng hiện tại; `idempotency_key`, `payload_hash`: tránh tạo trùng khi frontend gửi lại sau lỗi; `status`, `submitted_at`, `published_by`, `published_at`, `reason`: trạng thái đăng, người đăng, thời điểm đăng và phản hồi lịch sử. |
| PhotoAsset | `submission`: thuộc lần gửi nào; `original`: kiểm duyệt ảnh gốc riêng tư; `derivative`: preview/ảnh công khai đã bỏ EXIF; `file_size`: thông tin ảnh khi duyệt; `width`, `height`: bố cục masonry và kiểm tra ảnh; `sort_order`: thứ tự 1–5 ảnh. `sha256`: checksum tệp và tương thích cột bắt buộc hiện có; hash payload dùng để tránh gửi trùng. |
| PlacePhoto | `place`, `asset`: ảnh đã duyệt của quán; `status`, `published_at`, `withdrawn_at`: công khai/rút ảnh; `is_cover`: ảnh bìa; `caption`, `alt_text`: mô tả đã duyệt và khả năng tiếp cận; `attributes`: nhãn ảnh dùng trong feed, map và chi tiết. |
| PhotoAttribute | `photo`, `attribute`: nhãn của ảnh; `reviewed_by`, `reviewed_at`: ai xác nhận và khi nào. `source` giữ giá trị thủ công để tương thích cột hiện có; không có xử lý AI. |
| PhotoAudit | `actor`, `photo`, `submission`, `action`, `details`, `created_at`: lịch sử thao tác duyệt, đổi nhãn và công khai/rút ảnh, xem trong Admin. |
| ContentReport | `reporter`, `photo`, `place`: người và đối tượng báo cáo; `reason`, `note`: form báo cáo; `status`, `created_at`, `resolved_at`: xử lý báo cáo trong Admin. |

Các bảng auth/session/Admin của Django phục vụ phiên truy cập, quyền và lịch sử quản trị hiện tại. Không viết lớp auth riêng để thay thế chức năng sẵn có.

## Đã loại bỏ

- `research/`, `ml_service/`, cấu hình `ML_ATTRIBUTE_*` và giao tiếp inference HTTP.
- Model dự đoán, lần chạy inference, metadata mô hình/taxonomy và import mapping cho mô hình.
- Model menu, hóa đơn, đóng góp v2 và ảnh quán v2.

Các app `pricing` và `contributions` còn thư mục migration và module trống để Django chạy chuỗi migration lịch sử. Không có runtime model, API hoặc chức năng quản trị trong hai app này. Không xóa migration đã tồn tại hoặc đổi nhãn app khiến database hiện có mất dấu lịch sử.

## Schema và kiểm thử

Migration tinh giản đã được viết nhưng **chưa chạy trên PostgreSQL**. Các migration này xóa bảng và cột nêu trên; cần kiểm tra dữ liệu muốn giữ và sao lưu trước khi áp dụng. Code mới cần schema cập nhật để hoạt động đầy đủ trên database hiện có.

Kiểm thử dùng SQLite tạm trong `/tmp`, không thay đổi PostgreSQL hay media thật. Chúng kiểm tra chuỗi migration và API thực; SQLite không thay thế việc kiểm tra khóa/giao dịch đồng thời trên PostgreSQL. OpenAPI và kiểu frontend được sinh lại từ backend.

Kết quả kiểm tra cuối: 54 tests backend đạt trên SQLite thử, 20 tests frontend đạt, 14 luồng Playwright đạt với Django thật/SQLite thử (luồng pagination dùng API giả lập). Lint, format, typecheck, build và OpenAPI validation đạt. Đã xem ảnh chụp trang kiểm duyệt thủ công. Chưa kiểm tra trên PostgreSQL hoặc triển khai production.

## Đăng công khai ngay

`submit()` tạo ảnh công khai trực tiếp, không gọi bước duyệt. Khi người dùng thêm quán mới, quán được tạo ở trạng thái công khai trong cùng giao dịch. Gửi lại cùng idempotency key không tạo trùng quán/ảnh. Phiên bản xác nhận quyền đăng hiện tại là `photo-rights-v2`, ghi rõ ảnh được công khai ngay.

`PhotoSubmission.published_by` và `published_at` ghi người đăng và thời điểm đăng; dùng tên cột vật lý cũ để tương thích PostgreSQL chưa chạy migration. Mã trạng thái nội bộ `approved` cũng được giữ để tương thích ràng buộc cũ, nhưng giờ biểu thị **đã đăng**, không có thao tác phê duyệt. Migration metadata chỉ cập nhật state của Django, không thay tên cột vật lý.

Slug quán và checksum tệp được giữ lại để INSERT tương thích các cột bắt buộc của database hiện có. Không chạy migration hoặc tự công khai dữ liệu đang chờ từ trước. Không tạo thêm bản ghi VenueProposal cho quán mới; các bản ghi lịch sử được giữ nguyên. Không thêm AI, nội dung hứa hẹn AI hoặc UI placeholder cho AI.
