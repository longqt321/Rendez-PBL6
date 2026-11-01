# Hoàn thiện bản local

Mục tiêu: khám phá địa điểm Đà Nẵng qua ảnh thật; đăng nhập, tìm kiếm, lọc, bản đồ, lưu địa điểm, chia sẻ, đăng/gỡ ảnh và quản lý tài khoản hoạt động với PostgreSQL local. Không triển khai cloud, không AI placeholder, không giả rating/giá/ảnh của quán. Giữ database cũ; tạo database local riêng trong workspace.

## 1. Nền tảng và dữ liệu
- [x] Kiểm tra cấu trúc và luồng hiện tại.
- [x] Bỏ dependencies, artifacts và runtime khỏi tìm kiếm repo.
- [x] Chọn địa điểm Đà Nẵng có nguồn và ảnh đúng địa điểm.
- [x] Ghi địa chỉ, tọa độ, nguồn kiểm tra từng địa điểm.
- [x] Ghi trang nguồn thông tin từng ảnh.
- [x] Tải ảnh thật về workspace; không hotlink ảnh.
- [x] Chuẩn hóa kích thước ảnh, giữ tỷ lệ tự nhiên.
- [x] Chuẩn bị bản đồ đường phố Đà Nẵng lưu local.
- [x] Import idempotent, không tạo dữ liệu DEMO hoặc tài khoản có mật khẩu mặc định.
- [x] Tạo PostgreSQL riêng, dữ liệu lưu trong workspace.
- [x] Migration và import trên database local mới.
- [x] Kiểm tra nguồn, số địa điểm, số ảnh và vị trí.

## 2. Backend
- [x] Trang nguồn thông tin ảnh được trả về và hiển thị.
- [x] Tìm tên/địa chỉ tiếng Việt không dấu.
- [x] Bộ lọc loại địa điểm và đặc điểm phù hợp dữ liệu thật.
- [x] Tài khoản cập nhật tên và đổi mật khẩu.
- [x] Người đăng sửa mô tả và gỡ ảnh của mình.
- [x] Bảo vệ session/CSRF, quyền xem ảnh và quyền sửa/gỡ.
- [x] Upload lỗi không mất ảnh đã chọn; giới hạn ảnh rõ ràng.
- [x] Kiểm tra backend một lần khi hoàn thành module.

## 3. Giao diện
- [x] Thiết kế nhất quán: ảnh lớn, typography rõ, màu và khoảng cách có chủ đích.
- [x] Đăng nhập/đăng ký có ảnh địa phương thật và bố cục mobile.
- [x] Khám phá có tiêu đề, bộ lọc, số kết quả và masonry ổn định.
- [x] Chọn ảnh mở chi tiết, lưu địa điểm và xem vị trí thuận tiện.
- [x] Trang địa điểm có ảnh, địa chỉ, mô tả, bản đồ và nguồn thông tin.
- [x] Trang ảnh có thông tin nguồn, chia sẻ và báo cáo.
- [x] Bản đồ có danh sách đồng bộ, chọn marker, GPS và trạng thái lỗi.
- [x] Đã lưu: danh sách, trạng thái trống và bỏ lưu.
- [x] Đăng ảnh: chọn địa điểm bằng ảnh bìa, xem thêm theo nhóm 6, preview, chỉnh mô tả, gửi và xác nhận.
- [x] Ảnh của tôi: sửa mô tả/gỡ ảnh và trạng thái.
- [x] Hồ sơ: tên, số ảnh/địa điểm lưu, cập nhật và đổi mật khẩu.
- [x] Điều hướng desktop/mobile, bàn phím, focus và giảm chuyển động.
- [x] Loading/error/empty states, không overflow ở 375px.
- [x] Kiểm tra lint/type/unit/build một lần khi hoàn thành module.

## 4. Vận hành và kiểm chứng
- [x] Script setup/start/stop local, không phụ thuộc cloud.
- [x] Script kiểm tra tập trung, logs lưu trong workspace.
- [x] Script backup/restore database và media local.
- [x] README: chạy, tài khoản, dữ liệu, nguồn và giới hạn thực tế.
- [x] Mở app với PostgreSQL và dữ liệu thật.
- [x] Kiểm tra mọi màn hình, luồng chính desktop và mobile bằng browser.
- [x] Kiểm tra offline: frontend, ảnh và bản đồ không gọi dịch vụ bên ngoài.
- [x] Sửa lỗi quan sát được; kiểm tra lại phần đã sửa.
- [x] Báo cáo kết quả, URL chạy và phần chưa kiểm chứng.

