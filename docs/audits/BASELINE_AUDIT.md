# Báo cáo Kiểm toán Toàn diện Repository Rendez (Baseline Audit Report)

**Thời điểm thực hiện:** `2026-11-03`  
**Vai trò:** Senior Software Architect & Software Quality Auditor  
**Chế độ thực thi:** READ-ONLY (Không chỉnh sửa/xóa bất kỳ file mã nguồn production nào)  
**Tập tin mục tiêu:** `docs/audits/BASELINE_AUDIT.md`  

---

## A. Executive Summary

Repository **Rendez** là nền tảng khám phá đô thị Đà Nẵng dựa trên trải nghiệm thị giác và nội dung do cộng đồng đóng góp (UGC). Hệ thống bao gồm:
- **Backend:** Monolith viết bằng Python 3.12 / Django 5.2, Django REST Framework (DRF), quản lý qua `uv`, cơ sở dữ liệu PostgreSQL (có cấu hình fallback SQLite cho local/test môi trường đơn giản), GIS indexing và mô hình lai (Hybrid model).
- **Frontend:** Single Page Application (SPA) viết bằng TypeScript 5.9, React 19, React Router 7, `@tanstack/react-query` v5, quản lý qua `bun` và Vite 7.
- **Tình trạng chất lượng kiểm chuẩn hiện tại:** Bộ script kiểm tra chất lượng chuẩn `scripts/check.sh all` đạt **10/10 PASS** (Backend lint, format, import-linter, migrations, 223 tests pytest, django-check; Frontend lint, format, 61 vitest tests, production build).
- **Phát hiện trọng yếu:** Toàn bộ hệ thống có kiến trúc mạch lạc, tuy nhiên còn tồn đọng một số technical debt, legacy dual-model (giữa `apps.favorites.Favorite` và `apps.favorites.SavedPlace`), code trùng lặp logic Geocoding/External HTTP calls, mock data và tính toán tĩnh tại trang Insights, cùng các cảnh báo/lỗi về UI copy & eyebrow tokens theo `docs/VOICE.md`.

---

## B. Actual Architecture (Kiến trúc thực tế)

