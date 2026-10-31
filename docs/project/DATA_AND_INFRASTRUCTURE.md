# Rendez — Dữ Liệu & Hạ Tầng Kỹ Thuật (Data & Infrastructure)

Tài liệu này đặc tả chi tiết kiến trúc cơ sở dữ liệu PostgreSQL/PostGIS, lưu trữ tệp tin phương tiện, tài nguyên bản đồ số, dữ liệu hạt giống và cấu hình môi trường của Rendez.

---

## 1. Cơ Sở Dữ Liệu: PostgreSQL 17 + PostGIS

Hệ thống sử dụng hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở **PostgreSQL 17** tích hợp phần mở rộng không gian địa lý **PostGIS**:

```mermaid
graph TD
    subgraph Container_Env [Container Docker Cục Bộ: rendez-local-db-1]
        PGEngine["PostgreSQL 17 Engine"]
        PostGISExt["Phần Mở Rộng: postgis<br/>(Hỗ trợ kiểu PointField, ST_MakeEnvelope)"]
        GistExt["Phần Mở Rộng: btree_gist<br/>(Hỗ trợ chỉ mục không gian & loại trừ)"]
    end

    subgraph Host_Filesystem [Máy Chủ / Host Filesystem]
        VolumeDir[".local/postgres/<br/>(Thư mục Bind Mount lưu trữ dữ liệu vĩnh viễn)"]
        MediaDir[".local/media/<br/>(Lưu trữ tệp ảnh original & derivative)"]
    end

    DjangoBackend["Django Backend (Port 8000)"] <-->|Kết nối cổng 55433 (psycopg 3)| PGEngine
    PGEngine <--> VolumeDir
    DjangoBackend <--> MediaDir
```

### 1.1. Thông Số Môi Trường Phát Triển Cục Bộ
- **Tên Container:** `rendez-local-db-1`
- **Địa chỉ máy chủ:** `127.0.0.1` (localhost)
- **Cổng ánh xạ (Port):** `55433` (Lưu ý: Cổng `55432` là cổng cũ trong lịch sử dự án, hiện đã được thay thế hoàn toàn bằng `55433`).
- **Tên cơ sở dữ liệu:** `rendez_local`
- **Vị trí lưu trữ dữ liệu (Volume):** Thư mục bind mount `.local/postgres` trên máy chủ host, bảo đảm dữ liệu được giữ nguyên vẹn qua các lần khởi động lại container.
- **Phần mở rộng bắt buộc:**
  - `postgis`: Hỗ trợ lưu trữ tọa độ WGS-84 (`SRID 4326`), kiểu hình học `Point` và các phép tính khoảng cách không gian.
  - `btree_gist`: Hỗ trợ đánh chỉ mục GIST trên các cột quan hệ thông thường kết hợp không gian.

---

## 2. Lưu Trữ Tệp Phương Tiện (Media Storage)

Toàn bộ hình ảnh tải lên được quản lý bởi hệ thống tệp cục bộ có kiểm soát phân quyền (`apps.photos.models.PhotoAsset`):

- **Thư mục lưu trữ tệp:** `.local/media/` (được cấu hình qua biến môi trường `PRIVATE_MEDIA_ROOT`).
- **Phân tách hai cấp độ tệp:**
  1. **Tệp Gốc Đã Chuẩn Hóa (`original`):** Tệp ảnh chất lượng cao đã qua hàm `normalize_image()` để tháo gỡ hoàn toàn siêu dữ liệu EXIF và định chuẩn hệ màu sRGB. Được lưu trữ an toàn và chỉ cho phép kiểm duyệt viên/Staff tải về qua endpoint `/api/v1/private-photo-original/<id>/`.
  2. **Tệp Phái Sinh Hiển Thị (`derivative`):** Tệp ảnh đã được nén tối ưu (WebP hoặc JPEG chất lượng 85, kích thước cạnh dài tối đa 1600px). Phục vụ công khai cho người dùng đã đăng nhập qua endpoint `/api/v1/public-photo-media/<id>/`.
- **Định danh tệp chống trùng lặp:** Tên tệp được đặt theo mã băm nội dung SHA-256 (64 ký tự hex) kết hợp phần mở rộng chuẩn hóa, bảo đảm không bao giờ bị trùng tên hoặc ghi đè file cũ.

---

## 3. Tài Nguyên Bản Đồ Địa Phương & Nguồn Gạch (Map Assets & Tiles)

Để phục vụ hiển thị bản đồ trên máy trạm người dùng mà không bị phụ thuộc vào dịch vụ đám mây thương mại đắt đỏ:

