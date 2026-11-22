# BACKLOG

Danh sách các việc thật sự còn mở (cập nhật 2026-11-21 sau đợt đối chiếu mã nguồn & audit UI/UX).

## 1. Dữ liệu & Bản đồ

- [ ] **Ảnh quán thật**: phần lớn trong 360 địa điểm chưa có ảnh venue thật, đang hiển thị `PlacePlaceholder`; cần nguồn ảnh hợp pháp trước khi phát hành công khai. *(Đã có tab `Ảnh món thật` & `Bảng giá / Menu` qua `F-079` cho cộng đồng tự đóng góp.)*
- [x] **Áp dụng migration & seed mới (`20261122142200_f002_f079_f040`)**: đã chạy `bun run db:migrate`, `bun run db:seed` (đồng bộ `ReviewTier`, `PlaceMediaKind`, `RoomCandidate`/`RoomVote`, sửa SQL `rv.rating` còn sót trong `daily-picks.ts`/`suggestions.ts`/`recommendations.ts` và `og.ts`), và cấu hình `dev:all`/`db:up`/`dev:api` tự bật Postgres + Redis cục bộ.
- [ ] **Backfill embedding cho corpus 360 địa điểm**: chạy `cd backend && bun run scripts/embed-places.ts` khi Postgres bật để kích hoạt nhánh dense search và đo lại benchmark v3–v7.
- [ ] **Dữ liệu `price_level`**: nguồn thu thập thiếu mức giá đồng đều nên lọc mức giá chỉ có tác dụng khi bổ sung dữ liệu thật.
- [ ] **Hạn mức cụm trên bản đồ / tối ưu `/map`**: giảm mật độ cụm ở zoom thành phố nếu pin dày (`useMapPlaces` đã tách khỏi hook `/discover`).

## 2. Tính năng & UX / A11y

- [x] **Triển khai `F-002`, `F-079`, `F-040` (Clean Break)**: thay thang 1–5 sao bằng 3 mức (`Ổn` / `Rất ngon` / `Phải thử`) + món nên gọi, tách tab `Ảnh món thật` & `Bảng giá / Menu` (kèm zoom lightbox), và thêm bình chọn nhóm (`Swipe & Match`, `Ranked-Choice IRV`, `Random Wheel`) trong `/rooms/:code`.
- [x] **Mốc vị trí quen thuộc & Đồng bộ GPS từ điện thoại (`20261122172000_location_anchors_and_landmarks`)**: tách 2 bảng `UserLocationAnchor` (mốc cá nhân tối đa 10/user) & `CityLandmark` (địa danh nổi tiếng công khai), đồng bộ GPS chính xác (`<= 150m`) qua Redis (`PUT/GET/DELETE /me/location`), `LocationSwitcher` + `ManageAnchorsDialog` trên UI và thứ tự ưu tiên 6 tầng trong `useUserLocation`.
- [ ] **Nâng cấp `F-040` mở rộng**: thêm `F-034` (Thiệp mời chốt kèo & RSVP) và `F-039` (Gợi ý theo dịp đi & đối tượng) ở đợt tiếp theo.
- [ ] **Chỉnh sửa & ghim bài viết**: `DELETE /posts/:id` và gắn/đổi/gỡ địa điểm cho bài đã đăng (`PATCH /posts/:id/place` hỗ trợ cả `placeId: null` qua `AttachPostPlaceDialog`) đã có, còn thiếu API/UI sửa nội dung bài (`PATCH /posts/:id`) và ghim bài cho tab "Đã ghim" ở hồ sơ.
- [ ] **Kéo thả sắp xếp địa điểm trong bộ sưu tập**: hiện có thêm/xoá từng địa điểm; chưa có sắp xếp thứ tự (gợi ý `@dnd-kit/core` + `@dnd-kit/sortable`).
- [ ] **Tạo bộ sưu tập trực tiếp trên `/saved`**: hiện chỉ tạo được bên trong dialog "Lưu vào bộ sưu tập" ở trang quán.
- [ ] **Nút "Nhắn tin" trên `/u/:handle`**: đang tắt kèm tooltip, chờ tính năng hội thoại realtime (WebSocket + lưu tin nhắn).
- [ ] **A11y & Form (`V1-08`, `V7-05`)**: rà soát toàn bộ form lỗi dùng `aria-invalid`/`aria-describedby`, và kiểm tra focus trap ở dialog Bình luận. *(Vùng chạm mobile >= 44px cho các nút chính, chip lọc và composer đã xử lý.)*
- [ ] **Giữ vị trí cuộn khi Back từ `/discover/:id` (`V8-05`)** và **một số đường dẫn `/u/:handle` khi hồ sơ riêng tư**.
- [ ] **Vòng đời tài khoản nâng cao**: đổi email (kèm xác thực lại), cho phép đăng ký lại email đã xoá tài khoản, xuất dữ liệu cá nhân, xác nhận xoá tài khoản bằng cách nhập handle.
- [ ] **Quản lý thành viên phòng lọc phía server**: đã liên kết `userId` và khoá `SELECT ... FOR UPDATE` khi apply đề xuất song song; kiểm tra thêm tách biệt cookie khách theo phiên trình duyệt nếu cần.

