# Rendez — Tài Liệu Backend Chuyên Sâu (Backend Guide)

Tài liệu này cung cấp hướng dẫn toàn diện về kiến trúc backend, tổ chức mã nguồn, danh mục API, tầng dịch vụ nghiệp vụ, pipeline xử lý tệp ảnh và chiến lược kiểm thử của Rendez.

---

## 1. Cấu Trúc Dự Án Backend

Backend được xây dựng trên nền tảng **Python 3.12+**, **Django 5.2** và **Django REST Framework 3.16**.

```text
backend/
├── config/                     # Cấu hình dự án Django
│   ├── settings.py             # Cấu hình gốc (base settings)
│   ├── local.py                # Cấu hình môi trường phát triển cục bộ
│   ├── middleware.py           # Middleware tùy biến (CSRF, bảo mật)
│   ├── urls.py                 # Định tuyến URL gốc (/api/v1/, /admin/)
│   └── wsgi.py                 # WSGI entry point cho Gunicorn
│
├── apps/                       # Các mô-đun nghiệp vụ (Django Apps)
│   ├── accounts/               # Tài khoản, xác thực, Creator profile
│   ├── places/                 # Địa điểm, danh mục, Geocoding, PostGIS Map API
│   ├── photos/                 # Ảnh, quy trình upload, đặc tính, bình luận, like
│   └── favorites/              # Đánh dấu lưu địa điểm (SavedPlace)
│
├── templates/                  # Giao diện mở rộng cho Django Admin
│   └── admin/change_form.html
├── pyproject.toml              # Cấu hình Ruff linter và Pytest
└── tests/                      # 178 bài kiểm thử Pytest bao phủ toàn diện
```

---

## 2. Danh Mục API Toàn Diện (`/api/v1/`)

Tất cả các API được đặt dưới tiền tố `/api/v1/`. Trừ các endpoint công khai (Đăng ký, Đăng nhập, CSRF, Health check, feed/chi tiết Post, bình luận Post, media công khai), toàn bộ các endpoint dữ liệu đều yêu cầu phiên đăng nhập hợp lệ (`IsAuthenticated`).

Các endpoint tương tác (like, save, comment, share, view-log) được giới hạn tần suất qua `ScopedRateThrottle` với các scope cấu hình trong `settings.py`: `like: 60/min`, `favorite: 60/min`, `comment: 30/min`, `share: 30/min`, `view: 120/min`.

