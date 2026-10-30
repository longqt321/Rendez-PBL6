# Rendez — Cẩm Nang Kỹ Thuật & Vận Hành (Engineering Guide)

Tài liệu này cung cấp hướng dẫn thực hành từng bước để thiết lập môi trường phát triển, chạy ứng dụng cục bộ, thực thi kiểm thử tự động, sao lưu dữ liệu và gỡ lỗi hệ thống Rendez.

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

Trước khi bắt đầu, máy trạm phát triển cần cài đặt sẵn:
- **Hệ điều hành:** Linux (Ubuntu/Debian khuyến nghị) hoặc macOS.
- **Python:** Phiên bản `3.12` trở lên.
- **Bun:** Phiên bản `1.x` (quản lý gói và chạy công cụ frontend).
- **Docker & Docker Compose:** Đã cài đặt và dịch vụ docker daemon đang hoạt động.
- **Git:** Để quản lý mã nguồn.

---

## 2. Thiết Lập Môi Trường Phát Triển Cục Bộ (Local Setup)

Dự án cung cấp bộ kịch bản tự động hóa trong thư mục `scripts/`:

### Bước 1: Khởi tạo toàn bộ môi trường
Chạy kịch bản thiết lập một chạm:
```bash
./scripts/setup-local.sh
```
Kịch bản này sẽ tự động:
1. Tạo môi trường ảo Python tại `backend/.venv/` và cài đặt các phụ thuộc từ bánh xe nội bộ / cache.
2. Cài đặt các gói npm cho frontend bằng `bun install`.
3. Tạo thư mục dữ liệu cục bộ `.local/` (bao gồm `.local/postgres`, `.local/media`, `.local/logs`).
4. Khởi động container PostgreSQL 17 trên cổng `55433` (`rendez-local-db-1`).
5. Chạy toàn bộ migrations cơ sở dữ liệu (`backend/manage.py migrate`).
6. Nhập dữ liệu hạt giống 12 cơ sở quán cà phê thực tế (`import_danang`).
7. Tạo tài khoản quản trị mặc định và sinh tệp biến môi trường an toàn `.local/runtime.env`.

### Bước 2: Khởi động hệ thống
```bash
./scripts/start-local.sh
```
Sau khi khởi động thành công:
- **Ứng dụng web (Gunicorn + Frontend):** Truy cập tại `http://127.0.0.1:8000/`
- **Giao diện quản trị (Django Admin):** Truy cập tại `http://127.0.0.1:8000/admin/`
- **Kiểm tra trạng thái (Health Check):** `http://127.0.0.1:8000/api/v1/health/`

### Bước 3: Dừng hệ thống an toàn
```bash
./scripts/stop-local.sh
```

---

## 3. Cổng Kiểm Tra Chất Lượng Tự Động (Quality Gate: `check.sh`)

Mọi thay đổi trước khi bàn giao đều **bắt buộc phải vượt qua 100%** bài kiểm tra trong kịch bản `./scripts/check.sh`:

```bash
./scripts/check.sh all
```

Kịch bản này thực thi tuần tự **9 bài kiểm tra nghiêm ngặt**:

| Bước kiểm tra | Lệnh thực thi chi tiết | Tiêu chí đạt |
|---|---|---|
| **1. backend-lint** | `backend/.venv/bin/python -m ruff check backend` | Không có lỗi cú pháp hoặc vi phạm linting |
| **2. backend-format** | `backend/.venv/bin/python -m ruff format --check backend` | Mã nguồn Python tuân thủ chuẩn format Ruff |
| **3. migrations** | `backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run` | Không có thay đổi model nào bị sót migration |
| **4. backend-tests** | `backend/.venv/bin/python -m pytest -c backend/pyproject.toml backend/tests -q` | Toàn bộ **178 bài test Pytest** phải vượt qua (PASS) |
| **5. django-check** | `backend/.venv/bin/python backend/manage.py check` | Cấu hình hệ thống Django không có cảnh báo hệ thống |
| **6. frontend-lint** | `bun run --cwd frontend lint` | Không có lỗi ESLint/TypeScript |
| **7. frontend-format** | `bun run --cwd frontend format:check` | Mã nguồn Frontend tuân thủ chuẩn Prettier |
| **8. frontend-tests** | `bun run --cwd frontend test` | Toàn bộ **56 bài test Vitest** phải vượt qua (PASS) |
| **9. frontend-build** | `bun run --cwd frontend build` | Bản dựng Vite SPA hoàn thành không có lỗi biên dịch |