## 3. Hạ tầng, Bảo mật & Vận hành

- [ ] **Cloudflare R2 thật**: chưa cấu hình bucket/credentials thật; cần xác minh end-to-end `POST /media` + `PUT` presigned với `content-type`/`content-length`, job dọn object mồ côi và biến thể ảnh user upload.
- [ ] **SMTP / Resend thật**: backend `lib/mailer.ts` đã sẵn sàng; cần điền `SMTP_*` + `MAIL_FROM` khi có domain gửi mail thật (dev đang log link ra stdout).
- [ ] **Tile bản đồ production**: OpenStreetMap tile công cộng không phù hợp traffic lớn; đổi sang nhà cung cấp có SLA/key (MapTiler, Carto, Stadia) hoặc self-host trước khi mở công khai.
- [ ] **Tách `DATABASE_URL` test riêng & bỏ Prisma singleton**: hiện `bun run test` trong `backend/` chạy từng file process riêng qua `scripts/test-all.sh` bằng Testcontainers Postgres.
- [ ] **Cấu hình production**: chạy `caddy validate` trên máy có Caddy, thiết lập staging/monitoring và lịch diễn tập restore backup DB định kỳ; đưa job e2e backend thật vào CI khi cần.
- [ ] **Mở rộng đo lường hành vi & rollup (khi tăng trưởng)**: gắn `trackEvent` cho `place_impression`, `place_detail_view`, `filter_change`, `place_share` trên UI; khi vượt ngưỡng traffic cao, cân nhắc đẩy `POST /events` qua Redis Stream + job rollup bảng tổng hợp theo ngày. *(Đã chuẩn hoá toàn bộ cache `http-cache.ts`, `location.ts`, `events.ts`, `rate-limit.ts` sang `LRUCache` của `lru-cache`, dùng `net.BlockList` cho IPv4/IPv6 CIDR + Lua script nguyên tử cho Redis rate-limit, và `useLocalStorage` của `@uidotdev/usehooks` cho `useUserLocation`.)*

## 4. Kỹ thuật & Nợ code

- [ ] **3 lỗ hổng dev/test dependency** (`picomatch`, `minimatch`, `glob`): không đi vào bundle production nhưng `picomatch` chưa có bản vá upstream, còn `minimatch`/`glob` cần major bump.
- [ ] **Tách file lớn khi chạm lại**: `frontend/src/mocks/server.ts` (~2.816 dòng), `frontend/src/features/places/components/places-map.tsx` (~860 dòng), `backend/src/routes/admin.ts` (~832 dòng), `frontend/src/components/layout/app-shell.tsx` (~688 dòng).
- [ ] **Thay thẻ HTML thuần rải rác & nâng cấp UI**: đã thay `<table>`/progress `<div>` trong `observability-tab.tsx` bằng `<Table>`/`<Progress>` chuẩn `shadcn/ui`, chuyển đồng bộ URL search params sang `nuqs` (`NuqsAdapter`), dùng `aws4fetch` cho R2 presign, `@turf/distance` cho khoảng cách địa lý và hợp nhất `isOpenNow` vào `@rendez/schema`; có thể cân nhắc thêm `@tanstack/react-table` cho admin khi cần sort/filter nâng cao.
- [ ] **API nhỏ cần hoàn thiện**: expose `Place.description` qua API, xử lý `PATCH /notifications` khi không còn thông báo chưa đọc, cho phép tìm kiếm hybrid quá trần `HYBRID_MAX_RESULTS = 30` nếu cần phân trang sâu.
- [ ] **4 finding SonarCloud đánh dấu Won't Fix**: 4 rule trong migration lịch sử (không sửa migration đã chạy), mật khẩu dev mặc định trong `compose.yaml`, và `MD5` tiebreak trong `user-suggestions.ts`.