### 1. Phân tầng & Boundaries
- **Backend Layers:**
  - `views` (`apps.*.views`): Xử lý request HTTP, parsing tham số, quyền truy cập (permission/throttling) và trả về DRF `Response`.
  - `services` (`apps.photos.services`): Nghiệp vụ xử lý ảnh, hashing idempotency, giao dịch lưu trữ file.
  - `selectors` (`apps.*.selectors`): Truy vấn dữ liệu có tối ưu (ORM annotations, select_related, subqueries, unaccent search).
  - `models` (`apps.*.models`): Thực thể dữ liệu Django ORM, CheckConstraints, GistIndex, Index, Invariants.
  - *Kiểm soát kiến trúc:* Được kiểm soát tự động thông qua [`backend/.importlinter`](file:///home/longtran/Projects/rendez-web/backend/.importlinter) ngăn chặn import lộn xộn giữa các tầng.
- **Frontend Layers:**
  - `features/*`: Phân bổ theo tính năng người dùng (`discovery`, `search`, `places`, `experiences`, `contribute`, `profile`, `activity`, `insights`, `saved`, `shell`).
  - `lib/api/*`: Client HTTP gõ kiểu chặt chẽ tự động sinh từ OpenAPI schema (`src/lib/api/generated.d.ts`), React Query hooks (`queries.ts`), session context (`session.tsx`).
  - `components/ui/*`: UI Primitives dùng chung (`Button`, `SafeImage`, `States`, `ConfirmDialog`).
  - `styles/*`: CSS Modules / Vanilla CSS cấu trúc theo design tokens chuẩn trong `tokens.css`.

### 2. Runtime & Infrastructure
- **Runtime Backend:** Python 3.12 (`backend/.venv`), gunicorn cho production, `uv` làm package manager.
- **Runtime Frontend:** Bun 1.3.14, Vite 7.1.0 dev/build server.
- **Database:** PostgreSQL (PostGIS / GiST Indexing cho tọa độ địa lý, unaccent extension cho tiếng Việt, JSONB cho metadata).

---

## C. Critical Findings (Phân loại mức độ nghiêm trọng)

### [P0] Critical
*Không có lỗi P0 nào làm sập hệ thống hoặc gây mất an toàn dữ liệu tức thời trong nhánh kiểm toán hiện tại.*

---

### [P1] High (Ảnh hưởng đáng kể đến maintainability hoặc sự toàn vẹn đa module)

#### 1. Dual-Model Phân mảnh giữa `Favorite` và `SavedPlace`
- **Vị trí:** 
  - [`backend/apps/favorites/models.py`](file:///home/longtran/Projects/rendez-web/backend/apps/favorites/models.py#L6-L26)
  - [`backend/apps/places/selectors.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/selectors.py#L42)
  - [`backend/apps/posts/views.py`](file:///home/longtran/Projects/rendez-web/backend/apps/posts/views.py#L162-L174)
  - [`frontend/src/lib/api/queries.ts`](file:///home/longtran/Projects/rendez-web/frontend/src/lib/api/queries.ts#L240-L260)
- **Thực trạng:** 
  - Cơ sở dữ liệu tồn tại đồng thời 2 bảng: `favorites_favorite` (legacy) và `favorites_savedplace` (mô hình chuẩn mới).
  - Endpoint `PUT/DELETE /api/v1/favorites/<id>/` ghi vào bảng `Favorite`.
  - Endpoint `POST/DELETE /api/v1/places/<id>/saved/` ghi vào bảng `SavedPlace`.
  - QuerySelector `visual_places` trong `places/selectors.py` kiểm tra `is_saved` thông qua bảng `Favorite`.
  - Frontend hook `useSavePlace()` gọi `/api/v1/favorites/<id>/` (thay vì `/api/v1/places/<id>/saved/`).
- **Hệ quả:** Rủi ro dữ liệu không đồng bộ nếu người dùng lưu qua endpoint mới của Post/Place module và kiểm tra qua endpoint cũ hoặc ngược lại.
- **Đề xuất remediation:** Lập kế hoạch deprecate endpoint `/api/v1/favorites/`, chuyển toàn bộ logic read/write sang `SavedPlace` và xóa bỏ model `Favorite` sau khi backfill hoàn tất.

#### 2. Kết nối Mạng Bên Ngoài (External Network Call) trong Luồng Geocoding
- **Vị trí:** [`backend/apps/places/geocoding.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/geocoding.py#L63-L140)
- **Thực trạng:** `geocode_address()` gọi trực tiếp ra HTTPS Nominatim (`nominatim.openstreetmap.org`) và Photon (`photon.komoot.io`) với timeout 3s mỗi nguồn khi người dùng submit/geocode địa chỉ.
- **Hệ quả:** Vi phạm nguyên tắc tự vận hành độc lập (offline-first/air-gapped) khi test hoặc triển khai nội bộ, tiềm ẩn nghẽn I/O và phụ thuộc rate-limit từ nhà cung cấp miễn phí bên ngoài.
- **Đề xuất remediation:** Cấu hình biến môi trường `ENABLE_EXTERNAL_GEOCODING=0/1`, ưu tiên sử dụng cơ sở dữ liệu nội suy cục bộ `query_osm_local_database` khi chạy test hoặc khi môi trường không có internet.

---

### [P2] Medium (Ảnh hưởng một số thành phần & logic nghiệp vụ)

#### 1. Dữ liệu Mô phỏng / Tĩnh tại Trang Insights (`InsightsPage.tsx`)
- **Vị trí:** [`frontend/src/features/insights/InsightsPage.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/features/insights/InsightsPage.tsx#L17-L22)
- **Thực trạng:** Các chỉ số lượt xem và tương tác được tính bằng công thức nội suy cố định:
  ```ts
  const estimatedViews = myPhotosCount * 42 + mySavedCount * 12 + 15;
  const estimatedViewers = Math.round(estimatedViews * 0.75);
  const estimatedInteractions = myPhotosCount * 8 + mySavedCount * 3 + 4;
  ```
  Biểu đồ SVG bên dưới sử dụng đường cong tọa độ cố định (`<polygon points="...">`, `<circle cx="260" ... />`) không dựa trên dữ liệu time-series thực tế từ backend.
- **Hệ quả:** Dữ liệu hiển thị không phản ánh số liệu thực tế từ cơ sở dữ liệu (`PostViewLog`, `PostLike`).
- **Đề xuất remediation:** Bổ sung endpoint backend thống kê thật hoặc hiển thị chỉ số trực tiếp từ dữ liệu bài viết/tương tác đã có trong session.

#### 2. Cảnh báo và Lỗi Từ ngữ Giao diện (Copy Audit Violations)
- **Vị trí:** 
  - [`frontend/src/app/auth.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/auth.tsx)
  - [`frontend/src/features/contribute/CreateExperiencePage.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/features/contribute/CreateExperiencePage.tsx)
  - [`frontend/src/features/profile/ProfilePage.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/features/profile/ProfilePage.tsx)
- **Thực trạng:** Chạy `node scripts/check-copy.mjs` phát hiện **11 lỗi** (thuật ngữ bị cấm: "chia sẻ trải nghiệm", "đăng trải nghiệm", marketing slogans) và **8 cảnh báo** (sử dụng `<p className="eyebrow">` không đúng quy chuẩn `docs/VOICE.md`).
- **Hệ quả:** Làm lệch tông giọng sản phẩm trung tính, vi phạm quy tắc bắt buộc trong `docs/VOICE.md` và `docs/UX_RULES.md`.

---

### [P3] Low (Cải thiện nhỏ, tối ưu hiệu năng hoặc code hygiene)

#### 1. Các Export Không Sử Dụng (Unused Exports từ Knip)
- **Vị trí:**
  - `PlaceCard` trong `src/app/shared.tsx:273` (đã có `src/features/places/PlaceCard.tsx`)
  - `PlaceRow` trong `src/features/places/PlaceCard.tsx:135`
  - `usePosts`, `useMapPlaces`, `useCreatorPhotos`, `isNotFound` trong `src/lib/api/queries.ts`
  - `ratioOf` trong `src/components/ui/safe-image.tsx:70`
  - `formatDate`, `formatCount`, `countLabel` trong `src/lib/format.ts`
- **Hệ quả:** Tăng kích thước bundle (dù có tree-shaking), gây nhầm lẫn cho kỹ sư khi import.
- **Đề xuất remediation:** Xóa bỏ hoặc unexport các hàm không còn consumer.

#### 2. Thư mục Rỗng và Tàn Dư Build Cũ
- **Vị trí:** `backend/apps/places/ai/` (chỉ chứa `__pycache__`, file mã nguồn đã được dọn sạch sang nhánh tính năng).
- **Hệ quả:** Gây nhiễu khi duyệt cây thư mục mã nguồn.

---

## D. File-Level Findings

| File | Thành phần | Vấn đề | Đề xuất |
|---|---|---|---|
| `backend/apps/favorites/views.py` | `VisualFavorites`, `FavoriteDetail` | Thao tác trên model cũ `Favorite` thay vì `SavedPlace` | Thống nhất sang `SavedPlace` |
| `backend/apps/places/selectors.py` | `visual_places` | Kiểm tra `is_saved` qua bảng `Favorite` | Đổi sang `SavedPlace` |
| `backend/apps/places/geocoding.py` | `_safe_https_get_json` | Gọi ra HTTP ngoài không có mock/bypass cho CI offline | Thêm flag cấu hình offline |
| `frontend/src/app/shared.tsx` | `PlaceCard` | Component trùng lặp với `features/places/PlaceCard.tsx` | Xóa bỏ component thừa |
| `frontend/src/features/insights/InsightsPage.tsx` | UI & Chart | Hardcode công thức và SVG path tĩnh | Tích hợp dữ liệu thực |
| `frontend/src/app/auth.tsx` | Copy strings | Chứa marketing slogans và thuật ngữ cấm | Cập nhật theo `docs/VOICE.md` |

---

## E. Duplication Inventory (Bản kiểm kê Trùng lặp)

Qua công cụ phân tích clone `jscpd` và rà soát thủ công:
1. **Frontend UI Components:**
   - `src/app/shared.tsx` chứa định nghĩa `PlaceCard` cũ trong khi `src/features/places/PlaceCard.tsx` là component chuẩn được sử dụng rộng rãi.
   - `src/app/contributions.tsx` và `src/features/contribute/CreateExperiencePage.tsx` có một số đoạn form preview và xử lý ảnh lặp logic.
2. **CSS Duplication:**
   - Tỷ lệ trùng lặp CSS là ~1.57% (160 dòng) chủ yếu ở các thẻ padding/badge giữa `styles/discover.css` và `styles/experiences.css`.
3. **Backend Logic:**
   - Chuẩn hóa tiếng Việt không dấu có 2 bản triển khai: `normalize_vietnamese_text` trong `places/selectors.py` và `unaccent` trong `places/geocoding.py`. Nên gộp chung vào một module tiện ích dùng chung.

---

## F. Dead Code Inventory (Bản kiểm kê Mã chết)

1. **Unused Functions / Components (Xác nhận bởi Knip):**
   - `frontend/src/app/shared.tsx`: `PlaceCard`
   - `frontend/src/features/places/PlaceCard.tsx`: `PlaceRow`
   - `frontend/src/lib/api/queries.ts`: `usePosts`, `useMapPlaces`, `useCreator`, `useCreatorPhotos`, `isNotFound`
   - `frontend/src/lib/format.ts`: `formatDate`, `formatCount`, `countLabel`
   - `frontend/src/components/ui/safe-image.tsx`: `ratioOf`
2. **Unused DevDependencies:**
   - `@vitest/coverage-v8` trong `frontend/package.json` (chỉ cần nếu chạy coverage riêng trong frontend).

---

## G. Dependency Inventory (Bản kiểm kê Thư viện)

### Backend (`backend/pyproject.toml`)
- `django>=5.2,<5.3`: Framework chính (Up-to-date, LTS).
- `djangorestframework>=3.16,<3.17`: API Toolkit.
- `drf-spectacular>=0.28,<0.29`: Sinh OpenAPI 3 schema tự động.
- `psycopg[binary]>=3.2,<3.3`: PostgreSQL driver thế hệ mới.
- `pillow>=11.3,<12`: Xử lý hình ảnh.
- `gunicorn>=23,<24`: WSGI server production.
- *Dev:* `import-linter`, `pytest`, `pytest-cov`, `pytest-django`, `ruff`.

### Frontend (`frontend/package.json`)
- `react@19.2.0`, `react-dom@19.2.0`: UI Library.
- `react-router@7.9.0`: Routing SPA.
- `@tanstack/react-query@5.90.0`: Server state management.
- `maplibre-gl@5.0.0`, `react-map-gl@8.0.0`: Bản đồ vector offline/online.
- `lucide-react@0.468.0`: Icon system.
- `zod@4.1.0`, `react-hook-form@7.65.0`, `@hookform/resolvers@5.2.0`: Form validation.
- *Trạng thái:* Toàn bộ dependency là các gói mã nguồn mở phổ biến, không có gói bản quyền hay chi phí billing.

---

## H. UI Inventory (Bản kiểm kê Giao diện)

| Trang / Màn hình | Route | Trạng thái UI | API Integration | Đánh giá |
|---|---|---|---|---|
| Khám phá (Discover) | `/discover` | Hoàn thiện | Đầy đủ (`useFeed`, `useCategories`) | Chuẩn responsive & filter |
| Trải nghiệm (Community) | `/posts` | Hoàn thiện | Đầy đủ (`useInfiniteQuery`) | Hỗ trợ pagination/infinite |
| Chi tiết Post | `/posts/:id` | Hoàn thiện | Đầy đủ (like, comment, save, share) | Tương tác đầy đủ |
| Chi tiết Địa điểm | `/places/:id` | Hoàn thiện | Đầy đủ (`usePlaceDetail`) | Bản đồ thu nhỏ, gallery ảnh |
| Bản đồ lớn (Map) | `/map` | Hoàn thiện | Đầy đủ (MapLibre vector) | Lazy-loaded tiết kiệm tải |
| Tìm kiếm (Search) | `/search` | Hoàn thiện | Đầy đủ (`useSearchPlaces`) | Hỗ trợ lọc danh mục & thuộc tính |
| Đóng góp (Contribute) | `/create` | Hoàn thiện | Đầy đủ (upload ảnh, gắn thẻ) | Kiểm tra quyền & validate ảnh |
| Đã lưu (Saved) | `/saved` | Hoàn thiện | Đầy đủ (chuyển tab Địa điểm/Bài viết) | Cần thống nhất model backend |
| Tổng quan (Insights) | `/insights` | Hoàn thiện | Một phần (mock tĩnh biểu đồ) | Cần kết nối dữ liệu thật |
| Hoạt động (Activity) | `/activity` | Hoàn thiện | Đầy đủ (lịch sử duyệt/tương tác) | Hoạt động tốt |
| Hồ sơ & Cài đặt | `/profile`, `/settings` | Hoàn thiện | Đầy đủ (đổi mật khẩu, xóa tài khoản) | Có dialog xác nhận nguy hiểm |
| Điều khoản (Terms) | `/terms` | Hoàn thiện | Static content | Chuẩn quy tắc chữ |

---

## I. Technical Debt Register (Sổ nợ Kỹ thuật)

1. **Legacy Dual-Write / Dual-Model:** Duy trì cả 2 bảng `Favorite` và `SavedPlace` gây phân mảnh API và selector.
2. **Mocking Data trong Trang Production Insights:** Các hằng số nhân và đường cong SVG tĩnh cần được chuyển thành số liệu động.
3. **Hardcoded Geocoding Endpoints:** Việc hardcode trực tiếp các domain `nominatim.openstreetmap.org` và `photon.komoot.io` trong `geocoding.py` thiếu khả năng ngắt chuyển mạch cấu hình linh hoạt.
4. **Copywriting Non-compliance:** Các chuỗi chữ vi phạm `docs/VOICE.md` tại màn hình Authentication và Contributions cần được điều chỉnh sang văn phong trung tính, chuẩn xác.

---

## J. Risk Assessment (Đánh giá Rủi ro)

- **Rủi ro Dữ liệu (Thấp - Trung bình):** Việc tồn tại song song 2 bảng lưu địa điểm có thể khiến số lượng địa điểm đã lưu bị vênh nếu một client gọi API cũ và một client khác gọi API mới.
- **Rủi ro Hiệu năng (Thấp):** Các truy vấn nặng đã được bảo vệ bằng GiST Index, B-Tree Index và Subquery caching.
- **Rủi ro Khả năng vận hành (Thấp):** Hệ thống build và test hoàn toàn tự động, phân tầng được khóa chặt bằng `import-linter`.

---

## K. Recommended Remediation Order (Thứ tự Xử lý Đề xuất)

Theo nguyên tắc **Subtractive Refactoring First** và **Minimal Change**:

1. **Đợt 1 - Dọn sạch Dead Code & Export Thừa (Low Risk, Zero Behavioral Change):**
   - Xóa `PlaceCard` thừa trong `frontend/src/app/shared.tsx`.
   - Xóa các export không dùng trong `frontend/src/lib/api/queries.ts` và `frontend/src/lib/format.ts`.
   - Dọn thư mục rỗng `backend/apps/places/ai/`.
2. **Đợt 2 - Chuẩn hóa Văn phong & UI Copy (Medium Priority):**
   - Khắc phục 11 lỗi và 8 cảnh báo từ `scripts/check-copy.mjs` trên các file `auth.tsx`, `CreateExperiencePage.tsx`, `ProfilePage.tsx` theo đúng `docs/VOICE.md`.
3. **Đợt 3 - Thống nhất Mô hình SavedPlace (High Priority, Data Integrity):**
   - Cập nhật `frontend/src/lib/api/queries.ts` để gọi `/api/v1/places/<id>/saved/`.
   - Chuyển `visual_places` trong `places/selectors.py` sang truy vấn `SavedPlace`.
   - Deprecate và lên lịch gỡ bỏ model `Favorite`.
4. **Đợt 4 - Cải thiện Geocoding & Insights (Feature Completeness):**
   - Thêm switch cấu hình cho Geocoding để hỗ trợ chạy offline thuần túy.
   - Thay thế các chỉ số tĩnh trong `InsightsPage.tsx` bằng dữ liệu aggregation thật từ session/API.

---

## L. Unverified Findings (Những điểm chưa xác minh)

- **Map Tiles Rendering thực tế:** Do môi trường kiểm toán là giao diện dòng lệnh không có màn hình hiển thị trực tiếp (headless), việc hiển thị visual thực tế của các tile bản đồ vector (`/map/style.json`) chưa được kiểm tra bằng mắt người, dù Playwright E2E test cho luồng bản đồ đã pass ở các đợt chạy trước.
- **Tốc độ phản hồi mạng ngoài của OpenStreetMap:** Chưa đo đạc độ trễ mạng thực tế từ các server Nominatim/Photon do tuân thủ nguyên tắc không thực hiện các request tải nặng không cần thiết trong phiên kiểm toán.