### 3.1. Dữ Liệu Vector Nội Bộ
- **Đường phố địa phương:** Tệp `frontend/public/map/region.geojson` chứa dữ liệu hình học vector chi tiết của mạng lưới giao thông khu vực Liên Chiểu, Đà Nẵng.
- **Bộ ký tự phông chữ tiếng Việt (Glyphs):** Lưu trữ tại `frontend/public/map/glyphs/Noto Sans Regular/{range}.pbf`. Bộ glyphs này được tạo sẵn để hiển thị trọn vẹn dấu tiếng Việt mà không cần gọi ra Internet.
- **Bản quyền phông chữ:** Giấy phép mã nguồn mở công khai tại `frontend/public/map/FONT-LICENSE.txt`.

### 3.2. Nguồn Gạch Nền Raster (Esri ArcGIS Online)
- Lớp ảnh nền bản đồ địa hình (Terrain / Topographic base tiles) hiện được tải trực tiếp từ máy chủ công khai của Esri:
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`
- Được cấu hình trong tệp `frontend/public/map/style.json`. Đây là **phụ thuộc mạng ngoài bán phần duy nhất** của hệ thống bản đồ hiện tại.

---

## 4. Dịch Vụ Geocoding Gợi Ý Tọa Độ (`geocoding.py`)

Khi thành viên nộp ảnh cho một cơ sở mới và nhập địa chỉ, hệ thống kích hoạt module geocoding đa nguồn tại `backend/apps/places/geocoding.py`:
1. **Photon Geocoder:** Truy vấn dịch vụ Photon mã nguồn mở (`photon.komoot.io`).
2. **Nominatim OSM:** Truy vấn dịch vụ bản đồ cộng đồng OpenStreetMap Nominatim làm cơ chế dự phòng thứ nhất.
3. **Esri Geocoder:** Cơ chế dự phòng thứ hai.
4. **Cơ Chế Khả Năng Chống Chịu Lỗi (Resilience):** Nếu dịch vụ thứ nhất gặp sự cố mạng hoặc quá tải, hệ thống tự động chuyển sang nhà cung cấp tiếp theo mà không làm gián đoạn trải nghiệm của người dùng.

---

## 5. Dữ Liệu Hạt Giống & Cơ Chế Nhập Liệu Bền Vững (Seed Data)

Hệ thống được đóng gói sẵn bộ dữ liệu hạt giống tại thư mục `data/`:
- **`data/danang.json`:** Danh sách 12 cơ sở quán cà phê quanh khu vực Đại học Bách Khoa Đà Nẵng, bao gồm tên quán, địa chỉ, tọa độ GPS, danh mục và giờ mở cửa.
- **`data/photos/`:** 36 tệp **ảnh minh hoạ sinh tự động** (placeholder), tạo bởi `scripts/generate_coffee_photos.py` ở kích thước `1600×1067`.

> [!WARNING]
> **Giới hạn đã biết:** 36 ảnh trong `data/photos/` **không phải ảnh chụp thực địa**. Chúng được vẽ bằng PIL (gradient, khung, chip nhãn) và có watermark `RENDEZ · KHÁM PHÁ CÀ PHÊ QUANH ĐH BÁCH KHOA ĐÀ NẴNG (DUT)`. Trường `credit` trong `danang.json` ghi `license: "Synthetic placeholder (không phải ảnh thực địa)"`. Các tệp JPEG hiện có vẫn mang dòng chữ cũ `Đã xác thực thực tế & Giới trẻ Đà Nẵng` vẽ trực tiếp vào bitmap; script sinh ảnh đã được sửa sang watermark trung tính nhưng ảnh **chưa được sinh lại** (thao tác đó ghi đè 36 tệp đang được git theo dõi). Chi tiết: [`data/README.md`](../../data/README.md) mục 5.

### Lệnh Nhập Liệu Bền Vững: `import_danang`
Lệnh quản trị Django `python manage.py import_danang` được thiết kế với cơ chế bảo vệ trạng thái tuyệt đối:
- **Định danh UUID cố định (Deterministic UUIDs):** Sử dụng UUID và Idempotency Key cố định cho từng quán và từng ảnh dựa trên dữ liệu nguồn.
- **Chống Trùng Lặp (Idempotent):** Chạy lệnh nhiều lần không tạo ra bản ghi nhân bản trong cơ sở dữ liệu.
- **Bảo Toàn Trạng Thái Đã Rút (Preserve Withdrawn):** Nếu một ảnh đã bị kiểm duyệt viên rút (`status="withdrawn"`), việc chạy lại lệnh import **tuyệt đối không bao giờ tự ý xuất bản lại bức ảnh đó**.
- **Không Ghi Đè Chỉnh Sửa:** Các thay đổi về mô tả quán hoặc gắn nhãn thuộc tính do Staff thực hiện thủ công trong hệ thống không bị ghi đè bởi dữ liệu hạt giống ban đầu.

---

## 6. Danh Mục Biến Môi Trường (Environment Variables)

Hệ thống sử dụng tệp `.local/runtime.env` (tạo tự động bởi script setup) và `.env.example` làm mẫu cấu hình.

> [!CAUTION]
> Tuyệt đối không lưu giá trị bí mật thực tế vào tài liệu này. Bảng dưới đây chỉ mô tả tên biến và mục đích sử dụng.

| Tên Biến Môi Trường | Mục Đích Kỹ Thuật | Giá Trị Mẫu Trong Dev |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối tới cơ sở dữ liệu PostgreSQL | `postgresql://user:pass@127.0.0.1:55433/rendez_local` |
| `SECRET_KEY` | Khóa bí mật dùng cho mã hóa phiên và CSRF Django | Chuỗi ngẫu nhiên 64 ký tự |
| `DJANGO_DEBUG` | Bật/tắt chế độ debug của Django | `True` (Dev) / `False` (Prod) |
| `ALLOWED_HOSTS` | Danh sách tên miền được phép tiếp nhận request | `127.0.0.1,localhost` |
| `PRIVATE_MEDIA_ROOT` | Đường dẫn thư mục lưu trữ tệp ảnh nhị phân | `.local/media` |
| `SESSION_COOKIE_SECURE` | Cờ bảo mật HTTPS cho cookie phiên | `False` (Dev HTTP) / `True` (Prod HTTPS) |
| `CSRF_COOKIE_SECURE` | Cờ bảo mật HTTPS cho cookie chống giả mạo CSRF | `False` (Dev HTTP) / `True` (Prod HTTPS) |
| `CSRF_TRUSTED_ORIGINS` | Danh sách URL nguồn tin cậy chấp nhận request ghi | `http://127.0.0.1:8000,http://localhost:8000` |

