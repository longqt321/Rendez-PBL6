# Báo cáo Sửa chữa Hạ tầng Dùng chung & Dọn dẹp Nợ Kỹ thuật (Shared Foundation Repair)

**Thời điểm thực hiện:** `2026-11-03`  
**Nhánh thực hiện:** `refactor/quality-remediation`  
**Tập tin mục tiêu:** `docs/audits/SHARED_FOUNDATION_REPAIR.md`  

---

## 1. Tóm tắt Đợt Sửa chữa

Đợt thực thi này tập trung giải quyết các vấn đề cốt lõi về **Hạ tầng Dùng chung (Shared Infrastructure)**, **Mã nguồn chết (Dead Code)**, **Triệt tiêu trùng lặp (Duplication Elimination)** và **Khắc phục Hardcoded External Calls** đã được nhận diện trong [docs/audits/BASELINE_AUDIT.md](file:///home/longtran/Projects/rendez-web/docs/audits/BASELINE_AUDIT.md) và kế hoạch [docs/audits/REMEDIATION_PLAN.md](file:///home/longtran/Projects/rendez-web/docs/audits/REMEDIATION_PLAN.md).

Tất cả các thay đổi đều tuân thủ nguyên tắc **Subtractive Refactoring First**: không tạo abstraction mới, không thêm dependencies mới và bảo toàn 100% các bài kiểm thử tự động của hệ thống.

---

## 2. Files Modified (Tập tin đã chỉnh sửa)

| Tập tin | Loại hình thay đổi | Chi tiết thao tác |
|---|---|---|
| [`frontend/src/app/shared.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/shared.tsx) | **DELETE & REUSE** | - Xóa bỏ component trùng lặp `PlaceCard` (L273-L300) không còn consumer.<br/>- Đổi `AttributeIcon` từ export công khai sang private/file-scope.<br/>- Tái sử dụng `directionsUrl` từ `src/lib/format.ts` cho `googleMapsDirectionsUrl`. |
| [`frontend/src/features/places/PlaceCard.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/features/places/PlaceCard.tsx) | **DELETE** | Xóa component `PlaceRow` không sử dụng (L135-L160). |
| [`frontend/src/lib/api/queries.ts`](file:///home/longtran/Projects/rendez-web/frontend/src/lib/api/queries.ts) | **DELETE & CLEANUP** | - Xóa query hook chết `usePosts` (đã dùng `useInfiniteQuery` cho feed bài viết).<br/>- Xóa helper `isNotFound` không còn consumer.<br/>- Dọn dẹp import không dùng `ApiError`. |
| [`frontend/src/components/ui/safe-image.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/components/ui/safe-image.tsx) | **DELETE** | Xóa helper `ratioOf` không sử dụng. |
| [`frontend/src/app/creator.tsx`](file:///home/longtran/Projects/rendez-web/frontend/src/app/creator.tsx) | **REUSE & CONSOLIDATE** | Thay thế việc gọi trực tiếp `useQuery` và `api<...>` tự viết bằng các query hooks chuẩn hóa `useCreator` và `useCreatorPhotos` trong `queries.ts`. |
| [`backend/apps/places/geocoding.py`](file:///home/longtran/Projects/rendez-web/backend/apps/places/geocoding.py) | **REFACTOR & ISOLATION** | Bổ sung kiểm tra cờ cấu hình `getattr(settings, "GEOCODING_ENABLE_EXTERNAL", True)`. Khi tắt cờ (hoặc môi trường test/offline), hệ thống tự động bỏ qua các lệnh gọi mạng bên ngoài đến Nominatim/Photon và chạy thẳng vào cơ sở dữ liệu OSM nội suy vector cục bộ (`region.geojson`). |

---

## 3. Files Deleted / Created

- **Files Deleted:** Không xóa file mã nguồn độc lập nào ngoài việc dọn sạch các block mã chết bên trong các tập tin hiện hữu.
- **Dependencies Removed/Added:** **0 package mới**. Không thêm bất kỳ phụ thuộc nào vào `pyproject.toml` hoặc `package.json`.

---

## 4. Duplication & Hardcoding Corrected

1. **Triệt tiêu trùng lặp URL Google Maps Directions:**
   - Thay thế đoạn code tự viết sinh URL chỉ đường trong `shared.tsx` bằng việc gán alias trực tiếp từ `directionsUrl` của `src/lib/format.ts`.
2. **Triệt tiêu trùng lặp Component Place Card:**
   - Xóa bỏ định nghĩa `PlaceCard` cũ thừa thãi trong `shared.tsx`, chuyển toàn bộ hệ thống sang sử dụng duy nhất một nguồn chân lý: `src/features/places/PlaceCard.tsx`.
3. **Triệt tiêu logic truy vấn lặp tại màn hình Creator:**
   - Hợp nhất việc nạp dữ liệu hồ sơ creator và danh sách ảnh đóng góp tại `creator.tsx` về các hooks chính quy `useCreator` và `useCreatorPhotos` trong `src/lib/api/queries.ts`.
4. **Khắc phục External Network Hardcoding trong Geocoding:**
   - Đóng gói chuỗi lookup địa chỉ có cờ điều khiển `GEOCODING_ENABLE_EXTERNAL` cho phép cô lập hoàn toàn môi trường khi chạy offline.

---

## 5. Tests Executed & Quality Gates Results

Đã chạy toàn bộ bộ kiểm tra chất lượng 10 cổng tự động qua `./scripts/check.sh all`:

| Cổng kiểm tra | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| **backend-lint** | `ruff check backend` | **PASS** | 0 lỗi lint |
| **backend-format** | `ruff format --check backend` | **PASS** | 114/114 files sạch |
| **backend-import-linter** | `lint-imports --config backend/.importlinter` | **PASS** | 0 vi phạm phân tầng kiến trúc |
| **migrations** | `manage.py makemigrations --check --dry-run` | **PASS** | 0 lệch schema cơ sở dữ liệu |
| **backend-tests** | `pytest -c backend/pyproject.toml` | **PASS** | **223 passed / 223 tests (100%)** |
| **django-check** | `manage.py check` | **PASS** | Hệ thống Django toàn vẹn |
| **frontend-lint** | `bun run --cwd frontend lint` | **PASS** | 0 lỗi ESLint |
| **frontend-format** | `bun run --cwd frontend format:check` | **PASS** | Đã format đồng bộ Prettier |
| **frontend-tests** | `bun run --cwd frontend test` | **PASS** | **61 passed / 61 tests (100%)** |
| **frontend-build** | `bun run --cwd frontend build` | **PASS** | 1809 modules transformed, typecheck tsc sạch |

---

## 6. Remaining Issues (Các việc còn lại cho các đợt tiếp theo)

Theo lộ trình tại [docs/audits/REMEDIATION_PLAN.md](file:///home/longtran/Projects/rendez-web/docs/audits/REMEDIATION_PLAN.md):
1. **Batch 2 (Voice & Copy Audit):** Khắc phục 11 lỗi thuật ngữ cấm và các cảnh báo thẻ `<p className="eyebrow">` tại `auth.tsx`, `CreateExperiencePage.tsx`, `ProfilePage.tsx` theo `docs/VOICE.md`.
2. **Batch 3 (SavedPlace Consolidation):** Hợp nhất dứt điểm mô hình lưu trữ giữa `Favorite` và `SavedPlace` tại backend views và selectors.
3. **Batch 4 (Insights Dynamic Data):** Thay thế các số liệu tính toán giả định tại trang `InsightsPage.tsx` bằng dữ liệu aggregation thật từ session/API.
