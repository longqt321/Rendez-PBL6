# ADR 0001: Kế hoạch Tái cấu trúc và Chuẩn hóa Chất lượng Mã nguồn Rendez

- **Trạng thái:** Accepted
- **Ngày:** 2026-11-03
- **Tác giả:** AI Assistant & Rendez Engineering

## 1. Ngữ cảnh
Dự án Rendez phát sinh nợ kỹ thuật sau thời gian phát triển nhanh:
- Thiếu công cụ kiểm soát tĩnh tự động (pre-commit, CI gates bắt buộc cho format/lint).
- Trùng lặp giao diện: tồn tại trang `/search` độc lập dù đã có `SearchBar` toàn cục trên `AppShell`.
- Mã nguồn frontend xuất hiện các biến không dùng (`@typescript-eslint/no-unused-vars`), vi phạm format Prettier và mã tự viết lại (như URL Google Maps ở nhiều nơi).
- Cần thiết lập ranh giới kiến trúc rõ ràng giữa các tầng Backend và Frontend.

## 2. Quyết định
1. **Thiết lập CI và Pre-commit hooks:**
   - Sử dụng `.editorconfig` cho toàn bộ repository.
   - Thêm `scripts/check.sh` chạy kiểm tra toàn bộ: Backend (ruff check, ruff format check, migrations check, pytest với coverage) và Frontend (eslint, prettier check, vitest với coverage, tsc strict, build).
   - Thiết lập `import-linter` để khóa quy tắc phân tầng backend (views -> services/selectors -> models).
2. **Loại bỏ trùng lặp UI - Hợp nhất tìm kiếm:**
   - Lấy thanh tìm kiếm `SearchBar` trên thanh điều hướng làm điểm vào duy nhất.
   - Kết nối trực tiếp tìm kiếm vào trang khám phá `/discover` và `/map`.
   - Chuyển hướng route `/search` về `/discover`, gỡ bỏ `SearchPage.tsx` trùng lặp sau khi kiểm chứng test không bị gãy.
3. **Chuẩn hóa cấu hình và dọn dẹp mã chết:**
   - Xóa bỏ package thừa `tailwind-merge` khỏi frontend.
   - Sửa triệt để các biến không sử dụng (12 lỗi ESLint).
   - Format lại toàn bộ code theo chuẩn Prettier & Ruff.
   - Gom các hàm sinh URL ngoài và hằng số vào một module duy nhất (`format.ts`).

## 3. Hệ quả
- Quy trình kiểm thử và chất lượng được thực thi tự động.
- Không còn phân mảnh luồng người dùng khi tìm kiếm địa điểm.
- Giảm thiểu code trùng lặp và loại bỏ hoàn toàn các lỗi linter hiện tại.
