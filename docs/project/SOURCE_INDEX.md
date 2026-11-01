# Rendez — Mục Lục Tra Cứu Mã Nguồn (Source Index)

Tài liệu này là chỉ mục tra cứu nhanh (Quick Navigation Index), giúp các kỹ sư và AI coding agent nhanh chóng định vị chính xác vị trí tệp tin, lớp (class), hàm (function) và cấu hình trong toàn bộ repository Rendez.

---

## 1. Tài Liệu Dự Án & Thẩm Quyền Miền (Documentation & Domain Authority)

| Tài liệu | Đường dẫn tệp | Vai trò cốt lõi |
|---|---|---|
| **Hợp đồng vận hành AI Agent** | [AGENTS.md](file:///home/longtran/Projects/rendez-web/AGENTS.md) | Các quy tắc thao tác an toàn, ranh giới cấm kỵ và quy trình báo cáo |
| **Từ điển miền chuẩn mực** | [GLOSSARY.md](file:///home/longtran/Projects/rendez-web/GLOSSARY.md) | Thẩm quyền tối cao về Ubiquitous Language & phân loại trạng thái |
| **Hướng dẫn nhập môn Agent** | [docs/PROJECT_GUIDE.md](file:///home/longtran/Projects/rendez-web/docs/PROJECT_GUIDE.md) | Điểm bắt đầu duy nhất (Single Entry Point) cho kỹ sư và agent mới |
| **Tuyên ngôn sản phẩm** | [PRODUCT.md](file:///home/longtran/Projects/rendez-web/PRODUCT.md) | Mục đích sản phẩm, đối tượng người dùng, triết lý Visual Truth |
| **Hệ thống thiết kế** | [DESIGN.md](file:///home/longtran/Projects/rendez-web/DESIGN.md) | Phong cách Warm Botanical Pine & Clay, bảng màu, thang phông chữ |
| **Tổng quan sản phẩm chuyên sâu**| [docs/project/PRODUCT_OVERVIEW.md](file:///home/longtran/Projects/rendez-web/docs/project/PRODUCT_OVERVIEW.md) | Chi tiết hành trình người dùng, phạm vi địa lý và ranh giới loại trừ |
| **Mô hình nghiệp vụ chuyên sâu** | [docs/project/DOMAIN_MODEL.md](file:///home/longtran/Projects/rendez-web/docs/project/DOMAIN_MODEL.md) | Thực thể miền, quan hệ tương tác, vòng đời và bất biến nghiệp vụ |
| **Kiến trúc hệ thống** | [docs/project/ARCHITECTURE.md](file:///home/longtran/Projects/rendez-web/docs/project/ARCHITECTURE.md) | Sơ đồ luồng dữ liệu, ranh giới phân quyền media, kiến trúc Monolith |
| **Chi tiết backend** | [docs/project/BACKEND.md](file:///home/longtran/Projects/rendez-web/docs/project/BACKEND.md) | Cấu trúc app, danh mục toàn bộ API `/api/v1/`, tầng dịch vụ, kiểm thử |
| **Chi tiết frontend** | [docs/project/FRONTEND.md](file:///home/longtran/Projects/rendez-web/docs/project/FRONTEND.md) | React 19 SPA, MapLibre GL, TanStack Query, lưới ảnh thích ứng |
| **Chi tiết UI/UX** | [docs/project/UI_UX.md](file:///home/longtran/Projects/rendez-web/docs/project/UI_UX.md) | Bảng màu, tokens CSS, quy tắc đổ bóng thực vật, bố cục responsive |
| **Dữ liệu & hạ tầng** | [docs/project/DATA_AND_INFRASTRUCTURE.md](file:///home/longtran/Projects/rendez-web/docs/project/DATA_AND_INFRASTRUCTURE.md) | PostgreSQL 17/PostGIS port 55433, volume, media, biến môi trường |
| **Cẩm nang kỹ thuật & vận hành** | [docs/project/ENGINEERING_GUIDE.md](file:///home/longtran/Projects/rendez-web/docs/project/ENGINEERING_GUIDE.md) | Hướng dẫn cài đặt, danh mục lệnh, kịch bản test cổng chất lượng |
| **Hiện trạng & nợ kỹ thuật** | [docs/project/PROJECT_STATUS.md](file:///home/longtran/Projects/rendez-web/docs/project/PROJECT_STATUS.md) | Ma trận trạng thái tính năng, các khoảng trống kỹ thuật tồn đọng |
| **Đăng bạ quyết định (ADRs)** | [docs/project/DECISIONS.md](file:///home/longtran/Projects/rendez-web/docs/project/DECISIONS.md) | Các quyết định kiến trúc đã duyệt & 3 điểm chờ quyết định |

---

## 2. Mã Nguồn Backend (Django Core & REST API)

### 2.1. Cấu Hình Dự Án (`backend/config/`)
- `backend/config/settings.py`: Cấu hình nền tảng Django, `INSTALLED_APPS`, middleware, template engines.
- `backend/config/local.py`: Cấu hình môi trường phát triển cục bộ, nạp biến từ `.local/runtime.env`.
- `backend/config/middleware.py`: Middleware tùy biến kiểm tra bảo mật và CSRF.
- `backend/config/urls.py`: Bộ định tuyến URL gốc, phân phối tới `/api/v1/` và `/admin/`.

### 2.2. Ứng Dụng `apps.accounts` (Người Dùng & Xác Thực)
- `backend/apps/accounts/models.py`:
  - `User`: Model người dùng tùy biến, định danh bằng email (`CustomUserManager`).
- `backend/apps/accounts/views.py`:
  - `CsrfCookieView`: Cấp phát CSRF cookie.
  - `RegisterView`, `LoginView`, `LogoutView`: Luồng xác thực session.
  - `CurrentUserView`, `ChangePasswordView`: Quản lý thông tin tài khoản cá nhân.
  - `CreatorDetailView`, `CreatorPhotosView`: Tuyến đường hiển thị hồ sơ tác giả ảnh công khai.

### 2.3. Ứng Dụng `apps.places` (Địa Điểm & Bản Đồ)
- `backend/apps/places/models.py`:
  - `Category`: Danh mục loại hình quán (Cà phê, Trà, Làm việc).
  - `Place`: Thực thể địa điểm cơ sở (tên, slug, tọa độ, địa chỉ, status, `deleted_at`, `verified_at`).
  - `PlaceOpeningHoursSpecification`: Đặc tả giờ mở cửa theo ngày.
- `backend/apps/places/geocoding.py`: Module geocoding đa nguồn (Nominatim, Photon, OSM cục bộ).
- `backend/apps/places/selectors.py`: Hàm truy vấn tối ưu cho địa điểm và bản đồ không gian.
- `backend/apps/places/views.py`:
  - `PlaceListView`, `PlaceDetailView`: Danh sách và chi tiết địa điểm.
  - `PlaceMapView`: Truy vấn địa điểm trong khung nhìn không gian `?bbox=west,south,east,north`.
  - `GeocodeView`: API gợi ý tọa độ khi nhập địa chỉ.

### 2.4. Ứng Dụng `apps.photos` (Tư Liệu Ảnh & Đóng Góp)
- `backend/apps/photos/models.py`:
  - `PlacePhoto`: Bản ghi ảnh công khai gắn với Place (status: `pending_publication`, `published`, `withdrawn`).
  - `PhotoAsset`: Quản lý tệp nhị phân (`original` đã chuẩn hóa, `derivative` nén, sha256).
  - `VisualAttribute`: Danh mục đặc tính thị giác (Bàn học & Ổ cắm, Yên tĩnh, Điều hòa...).
  - `PhotoAttribute`: Bản ghi liên kết gán đặc tính (kèm `reviewed_by`, `source="manual"`).
  - `PhotoSubmission`: Lượt gửi chùm 1–5 ảnh kèm xác nhận điều khoản sử dụng `photo-rights-v2`.
  - `VenueProposal`: Model đề xuất quán mới (hiện bị luồng `submit()` bỏ qua).
  - `PhotoComment`, `PhotoLike`: Tương tác bình luận và thích ảnh.
  - `ContentReport`: Tiếp nhận báo cáo vi phạm nội dung.
  - `PhotoAudit`: Nhật ký kiểm toán các thao tác quản trị ảnh.
- `backend/apps/photos/services.py`:
  - `submit()`: Luồng nộp ảnh nguyên tử, khóa dòng `select_for_update()`, auto-publication.
  - `change_publication()`: Rút ảnh vi phạm, hủy cờ bìa `is_cover`, ghi nhật ký kiểm toán.
  - `set_tags()`: Gán/gỡ đặc tính thị giác thủ công cho ảnh.
  - `check_reviewer()`: Kiểm tra quyền kiểm duyệt viên (`photos.review_photosubmission`).
- `backend/apps/photos/images.py`:
  - `normalize_image()`: Tái tạo pixel, tháo gỡ EXIF, chuyển sRGB, nén phái sinh WebP/JPEG, tính SHA-256.
- `backend/apps/photos/selectors.py`: Truy vấn feed ảnh tối ưu hóa, eager loading chống N+1.
- `backend/apps/photos/views.py`:
  - `FeedView`: Lưới ảnh Masonry trang chủ.
  - `PhotoSubmissionView`: API nộp ảnh mới.
  - `PublicPhotoMediaView`, `PrivatePhotoMediaView`, `PrivatePhotoOriginalView`: Phục vụ tệp media có bảo vệ.

### 2.5. Ứng Dụng `apps.favorites` (Lưu Quán Yêu Thích)
- `backend/apps/favorites/models.py`: `Favorite` (liên kết User $\leftrightarrow$ Place).
- `backend/apps/favorites/views.py`: `FavoriteListView`, `FavoriteDetailView` (quản lý `/saved`).

---

## 3. Mã Nguồn Frontend (React 19 SPA)

### 3.1. Các Màn Hình & Thành Phần Cốt Lõi (`frontend/src/app/`)
- `frontend/src/app/App.tsx`: Điểm khởi đầu cấu hình BrowserRouter, Header, Desktop Rail và Bottom Bar.
- `frontend/src/app/discovery.tsx`: Màn hình Khám phá chính, thanh tìm kiếm, bộ lọc chip và lưới ảnh.
- `frontend/src/app/map.tsx`: Màn hình Bản đồ số MapLibre GL 5, xử lý đồng bộ hai chiều `bbox` với URL.
- `frontend/src/app/masonry.tsx`: Thành phần Lưới ảnh thích ứng tỷ lệ thật (Micro-row 8px + `ResizeObserver`).
- `frontend/src/app/creator.tsx`: Màn hình Hồ sơ tác giả ảnh (`/creators/:id`).
- `frontend/src/app/auth.tsx`: Form đăng nhập, đăng ký và đổi mật khẩu.
- `frontend/src/app/contributions.tsx`: Modal tải lên 1–5 ảnh, tích hợp geocoding gợi ý địa chỉ.
- `frontend/src/app/shared.tsx`: Các tiện ích giao diện dùng chung (Empty states, Skeleton loader).

### 3.2. Thành Phần UI Nguyên Tử (`frontend/src/components/ui/`)
- `frontend/src/components/ui/button.tsx`: Nút bấm dạng viên thuốc chuẩn Design Tokens.
- `frontend/src/components/ui/confirm-dialog.tsx`: Hộp thoại xác nhận hành vi nguy hiểm (gỡ ảnh, xóa bình luận).

### 3.3. Tầng Giao Tiếp Mạng (`frontend/src/lib/api/`)
- `frontend/src/lib/api/client.ts`: Wrapper `fetch` tự động đính kèm `X-CSRFToken` và xử lý mã lỗi 401.
- `frontend/src/lib/api/visual.ts`: Các hàm gọi API Feed, Photos, Places, Favorites.
- `frontend/src/lib/api/generated.d.ts`: Các định nghĩa TypeScript interface đồng bộ với backend schema.

### 3.4. Hệ Thống Kiểu Dáng (`frontend/src/styles/`)
- `frontend/src/styles/theme.css`: Biến màu sắc Warm Botanical, thang phông chữ, bán kính bo góc, bóng đổ.
- `frontend/src/styles/layout.css`: Khung bố cục Desktop Left Rail (80px) và Mobile Bottom Bar (64px).
- `frontend/src/styles/components.css`: Định kiểu chi tiết cho Masonry pin, chip bộ lọc, modal form.
- `frontend/src/styles/map.css`: Tùy biến thanh điều khiển và popup của MapLibre GL.

---

## 4. Dữ Liệu Hạt Giống & Tài Nguyên Bản Đồ

- `data/danang.json`: Manifest 12 cơ sở quán cà phê quanh khu vực Đại học Bách Khoa Đà Nẵng. 36 ảnh trong `data/photos/` là **ảnh minh hoạ sinh tự động** (placeholder), không phải ảnh chụp thực địa — xem `data/README.md` mục 5.
- `data/photos/`: 36 tệp ảnh minh hoạ sinh tự động, không phải ảnh chụp thực địa (xem `data/README.md` mục 5).
- `frontend/public/map/region.geojson`: Dữ liệu vector mạng lưới giao thông khu vực Liên Chiểu.
- `frontend/public/map/style.json`: Cấu hình lớp bản đồ MapLibre, nạp lớp gạch nền raster từ dịch vụ gạch công cộng.
- `frontend/public/map/glyphs/`: Bộ ký tự phông chữ tiếng Việt Noto Sans Regular phục vụ bản đồ nội bộ.

---

## 5. Bộ Kịch Bản Vận Hành & Kiểm Thử (`scripts/`)

- `scripts/setup-local.sh`: Kịch bản thiết lập toàn bộ môi trường phát triển cục bộ một chạm.
- `scripts/start-local.sh`: Kịch bản khởi động Docker container PostgreSQL và máy chủ Gunicorn.
- `scripts/stop-local.sh`: Kịch bản dừng toàn bộ ứng dụng và tiến trình nền an toàn.
- `scripts/check.sh`: Cổng kiểm tra chất lượng 9 bài kiểm thử (Backend + Frontend).
- `scripts/backup-local.sh`: Kịch bản sao lưu nén dump PostgreSQL và thư mục media `.local/media`.
- `scripts/restore-local.sh`: Kịch bản phục hồi dữ liệu từ tệp sao lưu.
- `scripts/create-admin.py`: Kịch bản tạo tài khoản quản trị Django Admin.

---

## 6. Bộ Kiểm Thử Tự Động (Test Suites)

### Backend (178 bài test Pytest)
- `backend/tests/test_api.py`: Hợp đồng API RESTful và kiểm tra CSRF.
- `backend/tests/test_auto_publication.py`: Luồng tự động xuất bản và bỏ qua `VenueProposal`.
- `backend/tests/test_auth_flow.py`: Vòng đời xác thực session và đăng ký.
- `backend/tests/test_upload_safety.py`: Ranh giới an toàn tệp tải lên, bóc tách EXIF và rollback lỗi.
- `backend/tests/test_database_schema_invariants.py`: Ràng buộc toàn vẹn cơ sở dữ liệu.
- `backend/tests/test_file_serving_security.py`: Ranh giới phân quyền phục vụ tệp media.
- `backend/tests/test_performance_pagination_and_eager_loading.py`: Tối ưu hóa truy vấn chống N+1.
- `backend/tests/test_backup_restore_lifecycle.py`: Vòng đời sao lưu và phục hồi dữ liệu.

### Frontend (56 bài test Vitest)
- `frontend/src/app/access.test.tsx`: Phân quyền màn hình và kiểm tra session.
- `frontend/src/app/accessibility.test.tsx`: Trợ năng WCAG 2.1 AA và điều hướng phím.
- `frontend/src/app/image_perf.test.tsx`: Hiệu năng hiển thị ảnh và độ ổn định layout.
- `frontend/src/app/forms_and_navigation.test.tsx`: Tính hợp lệ của form nộp ảnh.
- `frontend/src/app/map.test.tsx`: Khởi tạo MapLibre và đồng bộ URL `bbox`.
- `frontend/src/app/shared.test.tsx`: Cập nhật lạc quan tương tác thích và bình luận.
- `frontend/src/features/shell/TermsPage.test.tsx`: Trang điều khoản sử dụng đọc được khi chưa có phiên.
- `frontend/src/features/contribute/CreateExperiencePage.test.tsx`: Hai trạng thái định vị địa chỉ.
- `frontend/src/lib/api/client.test.ts`: Header CSRF Token trong API client.
