# Workspace

Dự án chạy từ `rendez-web/`. Frontend và backend nằm trong các thư mục cùng cấp. Dịch vụ ML và pipeline nghiên cứu đã được gỡ theo phạm vi phiên bản hiện tại. Hướng dẫn cài đặt và chạy nằm trong [README](../README.md).

## Cấu hình được giữ

- `.env` và `.env.example` nằm ở gốc. Vite đọc biến môi trường từ thư mục cha của `frontend`.
- Frontend dùng cổng 5173, proxy API/Admin/media sang backend ở cổng 8000.
- Makefile và CI dùng đường dẫn tương đối từ gốc workspace.
- `compose.yaml` giữ tên project `rendez-v2-specs` để tiếp tục dùng nhận diện container và volume hiện có. Đây là tên hạ tầng, không phải thư mục mã nguồn.
- Caddy vẫn nhận đường dẫn build/static qua biến môi trường. Nếu cấu hình triển khai bên ngoài trỏ tới thư mục cũ, cập nhật `RENDEZ_FRONTEND_ROOT` thành đường dẫn `frontend/dist` mới và `RENDEZ_STATIC_ROOT` thành `backend/staticfiles` mới.

## Dọn dẹp

Đã gỡ specs v2/v3, kế hoạch triển khai cũ, bộ mockup, ZIP, ảnh chụp giao diện và báo cáo kiểm thử cũ. Giữ mã nguồn, migration, kiểm thử hiện hành, OpenAPI, lockfiles và cấu hình. Media cục bộ không thuộc bộ ảnh thiết kế cũ và được giữ nguyên.

Ảnh/báo cáo kiểm thử được sinh lại khi chạy kiểm thử; không dùng chúng làm tài liệu nguồn. Các đường dẫn artifact được loại khỏi Git.

## Kiểm tra sau chuyển thư mục

- TypeScript, ESLint, Prettier, 6 kiểm thử frontend và production build: đạt.
- Ruff lint/format, cú pháp Python, Django system check và 3 kiểm thử nội dung không dùng database: đạt.
- Playwright: luồng nối trang ảnh, thử lại trang lỗi, đổi danh mục và giữ truy vấn khi chuyển sang bản đồ đạt với API giả lập.
- Docker Compose: kiểm tra cú pháp cấu hình đạt; không khởi động container.
- Git nhận `rendez-web` là gốc repo. README không còn liên kết nội bộ bị thiếu.

Không chạy migration, seed, kiểm thử cần PostgreSQL hoặc các luồng E2E ghi dữ liệu trong lần dọn dẹp này. Chưa xác minh triển khai production hay cấu hình đường dẫn bên ngoài repo. Build vẫn có cảnh báo chunk MapLibre lớn và annotation của Zod.