| Tuyến Đường (Route) | Phương Thức | Lớp View (View Class) | Phân Quyền | Chức Năng Nghiệp Vụ |
|---|---|---|---|---|
| `auth/csrf/` | GET | `CsrfCookieView` | AllowAny | Thiết lập cookie CSRF và trả về mã token |
| `auth/register/` | POST | `RegisterView` | AllowAny | Đăng ký tài khoản User mới |
| `auth/login/` | POST | `LoginView` | AllowAny | Xác thực thông tin và tạo phiên làm việc |
| `auth/logout/` | POST | `LogoutView` | IsAuthenticated | Hủy phiên làm việc hiện tại |
| `auth/me/` | GET, PATCH | `CurrentUserView` | IsAuthenticated | Xem và cập nhật tên hiển thị của tài khoản |
| `auth/password/` | POST | `ChangePasswordView` | IsAuthenticated | Đổi mật khẩu tài khoản |
| `health/` | GET | `HealthCheckView` | AllowAny | Kiểm tra trạng thái ứng dụng và kết nối DB |
| `categories/` | GET | `CategoryListView` | IsAuthenticated | Lấy danh sách các loại địa điểm hoạt động |
| `attributes/` | GET | `VisualAttributeListView` | IsAuthenticated | Lấy danh mục các đặc tính thị giác chuẩn hóa |
| `places/` | GET | `PlaceListView` | IsAuthenticated | Danh sách địa điểm (hỗ trợ lọc category, search) |
| `places/<id>/` | GET | `PlaceDetailView` | IsAuthenticated | Chi tiết địa điểm và giờ mở cửa |
| `places/<id>/photos/` | GET | `PlacePhotosView` | IsAuthenticated | Thư viện toàn bộ ảnh công khai của một cơ sở |
| `places/<id>/report/` | POST | `PlaceReportView` | IsAuthenticated | Báo cáo vi phạm liên quan đến địa điểm |
| `places/map/` | GET | `PlaceMapView` | IsAuthenticated | Lấy danh sách điểm ghim trong khung nhìn `?bbox=` |
| `places/geocode/` | GET | `GeocodeView` | AllowAny | Gợi ý tọa độ từ địa chỉ (Nominatim/Photon/OSM cục bộ), 30 yêu cầu/phút |
| `feed/` | GET | `FeedView` | IsAuthenticated | Lưới ảnh Masonry trang chủ (hỗ trợ lọc tags/search) |
| `photos/<id>/` | GET | `PhotoDetailView` | IsAuthenticated | Chi tiết ảnh, thông số kỹ thuật và tác giả |
| `photos/<id>/similar/` | GET | `SimilarPhotosView` | IsAuthenticated | Danh sách ảnh cùng quán hoặc cùng đặc tính |
| `photos/<id>/likes/` | POST, DELETE | `PhotoLikeView` | IsAuthenticated | Thích hoặc bỏ thích một góc ảnh |
| `photos/<id>/comments/` | GET, POST | `PhotoCommentListCreateView` | IsAuthenticated | Xem và gửi bình luận dưới ảnh |
| `comments/<id>/` | PATCH, DELETE | `PhotoCommentDetailView` | IsOwnerOrStaff | Sửa nội dung hoặc xóa bình luận của mình |
| `photos/<id>/manage/` | PATCH, DELETE | `PhotoManageView` | IsOwnerOrStaff | Sửa mô tả hoặc rút ảnh do mình đăng tải |
| `photos/<id>/report/` | POST | `PhotoReportView` | IsAuthenticated | Gửi báo cáo vi phạm nội dung đối với ảnh |
| `posts/` | GET | `PostFeed` | AllowAny | Feed bài đăng công khai (lọc `place`, `author`, phân trang) |
| `posts/<id>/` | GET | `PostDetail` | AllowAny | Chi tiết bài đăng và media của nó |
| `posts/<id>/likes/` | POST, DELETE | `PostLike` | IsAuthenticated | Thích hoặc bỏ thích bài đăng (throttle `like`) |
| `posts/<id>/saved/` | POST, DELETE | `PostSave` | IsAuthenticated | Lưu hoặc bỏ lưu bài đăng (throttle `favorite`) |
| `posts/<id>/shares/` | POST | `PostShare` | AllowAny | Ghi nhận chia sẻ bài đăng, tăng `share_count` (throttle `share`) |
| `posts/<id>/comments/` | GET, POST | `PostCommentListCreate` | AllowAny | Xem và gửi bình luận dưới bài đăng (throttle `comment`) |
| `posts/<id>/views/` | POST | `PostViewLog` | AllowAny | Ghi nhận lượt xem, tăng `view_count` (throttle `view`) |
| `places/<id>/saved/` | POST, DELETE | `PlaceSave` | IsAuthenticated | Lưu hoặc bỏ lưu địa điểm trong ngữ cảnh Post (throttle `favorite`) |
| `photos/<id>/` | GET | `LegacyPhotoAdapter` | IsAuthenticated | Adapter: UUID legacy `PlacePhoto` ủy quyền cho `PhotoDetail` cũ, hoặc trả payload Post cho ID mồ côi còn ánh xạ |
| `photo-submissions/` | GET, POST | `PhotoSubmissionView` | IsAuthenticated | Nộp chùm 1–5 ảnh mới / Xem lịch sử gửi ảnh |
| `photo-submissions/<id>/` | GET | `PhotoSubmissionDetailView` | IsOwnerOrStaff | Xem chi tiết lần gửi ảnh cụ thể |
| `favorites/` | GET | `FavoriteListView` | IsAuthenticated | Danh sách các cơ sở thành viên đã đánh dấu lưu |
| `favorites/<id>/` | PUT, DELETE | `FavoriteDetailView` | IsAuthenticated | Đánh dấu lưu hoặc gỡ lưu một địa điểm |
| `creators/<id>/` | GET | `CreatorDetailView` | IsAuthenticated | Thông tin hồ sơ công khai của tác giả ảnh |
| `creators/<id>/photos/` | GET | `CreatorPhotosView` | IsAuthenticated | Danh sách toàn bộ ảnh do tác giả đóng góp |
| `public-photo-media/<id>/` | GET | `PublicPhotoMediaView` | AllowAny | Tải tệp ảnh phái sinh công khai (`derivative`); trả về ETag + `Cache-Control` |
| `public-post-media/<id>/` | GET | `post_media` | AllowAny | Tải ảnh phái sinh của PostMedia đã xuất bản (Post và PostMedia cùng ở trạng thái `published`); trả về ETag + `Cache-Control` |
| `private-photo-media/<id>/` | GET | `PrivatePhotoMediaView` | IsOwnerOrStaff | Tải tệp ảnh xem trước riêng tư cho tác giả |
| `private-photo-original/<id>/` | GET | `PrivatePhotoOriginalView` | ModeratorOnly | Tải tệp ảnh gốc sạch (chỉ cho kiểm duyệt viên) |

