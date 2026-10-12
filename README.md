# Rendez v3

Khám phá café/nhà hàng qua ảnh cộng đồng và thuộc tính quan sát được. Người dùng phải đăng nhập để xem Feed/Map, ảnh chứng minh và chi tiết quán. Tài khoản dùng để lưu quán, gửi 1–5 ảnh và báo cáo nội dung. Ảnh và quán mới được đăng ngay. Django Admin quản lý nội dung đã đăng, chỉnh nhãn, chọn ảnh bìa và gỡ ảnh.

Workspace nằm trực tiếp tại `rendez-web`. Chạy các lệnh bên dưới từ thư mục này.

```text
rendez-web/
├── frontend/       # React, TypeScript, Vite
├── backend/        # Django, API và quản trị
├── docs/           # Ghi chú vận hành
├── compose.yaml
├── Makefile
└── Caddyfile
```

Để mở riêng frontend với dependencies đã cài: `make frontend`. Frontend cần backend ở cổng 8000 để tải dữ liệu; lệnh này không khởi động hoặc thay đổi database.

## Chạy local

Cần PostgreSQL/Docker Compose, uv và Bun 1.3.14. Frontend dùng Bun và `bun.lock`; chạy `bun install --cwd frontend --frozen-lockfile` để cài dependencies.

```bash
cp .env.example .env  # chỉ khi chưa có .env
make setup
```

Hai terminal:

```bash
make backend
```

```bash
make frontend
```

Mở http://127.0.0.1:5173. Django ở http://127.0.0.1:8000; API schema `/api/v1/schema/`; Swagger `/api/v1/docs/`; quản trị qua http://127.0.0.1:5173/admin/ để cùng origin session/CSRF.

`make setup` tạo fixture **DEMO**: quán/địa chỉ giả và ảnh minh họa do script tạo. Nhãn `[DEMO]` chỉ kiểm tra chức năng, không phải mapping SUN đã audit. `DEBUG=0` loại quán/ảnh và taxonomy DEMO khỏi API v3 public. Không dùng fixture làm benchmark hoặc nội dung quán thật.

## Luồng sản phẩm

- Feed hiển thị từng ảnh công khai; một quán có thể có nhiều thẻ. Saved và Map hiển thị từng quán.
- Nhiều thuộc tính là AND trên cùng một ảnh. Preview Map dùng ảnh chứng minh, không tự dùng cover không khớp.
- Chỉ đặc điểm đang hoạt động và được bật tìm kiếm xuất hiện ở bộ lọc. Người quản lý gắn nhãn theo nội dung nhìn thấy trong ảnh.
- Upload trả ngay, original riêng tư, derivative bỏ EXIF. Owner xem preview riêng tư; chỉ staff có quyền quản lý ảnh xem original. Không có URL static bỏ qua quyền xuất bản.
- Người dùng đăng ảnh vào quán có sẵn hoặc thêm quán mới. Ảnh hợp lệ và quán mới được công khai ngay trong cùng giao dịch. Gỡ ảnh hoặc ẩn quán chặn các request mới tới nội dung đó.
- Không có OCR, giá bắt buộc, rating, semantic search hoặc tuyên bố yên tĩnh/hợp làm việc từ ảnh.

## Quản trị

```bash
uv run --env-file .env --project backend python backend/manage.py createsuperuser
```

1. Quán và ảnh của người dùng xuất hiện ngay sau khi đăng.
2. Trong danh sách ảnh đã đăng, bấm **Quản lý ảnh** để sửa mô tả/nhãn, chọn ảnh bìa hoặc gỡ ảnh.
3. Xử lý báo cáo nội dung, kiểm tra ảnh/quán liên quan và đánh dấu đã xử lý.

Quyền `photos.review_photosubmission` được giữ tên để tương thích quyền hiện có; nó chỉ dùng cho quản lý sau đăng và xem ảnh gốc riêng tư. Người dùng thông thường không cần quyền này để đăng.

## Bản đồ

Mặc định dùng OpenFreeMap Liberty qua MapLibre, có dữ liệu đường phố và attribution của nguồn. Có thể thay `VITE_MAP_STYLE` theo hosting. GPS chỉ xin khi bấm “Vị trí của tôi”; từ chối vẫn dùng Map bình thường. Map bbox tối đa 2° mỗi chiều, trả tối đa 200 marker và cờ truncated nếu nhiều hơn.

[OpenFreeMap quick start](https://openfreemap.org/quick_start/) và [điều kiện/attribution](https://openfreemap.org/). Không có cam kết SLA riêng cho public tile instance.

## Kiểm thử

```bash
make check
make schema
bun run --cwd frontend playwright install chromium
# E2E_ADMIN_PASSWORD là secret mới do người chạy chọn, không dùng credential mặc định.
export E2E_ADMIN_PASSWORD='mật-khẩu-kiểm-thử-riêng-của-bạn'
make e2e
```

Tests backend dùng DB `test_rendez` riêng. E2E dùng DB local, tạo tài khoản và submission fixture; chỉ chạy trên môi trường demo. Report/screenshot browser ở `frontend/playwright-report/`, `frontend/test-results/`, `docs/screenshots-v3/`.

## Triển khai và dữ liệu lịch sử

Backend chỉ phục vụ luồng ảnh hiện hành. API giá/menu/hóa đơn, đóng góp v2 và media v2 đã được gỡ. Migration mới loại bỏ model, bảng và cột không dùng. Migration lịch sử được giữ để Django theo dõi việc chuyển schema.

Caddyfile phục vụ frontend build, proxy API/Admin và toàn bộ media qua Django ACL. Chưa publish lên hostname ngoài local. Trước public deploy: secret/HTTPS/allowed hosts/CSRF origins, DB và media bền vững, ảnh có phép và taxonomy thực, backup/restore rehearsal. Không phục vụ private media bằng static file server.

Tên project Compose được cố định là `rendez-v2-specs` để giữ nhận diện container và volume đã có sau khi đổi thư mục. Không đổi tên này nếu chưa chuẩn bị chuyển dữ liệu.

## Backend tối giản

Một ứng dụng Django, một database và lưu tệp cục bộ. Không có dịch vụ ML, worker, message broker hay pipeline huấn luyện. API phục vụ đúng các màn hình hiện tại. Xem [backend và vai trò dữ liệu](docs/BACKEND.md).

Các migration tinh giản đã được viết nhưng chưa áp dụng trên PostgreSQL. Chúng xóa bảng/cột cũ, vì vậy không chạy `make setup` trên database hiện có trước khi kiểm tra và sao lưu dữ liệu cần giữ. Backend mới cần schema đã cập nhật để ghi dữ liệu đúng.
