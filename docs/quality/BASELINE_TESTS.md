# Baseline Test Results & Metrics

Ghi lại số liệu kiểm thử baseline trước khi tiến hành tái cấu trúc (snapshot tham chiếu `archive/main-pre-refactor` / commit `f4b8e9c`).

## 1. Backend Tests (Pytest + PostgreSQL)
- **Tổng số test thu thập:** 223 tests (backend/tests + backend/apps)
- **Số test đạt (PASS):** 223 / 223 (100%)
- **Số test lỗi/thất bại:** 0
- **Thời gian chạy:** ~135s
- **Độ phủ test (Coverage apps/):**
  - Tổng Statements: 2907
  - Miss: 379
  - Tỉ lệ phủ: **87%**
  - Chi tiết theo module:
    - `apps.accounts`: 91% - 92%
    - `apps.favorites`: 97% - 100%
    - `apps.photos`: 90% - 98% (trừ management commands demo: 0%)
    - `apps.places`: 87% - 100% (geocoding 87%, models 95%, views 94%)
    - `apps.posts`: 92% - 100%

## 2. Frontend Tests (Vitest + Testing Library)
- **Tổng số test files:** 10 test files
- **Tổng số tests:** 61 tests
- **Số test đạt (PASS):** 61 / 61 (100%)
- **Số test thất bại:** 0
- **Thời gian chạy:** ~3.09s
- **Độ phủ test (Vitest Coverage v8):**
  - Tỉ lệ tổng: ~36.7% lines (các components cốt lõi: Client 93.3%, AppShell 89.0%, Nav 100%, Button 100%, ConfirmDialog 83.3%, TermsPage 100%, ProfilePage 90.5%).

## 3. Tiêu chuẩn cam kết
- Mọi đợt tái cấu trúc tiếp theo:
  - Backend test pass >= 223
  - Frontend test pass >= 61
  - Không làm giảm độ phủ test của các module đã tái cấu trúc.
