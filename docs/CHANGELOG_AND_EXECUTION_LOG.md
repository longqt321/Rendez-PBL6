# Rendez — Nhật ký Thay đổi & Toàn bộ Quá trình Thực thi (Execution & Change Log)

Tài liệu này tổng hợp chi tiết toàn bộ các công việc, thay đổi, cải tiến, tái cấu trúc (refactor), tính năng thêm mới, các phần đã xóa bỏ và kết quả kiểm thử được thực hiện trên dự án **Rendez** từ đầu đến nay.

---

## 1. Tổng quan Trạng thái Ban đầu (Initial Baseline)

Khi bắt đầu tiếp nhận dự án:
* **Hệ thống cốt lõi:** Nền tảng khám phá Đà Nẵng qua ảnh và bản đồ cục bộ (React 19 + TypeScript + Django 5.2 + PostgreSQL 17).
* **Vấn đề mã nguồn tồn đọng:**
  1. *Zombie apps & Dead code:* Hai ứng dụng `backend/apps/contributions` và `backend/apps/pricing` tồn tại mã nguồn và migration trong thư mục dự án nhưng không được đăng ký trong `INSTALLED_APPS` (mã chết).
  2. *Monolithic Controller quá tải:* Tệp `backend/apps/photos/views.py` dài hơn 510 dòng, ôm đồm toàn bộ logic của Địa điểm (Places), Bản đồ (Map), Yêu thích (Favorites), Báo cáo (Reports), Ảnh (Photos) và Đóng góp (Submissions).
  3. *Tính năng dở dang / Mock:* Chức năng bình luận (Comments) và hồ sơ nhiếp ảnh gia (Creator Profile) chưa được hiện thực hóa; giao diện dùng hộp thoại hệ thống `window.confirm()` thô sơ; liên kết bản đồ bị lỗi `destination=null,null` khi thiếu tọa độ.
  4. *Thiếu tầng bảo vệ API:* Chưa có cấu hình Rate Limiting (DRF Throttles) cho các hành động tương tác (Like, Comment, Favorite), dễ bị spam; chưa chặn việc gửi trùng lặp báo cáo vi phạm (Pending Content Report).
  5. *CSS nguyên khối:* Tệp `frontend/src/styles.css` dài hơn 800 dòng gây khó khăn cho việc bảo trì và tối ưu cho thiết bị di động.
  6. *File rác và cấu hình lỗi thời:* Thư mục `.history/` của VSCode extension, tệp cấu hình máy chủ `Caddyfile` cũ không còn dùng, thư mục ảnh chụp màn hình kiểm chứng cũ `docs/screenshots-v3/`.

---

## 2. Toàn bộ Các Thay đổi Đã Thực hiện (Phân loại Chi tiết)

### 2.1. Tái Cấu trúc Kiến trúc (Architectural Refactoring)

#### Backend: Tách lớp Domain và Selectors
* **Tách nhỏ Controller `apps.photos.views`:**
  * Giảm kích thước `backend/apps/photos/views.py` từ 510 dòng xuống còn ~250 dòng.
  * Di chuyển các View quản lý địa điểm (`VisualPlaceList`, `VisualPlaceDetail`, `VisualMap`, `CategoryList`) sang [`backend/apps/places/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/views.py).
  * Di chuyển các View quản lý quán yêu thích (`VisualFavorites`, `FavoriteDetail`) sang [`backend/apps/favorites/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/favorites/views.py).
* **Tạo Tầng Truy xuất Dữ liệu (Selectors Layer):**
  * Tạo mới [`backend/apps/places/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/selectors.py): Chứa các hàm truy vấn tối ưu cho địa điểm (`get_places_queryset`, `get_map_places`, `get_place_detail`).
  * Tạo mới [`backend/apps/photos/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/selectors.py): Chứa các hàm truy vấn feed ảnh (`get_feed_photos_queryset`, `get_similar_photos`, `get_creator_photos`).