---

## 3. Tầng Dịch Vụ Nghiệp Vụ (Service Layer: `services.py`)

Tệp `backend/apps/photos/services.py` đóng gói toàn bộ logic nghiệp vụ phức tạp của ứng dụng:

### 3.1. Dịch Vụ Nộp Ảnh: `submit()`
- **Chữ ký hàm:**
  ```python
  def submit(
      user: User,
      values: dict,
      files: list[UploadedFile],
      key: str,
  ) -> PhotoSubmission:
  ```
  `values` chứa `place_id` hoặc bộ ba `proposed_name`/`proposed_address`/`proposed_category`, kèm `caption`, `latitude`, `longitude` và `consent_version`.
- **Quy trình thực thi:**
  1. *Kiểm tra đầu vào:* `idempotency_key` phải có và không quá 100 ký tự; số ảnh từ 1 đến 5.
  2. *Chống gửi trùng (Idempotency):* Nếu gửi lại cùng `idempotency_key` và cùng nội dung hash, trả về bản ghi cũ; nếu gửi cùng key nhưng khác nội dung, ném lỗi xung đột `409 Conflict`.
  3. *Khóa dòng người dùng (`select_for_update`):* Toàn bộ thao tác nằm trong `transaction.atomic()` và khóa hàng người dùng, nên hai lần gửi song song của cùng một tài khoản được xử lý tuần tự.
  4. *Tự động tạo Place mới (Auto-Publication):* Nếu `values` có `proposed_name`, tạo ngay một bản ghi `Place(status="published")`. Model `VenueProposal` không được dùng trong luồng này.
  5. *Pipeline xử lý ảnh:* Gọi `normalize_image()` để bóc tách EXIF, tạo tệp `original` sạch và tệp `derivative` WebP/JPEG, tính toán SHA-256.
  6. *Ghi nhận cơ sở dữ liệu:* Tạo `PhotoSubmission(status="approved", published_by, published_at)`, `PhotoAsset`, `PlacePhoto(status="published")` với `is_cover=True` cho ảnh đầu tiên nếu quán chưa có ảnh bìa, cùng `Post` và `PostMedia` cho ảnh đầu.
  7. *Rollback an toàn:* Nếu có bất kỳ ngoại lệ nào phát sinh trong giao dịch, khối `except` sẽ tự động dọn dẹp và xóa sạch tất cả các tệp nhị phân vừa tạo trên đĩa, tránh rác storage.

### 3.2. Dịch Vụ Quản Trị Trạng Thái Công Khai: `change_publication()`
- **Chức năng:** Cho phép kiểm duyệt viên đổi trạng thái công khai của một ảnh đã tồn tại, qua bốn hành động `publish`, `withdraw`, `cover` và `edit_tags`.
- **Quy tắc:**
  - `withdraw`: Bắt buộc thiết lập `withdrawn_at = timezone.now()`, hủy cờ ảnh bìa (`is_cover = False`) và chuyển các `ContentReport` đang chờ của ảnh sang `resolved`.
  - `publish`: Chỉ áp dụng cho ảnh `pending_publication`; ảnh đã `withdrawn` không công khai lại qua thao tác này. Quán phải đang công khai.
  - `cover`: Chỉ ảnh `published` của quán đang công khai mới được chọn làm bìa; bìa cũ bị bỏ cờ trước.
  - Sau mỗi hành động, `sync_post_media_from_photo()` đồng bộ trạng thái sang `PostMedia` và `Post` tương ứng.
  - Ghi nhận nhật ký kiểm toán vào model `PhotoAudit` với hành động tương ứng.

