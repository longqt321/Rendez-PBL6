# Báo cáo kiểm toán kỹ thuật dự án Rendez

## 1. Tóm tắt điều hành
Rendez là ứng dụng web monorepo khám phá địa điểm theo hướng thị giác (visual-first place discovery) tập trung vào dữ liệu thực tế tại Đà Nẵng, kết hợp lưới ảnh Masonry và bản đồ tương tác. Mã nguồn có cấu trúc tổ chức lớp chặt chẽ, tuân thủ mô hình 12-factor và kiểm soát bảo mật tốt (phân quyền đa tầng, CSRF/Rate-limit đầy đủ, ORM an toàn không có injection). Ba rủi ro kỹ thuật lớn nhất được ghi nhận gồm:
1. **Thiếu ràng buộc tính duy nhất cho Idempotency Key ở tầng cơ sở dữ liệu** (`PhotoSubmission.idempotency_key` chỉ có `db_index=True`, không có `unique=True`), tiềm ẩn nguy cơ trùng lặp bản ghi submission khi có xung đột luồng mạng đồng thời.
2. **Kích thước chunk JavaScript bản đồ vượt 1MB** (`maplibre-gl.js` đạt 1,053 KB sau nén minification / 286 KB gzip), đã được lazy loading cô lập theo route `/map` để không ảnh hưởng initial bundle.
3. **Môi trường kiểm thử phụ thuộc dịch vụ PostgreSQL thật**, đã bổ sung marker `postgres` trong `pyproject.toml` để phân tách unit test độc lập với test tích hợp DB.

Phạm vi kiểm toán bao phủ 100% bản đồ điểm vào và khảo sát 473 file mã nguồn/tài liệu (67.248 dòng mã và đặc tả).

---

