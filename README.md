# Rendez

Khám phá Đà Nẵng qua ảnh và bản đồ. Lưu địa điểm muốn ghé, đăng ảnh của bạn và trao đổi trong bình luận. React + Django + PostgreSQL; database, ảnh và bản đồ chạy local.

## Chạy bản local

Cần Docker Compose, Python 3.12/uv và Bun. Chạy từ thư mục `rendez-web`:

```bash
make setup
make start
```

Mở **http://127.0.0.1:8080**. Một server Gunicorn phục vụ frontend build, API, ảnh và Django Admin. Giữ terminal đang chạy; Ctrl+C dừng app. `make stop` dừng từ terminal khác. Database tiếp tục chạy và giữ dữ liệu.

`make setup` tạo PostgreSQL riêng ở cổng **55433**, lưu tại `.local/postgres`. Không dùng hoặc thay đổi database cũ ở cổng 55432. Mật khẩu database và Django secret được tạo ngẫu nhiên tại `.local/runtime.env`, không commit. Setup chỉ import ảnh/địa điểm chưa có, không khôi phục ảnh đã gỡ hoặc ghi đè chỉnh sửa của người dùng.

Tạo tài khoản trên giao diện để sử dụng. Setup tạo sẵn tài khoản quản trị với mật khẩu ngẫu nhiên. Có thể kiểm tra/tạo quản trị bằng lệnh:

```bash
bash -c 'source scripts/env.sh; backend/.venv/bin/python scripts/create-admin.py'
```

Email/mật khẩu quản trị lưu trong `.local/admin-credentials.json` (quyền 0600). Quản trị ở **http://127.0.0.1:8080/admin/**. Bản local mặc định `DEBUG=0`, đăng nhập bằng tài khoản thật. Shortcut DEBUG chỉ hoạt động trong môi trường phát triển khi `DJANGO_DEBUG=1`.

## Dữ liệu có sẵn

14 địa điểm Đà Nẵng, 39 ảnh thật: quán cà phê, chợ, cầu, bãi biển, bảo tàng, nhà thờ và danh thắng. Manifest nằm ở [data/danang.json](data/danang.json). Ảnh có tác giả, giấy phép, trang nguồn và ngày chụp; giao diện hiển thị những thông tin này. Đây là ảnh tư liệu từ nhiều năm, không phải cam kết về hiện trạng, giá hoặc giờ mở cửa. Một địa điểm chưa có tọa độ đủ chắc chắn nên không có marker.

Ảnh được lưu trong repo để setup không cần tải ảnh từ dịch vụ bên ngoài. Sau import, media ứng dụng ở `.local/media`. Bản đồ sử dụng dữ liệu OpenStreetMap và glyph Noto Sans lưu tại `frontend/public/map`. Không gọi dịch vụ bản đồ, ảnh, font hoặc AI từ bên ngoài khi sử dụng app. Các liên kết nguồn và chỉ đường chỉ mở khi người dùng bấm. Xem [nguồn và giấy phép](data/README.md).

## Chức năng

- Feed masonry theo tỷ lệ ảnh, chủ đề khám phá, phân trang, lọc loại địa điểm và đặc điểm nhìn thấy trong từng ảnh.
- Tìm tên/địa chỉ tiếng Việt có dấu hoặc không dấu; nhiều từ khóa cùng khớp.
- Bản đồ Đà Nẵng, danh sách trong vùng, marker, ảnh xem trước và định vị khi người dùng yêu cầu.
- Lưu/bỏ lưu địa điểm, xem ảnh, thông tin nguồn và chia sẻ liên kết.
- Đăng 1–5 ảnh JPEG/PNG, tối đa 10 MiB/ảnh; bỏ EXIF và tạo ảnh hiển thị gọn hơn. Đăng công khai ngay, không duyệt trước.
- Thêm địa điểm bằng tên/địa chỉ/loại; chọn vị trí bằng thao tác trên bản đồ, không nhập kinh độ/vĩ độ.
- Bình luận, xóa bình luận của mình, sửa mô tả/gỡ ảnh của mình, báo cáo nội dung.
- Đổi tên hiển thị và mật khẩu; session/CSRF và quyền truy cập được kiểm tra ở backend.
- Admin quản lý địa điểm, nhãn ảnh và báo cáo sau khi đăng.

## Phát triển

Hai terminal để frontend tự cập nhật:

```bash
make backend
make frontend
```

Mở http://127.0.0.1:5173. Vite proxy đến Django 8000. Hai lệnh đọc cấu hình `.local/runtime.env`; không dùng database cũ. Sau chỉnh sửa, chạy `make setup` để build lại rồi `make start`.

```bash
bash scripts/check.sh backend   # lint, format, migration state, tests, Django check
bash scripts/check.sh frontend  # lint, format, unit tests, type check/build
make schema                    # cập nhật OpenAPI và kiểu TypeScript
```

Backend tests tạo database `test_rendez_local` riêng. Không chạy E2E cũ trên database chứa dữ liệu cần giữ; các fixtures E2E có dữ liệu DEMO. Log kiểm tra nằm trong `.local/logs`; checklist/kết quả ở [docs/LOCAL-RELEASE.md](docs/LOCAL-RELEASE.md).

## Sao lưu

```bash
make backup
make stop
bash scripts/restore-local.sh .local/backups/<thư-mục-backup> --yes
make start
```

Backup gồm PostgreSQL dump, media và cấu hình local. Restore tạo thêm backup trước khi thay dữ liệu; chỉ nhận thư mục backup trong workspace. Bảo vệ `.local/backups` vì có dữ liệu tài khoản và secrets. Script restore chưa được chạy đè lên database đang sử dụng; kiểm chứng phục hồi được thực hiện trên database tạm riêng.

Workspace chỉ có frontend, backend, dữ liệu nguồn, tài liệu và scripts. Không microservices, worker hay hạ tầng cloud. [Vai trò dữ liệu và API](docs/BACKEND.md).