### 3.3. Dịch Vụ Gán Nhãn Đặc Tính: `set_tags()`
- **Chức năng:** Gán hoặc gỡ bỏ các đặc tính thị giác (`VisualAttribute`) cho một ảnh.
- **Ràng buộc:** Kiểm tra quyền `check_reviewer(user)`. Ghi nhận `reviewed_by = user`, `source = "manual"` trên bản ghi `PhotoAttribute` và ghi log vào `PhotoAudit`.

---

## 4. Pipeline Xử Lý Hình Ảnh (`images.py`)

Tệp `backend/apps/photos/images.py` chịu trách nhiệm xử lý tệp nhị phân bằng thư viện Pillow (PIL):

1. **Tháo gỡ EXIF & Metadata Độc Hại:**
   - Hàm `normalize_image(uploaded_file)` đọc dữ liệu pixel thô, chuyển đổi hệ màu sang sRGB tiêu chuẩn.
   - Toàn bộ siêu dữ liệu EXIF (bao gồm thông tin máy ảnh, vị trí GPS và thông tin cá nhân) bị loại bỏ hoàn toàn trong quá trình tái tạo tệp ảnh sạch.
2. **Tạo Tệp Phái Sinh Hiển Thị (Derivative):**
   - Tự động nén và thu nhỏ kích thước tối đa (chiều dài tối đa 1600px).
   - Tối ưu hóa dung lượng (chất lượng nén tiêu chuẩn 85) để tải nhanh trên mạng di động.
3. **Tính Checksum SHA-256:**
   - Tính toán chuỗi băm 64 ký tự hex của tệp sạch để phát hiện ảnh trùng lặp và xác thực tính toàn vẹn dữ liệu.

---

## 5. Tối Ưu Hóa Truy Vấn & Chống N+1 (`selectors.py`)

Hệ thống triển khai tầng truy vấn riêng biệt (`apps.places.selectors` và `apps.photos.selectors`) nhằm bảo đảm hiệu năng cao:
- **Eager Loading Chặt Chẽ:** Mọi truy vấn danh sách ảnh trên feed và gallery đều sử dụng `select_related("place", "place__category", "asset")` và `prefetch_related("photoattribute_set__attribute")`.
- **Triệt Tiêu N+1 Query:** Tránh hoàn toàn việc truy vấn cơ sở dữ liệu riêng lẻ cho từng dòng khi duyệt qua danh sách hàng chục bức ảnh.
- **Truy Vấn Không Gian Tối Ưu:** Endpoint `/places/map/` sử dụng toán tử PostGIS `ST_MakeEnvelope` kết hợp chỉ mục không gian GIST, cho phép lọc các quán nằm trong khung nhìn `bbox` trong thời gian dưới 10ms.

---

## 6. Chiến Lược Kiểm Thử Backend (Pytest Suite)

Hệ thống sở hữu bộ kiểm thử tự động toàn diện gồm **178 bài kiểm thử Pytest** nằm trong thư mục `backend/tests/`:

- `test_api.py`: Kiểm tra toàn bộ hợp đồng API, mã phản hồi HTTP, quyền truy cập và kiểm tra CSRF.
- `test_auto_publication.py`: Kiểm chứng luồng tự động xuất bản khi nộp ảnh và hành vi bỏ qua `VenueProposal`.
- `test_auth_flow.py`: Kiểm tra chu trình đăng ký, đăng nhập session, đổi mật khẩu và bảo vệ cookie.
- `test_upload_safety.py`: Kiểm tra giới hạn dung lượng ảnh, định dạng tệp giả mạo, kiểm tra bóc tách EXIF và rollback tệp khi lỗi.
- `test_database_schema_invariants.py`: Kiểm chứng các ràng buộc toàn vẹn cơ sở dữ liệu, `null=False`, `on_delete=PROTECT`.
- `test_file_serving_security.py`: Kiểm tra ranh giới bảo mật của 3 endpoint phục vụ media (`public`, `private`, `original`).
- `test_performance_pagination_and_eager_loading.py`: Kiểm tra số lượng câu lệnh SQL thực thi, bảo đảm không bị N+1.
- `test_backup_restore_lifecycle.py`: Kiểm tra tính toàn vẹn của kịch bản sao lưu và phục hồi dữ liệu cục bộ.

Toàn bộ 178 bài test có thể được thực thi bằng lệnh:
```bash
./scripts/check.sh backend
```
hoặc chạy trực tiếp qua Pytest:
```bash
backend/.venv/bin/python -m pytest -c backend/pyproject.toml backend/tests -q
```
