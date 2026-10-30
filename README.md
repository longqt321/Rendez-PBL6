# Rendez — Khám Phá Không Gian & Địa Điểm Đà Nẵng

[![Test Status](https://img.shields.io/badge/tests-passed-success)](docs/CHANGELOG_AND_EXECUTION_LOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%2019-blue)](frontend)
[![Django](https://img.shields.io/badge/Django-5.2%20REST-green)](backend)

**Rendez** là ứng dụng khám phá không gian cà phê, học tập và làm việc tại Đà Nẵng qua hình ảnh thực tế và bản đồ tương tác. Ứng dụng kết hợp lưới ảnh theo tỷ lệ tự nhiên với bản đồ địa phương, hỗ trợ tìm kiếm và định vị địa chỉ dựa trên dữ liệu OpenStreetMap, Photon và Esri ArcGIS.

---

## Tính Năng Chính

- **Lưới ảnh không gian (Masonry Feed):** Tự động sắp xếp theo tỷ lệ khung hình thật (`aspect-ratio`), giữ nguyên góc chụp và tránh giật bố cục khi tải trang.
- **Bản đồ tương tác (Interactive Map):** Sử dụng nền bản đồ Esri World Street Map kết hợp dữ liệu vector địa phương (`region.geojson`), đồng bộ vị trí giữa điểm ghim và danh sách quán.
- **Định vị địa chỉ (Geocoding):** Tự động tra cứu tọa độ (kinh độ, vĩ độ) từ địa chỉ thực tế khi nhập thông tin quán mới bằng các dịch vụ GIS công khai.
- **Chỉ đường Google Maps:** Nút _"Chỉ đường"_ mở liên kết dẫn đường trực tiếp trên Google Maps dựa trên tên quán và địa chỉ cụ thể.
- **Giờ hoạt động & Trạng thái xác thực:** Hiển thị giờ mở cửa, trạng thái hoạt động và nhãn xác thực đối với các địa điểm đã kiểm chứng.
- **Tương tác cộng đồng:** Thích ảnh, viết và quản lý bình luận, xem trang tác giả ảnh (`/creators/:id`) và lưu danh sách địa điểm yêu thích (`/saved`).
- **Kênh liên hệ dành cho chủ quán:** Cung cấp thông tin liên hệ để chủ quán có thể xác nhận quyền quản trị và cập nhật thông tin địa điểm.

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

Ứng dụng hỗ trợ hai hình thức khởi chạy: vận hành trọn gói qua Gunicorn hoặc phát triển từng phần qua máy chủ dev.

### Cách 1: Khởi chạy trọn gói (Khuyên dùng)

Hình thức này thiết lập tự động database, môi trường Python/Bun, áp dụng migration, nạp dữ liệu mẫu và phục vụ toàn bộ ứng dụng qua Gunicorn tại cổng `8080`:

```bash
# 1. Thiết lập môi trường và nạp dữ liệu ban đầu
bash scripts/setup-local.sh
# Hoặc dùng make: make setup

# 2. Khởi động ứng dụng
bash scripts/start-local.sh
# Hoặc dùng make: make start

# 3. Dừng ứng dụng
bash scripts/stop-local.sh
# Hoặc dùng make: make stop
```

- **Ứng dụng web:** [http://127.0.0.1:8080](http://127.0.0.1:8080)
- **Tài liệu API (Swagger):** [http://127.0.0.1:8080/api/v1/docs/](http://127.0.0.1:8080/api/v1/docs/)
- **Trang Quản trị (Admin):** [http://127.0.0.1:8080/admin/](http://127.0.0.1:8080/admin/) (Tài khoản được lưu tại `.local/admin-credentials.json`).

### Cách 2: Chạy riêng từng phần (Development Mode)

Dành cho quá trình phát triển tính năng và gỡ lỗi trực tiếp:

1. **Khởi chạy Backend (Django REST Framework):**
   ```bash
   make backend
   # Hoặc: bash -c 'source scripts/env.sh; backend/.venv/bin/python backend/manage.py runserver 127.0.0.1:8000'
   ```
2. **Khởi chạy Frontend (React 19 / Vite):**
   ```bash
   make frontend
   # Hoặc: bash -c 'source scripts/env.sh; bun run --cwd frontend dev'
   ```

- **Giao diện Web dev:** [http://localhost:5173](http://localhost:5173) (tự động proxy API sang `8000`).

---

## Kiểm Thử & Đảm Bảo Chất Lượng

Hệ thống tích hợp quy trình kiểm tra tập trung gồm 9 bước, bao phủ toàn bộ frontend và backend:

```bash
bash scripts/check.sh all
# Hoặc dùng make: make check
```

**Các hạng mục kiểm tra tự động bao gồm:**

- `backend-lint`: Kiểm tra cú pháp và an toàn mã nguồn với Ruff.
- `backend-format`: Kiểm tra định dạng code PEP 8 với Ruff.
- `migrations`: Kiểm tra tính nhất quán giữa models và migrations (`makemigrations --check --dry-run`).
- `backend-tests`: 168 bài kiểm thử Pytest bao phủ toàn bộ API, transaction, bảo mật tệp, idempotency và logic ranh giới.
- `django-check`: Rà soát hệ thống Django system checks.
- `frontend-lint`: Phân tích tĩnh giao diện bằng ESLint.
- `frontend-format`: Kiểm tra chuẩn định dạng mã nguồn bằng Prettier.
- `frontend-tests`: 56 bài kiểm thử Vitest / Testing Library kiểm tra form, điều hướng, accessibility và tương tác UI.
- `frontend-build`: Kiểm tra biên dịch TypeScript (`tsc -b`) và đóng gói sản phẩm bằng Vite.

---

## Quy Trình Sao Lưu & Khôi Phục (Backup & Restore)

Hệ thống cung cấp cơ chế sao lưu đồng bộ cả dữ liệu quan hệ và tệp tin phương tiện để phòng ngừa mất dữ liệu:

### 1. Sao lưu dữ liệu (Backup)

```bash
bash scripts/backup-local.sh
# Hoặc dùng make: make backup
```

- Tạo thư mục sao lưu mới tại `.local/backups/<YYYYMMDD-HHMMSS>/` chứa:
  - `database.dump` (PostgreSQL) hoặc `database.sqlite3` (SQLite).
  - `media.tar.gz` (toàn bộ kho tệp ảnh đã tải lên).
  - `runtime.env` (cấu hình môi trường vận hành tương ứng).
- Sử dụng bẫy lỗi (`trap ERR`) tự động dọn sạch thư mục sao lưu nếu tiến trình bị gián đoạn.

### 2. Khôi phục dữ liệu (Restore)

```bash
# Bắt buộc dừng ứng dụng trước khi khôi phục
bash scripts/stop-local.sh

# Thực hiện khôi phục từ bản sao lưu cụ thể
bash scripts/restore-local.sh .local/backups/<thư_mục_sao_lưu> --yes
# Hoặc dùng make: make restore BACKUP=.local/backups/<thư_mục_sao_lưu>

# Khởi động lại ứng dụng
bash scripts/start-local.sh
```

- **Cơ chế an toàn:** Tự động tạo một bản sao lưu an toàn của dữ liệu hiện tại (`pre-restore safety backup`) trước khi ghi đè, xác minh tính toàn vẹn của tệp nén `media.tar.gz` bằng `tar -tzf`, và phục hồi database trong giao dịch.

---

## Cấu Hình Biến Môi Trường

Mẫu cấu hình chuẩn được cung cấp tại `.env.example`. Trong môi trường local, cấu hình tự động được sinh tại `.local/runtime.env`.

| Biến môi trường                     | Mục đích & Mặc định                                | Môi trường sản xuất (`DEBUG=0`)         |
| ----------------------------------- | -------------------------------------------------- | --------------------------------------- |
| `DJANGO_DEBUG`                      | Bật/tắt chế độ gỡ lỗi (`1` cho dev, `0` cho prod). | Bắt buộc đặt `0`.                       |
| `DJANGO_SECRET_KEY`                 | Khóa mã hóa session và chữ ký bảo mật.             | Bắt buộc dài ≥ 32 ký tự ngẫu nhiên.     |
| `DJANGO_ALLOWED_HOSTS`              | Danh sách tên miền/IP được phép truy cập.          | Bắt buộc chỉ định cụ thể (từ chối `*`). |
| `DJANGO_CSRF_TRUSTED_ORIGINS`       | Nguồn gốc được tin cậy để gửi request POST/PATCH.  | Chỉ định domain thực tế phục vụ web.    |
| `DJANGO_HTTPS`                      | Bật cờ `Secure` cho cookie phiên và CSRF.          | Mặc định tự động bật khi `DEBUG=0`.     |
| `POSTGRES_DB` / `USER` / `PASSWORD` | Thông số kết nối cơ sở dữ liệu PostgreSQL.         | Bắt buộc đặt mật khẩu mạnh.             |
| `PRIVATE_MEDIA_ROOT`                | Thư mục lưu trữ tệp ảnh gốc và phái sinh.          | Mặc định trỏ về `.local/media`.         |

---

## Giới Hạn Đã Biết & Lưu Ý Vận Hành

- **Phạm vi dữ liệu:** Dữ liệu thực tế gồm 14 địa điểm và 39 hình ảnh tư liệu tại Đà Nẵng với thông tin nguồn và tác giả đã được rà soát. Thông tin giờ mở cửa được thu thập từ kênh thông tin công khai hoặc khảo sát thực tế; đối với địa điểm chưa có nguồn chính thức, hệ thống hiển thị khung giờ phổ biến kèm ghi chú rõ ràng.
- **Bản đồ số:** Bản đồ là công cụ trực quan hóa không gian địa phương, không cung cấp dẫn đường thời gian thực từng ngã rẽ (turn-by-turn). Đối với nhu cầu dẫn đường di chuyển ngoài thực địa, người dùng có thể bấm nút _"Chỉ đường"_ để chuyển sang ứng dụng Google Maps.
- **Bảo mật Secret:** Không có bất kỳ secret thật nào được lưu trong mã nguồn Git. Mọi thông tin nhạy cảm được cách ly tại thư mục `.local/` đã cấu hình trong `.gitignore`.

---

## Kiến Trúc Công Nghệ

- **Frontend:** React 19, TypeScript, React Router v7, TanStack Query v5, MapLibre GL v5, Tailwind CSS v4, Lucide Icons.
- **Backend:** Python 3.14 / Django 5.2, Django REST Framework, Clean Architecture (Selectors / Services pattern), Scoped Throttles.
- **GIS & Dữ liệu:** OpenStreetMap Nominatim, Photon by Komoot, Esri World Geocoding, Nextzen OSM Vector Dataset (`region.geojson`).
- **Kiểm thử tự động:** Tích hợp kiểm thử đa tầng (Pytest backend, Vitest frontend, Playwright E2E).

---

## Giấy phép & Nguồn dữ liệu Bản đồ (Map Licensing & Attribution)

Mọi tài nguyên bản đồ trong Rendez đều tuân thủ các điều khoản cấp phép công khai, nguồn mở và không phát sinh chi phí:

1. **Lớp nền Raster Tiles (Esri ArcGIS World Street Map):**
   - **Nguồn:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}` và máy chủ `services.arcgisonline.com`.
   - **Chi phí & Ràng buộc:** Dịch vụ basemap công cộng, không yêu cầu billing hay API key trả phí.
   - **Ghi nhận bản quyền:** Hiển thị trực tiếp trên giao diện bản đồ qua Attribution Control: `Tiles © Esri — Sources: Esri, OpenStreetMap contributors`.

2. **Dữ liệu đường xá & ranh giới cục bộ (`region.geojson`):**
   - **Nguồn:** Nextzen / OpenStreetMap vector extracts tại Đà Nẵng.
   - **Bản quyền & Giấy phép:** © OpenStreetMap contributors (Open Database License - ODbL). Phục vụ hoàn toàn cục bộ từ `frontend/public/map/region.geojson`.

3. **Phông chữ nhãn bản đồ (Map Glyphs):**
   - **Phông chữ:** `Noto Sans Regular` PBF vector glyphs (`0-255.pbf`, `256-511.pbf`, `7680-7935.pbf` hỗ trợ tiếng Việt có dấu).
   - **Giấy phép:** SIL Open Font License, Version 1.1 (văn bản đầy đủ tại `frontend/public/map/FONT-LICENSE.txt`). Phục vụ 100% cục bộ từ máy chủ tĩnh Rendez, không phụ thuộc Google Fonts CDN.

4. **Biểu tượng ghim (Markers & Icons):**
   - Bộ biểu tượng Lucide SVG (`MapPin`, `NavigationControl`) render trực tiếp trong DOM nội bộ, không tải sprite ngoài.

5. **Xử lý ngoại tuyến & Lỗi mạng:**
   - Khi không có kết nối tới máy chủ ngoài, lớp màu nền ấm (`#f3f0e8`), các nhãn đường cục bộ từ `region.geojson` và danh sách địa điểm nội bộ vẫn được duy trì; khi style hoặc tài nguyên bản đồ cốt lõi gặp sự cố, giao diện hiển thị thông báo lỗi thân thiện kèm nút thử lại.

---

Chi tiết kiến trúc và kế hoạch phát triển xem tại [docs/PROJECT_DESCRIPTION.md](docs/PROJECT_DESCRIPTION.md).
