# Backend local

Một ứng dụng Django, PostgreSQL local và Django storage trong workspace. Gunicorn phục vụ cả frontend build, API, ảnh và static của Admin. Không microservices, AI, worker hoặc hàng đợi.

## API

Tiền tố `/api/v1/`:

| Thao tác | Endpoint |
| --- | --- |
| CSRF/đăng ký/đăng nhập/đăng xuất | `auth/csrf/`, `auth/register/`, `auth/login/`, `auth/logout/` |
| Xem/đổi tên | GET/PATCH `auth/me/` |
| Đổi mật khẩu | POST `auth/password/` |
| Loại địa điểm và đặc điểm ảnh | `categories/`, `attributes/` |
| Khám phá, chọn địa điểm, chi tiết/gallery | `feed/`, `places/`, `places/<id>/`, `places/<id>/photos/` |
| Bản đồ trong vùng | `places/map/?bbox=west,south,east,north` |
| Chi tiết ảnh | `photos/<id>/` |
| Sửa mô tả/gỡ ảnh của mình | PATCH/DELETE `photos/<id>/manage/` |
| Bình luận | GET/POST `photos/<id>/comments/`, DELETE `comments/<id>/` |
| Lưu/bỏ lưu | `favorites/`, PUT/DELETE `favorites/<id>/` |
| Đăng/lịch sử ảnh | `photo-submissions/`, `photo-submissions/<id>/` |
| Báo cáo | `photos/<id>/report/`, `places/<id>/report/` |
| Kiểm tra app/DB | `health/` |

Chỉ CSRF, đăng ký, đăng nhập và health cho khách. Toàn bộ nội dung, ảnh, schema và docs yêu cầu session. Các request ghi kiểm tra CSRF. Original chỉ dành cho staff có quyền quản lý ảnh; preview riêng tư chỉ cho chủ ảnh/staff. Owner sửa/gỡ ảnh của mình; comment chỉ người tạo được xóa. Nội dung đã gỡ không hiện trong feed/map/gallery hoặc URL ảnh công khai.

Tìm kiếm chuẩn hóa Unicode/dấu tiếng Việt, không dùng AI. Quy mô dữ liệu nhỏ nên so khớp trực tiếp tên/địa chỉ/mô tả, không thêm search engine/index ngoài PostgreSQL. Bộ lọc đặc điểm dùng AND trên cùng một ảnh. Không suy ra chất lượng dịch vụ từ ảnh.

## Dữ liệu

- `User`: đăng nhập, tên hiển thị và quyền Django Admin. Giữ trường auth chuẩn để migration/database cũ tương thích.
- `Category`, `Place`: danh mục, tên, địa chỉ, vị trí, mô tả, trạng thái công khai, tác giả và thời điểm. `source_url`/`verified_at` hiển thị nguồn/ngày đối chiếu dữ liệu nhập. Thông tin giờ mở cửa chỉ hiển thị khi có nguồn và ngày kiểm tra.
- `PhotoSubmission`: một lần gửi 1–5 ảnh, nội dung, xác nhận quyền đăng, idempotency key/hash và thời điểm. User lock + transaction tránh gửi lại tạo trùng.
- `PhotoAsset`: original riêng tư, derivative bỏ EXIF/thu nhỏ, checksum và kích thước thật.
- `PlacePhoto`: ảnh công khai, mô tả, ảnh bìa và attribution của ảnh tư liệu; gỡ ảnh giữ lịch sử.
- `VisualAttribute`, `PhotoAttribute`: nhãn nhìn thấy trong ảnh do người quản lý gắn; không có dự đoán AI.
- `PhotoComment`: ảnh, người viết, nội dung và ngày đăng. Không bình luận được vào ảnh đã gỡ.
- `Favorite`: user/địa điểm lưu; một cặp duy nhất.
- `ContentReport`, `PhotoAudit`: báo cáo nội dung và lịch sử chỉnh sửa/gỡ.

`VenueProposal` và migration lịch sử được giữ để đọc dữ liệu cũ; không tạo proposal mới. Apps giá/menu/hóa đơn và dịch vụ ML đã ngừng. Không tạo trường cho tính năng tương lai.

## Đăng và gỡ ảnh

`submit()` kiểm tra 1–5 JPEG/PNG hợp lệ, xử lý EXIF và kích thước, rồi tạo submission/asset/ảnh công khai trong giao dịch. Thêm địa điểm mới cũng công khai ngay. Lỗi ghi database dọn file vừa tạo. Gửi cùng idempotency key và nội dung trả lần gửi trước; khác nội dung trả 409. Xác nhận quyền đăng hiện tại là `photo-rights-v2`.

Mã nội bộ `approved` và tên cột `reviewed_by_id`/`reviewed_at` giữ để tương thích dữ liệu cũ; trên sản phẩm chúng có nghĩa **đã đăng/người đăng/ngày đăng**. Không có duyệt trước. Admin quản lý sau đăng, gắn nhãn, chọn bìa và xử lý báo cáo.

## Database và media

Bản local dùng `rendez_local` ở 127.0.0.1:55433, bind mount `.local/postgres`. Toàn bộ migration đã được áp dụng trên database mới này; database cũ ở 55432 không bị sửa. `.local/runtime.env` chứa credentials ngẫu nhiên và `PRIVATE_MEDIA_ROOT=.local/media`.

`import_danang` dùng UUID/idempotency key cố định. Import lại không tạo ảnh trùng, không xuất bản lại ảnh đã gỡ hoặc ghi đè chỉnh sửa hiện có. Ảnh/manifest nguồn được đóng gói trong repo; không cần API bên ngoài khi import.

Backend tests dùng PostgreSQL test database riêng; browser kiểm tra app thật với tài khoản kiểm tra được dọn sau đó. Kết quả cụ thể ở [checklist bản local](LOCAL-RELEASE.md).
