# BACKLOG

Danh sách các việc thật sự còn mở sau đợt rà soát 2026-11-19 (các mục đã hoàn thành đã được dọn gọn).

## 1. Dữ liệu & Bản đồ

- [ ] **Toạ độ POI trùng/trôi trên bản đồ**: `backend/data/places-expanded.json` (358 POI) hiện có 54 nhóm trùng toạ độ (118 POI, dùng chung tâm phường/quận hoặc trôi sông Hàn). Tool Go `~/scripts/rendez-geocode-fix` đã sửa lỗi parse Photon nhưng Photon/Nominatim đang rate-limit/chặn; cần nguồn geocode ổn định (hoặc duyệt sửa tay) rồi `db:seed` lại.
- [ ] **Ảnh quán thật**: phần lớn trong 358 địa điểm chưa có ảnh venue thật, đang hiển thị `PlacePlaceholder`; cần nguồn ảnh hợp pháp trước khi phát hành công khai.
- [ ] **Backfill embedding cho corpus 358 địa điểm**: chạy `cd backend && bun run scripts/embed-places.ts` khi Postgres bật để kích hoạt nhánh dense search và đo lại benchmark v3–v7.
- [ ] **Dữ liệu `price_level`**: nguồn thu thập thiếu mức giá đồng đều nên lọc mức giá chỉ có tác dụng khi bổ sung dữ liệu thật.
- [ ] **Đóng góp / duyệt thông tin quán**: hiện có `PlaceReport`, chưa có giao diện và route duyệt đóng góp thông tin quán từ cộng đồng.
- [ ] **Hạn mức cụm trên bản đồ / tối ưu `/map`**: giảm mật độ cụm ở zoom thành phố nếu pin dày, và tách phần lấy dữ liệu lưới khỏi hook URL của `/map` để tránh gọi trùng `/places` trang 1.

## 2. Tính năng & UX / A11y

- [ ] **Chỉnh sửa & ghim bài viết**: `DELETE /posts/:id` đã có, còn thiếu API/UI sửa nội dung bài (`PATCH /posts/:id`) và ghim bài cho tab "Đã ghim" ở hồ sơ.
- [ ] **Kéo thả sắp xếp địa điểm trong bộ sưu tập**: hiện có thêm/xoá từng địa điểm; chưa có sắp xếp thứ tự.
- [ ] **Tạo bộ sưu tập trực tiếp trên `/saved`**: hiện chỉ tạo được bên trong dialog "Lưu vào bộ sưu tập" ở trang quán.
- [ ] **Nút "Nhắn tin" trên `/u/:handle`**: đang tắt kèm tooltip, chờ tính năng hội thoại realtime (WebSocket + lưu tin nhắn).
- [ ] **Vùng chạm mobile < 44px (V1-07)** và **input lỗi thiếu `aria-invalid`/`aria-describedby` (V1-08)**.
- [ ] **Focus trap ở dialog Bình luận (V7-05)**: rà lại vòng Tab trong thread bình luận để không thoát ra ngoài khi mở dialog.
- [ ] **Giữ vị trí cuộn khi Back từ `/discover/:id` (V8-05)** và **một số đường dẫn `/u/:handle` khi hồ sơ riêng tư**.
- [ ] **Vòng đời tài khoản nâng cao**: đổi email (kèm xác thực lại), cho phép đăng ký lại email đã xoá tài khoản, xuất dữ liệu cá nhân, xác nhận xoá tài khoản bằng cách nhập handle.
- [ ] **Quản lý thành viên phòng lọc phía server**: liên kết thành viên phòng theo `userId` (bên cạnh cookie khách) và dùng `SELECT ... FOR UPDATE` khi apply đề xuất song song.

## 3. Hạ tầng, Bảo mật & Vận hành

- [ ] **SSE `/notifications/events` `ERR_INCOMPLETE_CHUNKED_ENCODING`**: điều tra timeout keepalive / buffering của proxy dev và giới hạn backoff reconnect phía client.
- [ ] **Cloudflare R2 thật**: chưa cấu hình bucket/credentials thật; cần xác minh end-to-end `POST /media` + `PUT` presigned với `content-type`/`content-length`, job dọn object mồ côi và biến thể ảnh user upload.
- [ ] **SMTP / Resend thật**: backend `lib/mailer.ts` đã sẵn sàng; cần điền `SMTP_*` + `MAIL_FROM` khi có domain gửi mail thật (dev đang log link ra stdout).
- [ ] **Tile bản đồ production**: OpenStreetMap tile công cộng không phù hợp traffic lớn; đổi sang nhà cung cấp có SLA/key (MapTiler, Carto, Stadia) hoặc self-host trước khi mở công khai.
- [ ] **Tách `DATABASE_URL` test riêng & bỏ Prisma singleton**: hiện `bun run test` trong `backend/` chạy từng file process riêng qua `scripts/test-all.sh` bằng Testcontainers Postgres.
- [ ] **Cấu hình production**: chạy `caddy validate` trên máy có Caddy, thiết lập staging/monitoring và lịch diễn tập restore backup DB định kỳ; đưa job e2e backend thật vào CI khi cần.

## 4. Kỹ thuật & Nợ code

- [ ] **3 lỗ hổng dev/test dependency** (`picomatch`, `minimatch`, `glob`): không đi vào bundle production nhưng `picomatch` chưa có bản vá upstream, còn `minimatch`/`glob` cần major bump.
- [ ] **Tách file lớn khi chạm lại**: `frontend/src/mocks/server.ts` (~2.260 dòng) và `frontend/src/features/places/components/places-map.tsx` (~625 dòng).
- [ ] **Schema chưa dùng route**: các cột `Place.moderationStatus`/`moderatedBy`/`moderatedAt`/`moderationNote` và trang/route admin xử lý `PlaceReport.status`.
- [ ] **API nhỏ cần hoàn thiện**: expose `Place.description` qua API, xử lý `PATCH /notifications` khi không còn thông báo chưa đọc, cho phép tìm kiếm hybrid quá trần `HYBRID_MAX_RESULTS = 30` nếu cần phân trang sâu.
- [ ] **4 finding SonarCloud đánh dấu Won't Fix**: 4 rule trong migration lịch sử (không sửa migration đã chạy), mật khẩu dev mặc định trong `compose.yaml`, và `MD5` tiebreak trong `user-suggestions.ts`.