## Kết quả kiểm chứng

- PostgreSQL thật: `rendez_local` tại 127.0.0.1:55433; toàn bộ migration áp dụng trên database mới. Database cũ 55432 giữ nguyên.
- Dữ liệu cuối: 14 địa điểm, 39 ảnh tư liệu có trang nguồn; 13 địa điểm có tọa độ. Đã mở và kiểm tra toàn bộ ảnh, kiểm tra file original/derivative, sửa ba metadata ngày chụp và import lại không tạo ảnh mới.
- Backend cuối: **222 tests đạt trên PostgreSQL test database** (`backend/tests` + `backend/apps`), Ruff lint/format đạt, Django check đạt, migration state không lệch; OpenAPI validation và sinh TypeScript đạt.
- Frontend: **61 unit tests đạt**; lint, format và TypeScript/build cuối đạt.
- Browser app thật: đăng ký/validation/eye, chặn URL khách/API, feed tải 39 ảnh, masonry, lưu/bỏ lưu, tìm không dấu, danh mục/đặc điểm, empty/search recovery, chi tiết/gallery/attribution, bình luận/xóa, báo cáo, bản đồ/marker/list/zoom, GPS từ chối và được cấp quyền, lỗi bản đồ/thử lại, upload lỗi/preview/đăng ngay, sửa mô tả/gỡ ảnh, thêm địa điểm với map picker, đổi tên/mật khẩu/đăng xuất/đăng nhập lại, thống kê hồ sơ, chia sẻ liên kết, 404/API outage/retry/session hết hạn.
- Đã mở các màn hình khám phá, địa điểm, ảnh, bản đồ, đã lưu, lịch sử, đăng ảnh và hồ sơ ở 375px; kiểm tra landscape 844×390, focus và reduced motion. Không tràn ngang hoặc lỗi JavaScript trong các luồng cuối. Kiểm tra đăng nhập/đăng ký ở desktop và mobile.
- Admin: đã mở dashboard, địa điểm, submission, nhãn ảnh, báo cáo, tài khoản và màn hình quản lý ảnh. Luồng chỉnh sửa admin đã có tests backend; lần browser này không sửa/gỡ ảnh tư liệu thật trong Admin.
- Chặn toàn bộ request HTTPS ngoài local trong browser; frontend/ảnh/bản đồ/glyph vẫn hoạt động. Không có request runtime ra ngoài trong các luồng cuối. Liên kết nguồn/chỉ đường mở ngoài app khi được bấm; chưa kiểm tra dẫn đường ngoài thực địa.
- Backup database/media đã tạo. PostgreSQL dump đã phục hồi vào database tạm `rendez_restore_check` và kiểm tra số bản ghi, rồi dọn database tạm. Đã kiểm tra archive media; chưa thực hiện restore đè database app đang dùng.
- Tài khoản, báo cáo, bình luận, địa điểm và ảnh do kiểm chứng tạo đã được dọn; dữ liệu sản phẩm giữ 14/39. Credentials quản trị và backup lưu riêng trong `.local`, không commit.

Ảnh kiểm chứng: `.local/screenshots/release-desktop.png`, `release-mobile.png`, `map-street-labels.png`, `profile-final.png` và các màn hình liên quan. Logs ở `.local/logs`; các script kiểm chứng browser trong `.local/review-*.mjs`.

## Giới hạn hiện tại

Chưa khảo sát khách hàng ngoài thực tế, không cam kết mức thu hút/chuyển đổi. Ảnh tư liệu có nhiều năm chụp; giờ mở cửa/giá chưa được xác minh nên không bịa số liệu. Oxy Garden chưa có marker do thiếu tọa độ đủ chắc chắn. Bản đồ là snapshot Đà Nẵng, không phải dẫn đường turn-by-turn. Chưa triển khai hoặc kiểm tra dịch vụ trên cloud. Browser automation cũ dùng DEMO được cập nhật selectors, nhưng không chạy lại toàn bộ suite đó trên database thật này.

Build còn cảnh báo kích thước chunk MapLibre và annotation trong Zod; build thành công. `check --deploy` có bốn cảnh báo HTTPS/cookie/HSTS vì bản local chỉ phục vụ HTTP trên loopback; không tắt cảnh báo và không coi cấu hình này là triển khai public HTTPS.
