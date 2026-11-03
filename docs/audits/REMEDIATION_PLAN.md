# Kế hoạch Khắc phục Kỹ thuật & Chiến lược Kiến trúc Thực tế (Remediation Plan)

Tập tin này được xây dựng dựa trên kết quả kiểm toán tại [docs/audits/BASELINE_AUDIT.md](file:///home/longtran/Projects/rendez-web/docs/audits/BASELINE_AUDIT.md).
Chiến lược tuân thủ tuyệt đối các nguyên tắc:
1. **Subtractive Refactoring First:** Ưu tiên xóa code chết, hợp nhất logic trùng lặp, xóa abstraction không cần thiết; không tạo thêm tầng lớp trung gian hay rewrite toàn bộ hệ thống.
2. **Không refactor hình thức:** Mỗi thay đổi phải giải quyết một vấn đề cụ thể, có lý do kỹ thuật rõ ràng và có thể kiểm chứng.
3. **Thực dụng & Giữ vững tính ổn định:** Giữ nguyên các implementation đang hoạt động tốt (Clean Monolith, Django ORM, PostGIS, TanStack Query, MapLibre GL).

---

## 1. Target Architecture (Kiến trúc Mục tiêu Thực tế)

### 1.1. Frontend Architecture
- **Application Structure:** SPA theo mô hình Feature-Driven kết hợp Clean Monolith UI:
  - `src/features/*`: Đóng gói logic theo tính năng người dùng (`discovery`, `search`, `places`, `experiences`, `contribute`, `profile`, `activity`, `insights`, `saved`, `shell`).
  - `src/lib/api/*`: Client HTTP duy nhất sinh từ OpenAPI contract (`generated.d.ts`), API wrapper (`client.ts`), React Query hooks (`queries.ts`), session (`session.tsx`).
  - `src/components/ui/*`: UI Primitives nhẹ (`button.tsx`, `states.tsx`, `safe-image.tsx`, `confirm-dialog.tsx`).
- **Routing & Page Composition:** 
  - Quản lý tập trung tại `src/app/App.tsx` bằng React Router 7.
  - Page components chỉ đóng vai trò composition (kết hợp hooks, state và layout). Không viết logic truy vấn SQL hay tính toán nặng trong component view.
  - Màn hình bản đồ nặng (`MapPage`) duy trì cơ chế Lazy Loading (`React.lazy`) để giữ entry bundle < 500KB.
- **State Management:**
  - *Server State:* Quản lý 100% bằng TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`) với cơ chế query key scoping chuẩn hóa (`queryKeys` trong `queries.ts`).
  - *Local/UI State:* Sử dụng React `useState` / `useReducer` cục bộ trong component hoặc Context API cho session toàn cục (`SessionProvider`). Không đưa thêm thư viện state bên ngoài (Redux, Zustand) vào hệ thống.
- **Form & Validation:** 
  - Kết hợp `react-hook-form` và `zod` với `@hookform/resolvers/zod`. Mọi form nhập liệu (đăng ký, nộp bài, chỉnh sửa) đều phải validate schema tại client trước khi gửi và bắt lỗi validation từ backend map vào form fields.
- **Error Handling & Type Definitions:** 
  - Bắt lỗi đồng nhất qua lớp `ApiError` trong `src/lib/api/client.ts`. Tự động nhận diện lỗi 401 hết phiên để dispatch sự kiện `rendez:session-expired`.
  - Type definitions được kế thừa trực tiếp từ OpenAPI schema (`components["schemas"]`), không tự định nghĩa lại các kiểu dữ liệu trùng lặp với backend.

### 1.2. Backend Architecture
- **Django Application Boundaries:** 5 Django apps với ranh giới trách nhiệm rõ ràng:
  - `apps.accounts`: Xác thực người dùng, phiên làm việc (Session/CSRF), hồ sơ cá nhân và quyền Creator.
  - `apps.places`: Quản lý thực thể địa điểm (Place), phân loại (Category), tọa độ địa lý, GiST Indexing và tra cứu bản đồ theo Bounding Box.
  - `apps.posts`: Quản lý bài đăng (Post), phương tiện (PostMedia), tương tác mạng xã hội (Like, Comment, Share, ViewLog) và lưu trữ (`SavedPost`, `SavedPlace`).
  - `apps.photos`: Quản lý tài nguyên media gốc (`PhotoAsset`), pipeline xử lý ảnh (băm SHA-256, stripped EXIF, sinh WebP/JPEG) và phục vụ tệp tin bảo mật qua view chuyên biệt.
  - `apps.favorites`: App lưu trữ dấu trang kế thừa (Legacy). Định hướng hợp nhất vào `apps.posts` / `apps.places`.
- **Phân tầng & Ràng buộc Kiến trúc (Layered Architecture):**
  - Khóa phân tầng tự động qua [`backend/.importlinter`](file:///home/longtran/Projects/rendez-web/backend/.importlinter):
    `Views -> Services/Geocoding -> Selectors -> Models`.
  - Nghiệp vụ thay đổi dữ liệu phức tạp (nộp bài, đổi trạng thái xuất bản, giao dịch nhiều bảng) đặt tại `services.py`.
  - Truy vấn đọc tối ưu (ORM annotations, unaccent filter, subquery) đặt tại `selectors.py`.
  - Tuyệt đối không tạo thêm Service/Repository abstraction nếu Django ORM và Manager/QuerySet đã giải quyết sạch sẽ và ngắn gọn.
- **Transactions & Concurrency:** Sử dụng `transaction.atomic()` và `select_for_update()` tại các trust boundary có nguy cơ race condition (nộp bài cùng lúc, cập nhật ảnh bìa, kiểm tra idempotency).
- **Authentication & Security:** Session-based authentication với CSRF cookie chống tấn công chéo site. Throttling qua `ScopedRateThrottle`. Phân quyền nghiêm ngặt qua DRF `IsAuthenticated` / `IsOwnerOrReadOnly`.

### 1.3. Integration & API Contracts
- **API Contract:** Tệp `backend/openapi.yaml` là nguồn chân lý duy nhất (Single Source of Truth), được kiểm chứng tự động bằng `drf-spectacular`.
- **Định dạng Response & Phân trang:**
  - Phân trang chuẩn DRF PageNumberPagination: `{ count: number, next: string | null, previous: string | null, results: T[] }`.
  - Định dạng lỗi chuẩn: `{ message: string, fields?: Record<string, string[]> }`.
- **Data Ownership:**
  - Địa điểm thuộc quyền quản lý của `apps.places`.
  - Bài viết và tương tác thuộc quyền quản lý của `apps.posts`.
  - Tài sản media thuộc quyền quản lý của `apps.photos`.

---

## 2. Library & Dependency Strategy

1. **Nguyên tắc ưu tiên:**
   `Built-in API / Framework có sẵn > Dependencies hiện có > Gói mã nguồn mở trưởng thành > Tự code`.
2. **Loại bỏ (Subtractive):**
   - Đã gỡ bỏ `tailwind-merge` (không cần thiết).
   - Tiếp tục xem xét loại bỏ `@vitest/coverage-v8` trong frontend devDependencies nếu không dùng riêng.
3. **Không thêm dependency mới:** Toàn bộ quá trình remediation không được cài thêm bất kỳ package nào vào `pyproject.toml` hay `package.json`. Sử dụng tối đa các thư viện hiện có (`lucide-react`, `date-fns`/Intl có sẵn, standard library Python/Node).

---

## 3. Subtractive Refactoring Plan (Chia theo 4 Batches Thực thi)

Bảng phân loại hành động chuẩn: `KEEP`, `DELETE`, `SIMPLIFY`, `REUSE`, `CONSOLIDATE`, `REFACTOR`, `REPLACE`, `ADD`.

---

### BATCH 1: Dọn dẹp Code chết & Export thừa (Dead Code & Unused Exports Removal)
- **Mục tiêu:** Giảm kích thước mã nguồn, loại bỏ nhầm lẫn kiến trúc, không làm thay đổi hành vi runtime.
- **Phạm vi tác động:** `frontend/src/` (các file shared, components, queries).
- **Hành động chi tiết:**
  1. `frontend/src/app/shared.tsx`: **[DELETE]** Xóa component `PlaceCard` (L273-L300) vì đã có `src/features/places/PlaceCard.tsx` chuẩn hóa.
  2. `frontend/src/features/places/PlaceCard.tsx`: **[DELETE]** Xóa component `PlaceRow` không sử dụng (L135-L160).
  3. `frontend/src/lib/api/queries.ts`: **[DELETE]** Xóa các hàm truy vấn không còn consumer: `usePosts`, `useMapPlaces`, `useCreator`, `useCreatorPhotos`, `isNotFound`.
  4. `frontend/src/lib/format.ts`: **[DELETE]** Xóa các helper chết: `formatDate`, `formatCount`, `countLabel`.
  5. `frontend/src/components/ui/safe-image.tsx`: **[DELETE]** Xóa hàm helper không dùng `ratioOf`.
  6. `backend/apps/places/ai/`: **[DELETE]** Dọn dẹp thư mục rỗng và tàn dư cache.
- **Rủi ro hồi quy (Regression Risks):** Thấp. Cần đảm bảo không có file nào import ngầm thông qua re-export.
- **Kiểm thử & Xác minh:**
  - `bun run --cwd frontend typecheck`
  - `bun run --cwd frontend lint`
  - `bun run --cwd frontend test`
  - `bun run --cwd frontend build`
  - `cd frontend && bun run knip` (xác nhận số lượng unused exports giảm về 0).
- **Tiêu chí hoàn thành (DoD):** Knip không còn cảnh báo các exports trên; `scripts/check.sh all` đạt 10/10 PASS.

---

### BATCH 2: Chuẩn hóa Bản quyền Chữ & UI Copy (Voice & Copy Audit Remediation)
- **Mục tiêu:** Khắc phục triệt để 11 lỗi thuật ngữ và 8 cảnh báo cấu trúc chữ, tuân thủ nghiêm ngặt `docs/VOICE.md` và `docs/UX_RULES.md`.
- **Phạm vi tác động:** `frontend/src/app/auth.tsx`, `frontend/src/features/contribute/CreateExperiencePage.tsx`, `frontend/src/features/profile/ProfilePage.tsx`, `frontend/src/features/places/PlaceCard.tsx`, `frontend/src/features/places/PlaceDetailPage.tsx`.
- **Hành động chi tiết:**
  1. `frontend/src/app/auth.tsx`: **[REFACTOR]**
     - Sửa các chuỗi vi phạm thuật ngữ cấm ("chia sẻ trải nghiệm" -> "đăng ảnh và lưu địa điểm").
     - Loại bỏ các câu marketing tagline cũ tại L127-L145 ("Khám phá thành phố qua...", "sổ tay thành phố...", "tiếp tục nơi bạn đã dừng lại").
     - Đổi "Đăng nhập trải nghiệm nhanh" thành "Đăng nhập nhanh".
     - Xóa hoặc chuyển đổi thẻ `<p className="eyebrow">` không phân loại dữ liệu thật sang nhãn ngữ nghĩa thông thường.
  2. `frontend/src/features/contribute/CreateExperiencePage.tsx`: **[REFACTOR]**
     - Đổi "Cần đăng nhập để đăng trải nghiệm" -> "Cần đăng nhập để đóng góp ảnh".
     - Xóa `<p className="eyebrow">Đóng góp</p>`.
  3. `frontend/src/features/profile/ProfilePage.tsx`: **[REFACTOR]**
     - Đổi "Đăng trải nghiệm đầu tiên" -> "Đóng góp ảnh đầu tiên".
  4. Các file có cảnh báo eyebrow: **[SIMPLIFY]**
     - Chỉ giữ thẻ in hoa khi hiển thị Category/Loại hình thực tế của địa điểm (`place.category.name`), loại bỏ các thẻ eyebrow trang trí tĩnh.
- **Rủi ro hồi quy:** Thấp. Một số test unit có thể đang kiểm tra chuỗi text cũ.
- **Kiểm thử & Xác minh:**
  - `node scripts/check-copy.mjs` (kết quả phải trả về 0 lỗi, 0 cảnh báo).
  - `bun run --cwd frontend test`
- **Tiêu chí hoàn thành (DoD):** `node scripts/check-copy.mjs` kết thúc với exit code 0.

---

### BATCH 3: Hợp nhất & Chuẩn hóa Mô hình Lưu Địa điểm (SavedPlace Consolidation)
- **Mục tiêu:** Giải quyết dứt điểm sự phân mảnh giữa model `Favorite` và `SavedPlace`. Đưa toàn bộ hệ thống về một mô hình dữ liệu duy nhất `SavedPlace`.
- **Phạm vi tác động:**
  - `backend/apps/places/selectors.py`
  - `backend/apps/favorites/views.py`
  - `backend/apps/accounts/views.py`
  - `frontend/src/lib/api/queries.ts`
- **Hành động chi tiết:**
  1. `backend/apps/places/selectors.py`: **[CONSOLIDATE]**
     - Sửa annotation `is_saved`:
       Từ `Exists(Favorite.objects.filter(place_id=OuterRef("pk"), user=request.user))`
       Sang `Exists(SavedPlace.objects.filter(place_id=OuterRef("pk"), user=request.user))`.
  2. `backend/apps/favorites/views.py`: **[CONSOLIDATE]**
     - Sửa `VisualFavorites` truy vấn qua `savedplace__user=self.request.user`.
     - Sửa `FavoriteDetail` (PUT/DELETE) ghi vào bảng `SavedPlace` thay vì `Favorite`.
  3. `frontend/src/lib/api/queries.ts`: **[REUSE]**
     - Chuẩn hóa hook `useSavePlace`: Có thể duy trì endpoint `favorites/${id}/` (hoặc chuyển sang `places/${id}/saved/`), đảm bảo backend xử lý thống nhất vào `SavedPlace`.
  4. `backend/apps/accounts/views.py`: **[CONSOLIDATE]**
     - Khi xóa tài khoản người dùng, xóa triệt để `SavedPlace.objects.filter(user=user).delete()`.
- **Rủi ro hồi quy:** Trung bình. Có thể ảnh hưởng đến các test case kiểm tra số lượng bản ghi `Favorite` cũ.
- **Kiểm thử & Xác minh:**
  - `backend/.venv/bin/python -m pytest backend/tests/test_favorites.py backend/apps/places backend/apps/posts`
  - Chạy toàn bộ test suite: `pytest` (223 passed).
  - Test E2E luồng lưu địa điểm: `bunx playwright test e2e/saved.spec.ts` (nếu chạy e2e).
- **Tiêu chí hoàn thành (DoD):** Dữ liệu lưu địa điểm chỉ lưu vào một bảng duy nhất `SavedPlace`; toàn bộ test backend pass 100%.

---

### BATCH 4: Khắc phục External Calls & Tinh chỉnh Insights (Resilience & Data Integrity)
- **Mục tiêu:** Đảm bảo hệ thống vận hành hoàn toàn độc lập (offline-first) và thay thế mock data tĩnh trên giao diện.
- **Phạm vi tác động:**
  - `backend/apps/places/geocoding.py`
  - `frontend/src/features/insights/InsightsPage.tsx`
- **Hành động chi tiết:**
  1. `backend/apps/places/geocoding.py`: **[SIMPLIFY]**
     - Bổ sung kiểm tra cờ cấu hình `getattr(settings, "GEOCODING_ENABLE_EXTERNAL", False)`.
     - Nếu cờ là `False` (mặc định trong kiểm thử và môi trường nội bộ), bỏ qua `query_nominatim_realtime` và `query_photon_realtime`, chạy thẳng vào `query_osm_local_database` (sử dụng `region.geojson` cục bộ).
  2. `frontend/src/features/insights/InsightsPage.tsx`: **[SIMPLIFY & REUSE]**
     - Thay vì nhân số liệu giả định (`* 42 + 15`), hiển thị trung thực các con số đã có: tổng số ảnh đã đóng góp (`photo_count`), tổng số địa điểm đã lưu (`saved_count`).
     - Với biểu đồ chưa có dữ liệu lịch sử time-series từ backend: Hiển thị trạng thái empty state trung thực hoặc thông báo "Chưa đủ dữ liệu thống kê theo thời gian" thay vì vẽ biểu đồ tĩnh gây hiểu lầm.
- **Rủi ro hồi quy:** Thấp.
- **Kiểm thử & Xác minh:**
  - Chạy `pytest backend/tests/test_geocoding.py`.
  - `bun run --cwd frontend test`.
- **Tiêu chí hoàn thành (DoD):** Không có external call nào tự phát ra mạng ngoài khi geocode; trang Insights không dùng số liệu ảo.

---

## 4. Engineering Standards (Quy Chuẩn Kỹ Thuật Dự Án)

Để tránh phân tán tài liệu, các quy chuẩn kỹ thuật cốt lõi được định nghĩa trực tiếp tại đây làm căn cứ thực hiện:

### 4.1. Code Structure & Dependencies
- **Single Responsibility:** Mỗi file/module chỉ chịu một trách nhiệm rõ ràng. Không gộp logic view, selector, service vào chung một file nếu không cần thiết.
- **Zero Cosmetic Refactor:** Cấm tuyệt đối đổi tên biến, sắp xếp import hàng loạt, hoặc chia nhỏ file chỉ vì file dài.
- **Dependency First:** Kiểm tra thư viện trong `STACK.md` trước khi viết hàm mới. Cấm cài package mới khi chưa có quyết định trong `DECISIONS.md`.

### 4.2. Configuration & Hardcoding
- **Environment Isolation:** Mọi cấu hình nhạy cảm, URL máy chủ, khóa bí mật đều phải đọc từ biến môi trường thông qua `settings.py`. Không hardcode `http://localhost:...` trong production paths.
- **Domain Constants:** Các hằng số nghiệp vụ (danh mục, loại sắp xếp, giới hạn kích thước) phải tập trung tại một nơi (ví dụ `types.ts` hoặc `models.py`), không rải rác trong component UI.

### 4.3. Frontend & UI
- **Pure Composition Pages:** Page component không khởi tạo fetch tùy tiện; luôn dùng hooks từ `src/lib/api/queries.ts`.
- **Voice Compliance:** Tuân thủ `docs/VOICE.md`. Giọng văn trung tính, không giật gân, không dùng thuật ngữ cấm.
- **Design Tokens:** Sử dụng 100% token từ `src/styles/tokens.css` (màu sắc, typography, khoảng cách, bo góc). Không tự chế mã màu hex lạ trong css file.

### 4.4. Backend & Database
- **Trust Boundary Validation:** Mọi input từ client đều phải validate qua Django Form hoặc DRF Serializer. Không tin tưởng dữ liệu từ frontend.
- **Atomic Operations:** Bắt buộc dùng `transaction.atomic()` khi thao tác ghi trên từ 2 bảng trở lên.
- **Optimized Queries:** Luôn dùng `select_related` cho ForeignKey và `prefetch_related` cho M2M/Reverse FK để triệt tiêu lỗi N+1 Query.

---

## 5. Quality Gates (Cổng Kiểm Soát Chất Lượng Bắt Buộc)

Mọi thay đổi trong các batch remediation bắt buộc phải vượt qua toàn bộ 10 cổng kiểm soát chất lượng thực tế sau thông qua kịch bản [`scripts/check.sh all`](file:///home/longtran/Projects/rendez-web/scripts/check.sh):

```bash
# Thực thi toàn bộ bộ kiểm tra chất lượng
./scripts/check.sh all
```

Chi tiết 10 cổng kiểm tra và lệnh tương ứng:
1. **Backend Lint:** `backend/.venv/bin/python -m ruff check backend` (Yêu cầu: 0 lỗi).
2. **Backend Format:** `backend/.venv/bin/python -m ruff format --check backend` (Yêu cầu: 0 lỗi format).
3. **Backend Import Linter:** `backend/.venv/bin/lint-imports --config backend/.importlinter` (Yêu cầu: 0 vi phạm tầng).
4. **Backend Migrations:** `backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run` (Yêu cầu: 0 lệch schema).
5. **Backend Unit & Integration Tests:** `pytest -c backend/pyproject.toml backend/tests backend/apps` (Yêu cầu: 223/223 PASS).
6. **Backend Django Check:** `backend/.venv/bin/python backend/manage.py check` (Yêu cầu: 0 vấn đề hệ thống).
7. **Frontend Lint:** `bun run --cwd frontend lint` (Yêu cầu: 0 lỗi ESLint).
8. **Frontend Format:** `bun run --cwd frontend format:check` (Yêu cầu: 0 vi phạm Prettier).
9. **Frontend Vitest Tests:** `bun run --cwd frontend test` (Yêu cầu: 61/61 PASS).
10. **Frontend Production Build:** `bun run --cwd frontend build` (Yêu cầu: build thành công, typecheck tsc sạch sẽ).

**Cổng kiểm tra bổ sung (Copy Audit):**
```bash
node scripts/check-copy.mjs
```
(Yêu cầu: 0 lỗi thuật ngữ, 0 cảnh báo format chữ theo `docs/VOICE.md`).