### Chạy Từng Nhóm Kiểm Tra
- Chỉ kiểm tra Backend (5 bài):
  ```bash
  ./scripts/check.sh backend
  ```
- Chỉ kiểm tra Frontend (4 bài):
  ```bash
  ./scripts/check.sh frontend
  ```

---

## 4. Quản Trị Cơ Sở Dữ Liệu & Nhập Liệu

### 4.1. Tạo Tài Khoản Quản Trị (Admin Creation)
```bash
backend/.venv/bin/python scripts/create-admin.py
```

### 4.2. Nhập Lại Dữ Liệu Hạt Giống (Idempotent Seed Import)
```bash
backend/.venv/bin/python backend/manage.py import_danang
```
Lệnh này an toàn tuyệt đối khi chạy nhiều lần, không nhân bản dữ liệu, không ghi đè mô tả đã sửa và không kích hoạt lại ảnh đã bị rút.

### 4.3. Sao Lưu & Phục Hồi Dữ Liệu (Backup & Restore)
Dự án cung cấp bộ công cụ sao lưu và phục hồi toàn diện bao gồm cả SQL dump và thư mục tệp media:
- **Sao lưu:**
  ```bash
  ./scripts/backup-local.sh
  ```
  Tạo bản sao lưu nén tại thư mục `.local/backups/`.
- **Phục hồi:**
  ```bash
  ./scripts/restore-local.sh <đường_dẫn_tệp_sao_lưu>
  ```

---

## 5. Quy Trình Gỡ Lỗi & Quan Sát Hệ Thống (Debugging & Observability)

### 5.1. Nhật Ký Hoạt Động (Logs)
Toàn bộ nhật ký được lưu tại thư mục `.local/logs/`:
- `.local/logs/app.log`: Nhật ký ghi nhận các lỗi runtime và thông tin dịch vụ của Django.
- `.local/logs/access.log`: Nhật ký toàn bộ các request HTTP vào máy chủ Gunicorn.
- `.local/logs/check-*.log`: Chi tiết nhật ký thực thi của từng bài kiểm tra cổng chất lượng.

### 5.2. Chạy Kiểm Thử Chuyên Sâu Bằng Pytest
Khi cần gỡ lỗi một bài kiểm thử cụ thể, có thể sử dụng các tham số trực tiếp của Pytest:
```bash
# Chạy một tệp kiểm thử cụ thể và in toàn bộ output (stdout/stderr)
backend/.venv/bin/python -m pytest backend/tests/test_upload_safety.py -s -vv

# Chạy một hàm kiểm thử duy nhất
backend/.venv/bin/python -m pytest backend/tests/test_auto_publication.py -k "test_submit_new_venue_auto_published" -vv
```

---

## 6. Quy Tắc Kỹ Thuật Dành Cho Kỹ Sư & Coding Agent

Theo hợp đồng vận hành chung trong [AGENTS.md](file:///home/longtran/Projects/rendez-web/AGENTS.md):
1. **Bảo toàn trạng thái Git:** Tuyệt đối không chạy `git reset --hard` hoặc `git clean -fd`. Không ghi đè các sửa đổi có sẵn của người dùng.
2. **Không thêm dependency mới:** Không cài thêm package bằng `pip` hoặc `bun` trừ khi có chỉ thị rõ ràng.
3. **Phân tích trước khi sửa:** Luôn kiểm tra caller, tests, serializers và models liên quan trước khi sửa logic. Chọn diff nhỏ nhất nhưng hoàn chỉnh.
4. **Không bỏ qua xác thực:** Mọi logic xử lý tại ranh giới tin cậy (Trust Boundary - API Serializer, Service Layer) bắt buộc phải có validation và xử lý lỗi chặt chẽ.
5. **Kiểm tra thực tế:** Không kết luận một lỗi tồn tại chỉ qua phỏng đoán; hãy kiểm tra bằng mã nguồn và test thực tế trước.