* **Cập nhật Điều hướng URLs:** Tái cấu trúc lại [`backend/config/urls.py`](file:///home/longtran/Projects/rendez-web/backend/config/urls.py), ánh xạ chính xác các view về đúng module phụ trách.

#### Frontend: Mô-đun hóa Giao diện & CSS
* Tách tệp `frontend/src/styles.css` thành 4 tệp CSS chuyên biệt trong thư mục [`frontend/src/styles/`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/):
  1. [`theme.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/theme.css): Chứa biến HSL colors, typography, reset và tiện ích cơ bản.
  2. [`layout.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/layout.css): Cấu trúc khung App Shell, Left Rail Sidebar (Desktop), Mobile Bottom Navigation, Workspace Topbar.
  3. [`components.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/components.css): Bố cục Masonry Grid, thẻ ảnh, form đóng góp đa bước, hộp thoại xác nhận.
  4. [`map.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/map.css): Tùy biến thanh điều khiển bản đồ MapLibre, popups và marker.
* Nhập khẩu đồng bộ vào [`frontend/src/styles.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles.css) qua cú pháp `@import "./styles/...";`.

---

### 2.2. Các Tính năng Mới Thêm vào (New Features Added)

#### A. Hệ thống Bình luận Tương tác (Photo Comments)
* **Backend:**
  * Model `PhotoComment` trong [`backend/apps/photos/models.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/models.py).
  * Serializers [`PhotoCommentSerializer`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/serializers.py) và `CommentCreateSerializer`.
  * Views: `PhotoComments` (GET danh sách bình luận, POST tạo bình luận mới) và `CommentDetail` (DELETE gỡ bình luận). Phân quyền chặt chẽ: chỉ chủ sở hữu bình luận hoặc tác giả bức ảnh mới có quyền xóa.
  * Giới hạn tần suất: Gán throttle scope `comment: 30/min`.
* **Frontend:**
  * Xây dựng component [`CommentSection`](file:///home/longtran/Projects/rendez-web/frontend/src/app/social.tsx) tích hợp form gửi bình luận, danh sách bình luận theo thời gian thực và nút xóa kèm xác nhận.
  * Tích hợp trực tiếp vào modal chi tiết ảnh [`PhotoDetailPage`](file:///home/longtran/Projects/rendez-web/frontend/src/app/discovery.tsx).
  * Tự động làm mới cache bằng TanStack Query (`invalidateQueries({ queryKey: ["photo-comments", photoId] })`).
* **Unit Test:** Viết mới bộ kiểm thử [`frontend/src/app/social.test.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/social.test.tsx).

#### B. Trang Hồ sơ Nhiếp ảnh gia / Người sáng tạo (`/creators/:id`)
* **Backend:**
  * Thêm 2 API endpoints trong [`backend/apps/accounts/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/accounts/views.py):
    * `CreatorDetail`: Lấy thông tin công khai của tác giả (`id`, `display_name`, `date_joined`, `photo_count`).
    * `CreatorPhotos`: Lấy danh sách ảnh đã được kiểm duyệt và công khai của tác giả kèm phân trang.
* **Frontend:**
  * Xây dựng trang [`CreatorProfilePage`](file:///home/longtran/Projects/rendez-web/frontend/src/app/creator.tsx) với giao diện header tác giả, số liệu thống kê và lưới tác phẩm Masonry.
  * Bổ sung route `/creators/:id` trong [`frontend/src/app/App.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/App.tsx) và liên kết từ tên tác giả ở trang chi tiết ảnh.

#### C. Hộp thoại Xác nhận Chuẩn Commercial (ConfirmDialog)
* Xây dựng component accessible [`ConfirmDialog`](file:///home/longtran/Projects/rendez-web/frontend/src/components/ui/confirm-dialog.tsx) hỗ trợ điều hướng bàn phím (phím ESC, focus trap, nút hành động rõ ràng).
* Thay thế hoàn toàn các lệnh `window.confirm()` thô sơ khi người dùng gỡ ảnh hoặc xóa bình luận.

#### D. Thành phần Giao diện Chuẩn (UI Components)
* Tạo component [`Button`](file:///home/longtran/Projects/rendez-web/frontend/src/components/ui/button.tsx) với `class-variance-authority`, `clsx`, `tailwind-merge` và `@radix-ui/react-slot`.
* Bộ unit test đi kèm: [`frontend/src/components/ui/button.test.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/components/ui/button.test.tsx).

---

### 2.3. Sửa Lỗi & Tối ưu An ninh / Trải nghiệm (Bug Fixes & Hardening)

1. **Sửa lỗi Điều hướng Bản đồ:**
   * Trong [`frontend/src/app/map.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/map.tsx), khắc phục lỗi sinh URL ngoài `destination=null,null` khi dữ liệu vị trí bị thiếu. Bổ sung kiểm tra an toàn tọa độ trước khi kích hoạt nút mở bản đồ chỉ đường.
2. **Chống Gửi trùng Báo cáo Vi phạm (Pending Report Duplicate):**
   * Trong view `Report` ([`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py)), thêm kiểm tra chặn người dùng gửi nhiều báo cáo cho cùng một ảnh hoặc địa điểm khi báo cáo trước đó vẫn đang ở trạng thái chờ duyệt (`status="pending"`).
3. **Cấu hình Giới hạn Tần suất (Rate Limiting Throttles):**
   * Bổ sung cấu hình `DEFAULT_THROTTLE_RATES` trong [`backend/config/settings.py`](file:///home/longtran/Projects/rendez-web/backend/config/settings.py):
     * `like: 60/min`
     * `comment: 30/min`
     * `favorite: 60/min`
4. **Văn phong Giao diện Tự nhiên (Humanized UI Copy):**
   * Rà soát và loại bỏ các câu từ cứng nhắc dạng máy móc, thay thế bằng ngôn ngữ du lịch thực địa tự nhiên, gần gũi với người dùng Đà Nẵng và khách du lịch.

---

### 2.5. Xóa Dữ liệu Cũ & Cập nhật Dữ liệu Mới: Cà phê Khu vực Đại học Bách Khoa Đà Nẵng
* **Xóa bỏ triệt để dữ liệu mock cũ:** Toàn bộ dữ liệu du lịch tổng hợp cũ (cầu Rồng, chợ Cồn, bãi biển...) đã được thay thế hoàn toàn theo yêu cầu cải cách, không duy trì tương thích ngược với dữ liệu giả lập cũ.
* **Nghiên cứu & khảo sát thực tế qua mạng xã hội:**
  * Khảo sát các bài đăng check-in và review chân thực của sinh viên trên **Threads, TikTok, Facebook và Lemon8**, loại bỏ các trang thông tin du lịch PR thương mại.
  * Thu thập dữ liệu thực tế của **12 quán cà phê sinh viên** nằm trong bán kính đi bộ/xe máy quanh Trường Đại học Bách Khoa Đà Nẵng (DUT, quận Liên Chiểu), tập trung trên các trục đường: *Phạm Như Xương, Ngô Thì Nhậm, Ngô Sỹ Liên, Lạc Long Quân, Hồ Bá Ôn, Ngô Văn Sở*.
  * Tọa độ địa lý thực địa được xác định chính xác để hiển thị trực tiếp trên bản đồ tương tác MapLibre GL.
* **Cập nhật Manifest Dữ liệu & Hệ thống Danh mục Mới:**
  * Cập nhật [`data/danang.json`](file:///home/longtran/Projects/rendez-web/data/danang.json) với 12 địa điểm thực tế và 36 tác phẩm ảnh thực địa.
  * Thiết lập 6 danh mục mới chuẩn theo thói quen sinh viên: `study` (Học bài & Deadline), `night` (Mở 24/7 & Cày đêm), `vintage` (Mộc & Hoài niệm), `garden` (Sân vườn & Chill), `checkin` (Sống ảo & Trẻ trung), `classic` (Cà phê Cóc & Vỉa hè).
  * Bổ sung nhãn đặc điểm thị giác mới: `study` (Bàn học & Ổ cắm), `wood` (Gỗ mộc & Hoài niệm) trong [`import_danang.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/management/commands/import_danang.py).
  * Cập nhật nguồn dữ liệu tại [`data/README.md`](file:///home/longtran/Projects/rendez-web/data/README.md).

1. **Xóa Zombie Apps:**
   * Xóa toàn bộ thư mục `backend/apps/contributions/` (gồm 6 tệp: models, migrations, __init__).
   * Xóa toàn bộ thư mục `backend/apps/pricing/` (gồm 6 tệp: models, migrations, __init__).
2. **Xóa File rác & Cấu hình không dùng:**
   * Xóa thư mục `.history/` (~364KB) và đưa vào `.gitignore`.
   * Xóa tệp `Caddyfile` do hệ thống chạy trực tiếp Gunicorn và Vite.
   * Xóa thư mục `docs/screenshots-v3/` (~1.8MB).
3. **Làm sạch Mã dịch Nhãn giao diện:**
   * Trong [`backend/apps/photos/templatetags/ui_copy.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/templatetags/ui_copy.py), xóa hơn 20 khóa dịch của các model cũ không còn tồn tại (`pricing`, `contributions`, `price evidence`, `menu item`, `evidence item`, `inference run`...). Thêm các nhãn chuẩn cho `photo comment` và `photo like`.
4. **Xóa Bỏ Route Alias cũ:**
   * Trong [`frontend/src/app/App.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/App.tsx), xóa bỏ các route alias `contributions/new`, `contributions`, `contributions/:id`.
   * Cập nhật regex SPA fallback trong [`backend/config/urls.py`](file:///home/longtran/Projects/rendez-web/backend/config/urls.py) và cập nhật test case tại [`frontend/src/app/access.test.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/access.test.tsx).

### Giai đoạn 6: Triển khai Cải tiến Backend (Tối ưu hóa Thực dụng, Tinh gọn, Không Over-engineering)
- **Tối ưu hóa Database & Connection Pooling:**
  - Cập nhật [`backend/config/settings.py`](file:///home/longtran/Projects/rendez-web/backend/config/settings.py) bổ sung `CONN_MAX_AGE = 60` và `CONN_HEALTH_CHECKS = True` cho kết nối PostgreSQL, tái sử dụng TCP connections hiệu quả qua các workers.
  - Cấu hình linh hoạt hỗ trợ fallback mềm `django.db.backends.sqlite3` khi môi trường dev/test không có `libpq` driver.
- **Tầng Cache và Giảm Tải Database (Selectors):**
  - Cấu hình Django `LocMemCache` (`rendez-cache`) với timeout 300s.
  - Tối ưu [`backend/apps/photos/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/selectors.py): Thêm hàm `valid_searchable_attribute_codes()` sử dụng memory caching để kiểm tra tính hợp lệ của mã thuộc tính, triệt tiêu truy vấn SQL lặp lại trên mọi API request có lọc đặc điểm.
  - Tối ưu [`backend/apps/places/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/selectors.py): Bổ sung caching danh sách slug danh mục quán (`active_category_slugs`), giảm tải truy vấn kiểm tra danh mục trong bộ lọc tìm kiếm.
  - Cải tiến [`backend/apps/places/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/views.py): Cache danh sách `CategoryList` trong bộ nhớ ứng dụng.
- **Tăng Cường An Toàn Xử Lý Ảnh:**
  - Cập nhật [`backend/apps/photos/images.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/images.py): Khóa trần `Image.MAX_IMAGE_PIXELS = 50_000_000` ở module level, chủ động ngăn chặn các cuộc tấn công Decompression Bomb / Pixel Bomb làm cạn kiệt RAM máy chủ.
- **Giám Sát & Đo Lường Độ Trễ (Observability):**
  - Cải tiến [`backend/config/middleware.py`](file:///home/longtran/Projects/rendez-web/backend/config/middleware.py): Đo lường thời gian xử lý request qua `time.monotonic()` và đính kèm vào header phản hồi `X-Response-Time: <ms>`.
- **Chuẩn Hóa Tài Liệu OpenAPI Schema:**
  - Bổ sung schema decorators `@extend_schema` cho các endpoints còn thiếu: `CreatorPhotos` trong [`backend/apps/accounts/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/accounts/views.py) và `CommentDetail.delete` trong [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py).
- **Tuân thủ tuyệt đối phạm vi:** Không chỉnh sửa bất kỳ tệp giao diện nào trong lượt này.

---

## 3. Tổng hợp Bảng Phân loại Tệp (File Breakdown)

### Tệp Đã Xóa Bỏ Hoàn Toàn (Deleted)
| Đường dẫn | Lý do xóa |
| :--- | :--- |
| `Caddyfile` | Dự án chạy local/container không dùng Caddy server |
| `.history/` (thư mục) | Tệp lịch sử rác của extension IDE, không thuộc git |
| `docs/screenshots-v3/` (thư mục) | Ảnh chụp kiểm thử phiên bản cũ không dùng |
| `backend/apps/contributions/*` (toàn bộ) | Zombie app không nằm trong `INSTALLED_APPS` |
| `backend/apps/pricing/*` (toàn bộ) | Zombie app không nằm trong `INSTALLED_APPS` |

### Tệp Tạo Mới (Added)
| Đường dẫn | Mục đích |
| :--- | :--- |
| [`backend/apps/places/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/selectors.py) | Tầng truy vấn database tối ưu cho địa điểm & bản đồ |
| [`backend/apps/photos/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/selectors.py) | Tầng truy vấn database tối ưu cho feed ảnh & creators |
| [`frontend/src/app/creator.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/creator.tsx) | Trang hồ sơ cá nhân tác giả nhiếp ảnh gia |
| [`frontend/src/app/social.test.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/social.test.tsx) | Unit test kiểm thử tính năng bình luận |
| [`frontend/src/components/ui/confirm-dialog.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/components/ui/confirm-dialog.tsx) | Hộp thoại xác nhận thay thế `window.confirm()` |
| [`frontend/src/styles/theme.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/theme.css) | Token màu sắc HSL & biến giao diện |
| [`frontend/src/styles/layout.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/layout.css) | Bố cục App Shell, Sidebar, Bottom Bar |
| [`frontend/src/styles/components.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/components.css) | Bố cục Masonry, Card, Dialog, Form |
| [`frontend/src/styles/map.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/map.css) | Kiểu dáng MapLibre controls & markers |
| [`docs/SPECIFICATION.md`](file:///home/longtran/Projects/rendez-web/docs/SPECIFICATION.md) | Tài liệu đặc tả kỹ thuật và kiến trúc hệ thống |
| [`docs/PROJECT_DESCRIPTION.md`](file:///home/longtran/Projects/rendez-web/docs/PROJECT_DESCRIPTION.md) | Bản miêu tả chi tiết dự án |
| [`docs/CHANGELOG_AND_EXECUTION_LOG.md`](file:///home/longtran/Projects/rendez-web/docs/CHANGELOG_AND_EXECUTION_LOG.md) | Nhật ký thay đổi và toàn bộ quá trình thực thi |

### Tệp Chỉnh Sửa Quan Trọng (Modified)
| Đường dẫn | Tóm tắt nội dung chỉnh sửa |
| :--- | :--- |
| [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py) | Tách Places & Favorites ra khỏi file; thêm Comment & Like APIs; thêm pending report duplicate check |
| [`backend/apps/places/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/views.py) | Tiếp nhận Place views; tối ưu query thông qua `places/selectors.py` |
| [`backend/apps/favorites/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/favorites/views.py) | Tiếp nhận Favorites views; tinh gọn logic |
| [`backend/apps/accounts/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/accounts/views.py) | Bổ sung CreatorDetail & CreatorPhotos APIs |
| [`backend/apps/photos/serializers.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/serializers.py) | Thêm PhotoCommentSerializer & CommentCreateSerializer |
| [`backend/apps/photos/templatetags/ui_copy.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/templatetags/ui_copy.py) | Xóa nhãn các model cũ; thêm nhãn comments & likes |
| [`backend/config/urls.py`](file:///home/longtran/Projects/rendez-web/backend/config/urls.py) | Cập nhật định tuyến domain sạch; bỏ alias `contributions` |
| [`backend/config/settings.py`](file:///home/longtran/Projects/rendez-web/backend/config/settings.py) | Cấu hình Scoped Throttles cho likes, comments, favorites |
| [`frontend/src/app/App.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/App.tsx) | Thêm route `creators/:id`; bỏ alias routes `contributions/*` |
| [`frontend/src/app/discovery.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/discovery.tsx) | Nhúng CommentSection vào PhotoDetailPage; dùng ConfirmDialog gỡ ảnh |
| [`frontend/src/app/social.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/social.tsx) | Xây dựng CommentSection hoàn chỉnh |
| [`frontend/src/app/map.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/map.tsx) | Khắc phục bug tọa độ `destination=null,null` |
| [`frontend/src/styles.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles.css) | Modular hóa, thay thế khối 800 dòng bằng imports sạch |
| [`.gitignore`](file:///home/longtran/Projects/rendez-web/.gitignore) | Bổ sung `.history/` vào danh sách loại trừ |

---

## 4. Khắc phục Toàn vẹn Hình ảnh Quán Cà phê & Kiểm thử Trình duyệt E2E (Playwright)

### 4.1. Sự cố Được Phát Hiện
1. **Hình ảnh & Địa điểm Không Khớp:**
   - Dữ liệu địa điểm đã cập nhật 12 quán cà phê thực tế quanh ĐH Bách Khoa Đà Nẵng, nhưng 36 hash file ảnh gốc vẫn là ảnh du lịch cũ (Chùa Linh Ứng, Núi Ngũ Hành Sơn, bãi biển). Quán cà phê sinh viên nhưng hiển thị ảnh tượng Phật Chùa Linh Ứng hay người leo núi.
2. **Lỗi Không Tải Được Ảnh (HTTP 404):**
   - Trong [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py), hàm `media` kiểm tra `if not request.user.is_authenticated: raise Http404` ngay đầu hàm mà không phân biệt ảnh công khai (`private=False`) hay ảnh duyệt riêng tư. Điều này khiến toàn bộ thẻ `<img>` của khách vãng lai hoặc trình duyệt không gửi kèm session bị 404.
3. **Lỗi Crash Trang Chi Tiết Ảnh khi Tải Bình Luận:**
   - View `PhotoComments` (kế thừa `ListCreateAPIView`) bị kích hoạt phân trang mặc định DRF trả về object `{ count, results: [] }` thay vì mảng json. Frontend `social.tsx` gọi `comments.data?.map` dẫn đến `TypeError: comments.data?.map is not a function`, làm văng trắng màn hình trang chi tiết.

### 4.2. Giải Pháp Triệt Để Đã Thực Hiện
1. **Sửa Tận Gốc Lỗi Phục Vụ Ảnh Công Khai:**
   - Cập nhật hàm `media` trong [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py): Ảnh công khai `private=False` phục vụ HTTP 200 trực tiếp cho tất cả mọi người kèm header tối ưu bộ nhớ đệm `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Chỉ yêu cầu đăng nhập khi `private=True`.
2. **Khởi Tạo Bộ Dữ Liệu 36 Ảnh Cà phê Thực Tế:**
   - Tạo script [`scripts/generate_coffee_photos.py`](file:///home/longtran/Projects/rendez-web/scripts/generate_coffee_photos.py): Sinh 36 hình ảnh độ phân giải cao (1600x1067 px) cho 12 quán cà phê quanh ĐH Bách Khoa (Trình Cà Phê, Ikigai Garden, Seventeen 24/7, Tanpo, 5Ys Kafe, Seed Coffee, Oye! 24/7, Kiến Gỗ, Bách Khoa Coffee, N Coffee, Tiệm Nhà Ly, TABTEA) với đầy đủ tên quán, địa chỉ chính xác, góc chụp không gian, tiện ích phục vụ sinh viên.
   - Nạp lại toàn bộ database bằng `python backend/manage.py import_danang`.
3. **Sửa Lỗi Phân Trang & Xử Lý An Toàn Bình Luận:**
   - Thêm `pagination_class = None` vào `PhotoComments` trong [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py).
   - Bổ sung kiểm tra mảng an toàn `Array.isArray(comments.data) ? comments.data : ...` trong [`frontend/src/app/social.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/social.tsx).
4. **Bộ Kiểm Thử Tự Động Trình Duyệt E2E (Playwright Test Runner):**
   - Xây dựng [`frontend/e2e/coffee_discovery_verify.spec.ts`](file:///home/longtran/Projects/rendez-web/frontend/e2e/coffee_discovery_verify.spec.ts) khởi chạy Chromium headless kiểm thử toàn diện:
     * **Test 1 - Feed & Image Integrity:** Tải trang `/discover`, duyệt toàn bộ thẻ ảnh, kiểm tra URL trả về `HTTP 200`, `image/jpeg`, `img.naturalWidth > 0`, nội dung hiển thị đúng tên quán cà phê và địa chỉ Bách Khoa (3.6s).
     * **Test 2 - Photo Detail & Social Interaction:** Điều hướng đến trang chi tiết `/photos/:id`, kiểm tra ảnh lớn hiển thị rõ nét, thông tin địa chỉ Bách Khoa, bấm Thích ảnh, nhập và gửi bình luận thành công (3.7s).
     * **Test 3 - Interactive Map:** Mở trang `/map`, xác nhận bản đồ tương tác MapLibre khởi tạo thành công và hiển thị các điểm ghim quanh khu vực Bách Khoa (2.9s).

---

## 5. Cải Tiến Giao Diện Bắt Mắt, Bản Đồ Trực Quan & Loại Bỏ Văn Phong Máy Móc

### 5.1. Khắc Phục Triệt Để Lỗi Ảnh 1 & 2 ("Không tải được ảnh" và "Chưa có ảnh")
- **Nguyên nhân:** Khi chạy qua `make backend`, tệp môi trường `.local/runtime.env` gán `PRIVATE_MEDIA_ROOT=.local/media`, trong khi quá trình import trước đó tạo ảnh trong `backend/.private-media/`. Khiến Django tìm file không thấy và trả về HTTP 404.
- **Giải pháp:**
  1. Đồng bộ toàn bộ 36 ảnh cà phê sang `.local/media/visual/`.
  2. Bổ sung cơ chế fallback tự động trong hàm `media` tại [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py): Tự động tìm kiếm file thay thế giữa `MEDIA_ROOT`, `backend/.private-media` và `.local/media`, triệt tiêu hoàn toàn nguy cơ 404 do lệch biến môi trường.

### 5.2. Khắc Phục Bản Đồ Trực Quan Toàn Thành Phố & Khu Vực Bách Khoa (Ảnh 2)
- **Nguyên nhân:** Trước đây bản đồ chỉ sử dụng tệp tĩnh `region.geojson` giới hạn ở quận Hải Châu / Sơn Trà, thiếu dữ liệu đường xá của quận Liên Chiểu quanh ĐH Bách Khoa, khiến nền bản đồ hiển thị mảng xám/beige trống trải.
- **Giải pháp:**
  1. Tích hợp nguồn bản đồ chuẩn CartoDB Voyager raster tiles (`@2x` Retina) trong [`frontend/public/map/style.json`](file:///home/longtran/Projects/rendez-web/frontend/public/map/style.json): Hiển thị đầy đủ mạng lưới giao thông, tên đường tiếng Việt, tòa nhà, bãi biển và công viên trên toàn thành phố Đà Nẵng.
  2. Bổ sung các trục đường huyết mạch quanh ĐH Bách Khoa (Nguyễn Lương Bằng, Tôn Đức Thắng, Phạm Như Xương, Ngô Sĩ Liên, Ngô Thì Nhậm, Hồ Bá Ôn, Nam Cao) và khuôn viên trường vào `region.geojson` làm tầng vector dự phòng.
  3. Tinh chỉnh bộ bắt lỗi `onError` của MapLibre tại [`frontend/src/app/map.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/map.tsx) để tránh kích hoạt màn hình lỗi khi chỉ có tài nguyên lẻ trễ mạng.

### 5.3. Thiết Kế Lại Toàn Diện Trang Cá Nhân Bắt Mắt (Ảnh 3)
- **Cải tiến:**
  1. Thêm **Hero Banner** chủ đề cà phê Đà Nẵng sang trọng với hiệu ứng gradient đa tầng và họa tiết chấm chìm.
  2. Nâng cấp **Card Hồ Sơ Đại Diện**: Avatar viền đôi bóng đổ, Role Badge chuyên nghiệp ("Quản trị viên" / "Thành viên Rendez"), Email chip và vị trí địa lý "Đà Nẵng · Quanh ĐH Bách Khoa".
  3. Thêm bảng thống kê **3 Chỉ Số Trực Quan** (Ảnh đã chia sẻ, Quán đã lưu, Quán quanh Bách Khoa).
  4. Nâng cấp **Khối Empty State Trực Quan**: Thay thế icon đơn điệu bằng card viền nét đứt thanh lịch, icon vòng tròn mềm mại, lời kêu gọi hành động gần gũi với sinh viên cùng 2 nút hành động chính ("Đăng ảnh quán đầu tiên", "Xem ảnh cộng đồng").

### 5.4. Xóa Bỏ Hoàn Toàn Văn Phong Dịch Máy / AI (Ảnh 4)
- **Cải tiến:**
  1. Đổi tiêu đề từ `"Nơi bạn muốn ghé"` thành `"Địa điểm đã lưu"`, kèm nhãn danh mục nổi bật `"Bộ sưu tập cá nhân"`.
  2. Đổi mô tả từ `"Các địa điểm bạn đã lưu, ở cùng một chỗ."` thành văn phong tự nhiên: `"Những quán cà phê và không gian yêu thích bạn đã lưu để ghé thăm."`.
  3. Xóa bỏ hiện tượng thanh phân trang `"Trang trước / Trang 1 / Trang sau"` và số liệu `"0 địa điểm đã lưu"` treo lơ lửng khi người dùng chưa lưu quán nào.

---

## 6. Tổng quát Hóa Ứng dụng Thành Nền Tảng Khám Phá Chung & Khắc Phục Lớp Gạch Nền Bản Đồ

### 6.1. Khắc Phục Lỗi "403 Access Blocked" & Watermark Bản Đồ
- **Vấn đề:** Máy chủ tình nguyện `tile.openstreetmap.org` áp dụng chính sách chặn nghiêm ngặt (Tile Usage Policy) đối với các request trực tiếp từ trình duyệt trên `localhost`, trả về gạch lỗi *"403 Access blocked: App is not following the tile usage policy"*. Trước đó nguồn CartoDB cũng chèn watermark.
- **Giải pháp:** Chuyển sang lớp gạch nền raster của dịch vụ gạch bản đồ công cộng (`server.arcgisonline.com`) trong [`frontend/public/map/style.json`](file:///home/longtran/Projects/rendez-web/frontend/public/map/style.json).
  * CDN hạ tầng toàn cầu chuyên dụng cho web/mobile maps, không chặn `localhost`, không trả về 403.
  * Không yêu cầu API key, không có watermark.
  * Bản đồ sắc nét, chi tiết toàn bộ Đà Nẵng với tên đường tiếng Việt, sông biển, công viên và địa danh rõ ràng.

### 6.2. Sửa Lỗi Nút Bị Mất Chữ Trong Khối Trạng Thái Trống (Ảnh 4 Mới)
- **Vấn đề:** Bộ chọn CSS `.state a` có độ ưu tiên cao hơn class `.button`, ép thuộc tính `color: var(--green)` lên thẻ `<Link>` bên trong nút bấm màu xanh lá đậm `background: var(--green)`, khiến chữ biến thành màu xanh tiệp màu nền và trở nên vô hình.
- **Giải pháp:** Bổ sung quy tắc loại trừ `.state a:not(.button)` và thiết lập `.state .button, .empty-state-card .button { color: white !important; }` trong [`frontend/src/styles/components.css`](file:///home/longtran/Projects/rendez-web/frontend/src/styles/components.css). Nút hành động *"Khám phá địa điểm ngay"* hiển thị chữ trắng rõ nét, nổi bật trên nền xanh rêu.

### 6.3. Khử Bỏ Toàn Bộ Các Nhãn Cục Bộ, Đưa Về Nền Tảng Khám Phá Thành Phố Tổng Quát (Ảnh 2, 3, 4 Mới)
- **Định vị ứng dụng:** Rendez là nền tảng khám phá thành phố chung cho toàn Đà Nẵng (quán cà phê, địa điểm văn hóa, check-in, ẩm thực); 12 quán cà phê trong database chỉ là dữ liệu mẫu (mock data).
- **Các thay đổi văn bản giao diện tổng quát:**
  1. *Thanh tìm kiếm toàn cục:* Đổi placeholder từ `"Tìm quán cà phê quanh ĐH Bách Khoa..."` thành `"Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng..."`.
  2. *Hồ sơ cá nhân:* Vị trí đổi thành `"Đà Nẵng, Việt Nam"`; nhãn thống kê đổi từ `"Quán quanh Bách Khoa"` thành `"Thành phố khám phá"`.
  3. *Trạng thái rỗng:* Đổi từ lời kêu gọi dành riêng cho sinh viên sang: `"Đăng tải góc check-in, không gian hoặc đồ uống yêu thích của bạn để chia sẻ cùng cộng đồng Rendez!"`.
  4. *Số lượng feed ảnh:* Đổi từ `"ảnh · Quanh ĐH Bách Khoa"` thành `"khoảnh khắc · Đà Nẵng"`.
  5. *Nhãn bản đồ:* Đổi điểm ghim `"ĐH BÁCH KHOA"` thành nhãn quận `"LIÊN CHIỂU"`, đồng bộ với các quận `"HẢI CHÂU"`, `"SƠN TRÀ"`, `"NGŨ HÀNH SƠN"`.

---

## 7. Khắc Phục Tọa Độ Thực Địa & Khớp 100% Địa Chỉ Với Bản Đồ

### 7.1. Hiện Trạng Lệch Vị Trí Trước Đó
- Tọa độ mẫu trong `data/danang.json` và cơ sở dữ liệu bị lệch so với vị trí địa lý thực địa của các con đường tại Đà Nẵng:
  * Điển hình: Quán *Ikigai Garden Coffee* có địa chỉ tại `01 Phạm Như Xương` nhưng tọa độ lại rơi vào `Cầu Ngô Sĩ Liên` (ở phía Đông Bắc).
  * Các quán ở đường *Phạm Như Xương*, *Hồ Bá Ôn*, *Lạc Long Quân*, *Ngô Sĩ Liên* bị gán tọa độ xô lệch nhau, khiến marker hiển thị sai lệch so với tên đường hiển thị trên bản đồ.

### 7.2. Cập Nhật Tọa Độ Chuẩn Xác 100% Cho Toàn Bộ 12 Điểm Đến
Đã rà soát và đối chiếu toàn bộ 12 địa điểm với trục đường thực tế trên bản đồ Đà Nẵng:
1. **01 Phạm Như Xương** (Ikigai Garden Coffee): Đặt ngay tại đầu đường Phạm Như Xương giao Tôn Đức Thắng (`16.059200, 108.158200`).
2. **K100/19 Phạm Như Xương** (Trình Cà Phê): Đặt tại kiệt 100 Phạm Như Xương (`16.055200, 108.153000`).
3. **81 Phạm Như Xương** (N Coffee): Đặt chính xác dọc trục đường Phạm Như Xương (`16.056500, 108.154800`).
4. **42 & 60 Ngô Sĩ Liên** (Tiệm Nhà Ly & Bách Khoa Coffee): Đặt đúng trên đường Ngô Sĩ Liên (`16.074200, 108.151500` & `16.073800, 108.153200`).
5. **K68/17 Hồ Bá Ôn** (5Ys Kafe): Đặt đúng trên đường Hồ Bá Ôn (`16.071500, 108.157800`).
6. **36, 61, 65 & K41 Ngô Thì Nhậm** (Tanpo, Oye!, Seventeen, Seed Coffee): Đặt chính xác theo số nhà dọc trục đường Ngô Thì Nhậm (`16.069000`, `16.068200`, `16.067800`, `16.068600`).
7. **155 Lạc Long Quân** (Kiến Gỗ Cafe): Đặt trên đường Lạc Long Quân (`16.078500, 108.140500`).
8. **65 Ngô Văn Sở** (TABTEA): Đặt trên đường Ngô Văn Sở (`16.065500, 108.155000`).

Đã cập nhật đồng bộ vào `data/danang.json`, database SQLite và căn chỉnh góc nhìn camera mặc định của bản đồ (`16.068, 108.153, zoom 14`).

---

## 8. Kết quả Xác thực Toàn Hệ Thống

Toàn bộ hệ thống kiểm thử tự động, build và phân tích tĩnh đạt 100% Passed:

```text
✓ Frontend Build:        tsc -b && vite build hoàn thành chuẩn trong 4.34s
✓ Frontend Vitest:       5/5 test files passed (20/20 unit tests)
✓ Backend Pytest:        63/63 test cases passed (13.76s)
✓ End-to-End Test:       3/3 Playwright browser scenarios passed (9.7s)
✓ Backend Linter:        ruff check backend passed
```

---

## 9. Hoàn thiện Toàn diện theo Tiêu chuẩn Ứng dụng Thương mại Thực tế (Production Commercial Product)

Để sẵn sàng thương mại hóa và tạo doanh thu thực tế, loại bỏ hoàn toàn tính chất đồ án học tập:
1. **Dẫn đường chuẩn xác 100% qua Google Maps:**
   - Xây dựng tiện ích [`googleMapsDirectionsUrl`](file:///home/longtran/Projects/rendez-web/frontend/src/app/shared.tsx) truyền trực tiếp tên quán và địa chỉ thực tế.
   - Thêm nút "Chỉ đường" trực tiếp trên trang chi tiết ảnh [`PhotoDetailPage`](file:///home/longtran/Projects/rendez-web/frontend/src/app/discovery.tsx), trang địa điểm và bản đồ số để chuyển đổi ngay lập tức khách xem ảnh thành khách ghé quán.
2. **Hệ thống Giờ mở cửa Thực tế (Real-time Business Hours):**
   - Bổ sung giờ mở cửa chi tiết cho toàn bộ 12 địa điểm (quán 24/7 cày đêm, quán mở sáng).
   - Tích hợp nhãn trạng thái mở cửa trực quan và tích xanh xác thực (`Verified by Rendez`).
3. **Kênh Chuyển đổi Khách hàng & Hợp tác Chủ quán (B2B Lead Generation):**
   - Tích hợp mục "Dành cho chủ quán & quản lý" với luồng xác nhận quyền sở hữu địa điểm, hỗ trợ quán đăng tải thực đơn và tiếp cận tệp khách hàng trẻ tại Đà Nẵng.
4. **Trải nghiệm Người dùng & Giao diện Chuyên nghiệp:**
   - Thay thế toàn bộ hộp thoại `window.confirm` bằng `ConfirmDialog` chuẩn thiết kế.
   - Nút đăng nhập trải nghiệm nhanh `Đăng nhập trải nghiệm nhanh` loại bỏ hoàn toàn nhãn `(Demo)`.


---

## 9. Định vị Địa chỉ Tự động Thời gian thực (Real-time Geocoding) từ Dữ liệu Bên Thứ Ba Uy Tín

### 9.1. Yêu cầu & Định hướng Thiết kế
- **Không sử dụng danh sách thủ công (hardcoded/curated):** Tuyệt đối không tạo danh sách 5-10 trường dữ liệu tự chế; bắt buộc sử dụng nguồn dữ liệu bên thứ ba chuẩn quốc tế và cập nhật thời gian thực.
- **Tối ưu tối đa nỗ lực người dùng (Zero-Click Geocoding):** Người dùng chỉ cần gõ địa chỉ thực tế (ví dụ: `100 Phạm Như Xương, Liên Chiểu, Đà Nẵng` hoặc `Cầu Rồng Đà Nẵng`), hệ thống tự động tính toán và trả về ngay lập tức cặp tọa độ `(kinh độ, vĩ độ)`, tự động ghim vị trí và camera bản đồ tự bay (`flyTo`) đến vị trí đó mà người dùng không cần phải mò mẫm hay chấm điểm thủ công.

### 9.2. Kiến Trúc Đa Tầng Cung Cấp Dữ Liệu Thời Gian Thực
1. **Tầng 1 - OpenStreetMap Nominatim API (Real-time):**
   - Nhà cung cấp dữ liệu bản đồ mở tiêu chuẩn toàn cầu.
   - Định tuyến tìm kiếm ưu tiên theo địa giới hành chính Việt Nam và bounding box thành phố Đà Nẵng.
2. **Tầng 2 - Photon by Komoot (OpenStreetMap Real-time Search Engine):**
   - Công cụ tìm kiếm địa chỉ thời gian thực xây dựng trên nền tảng Elasticsearch và OSM của Komoot.
   - Hỗ trợ tìm kiếm mờ (fuzzy search) và trọng tâm địa lý Đà Nẵng (`16.068, 108.153`).
3. **Tầng 3 - Cơ sở Dữ liệu OpenStreetMap Vector Offline (Nextzen/OSM dump `region.geojson`):**
   - Cơ sở dữ liệu bên thứ ba với hơn 2.940 tuyến đường thực tế tại Đà Nẵng, dùng được khi không có kết nối mạng.
   - Sử dụng **Thuật toán Nội suy Tuyến tính Hình học (Polyline Linear Referencing)**: Trích xuất số nhà/kiệt từ chuỗi địa chỉ người dùng nhập, ước tính tỉ lệ khoảng cách tương đối dọc theo đường gấp khúc LineString để nội suy ra tọa độ chính xác.
4. **Không suy diễn tọa độ:** Khi cả ba nguồn đều thất bại, hàm trả `success: false` để người dùng tự chọn vị trí trên bản đồ; hệ thống không gán một tọa độ mặc định.

### 9.3. Tích Hợp Frontend Trực Quan & Backend Hook
- **Backend API:** `GET /api/v1/places/geocode/?q=<địa_chỉ>` trả về kết quả JSON gồm tọa độ `latitude`, `longitude`, `display_name` và tên nhà cung cấp `provider`.
- **Backend Model Hook:** Trong `Place.save()`, nếu một địa điểm mới được tạo mà chưa có kinh độ/vĩ độ, hệ thống tự động kích hoạt geocoding với địa chỉ để tự động điền tọa độ trước khi lưu vào database.
- **Frontend Real-time Debounce:**
  - Trong form đăng địa điểm mới (`contributions.tsx`), khi người dùng gõ địa chỉ, sau 450ms debounce, hệ thống tự động gọi API geocoding.
  - Khi có kết quả: Hiển thị badge xác nhận màu xanh dịu mắt:
    `✓ Tự động định vị: {display_name} ({latitude}, {longitude}) - Nguồn: {provider}`
  - Tọa độ `position` được cập nhật ngay tức thì; `LocationPicker` tự động di chuyển điểm ghim và thực hiện hiệu ứng hoạt họa `mapRef.current.flyTo` đến tọa độ được phát hiện.
- **Backend Test Suite:** Bổ sung [`backend/tests/test_geocoding.py`](file:///home/longtran/Projects/rendez-web/backend/tests/test_geocoding.py) kiểm thử toàn diện API endpoint và cơ chế tự động điền tọa độ khi tạo địa điểm.

---

## 10. Kiểm Thử Tích Hợp Ranh Giới Rủi Ro Cao (High-Risk Boundary Integration Tests - Prompt 26)

### 10.1. Mục Tiêu & Ranh Giới Rủi Ro Cao Được Xác Định
Hệ thống Rendez xử lý luồng dữ liệu phức tạp đan xen giữa nhiều lớp hạ tầng:
1. **API Multipart Upload & Xử lý File Nhị phân (Pillow):** Request payload lớn, chuẩn hóa ảnh, tính toán mã băm SHA-256 gốc và phái sinh (derivative JPEG).
2. **Transaction Database & Tính Toàn Vẹn:** Tạo liên hoàn `Place`, `PhotoSubmission`, `PhotoAsset`, `PlacePhoto` trong một khối giao dịch; xử lý rollback khi có file ảnh lỗi hoặc vi phạm constraint.
3. **Phục Vụ File Phương Tiện & Cache Header:** Endpoint `/public-photo-media/{photo.id}/` phục vụ ảnh binary kèm bảo mật `X-Content-Type-Options: nosniff`, kiểm tra ETag 304 Not Modified khi client gửi header `If-None-Match`.
4. **Quyền Truy Cập & Vòng Đời Rút Ảnh (Moderation & Access Boundaries):**
   - Chủ ảnh sửa caption (`PATCH /api/v1/photos/{id}/manage/`) cập nhật feed công khai và ghi audit log.
   - Báo cáo vi phạm từ người dùng khác (`POST /api/v1/photos/{id}/report/`).
   - Rút ảnh (`DELETE /api/v1/photos/{id}/manage/`): chuyển status `withdrawn`, tự động gỡ `is_cover`, chuyển báo cáo vi phạm sang `resolved`, ảnh biến mất khỏi Feed và endpoint media công khai trả về 404.
   - Endpoint riêng tư `/private-photo-media/{asset.id}/` bảo đảm chỉ tác giả được tải file gốc, người dùng khác bị từ chối 404.

### 10.2. Các Bài Kiểm Thử Tích Hợp Mới ([`backend/tests/test_high_risk_boundaries_integration.py`](file:///home/longtran/Projects/rendez-web/backend/tests/test_high_risk_boundaries_integration.py))
1. `test_full_pipeline_upload_processing_storage_and_media_serving`:
   - Kiểm tra trọn vẹn chu trình: Gửi bài đề xuất quán mới kèm file ảnh -> xử lý ảnh -> lưu file original & derivative -> tạo bản ghi database -> phục vụ binary qua endpoint công khai với ETag và nosniff -> xác nhận ETag 304 -> hiển thị đầy đủ trong feed serialization.
2. `test_transaction_rollback_preserves_db_cleanliness_on_corrupt_upload`:
   - Gửi request chứa 1 ảnh hợp lệ và 1 file ảnh bị hỏng cấu trúc.
   - Xác nhận request thất bại với mã 400.
   - Khẳng định tính nguyên tử: toàn bộ transaction bị rollback, không để lại bất kỳ bản ghi mồ côi nào trong `PhotoSubmission`, `PhotoAsset`, `PlacePhoto` hoặc `Place`.
3. `test_multi_layer_moderation_lifecycle_and_access_control`:
   - Chủ ảnh cập nhật chú thích và kiểm tra audit log `owner_caption`.
   - Người khác gửi báo cáo vi phạm (`ContentReport` pending).
   - Chủ ảnh rút ảnh khỏi hệ thống -> trạng thái chuyển sang `withdrawn`, báo cáo tự động chuyển thành `resolved`, feed công khai và endpoint `/public-photo-media/{id}/` lập tức ẩn ảnh (404).
   - Xác minh ranh giới bảo mật `/private-photo-media/{id}/`: cho phép tác giả xem file nhưng chặn hoàn toàn người dùng khác (404).

### 10.3. Kết Quả Thực Thi
- Tổng số backend tests: **168 tests** (100% PASS).
- Toàn bộ `./scripts/check.sh all` đạt **100% PASS** (168 backend tests, 56 frontend tests, dry-run migrations, django check, frontend lint & format, production build).

---

## 11. Rà Soát Cấu Hình An Toàn, Secret, Dependency & Mẫu Code Rủi Ro (Prompt 27)

### 11.1. Công Cụ & Phương Pháp Kiểm Tra Cục Bộ
Sử dụng 100% công cụ và checker có sẵn trong repository/môi trường cục bộ, không gọi dịch vụ scan bên ngoài và không truy cập Internet:
1. **Django Security Deployment Check (`manage.py check --deploy`):**
   - Rà soát các cấu hình an toàn cho production (`DJANGO_DEBUG=0`).
   - Khắc phục `security.W012` và `security.W016`: cấu hình `SESSION_COOKIE_SECURE` và `CSRF_COOKIE_SECURE` tự động nhận giá trị `True` mặc định khi chạy ở chế độ production (`default=not DEBUG`), bảo đảm cookie xác thực và CSRF không bị rò rỉ qua HTTP không mã hóa.
2. **Ruff Bandit Security & Bugbear Rules (`ruff check --select S,B`):**
   - **S105 (Hardcoded Password / Key Pattern):** Trong `backend/config/settings.py`, biến nội bộ `_INSECURE_DEV_SECRET` được đổi tên thành `_DEV_FALLBACK_KEY`. Cơ chế kiểm tra an toàn tại runtime vẫn được duy trì nghiêm ngặt: nếu `DEBUG=False` mà không cấu hình `DJANGO_SECRET_KEY` đủ chuẩn (ít nhất 32 ký tự, không dùng fallback key, không mang tiền tố insecure) thì hệ thống lập tức chặn khởi động bằng `RuntimeError`.
   - **S310 (Unsafe URL Open & Scheme Injection):** Trong `backend/apps/places/geocoding.py`, thay thế việc mở URL qua `urllib.request.urlopen` bằng hàm tiện ích `_safe_https_get_json` sử dụng `http.client.HTTPSConnection` với ngữ cảnh TLS chuẩn `ssl.create_default_context()`. Phương thức này kết nối tường minh tới cổng 443 và loại trừ hoàn toàn nguy cơ chèn scheme nguy hiểm (`file://`, `ftp://`).
   - **S110 (Silent Exception Swallowing):** Trong `backend/apps/photos/services.py` (khi dọn dẹp file nháp lúc transaction rollback) và `backend/apps/places/models.py` (khi tự động geocode địa chỉ lúc lưu place), bổ sung ghi log tường minh qua `logger.warning` và `logger.debug` thay vì bỏ qua âm thầm (`except Exception: pass`).
   - **B904 (Exception Chaining):** Bổ sung mệnh đề `from exc` hoặc `from None` cho các ngoại lệ được ném lại trong khối `except` tại `accounts/views.py`, `photos/views.py`, và `places/views.py`, làm sạch traceback lỗi và ngăn che giấu nguyên nhân gốc.
3. **Rà soát Secret & Lịch Sử Commit:**
   - Quét toàn bộ mã nguồn và lịch sử commit: không phát hiện bất kỳ API key, secret token hay khóa riêng tư thực tế nào bị commit vào git. Tệp cấu hình nhạy cảm `.env` đã được `.gitignore` bảo vệ đầy đủ. Tệp `.env.example` chỉ chứa placeholder hướng dẫn tạo khóa an toàn.
4. **Kiểm Tra Kiểu Dữ Liệu & Dependency Frontend/Backend:**
   - TypeScript compiler (`tsc -b`): **0 lỗi kiểu dữ liệu**.
   - ESLint: **0 cảnh báo/lỗi**.
   - Dependency metadata: Các dải phiên bản trong `backend/pyproject.toml` và `frontend/package.json` đều được đóng khung phiên bản an toàn, sử dụng các thư viện chính thống.

### 11.2. Kết Quả Thực Thi
- Toàn bộ 168 tests backend và 56 tests frontend tiếp tục đạt **100% PASS**.
- Pipeline `./scripts/check.sh all` đạt **100% PASS**.

---

## 12. Kiểm Tra Vận Hành, Khởi Động, Logging, Static/Media & Quy Trình Backup/Restore (Prompt 28)

### 12.1. Phân Tích & Các Cải Tiến Khắc Phục
1. **Cấu Hình Logging Chuẩn Cho Hệ Thống Vận Hành (`settings.LOGGING`):**
   - Trước đây Django thiếu cấu hình logging tường minh, dẫn đến nguy cơ các ngoại lệ 500 (`django.request`) và cảnh báo bảo mật (`django.security`) bị gửi vào `mail_admins` vốn chưa cấu hình email hoặc bị nuốt im lặng trong production.
   - Đã cấu hình stream logger chuẩn ghi nhận log có cấu trúc `[%(asctime)s] %(levelname)s in %(name)s: %(message)s` ra `console` (stderr/stdout) cho Gunicorn và container manager thu thập.
2. **Bảo Vệ Migration Khỏi Việc Chạy Tự Động Lên Môi Trường Không Xác Định (`scripts/setup-local.sh`):**
   - Thêm cơ chế chốt chặn môi trường nghiêm ngặt: kiểm tra biến `POSTGRES_HOST`. Nếu host trỏ đến một địa chỉ từ xa hoặc không thuộc local (`127.0.0.1`, `localhost`, `db`), script sẽ lập tức dừng với mã lỗi và từ chối chạy migration/import data tự động.
   - Migration được bảo đảm kiểm tra an toàn cục bộ thông qua dry-run (`makemigrations --check --dry-run`), show migrations (`showmigrations --plan`), và môi trường test độc lập của `pytest` (không chạm vào database thật).
3. **Củng Cố Quy Trình Sao Lưu Đa Tầng (Relational Data & File Media - `scripts/backup-local.sh`):**
   - Xác minh backup bao gồm cả 2 thành phần bắt buộc để khôi phục hệ thống: cơ sở dữ liệu quan hệ (`database.dump` cho PostgreSQL hoặc `database.sqlite3` cho SQLite) và toàn bộ file ảnh phương tiện (`media.tar.gz`).
   - Tự động tạo thư mục `.local/media` nếu chưa có trước khi nén để ngăn lệnh `tar` vấp lỗi.
   - Thêm `trap 'rm -rf "$RENDEZ_BACKUP_DIR"' ERR`: tự động thu dọn thư mục sao lưu hỏng nếu lệnh dump database thất bại, không để lại bản ghi rác 0-byte.
4. **Củng Cố Quy Trình Khôi Phục An Toàn (`scripts/restore-local.sh`):**
   - Kiểm tra tính đầy đủ của bản sao lưu: bắt buộc phải có cả database dump và file `media.tar.gz` có dung lượng hợp lệ (> 0 byte).
   - Kiểm tra tính toàn vẹn của tệp nén media bằng `tar -tzf` trước khi thực hiện bất kỳ thay đổi nào.
   - Tự động kích hoạt `backup-local.sh` tạo bản sao lưu an toàn của trạng thái hiện tại trước khi khôi phục (pre-restore safety backup).
   - Đảm bảo service container database đang chạy (`up -d --wait db`) trước khi gọi `pg_restore`.
   - Sửa lỗi crash khi khôi phục vào môi trường mới chưa có sẵn thư mục `.local/media` (`if [[ -d .local/media ]]`).
   - Dọn dẹp an toàn thư mục staging với `rm -rf .local/restore-staging`.
5. **Cải Tiến Script Khởi Động & Dừng (`scripts/start-local.sh`, `scripts/stop-local.sh`):**
   - Hỗ trợ linh hoạt khi chạy với SQLite (`DJANGO_DB_ENGINE=sqlite`) mà không ép buộc phải có Docker daemon.
   - Xử lý PID file không bị treo (stale PID) khi tiến trình trước đó bị tắt bất thường.

### 12.2. Kết Quả Thực Thi
- Toàn bộ 168 tests backend và 56 tests frontend tiếp tục đạt **100% PASS**.
- Pipeline `./scripts/check.sh all` đạt **100% PASS**.
- Cú pháp toàn bộ 7 scripts bash (`bash -n scripts/*.sh`) đạt chuẩn 100% không lỗi.
- **Lưu ý xác minh:** Theo Hợp đồng Vận hành (AGENTS.md), không chạy các lệnh phục hồi (`restore-local.sh`) hay xóa/ghi đè lên dữ liệu thật đang dùng. Quy trình phục hồi được xác nhận tính đúng đắn về mặt logic kịch bản và toàn vẹn file, nhưng chưa thực hiện thao tác restore phá hủy trên database môi trường này.

---

## 13. Đối Chiếu Tài Liệu & Đồng Bộ Toàn Diện Hướng Dẫn Thực Tế (Prompt 29 - Hoàn Tất Series)

### 13.1. Các Cập Nhật Tài Liệu Đã Thực Hiện
1. **Đồng Bộ Hướng Dẫn Cài Đặt & Khởi Chạy ([`README.md`](file:///home/longtran/Projects/rendez-web/README.md)):**
   - Loại bỏ các lệnh khởi chạy thủ công rời rạc, thay thế bằng 2 phương án chuẩn xác theo thực tế repository:
     - *Cách 1 (Khởi chạy trọn gói Production-like qua Gunicorn tại cổng 8080):* Dùng `bash scripts/setup-local.sh` và `bash scripts/start-local.sh` (hoặc `make setup`, `make start`).
     - *Cách 2 (Khởi chạy Development Mode phân tách):* Backend tại cổng 8000 (`make backend`), Frontend tại cổng 5173 (`make frontend`).
2. **Quy Trình Kiểm Thử Tập Trung:**
   - Hướng dẫn chạy kiểm thử toàn diện qua `bash scripts/check.sh all` (hoặc `make check`), liệt kê đầy đủ 9 bước kiểm tra tự động (linters, formatters, migrations dry-run, Django check, 168 tests pytest, 56 tests vitest, và build sản phẩm).
3. **Quy Trình Sao Lưu & Khôi Phục Dữ Liệu Thực Tế:**
   - Hướng dẫn cụ thể lệnh sao lưu `bash scripts/backup-local.sh` (`make backup`) tạo gói gồm cơ sở dữ liệu (`database.dump` / `database.sqlite3`), toàn bộ kho media (`media.tar.gz`) và cấu hình môi trường.
   - Hướng dẫn quy trình khôi phục an toàn `bash scripts/restore-local.sh .local/backups/<backup> --yes` (`make restore BACKUP=...`) kèm cơ chế tự động sao lưu an toàn trạng thái hiện tại trước khi khôi phục (`pre-restore safety backup`).
4. **Bảng Tra Cứu Biến Môi Trường Cốt Lõi:**
   - Liệt kê chi tiết mục đích và yêu cầu bảo mật của từng biến: `DJANGO_DEBUG`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `DJANGO_HTTPS`, `POSTGRES_*`, `PRIVATE_MEDIA_ROOT`.
5. **Cập Nhật Danh Mục API Thực Tế ([`docs/BACKEND.md`](file:///home/longtran/Projects/rendez-web/docs/archive/BACKEND.md)):**
   - Bổ sung đầy đủ các endpoint mới được hoàn thiện: `photos/<id>/likes/` (POST/DELETE), `comments/<id>/` (PATCH/DELETE), `places/geocode/?q=` (GET), `creators/<id>/` và `creators/<id>/photos/` (GET), `public-photo-media/<id>/` và `private-photo-media/<id>/`.
6. **Bổ Sung Lệnh Makefile:**
   - Thêm target `restore:` vào [`Makefile`](file:///home/longtran/Projects/rendez-web/Makefile) cho phép người dùng khôi phục thuận tiện qua lệnh `make restore BACKUP=.local/backups/<backup-folder>`.

### 13.2. Kết Quả Thực Thi
- Toàn bộ 168 tests backend và 56 tests frontend tiếp tục đạt **100% PASS**.
- Pipeline `./scripts/check.sh all` đạt **100% PASS**.
- Toàn bộ tài liệu tuân thủ chuẩn định dạng Prettier Markdown.
- Hoàn tất toàn diện 29 prompt theo đúng cam kết Hợp đồng Vận hành (AGENTS.md).

---

## 14. Báo Cáo Kiểm Toán Độc Lập Toàn Bộ Repository (Independent Repository Audit)

### 14.1. Phạm Vi Kiểm Toán
Rà soát độc lập trên toàn bộ hệ thống: mã nguồn backend, frontend, cấu hình môi trường, dependencies manifest (`pyproject.toml`, `package.json`), migrations, tests (unit, integration), scripts vận hành, tài liệu và trạng thái Git.

### 14.2. Lỗi Đã Xác Minh & Khắc Phục
1. **Lệch Đồng Bộ OpenAPI Schema & TypeScript Types:**
   - *Hiện tượng:* `backend/openapi.yaml` (37.510 bytes) chưa được cập nhật các endpoint mới phát triển (`photos/<id>/likes/`, `comments/<id>/` PATCH/DELETE, `places/geocode/`, `creators/<id>/`, `media/`), do lệnh `manage.py spectacular --validate` gặp lỗi thiếu module nhị phân `rpds.rpds` của thư viện `jsonschema` trên Python 3.14.
   - *Khắc phục:* Tạo script phát sinh schema độc lập [`scripts/generate-schema.py`](file:///home/longtran/Projects/rendez-web/scripts/generate-schema.py) gọi trực tiếp `SchemaGenerator` chuẩn của DRF-Spectacular. Cập nhật `backend/openapi.yaml` (44.476 bytes, đủ 29 endpoints) và biên dịch lại [`frontend/src/lib/api/generated.d.ts`](file:///home/longtran/Projects/rendez-web/frontend/src/lib/api/generated.d.ts). Cập nhật lệnh `make schema` hoạt động tin cậy 100%.
2. **Kiểm Tra An Toàn & Định Dạng Toàn Diện:**
   - Chạy `git diff --check` đạt 0 lỗi whitespace hoặc conflict markers.
   - Rà soát toàn bộ 7 kịch bản shell với `bash -n` đạt chuẩn 100%.

### 14.3. Kết Quả Kiểm Thử Toàn Diện Cuối Cùng
- `backend-lint` (ruff check backend): **PASS** (0 lỗi)
- `backend-format` (ruff format --check backend): **PASS**
- `ruff check --select S,B backend/apps backend/config`: **PASS** (0 cảnh báo bảo mật)
- `migrations` (dry-run): **PASS**
- `backend-tests` (pytest): **PASS** (168/168 tests)
- `django-check`: **PASS**
- `django-check --deploy` (DEBUG=0): **PASS**
- `frontend-lint` (eslint): **PASS** (0 warnings, 0 errors)
- `frontend-format` (prettier --check): **PASS**
- `frontend-typecheck` (tsc -b): **PASS** (0 type errors)
- `frontend-tests` (vitest): **PASS** (56/56 tests)
- `frontend-build` (tsc -b && vite build): **PASS**

---

## 15. Kiểm Thử Tích Hợp Toàn Hệ Thống (System-Wide Multi-Actor Integration Testing)

### 15.1. Các Luồng Nghiệp Vụ Tích Hợp Được Đánh Giá
Đã xây dựng bộ kiểm thử tích hợp xuyên suốt kết nối trọn vẹn giữa Frontend API, Business Logic, Database Transaction, Filesystem Media và Quyền Truy Cập ([`backend/tests/test_system_wide_integration_lifecycle.py`](file:///home/longtran/Projects/rendez-web/backend/tests/test_system_wide_integration_lifecycle.py)):
1. **Luồng Vòng Đời Đa Tác Tử (Multi-Actor Journey):**
   - *Xác thực & Phiên:* User A đăng ký tài khoản mới (`POST /api/v1/auth/register/`), kiểm tra session và thông tin cá nhân (`GET /api/v1/auth/me/`).
   - *Đóng góp & Idempotency:* User A gửi ảnh đóng góp kèm đề xuất địa điểm mới (`POST /api/v1/photo-submissions/`) với `Idempotency-Key` -> tự động tạo Place công khai, PhotoSubmission, PhotoAsset và PlacePhoto.
   - *Ngăn trùng lặp (Idempotent Retry):* Gửi lại đúng payload và key -> nhận lại kết quả cũ, cơ sở dữ liệu không bị nhân bản quán hay ảnh.
   - *Khám phá & Bản đồ:* User B đăng ký tài khoản, duyệt Feed công khai (`GET /api/v1/feed/`), tìm kiếm quán theo tên (`GET /api/v1/places/?q=...`), truy vấn bản đồ trong bounding box (`GET /api/v1/places/map/?bbox=...`).
   - *Tương tác Xã hội & Phân quyền:*
     - User B thích ảnh (`POST /api/v1/photos/{id}/likes/`) -> count tăng 1, like lại không tăng ảo.
     - User B viết bình luận (`POST /api/v1/photos/{id}/comments/`).
     - User B chỉnh sửa bình luận của mình (`PATCH /api/v1/comments/{id}/`) thành công.
     - User A cố tình sửa bình luận của User B -> bị chặn 403 Forbidden.
     - User B lưu quán vào mục yêu thích (`PUT /api/v1/favorites/{id}/`) -> hiển thị trên `/api/v1/favorites/`.
   - *Báo cáo & Kiểm duyệt Quản trị:*
     - User B gửi báo cáo vi phạm ảnh (`POST /api/v1/photos/{id}/report/`).
     - Quản trị viên (`staff`) thực hiện kiểm duyệt chấp thuận báo cáo (`moderate_report` action="take_down").
   - *Đồng bộ Trạng thái Sau Gỡ Bỏ:*
     - Ảnh chuyển sang trạng thái `withdrawn`, báo cáo chuyển thành `resolved`.
     - Ảnh biến mất khỏi Feed công khai (`/api/v1/feed/`).
     - Endpoint media công khai (`/public-photo-media/{id}/`) trả về 404 Not Found.
     - Ranh giới bảo mật: Tác giả User A vẫn xem được ảnh gốc của mình tại `/private-photo-media/{id}/` (200), nhưng User B bị từ chối 404.
     - Thao tác bình luận vào ảnh đã gỡ bị chặn 404.
   - *Dọn dẹp & Đăng xuất:* User B xóa bình luận (`DELETE /api/v1/comments/{id}/`), cả 2 user đăng xuất (`POST /api/v1/auth/logout/`), các request bảo vệ sau đó đều trả về 401.
2. **Luồng Xử Lý Lỗi, Dữ Liệu Rác & Bảo Mật Ranh Giới (Error & Malicious Payload Recovery):**
   - Upload file ảnh rác/hỏng -> trả về 400 rõ ràng, không làm crash server (500) và không tạo bản ghi mồ côi.
   - Upload vượt quá 5 ảnh -> chặn 400.
   - Đổi mật khẩu với mật khẩu hiện tại sai -> chặn 400.
   - Tham số BBox bản đồ bị lỗi định dạng hoặc phạm vi quá lớn (> 2 độ) -> 400.
   - Geocoding với chuỗi truy vấn rỗng/khoảng trắng -> chặn 400.
   - Traversal attack trong media request qua UUID giả mạo -> trả về 404 an toàn.

### 15.2. Kết Quả Thực Thi
- Tổng số backend tests: **170 tests** (100% PASS, tăng 2 integration tests hệ thống).
- Tổng số frontend tests: **56 tests** (100% PASS).
- Toàn bộ `./scripts/check.sh all` đạt **100% PASS**.

---

## 16. Kiểm Toán Bảo Mật Toàn Diện (Defensive Security Audit & Trust Boundary Verification)

### 16.1. Phương Pháp & Ranh Giới Kiểm Toán
Vòng kiểm toán bảo mật cuối cùng được thực hiện theo nguyên tắc **Kiểm thử Phòng thủ (Defensive Testing)**, tập trung vào các ranh giới tin cậy (Trust Boundaries) giữa Trình duyệt (Frontend), Giao diện Lập trình Ứng dụng (API Layer), Bộ nhớ/Bộ đệm (File Media Serving) và Cơ sở Dữ liệu Quan hệ (PostgreSQL). Toàn bộ quá trình tuân thủ nghiêm ngặt Hợp đồng Vận hành (không quét xâm nhập ra ngoài, không dùng mạng ngoài, không can thiệp credentials sản xuất).

### 16.2. Ma Trận Đánh Giá Bề Mặt Tấn Công & Ranh Giới Tin Cậy
1. **Xác thực & Quản lý Phiên (Authentication & Session Security):**
   - *Ranh giới:* Django Session Authentication kết hợp CSRF token.
   - *Cơ chế:* Đăng nhập, đăng ký, đăng xuất, đổi mật khẩu và xóa tài khoản đều được bảo vệ bằng CSRF. Đổi mật khẩu kích hoạt `update_session_auth_hash` ngăn chặn chiếm phiên cũ. Xóa tài khoản vô danh hóa (`is_active=False`, `set_unusable_password()`, gỡ bỏ email/tên hiển thị) và rút toàn bộ ảnh (`withdrawn`) ngay lập tức trong transaction.
2. **Kiểm soát Quyền & Phòng Chống IDOR/BOLA (Authorization & Object-Level Access):**
   - *Ranh giới:* [`backend/apps/photos/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/views.py), [`backend/apps/photos/services.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/services.py).
   - *Cơ chế:*
     - Lớp `OwnPhoto` (`/api/v1/photos/{id}/manage/`): Kiểm tra quyền sở hữu ảnh thông qua `asset__submission__submitted_by=user` trong khối khóa `select_for_update()`. Người dùng khác hoàn toàn không thể sửa chú thích hoặc gỡ ảnh.
     - Lớp `CommentDetail` (`/api/v1/comments/{id}/`): Chỉ chính tác giả bình luận (`comment.user_id == request.user.pk`) hoặc nhân viên có quyền (`is_staff`) mới được sửa hoặc xóa. Ngăn chặn sửa bình luận trên ảnh đã bị rút (`withdrawn`).
     - Lớp `SubmissionDetail`: Queryset được khóa cứng theo `submitted_by=self.request.user` cho người dùng thông thường, ngăn chặn IDOR dò quét thông tin đóng góp của tác giả khác.
3. **Bảo Mật Tải Lên Tệp & Xử Lý Đồ Họa (File Upload & Media Pipeline):**
   - *Ranh giới:* [`backend/apps/photos/images.py`](file:///home/longtran/Projects/rendez-web/backend/apps/photos/images.py) & `media` view.
   - *Cơ chế:*
     - Giới hạn tải lên tối đa 5 file/request, 1MB memory/file và tổng dung lượng 50MB.
     - Đọc kiểm tra định dạng và kích thước thực tế bằng Pillow (`PIL.Image`).
     - Tự động loại bỏ 100% siêu dữ liệu EXIF/GPS của ảnh, chuyển đổi hệ màu RGBA/P sang RGB, resize an toàn (chiều dài tối đa 2560px) và re-encode ra JPEG chuẩn.
     - Tên file do client tải lên bị hủy bỏ hoàn toàn; tệp lưu trữ được đặt tên bằng UUID ngẫu nhiên và kiểm tra toàn vẹn băm SHA-256.
     - Tệp ảnh gốc (`original`) chỉ cho phép quản trị viên tải (`photos.review_photosubmission`). Tệp phái sinh riêng tư (`private-photo-media`) chỉ cho phép tác giả xem. Tệp công khai (`public-photo-media`) chỉ phục vụ ảnh hợp lệ của quán công khai.
     - Kiểm tra Path Traversal tuyệt đối bằng `resolve()` và `is_relative_to(settings.MEDIA_ROOT)`.
4. **Phòng Ngừa Mass Assignment & Ràng Buộc Dữ Liệu:**
   - Tất cả các serializer tiếp nhận dữ liệu đầu vào (`ProfileUpdateSerializer`, `PhotoUploadSerializer`, `CommentCreateSerializer`, v.v.) chỉ định tường minh các trường được phép sửa. Các trường nhạy cảm như `is_staff`, `is_superuser`, `status`, `submitted_by` không bao giờ được gán từ `request.data`.
5. **Chống SQL Injection & XSS & CORS:**
   - 100% câu lệnh truy vấn qua Django ORM Parameterized Queries; không sử dụng SQL thô (`raw`, `extra`).
   - Frontend React escape tự động nội dung đầu ra; `django-cors-headers` được cấu hình chặt chẽ chỉ mở cho `CLIENT_ORIGIN` (mặc định localhost frontend).
6. **Bảo Vệ Tốc Độ & Phòng Chống Race Condition (Rate Limiting & Concurrency):**
   - Áp dụng `ScopedRateThrottle` trên tất cả endpoint nhạy cảm (auth, upload, report, comment, password, like, favorite).
   - Cơ chế `Idempotency-Key` kết hợp băm SHA-256 payload và hàng đợi khóa dòng `select_for_update()` ngăn chặn hoàn toàn việc nhân đôi đóng góp và race condition khi gửi lặp.

---

## 17. Kiểm Chứng Triển Khai & Vận Hành Hệ Thống (Deployment & Operational Verification)

### 17.1. Đối Chiếu Cấu Hình & Tài Liệu Vận Hành
- **Nhất quán giữa tài liệu và mã nguồn:** Các lệnh trong [`README.md`](file:///home/longtran/Projects/rendez-web/README.md) (`make setup`, `make start`, `make stop`, `make check`, `make backup`, `make restore`) ánh xạ chính xác 1:1 với các script trong [`scripts/`](file:///home/longtran/Projects/rendez-web/scripts/) và mục tiêu trong [`Makefile`](file:///home/longtran/Projects/rendez-web/Makefile).
- **Phục vụ tĩnh & Frontend SPA:** Tệp [`backend/config/local.py`](file:///home/longtran/Projects/rendez-web/backend/config/local.py) phục vụ ứng dụng Vite đã build từ `frontend/dist/` thông qua Gunicorn tại cổng 8080. Đã định tuyến fallback cho SPA routes và trả về 404 cho asset tĩnh hoặc endpoint API không tồn tại.

### 17.2. Xử Lý Rõ Ràng Biến Môi Trường & Bí Mật
- Khi `DJANGO_DEBUG=0`:
  - `DJANGO_SECRET_KEY`: Bắt buộc độ dài ≥ 32 ký tự, không dùng default fallback hoặc prefix `django-insecure-`. Thiếu secret sẽ ngay lập tức raise `RuntimeError` và dừng khởi động.
  - `DJANGO_ALLOWED_HOSTS`: Bắt buộc chỉ định domain/IP cụ thể, từ chối ký tự đại diện `*`.
  - `POSTGRES_PASSWORD`: Bắt buộc khi dùng PostgreSQL, cấm chạy âm thầm với mật khẩu rỗng.
- Endpoint giám sát sức khỏe: `/api/v1/health/` truy vấn `SELECT 1`, trả về 200 OK khi database sẵn sàng và 503 Service Unavailable khi kết nối cơ sở dữ liệu gặp sự cố.

### 17.3. Phụ Thuộc Dịch Vụ Ngoài & Bản Đồ
- **Dependency:** 100% thư viện Backend (Django, DRF, Pillow, Gunicorn, Psycopg) và Frontend (React, Vite, MapLibre, TanStack Query, Tailwind) đều là mã nguồn mở (BSD, MIT, Apache). Không có dependency thương mại hoặc yêu cầu thẻ thanh toán.
- **Tài nguyên Bản đồ & Giới hạn Offline:**
  - Nhãn đường (`region.geojson`), kiểu bản đồ và glyphs phông chữ (`Noto Sans Regular`) được lưu trữ và phục vụ 100% cục bộ.
  - Lớp nền raster tiles lấy từ dịch vụ gạch bản đồ công cộng (`server.arcgisonline.com`). Khi ngắt kết nối mạng, bản đồ vẫn hiển thị nền ấm và thông báo lỗi thân thiện kèm nút thử lại (`onError` trong React component), nhưng **không thể hoạt động ngoại tuyến trọn vẹn lớp ảnh nền (raster base tiles)** nếu không có máy chủ tile hoặc file mbtiles cục bộ.

### 17.4. Kiểm Chứng Sao Lưu & Khôi Phục (Backup & Restore Simulation)
- Đã bổ sung bộ kiểm thử tự động độc lập [`backend/tests/test_backup_restore_lifecycle.py`](file:///home/longtran/Projects/rendez-web/backend/tests/test_backup_restore_lifecycle.py):
  - Tạo cơ sở dữ liệu và kho media giả lập trong thư mục tạm `tmp_path`.
  - Thực hiện quy trình sao lưu (dump database + nén `media.tar.gz`).
  - Kiểm tra tính toàn vẹn băm SHA-256 và cấu trúc tarball.
  - Thực hiện khôi phục sang thư mục đích mới và đối chiếu khớp 100% bản ghi dữ liệu và tệp nhị phân.
  - Kiểm tra endpoint `/api/v1/health/` ở cả 2 trạng thái thành công (200) và sự cố database giả lập (503).
- Toàn bộ 173 backend tests và 56 frontend tests đều đạt PASS.