---

## 7. Hiện Trạng Hạ Tầng Triển Khai (Deployment Status)

| Môi Trường | Hiện Trạng Kiểm Chứng Trong Repository |
|---|---|
| **Môi Trường Cục Bộ (Local Development)** | **Đã Kiểm Chứng (Verified):** Chạy hoàn hảo trên Docker + Gunicorn + WhiteNoise + PostgreSQL 17 cục bộ. |
| **Môi Trường Kiểm Thử (Automated Test)** | **Đã Kiểm Chứng (Verified):** Cơ sở dữ liệu test PostgreSQL độc lập được khởi tạo tự động khi chạy Pytest. |
| **Môi Trường Sản Xuất (Production Deployment)** | **Chưa Xác Minh (Not Verified / Unknown):** Chưa có kịch bản triển khai Kubernetes, Docker Swarm hoặc cấu hình máy chủ đám mây production trong repository. |

---

## 8. Bố Cục Workspace & Quy Ước Vận Hành

Mọi mã nguồn, dữ liệu nguồn và scripts nằm tại gốc `rendez-web`:

```text
frontend/       React, TypeScript, ảnh chủ đề và bản đồ local
backend/        Django, API, migrations, quản trị và tests
data/           manifest, ảnh minh hoạ và nguồn/giấy phép
docs/           hướng dẫn, checklist và kết quả kiểm chứng
scripts/        setup/start/stop/check/backup/restore
.local/         PostgreSQL, media, secrets, logs, backup; không commit
```

* `compose.local.yaml` dùng PostgreSQL riêng ở 55433, bind mount trong workspace. `compose.yaml` cũ giữ nguyên để không đổi nhận diện container/volume đang có. Cấu hình local nằm ở `.local/runtime.env`, được `scripts/env.sh` nạp trước khi chạy.
* `make setup`, `make start` chạy bản build ở 8080. `make backend`, `make frontend` phục vụ phát triển ở 8000/5173. Ứng dụng chạy trực tiếp local/container, không triển khai cloud.
* `.gitignore` bỏ secrets/runtime/dependencies/artifacts khỏi Git; `.ignore` bỏ thư mục lớn khỏi tìm kiếm bằng `rg`.
* Mỗi module được kiểm tra sau khi hoàn thành; kết quả/log nằm trong `.local/logs`, ảnh kiểm chứng ở `.local/screenshots`. Không đưa ảnh kiểm chứng vào dữ liệu sản phẩm.