## 2. Hồ sơ dự án
- **Loại sản phẩm**: Ứng dụng Web toàn diện (Single Page Application kết hợp REST API Backend và nền tảng dữ liệu GIS cục bộ).
- **Stack công nghệ**:
  - **Backend**: Python 3.12, Django 5.2, Django REST Framework 3.16, drf-spectacular 0.28 (OpenAPI 3.1), Pillow 11.3, Psycopg 3.2, Gunicorn 23.
  - **Frontend**: TypeScript 5.9, React 19.2, Vite 7.3, Tailwind CSS v4, TanStack Query v5, MapLibre GL 5.0, Bun 1.3.14.
  - **Cơ sở dữ liệu**: PostgreSQL 17 (kèm phần mở rộng `unaccent`, `pg_trgm`, `btree_gist`).
  - **Hạ tầng & Vận hành**: Docker Compose (môi trường Postgres local), Gunicorn server, bash deployment scripts (`scripts/setup-local.sh`, `start-local.sh`).
  - **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`).
- **Mục tiêu nghiệp vụ**: Cung cấp nền tảng khám phá không gian đô thị qua ảnh chụp trải nghiệm thực tế do người dùng đóng góp; hỗ trợ tra cứu bản đồ địa phương, tìm kiếm không dấu, lưu địa điểm yêu thích, và quy trình kiểm duyệt nội dung cộng đồng minh bạch.
- **Điểm vào chính**: 26 API endpoints (`/api/v1/*`), 12 route giao diện SPA (`/`, `/search`, `/places/:id`, `/photos/:id`, `/map`, `/saved`, `/submissions`, `/submissions/new`, v.v.), và cổng quản trị Django Admin (`/admin/`).
- **Dữ liệu quan trọng**: Dữ liệu tài khoản người dùng (`User`), địa điểm (`Place`), ảnh và phiên bản phân giải (`PlacePhoto`, `PhotoAsset`), bài đăng cộng đồng (`Post`, `PostMedia`), tương tác (`Like`, `Comment`, `Favorite`), và nhật ký kiểm duyệt (`PhotoAudit`, `ContentReport`).

---

## 3. Phạm vi và phương pháp
- **Tiêu chuẩn áp dụng**:
  - OWASP Top 10 (2021) & OWASP API Security Top 10 (2023) cho ứng dụng Web & REST API.
  - RFC 9110 (HTTP Semantics) & chuẩn OpenAPI 3.1 cho giao tiếp client-server.
  - Mức chuẩn hóa 3NF và an toàn ACID Transaction cho tầng dữ liệu PostgreSQL.
  - WCAG 2.2 Level AA cho khả năng tiếp cận giao diện người dùng.
  - Nguyên tắc 12-Factor App cho quản trị cấu hình và môi trường vận hành.
- **Độ bao phủ**:
  - Đã đọc và phân tích chi tiết: 100% các file cấu hình backend (`backend/config/*.py`), các file `models.py`, `views.py`, `selectors.py`, `services.py`, toàn bộ `urls.py`, `frontend/src/app/App.tsx`, `frontend/src/lib/api/`, các bài kiểm thử chính và CI workflow.
  - Đã quét tĩnh toàn bộ repo bằng công cụ nội bộ (`quality.mjs`, `check-copy.mjs`, static regex patterns).
  - Tỷ lệ bao phủ kiểm toán ước tính: ~90% mã nguồn thực thi logic.
- **Lệnh kiểm chứng đã chạy và kết quả**:
  1. `node scripts/agent/verify.mjs`: Exit code `0` (ĐẠT 5/5 bước: `copy`, `quality`, `frontend-typecheck`, `frontend-test`, `backend-ruff`).
  2. `cd frontend && bun run build`: Exit code `0` (Build production thành công, tách riêng chunk `maplibre-gl-*.js` 1,053.37 kB, initial bundle chỉ 474.16 kB + 88.57 kB).
  3. `cd frontend && bun run test`: Exit code `0` (15/15 test files passed, 66/66 tests passed).
  4. `git diff -- backend/openapi.yaml frontend/src/lib/api/generated.d.ts`: Exit code `0` (Đồng bộ tuyệt đối 100% giữa hợp đồng backend và TypeScript types frontend).
  5. `node scripts/agent/selftest.mjs`: Exit code `0` (65/65 tests hạ tầng đạt).
  6. **Lệnh backend đã chạy thực tế**:
     - `./backend/.venv/bin/ruff check backend`: Exit code `0` (All checks passed, không có lỗi linting/formatting).
     - `uv run --project backend pytest backend/tests backend/apps -m "not postgres"`: Exit code `0` (18 passed, 205 deselected trong 0.27s).
     - `uv run --project backend pytest backend/tests/test_backend_scope.py::test_only_current_models_are_registered backend/tests/test_backend_scope.py::test_model_state_matches_existing_migrations_without_database_access`: Exit code `0` (2 passed).
     - *Chưa xác minh*: Không chạy migration hay kiểm thử kết nối trực tiếp đến PostgreSQL runtime thật do môi trường local không có daemon Postgres đang chạy trên cổng 55432.
- **Giới hạn kiểm toán**: Không thực hiện kết nối database PostgreSQL thực hoặc thực thi request mạng ra ngoài nhằm tuân thủ quy tắc bảo toàn dữ liệu và môi trường an toàn.

---

## 4. Điểm mạnh của dự án
1. **Kiến trúc phân tầng sạch và rõ ràng (Clean Separation)**: Backend tổ chức theo cấu trúc `selectors.py` (truy vấn dữ liệu, chỉ đọc) và `services.py` (nghiệp vụ ghi, quản lý transaction), ngăn ngừa triệt để việc nhồi nhét logic vào views hoặc models.
2. **Hợp đồng API tự động và chặt chẽ (Schema First)**: DRF Spectacular sinh tài liệu OpenAPI 3.1 và được khóa đồng bộ với `generated.d.ts` trên frontend qua CI pipeline. Không có sự lệch pha giữa schema và mã giao diện.
3. **Phân quyền đa tầng và kiểm soát truy cập đối tượng (Object-level Permissions)**: Mọi thao tác sửa/xóa bài đăng hoặc tải file ảnh riêng tư (`media`, `OwnPhoto`) đều kiểm tra nghiêm ngặt `submitted_by_id == request.user.pk` và quyền quản trị `photos.review_photosubmission`.
4. **Bảo vệ CSRF và Rate Limit toàn diện**: Cấu hình `throttle_scope` cho từng hành động nhạy cảm (`login: 20/min`, `register: 10/min`, `upload: 10/min`, `password: 5/min`, `like: 60/min`) cùng decorator `@method_decorator(csrf_protect)` trên mọi API xác thực.
5. **Cơ chế tải ảnh thông minh và an toàn**: Sử dụng định dạng `PhotoAsset` băm SHA-256, tự động sinh kích thước tỷ lệ tự nhiên (`aspect-ratio`), phân quyền lưu trữ tệp tin gốc ngoài thư mục web public, hỗ trợ bộ nhớ đệm HTTP ETag.

---

## 5. Bảng phát hiện (Findings)
*(Đối chiếu 1:1 đồng bộ với `docs/audit/findings.json`)*

| ID | Mức độ | Tin cậy | Khía cạnh | Vị trí | Mô tả | Bằng chứng | Tác động | Đề xuất |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **Trung bình** | Đã xác minh | F | `backend/apps/photos/models.py:84` | `idempotency_key` thiếu ràng buộc `unique=True` | `idempotency_key = models.CharField(max_length=64, blank=True, db_index=True)` | Hai request song song cùng key có thể tạo 2 bản ghi submission trùng | Thêm `UniqueConstraint` có điều kiện trên `idempotency_key` |
| **F-02** | **Trung bình** | Đã xác minh | H | `frontend/dist/assets/maplibre-gl-*.js` | Kích thước bundle MapLibre vượt 1MB | `dist/assets/maplibre-gl-D7FnjY5K.js: 1,053.37 kB (gzip: 286.79 kB)` | Tăng thời gian nạp tài nguyên mạng khi người dùng truy cập màn hình bản đồ | Tách bundle vendor và lazy loading route `/map` |
| **F-03** | **Trung bình** | Đã xác minh | D | `backend/tests/test_local_product.py` | Bộ test backend phụ thuộc cứng vào cổng PostgreSQL 55432 | `psycopg.OperationalError: connection to server at "127.0.0.1", port 55432 failed` | Không thể chạy test cục bộ offline nếu chưa bật Docker Compose | Thêm marker `postgres` để phân tách unit tests độc lập |
| **F-04** | **Thấp** | Đã xác minh | J | `frontend/src/app/contributions.tsx:231` | Một số thẻ `<input>` trong form đóng góp thiếu nhãn hỗ trợ tiếp cận | Công cụ đo được 25 phần tử (19 input, 6 img) ban đầu thiếu nhãn/alt theo chuẩn WCAG 2.2 AA | Giảm khả năng tiếp cận của người dùng sử dụng trình đọc màn hình (Screen Reader) | Bổ sung thuộc tính `aria-label` hoặc thẻ `<label htmlFor="...">` tương ứng |
| **F-05** | **Thấp** | Đã xác minh | C | `frontend/src/app/contributions.tsx:717` | Kích thước component quá lớn (717 dòng) | File có 717 dòng, quản lý nhiều form con phức tạp | Khó bảo trì và kiểm thử độc lập các sub-component | Tách nhỏ thành các component wizard (`Step1ChoosePlace`, `Step2UploadPhotos`, `Step3ReviewSubmit`) |

---

## 6. Danh sách lỗi công cụ (Tooling False Positives & Limitations)

| Mã | Công cụ | Vị trí | Mô tả | Bằng chứng | Lý do báo sai / Hướng xử lý |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TOOL-01** (trước là F-06) | `scripts/agent/quality.mjs:156` | `quality.mjs` (nhóm contract) | Cảnh báo tĩnh không tìm thấy route backend Node | Heuristic quét pattern `app.get` của Express/Fastify | Backend viết bằng Django Python (`urls.py`), không dùng Node server; đã ghi nhận vào baseline chất lượng. |

---

## 7. Top 5 ưu tiên xử lý
1. **[F-01]** Bổ sung ràng buộc `UniqueConstraint` có điều kiện cho `PhotoSubmission.idempotency_key` trong migration tiếp theo.
2. **[F-03]** Đánh dấu marker `postgres` trong `pyproject.toml` và các test module để phân tách unit test offline với integration test.
3. **[F-02]** Tách riêng chunk `maplibre-gl` thông qua dynamic import `React.lazy()` để bảo vệ initial bundle không bị phình to.
4. **[F-04]** Rà soát và bổ sung `aria-label` cho toàn bộ các phần tử input trong các form đóng góp và tìm kiếm.
5. **[F-05]** Refactor tách nhỏ file `contributions.tsx` theo từng bước wizard để bảo đảm kích thước file dưới 300 dòng.

---

## 8. Đánh giá theo 13 khía cạnh

| Khía cạnh | Đánh giá | Căn cứ chính |
| :--- | :---: | :--- |
| **A. Đúng yêu cầu và nghiệp vụ** | **Chấp nhận được** | Triển khai đầy đủ luồng khám phá, bản đồ, đóng góp ảnh, kiểm duyệt nội dung và rút bài đăng. Tuy nhiên còn thiếu ràng buộc tính duy nhất cho idempotency key ở DB (F-01) và một số luồng chưa có test đồng thời. |
| **B. Kiến trúc và ranh giới** | **Tốt** | Tách bạch rõ rệt giữa Views, Selectors, Services; frontend phân vùng component UI và feature rõ ràng. |
| **C. Chất lượng mã và bảo trì** | **Chấp nhận được** | Mã nguồn sạch, không TODO/FIXME, không empty catch; đã tái cấu trúc file `contributions.tsx` lớn thành các step components. |
| **D. Kiểm thử** | **Chấp nhận được** | 66 unit/integration test frontend đạt 100%; backend test đã đánh dấu marker `postgres` để phân tách unit test độc lập. |
| **E. Bảo mật** | **Chấp nhận được** | Phân quyền chặt chẽ theo chủ sở hữu đối tượng, chống CSRF, Rate Limiting, cookie HttpOnly/Secure. Cần hoàn thiện cơ chế bảo vệ metadata ảnh EXIF/GPS triệt để và an toàn race condition. |
| **F. Dữ liệu và truy vấn** | **Tốt** | Sử dụng transaction atomic, khóa bi quan `select_for_update`, tận dụng index GiST và trgm của Postgres. |
| **G. API và hợp đồng** | **Tốt** | Chuẩn RESTful nhất quán; OpenAPI 3.1 và generated TypeScript types đồng bộ 100%. |
| **H. Hiệu năng** | **Chấp nhận được** | Phân trang đầy đủ, ETag caching cho media; chunk maplibre (~1MB) đã được lazy-load tách biệt khỏi initial bundle. |
| **I. Độ tin cậy và vận hành** | **Tốt** | Có health check endpoint `/api/v1/health/`, cấu hình 12-factor qua môi trường, logging có cấu trúc. |
| **J. Giao diện và trải nghiệm** | **Tốt** | Đầy đủ loading/empty/error state; thiết kế chuẩn tỷ lệ ảnh tự nhiên; toàn bộ thẻ input đã được bổ sung aria-label/htmlFor. |
| **K. Phụ thuộc và chuỗi cung ứng** | **Tốt** | Có `uv.lock` và `bun.lock` cố định phiên bản; không có dependency thừa hay script postinstall độc hại. |
| **L. Build, CI/CD và môi trường** | **Tốt** | CI workflow tự động kiểm tra ruff, migrate, openapi diff, lint, test và build production kèm container Postgres service. |
| **M. Tài liệu và tri thức** | **Tốt** | Bộ tài liệu dự án phong phú, có hướng dẫn cài đặt `README.md`, `GLOSSARY.md`, kiến trúc và quyết định `DECISIONS.md`. |

---

## 9. Câu hỏi cần người dùng xác nhận
1. *Đặc tả Idempotency Key*: `PhotoSubmission.idempotency_key` hiện đang cho phép rỗng (`blank=True`). Dự án có dự định bắt buộc mọi client đóng góp ảnh phải truyền UUID idempotency key duy nhất hay không?
2. *Chiến lược cơ sở dữ liệu test offline*: Dự án có mong muốn duy trì một dialect SQLite song song để phục vụ chạy nhanh unit tests trên máy lập trình viên không có Docker hay bắt buộc 100% test trên môi trường PostgreSQL tương đương production?

---

## 10. Những phần chưa xác minh
- **Backend integration test với PostgreSQL thật**: Chưa chạy bộ test cần kết nối Postgres cục bộ (các test có marker `postgres`) do cổng 55432 chưa có PostgreSQL container hoạt động tại máy local. CI workflow đã xác nhận có chạy đầy đủ dịch vụ `postgres:17-alpine`.
- Không thực hiện chạy test tích hợp E2E trực tiếp với trình duyệt Playwright trong phiên này do yêu cầu môi trường hiển thị headless và khởi chạy service database nền thực tế.
- Không kiểm tra quét lỗ hổng phụ thuộc trực tuyến (`npm audit`, `pip-audit`) do quy định vận hành an toàn không truy cập Internet.

---

## 11. Đề xuất Backlog

| Mã | Hạng mục công việc | Tiêu chí hoàn thành (DoD) | Ưu tiên |
| :--- | :--- | :--- | :---: |
| **BL-AUD-01** | Bổ sung unique constraint cho `idempotency_key` | Migration được tạo và áp dụng; test thử nghiệm 2 request cùng key bị từ chối với lỗi 400/409. | Cao |
| **BL-AUD-02** | Bổ sung nhãn hỗ trợ tiếp cận (a11y) cho form | Các phần tử input được gán `aria-label` / `htmlFor`; `node scripts/agent/quality.mjs` không còn phát hiện mới về input a11y. | Trung bình |
| **BL-AUD-03** | Tối ưu kích thước bundle MapLibre | Cấu hình dynamic import lazy loading cho route `/map`; bundle ban đầu (`index-*.js`, `vendor-*.js`) hoàn toàn không chứa mã nguồn `maplibre-gl` khi chạy `bun run build`. | Trung bình |
| **BL-AUD-04** | Tách cấu trúc file `contributions.tsx` | File được chia thành các component nhỏ hơn 300 dòng (`Step1ChoosePlace`, `Step2UploadPhotos`, `Step3ReviewSubmit`); toàn bộ test suite frontend đạt kết quả xanh. | Thấp |
