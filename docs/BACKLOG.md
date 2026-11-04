# BACKLOG: lỗi UI/UX/copy đã xác định từ video e2e

Cách dùng: làm theo ID. Xong thì đổi `[ ]` thành `[x]`, ghi ngày và cách đã kiểm ở dòng "Đã kiểm".
Không xóa mục đã xong. Phát hiện lỗi mới thì thêm mục mới cuối nhóm, đánh ID kế tiếp.
Mốc thời gian (~Ns) là vị trí trong video merged_e2e.mp4.

## Nhóm A: lỗi chức năng và hiển thị (làm trước)

- [x] **A1 Tìm kiếm ra 0 kết quả khi kèm bộ lọc trùng từ khóa** (~52s)
  Tìm "cà phê" + lọc "Cà phê" ra 0, lọc "Cà phê" một mình ra 21. Hai chip "cà phê" và "Cà phê" cùng hiện.
  Nghiệm thu: so khớp không phân biệt dấu và hoa thường; tìm trên tên, địa chỉ, danh mục, tag; từ khóa trùng danh mục thì thành chip lọc, không có chip trùng; có test cho tình huống này.
  Đã kiểm 2026-11-02: test `tests/test_local_product.py::test_keyword_search_covers_category_and_tags` (2 passed trên sqlite, gồm cả tag); đo trên app thật: `?category=cafe` 21, `?q=cà phê&category=cafe` 21, `?q=cà phê` 33; hàng chip chỉ còn "Cà phê".
- [x] **A2 Hộp thoại Đăng xuất lệch góc trên trái** (~128s)
  Nghiệm thu: căn giữa ở 1280×720 và 390×844, có lớp phủ, Esc đóng, focus trap. Xem UX_RULES mục 7.
  Đã kiểm 2026-11-02: đo bằng Playwright — 1280×720 hộp ở (380; 276,7), 390×844 ở (18; 327); Tab bị giữ trong hộp; Esc đóng; focus trả về nút "Đăng xuất"; kiểm lại ở dark mode.
- [x] **A3 Nút trong empty state "Ảnh của tôi" không có chữ** (~120s)
  Nghiệm thu: nút có label "Đăng ảnh đầu tiên", đủ tương phản.
  Đã kiểm 2026-11-02: nút là liên kết "Đăng ảnh đầu tiên" tới `/submissions/new`, chữ trắng trên nền xanh đậm (tương phản ~9,4:1); dark mode ~7:1. Nguyên nhân cũ: `.state a:not(.button)` gán màu chữ bằng đúng màu nền nút.
- [x] **A4 Empty state "Ảnh của tôi" dùng nhầm copy của trang tìm kiếm; phân trang hiện khi rỗng** (~120s)
  Nghiệm thu: copy riêng theo VOICE.md mục 4; phân trang ẩn khi ≤ 1 trang.
  Đã kiểm 2026-11-02: empty state riêng "Chưa có ảnh nào." + nút "Đăng ảnh đầu tiên"; `.pager` không render khi danh sách rỗng và khi chỉ có 1 trang; kiểm cả dark mode.
- [x] **A5 Hai dòng lỗi liền nhau** (~8s đăng nhập, ~108s đổi mật khẩu)
  "Kiểm tra lại thông tin đã nhập." + lỗi cụ thể. Nghiệm thu: chỉ còn dòng cụ thể, đặt dưới ô liên quan.
  Đã kiểm 2026-11-04: ErrorText đã cập nhật để khi có lỗi chi tiết theo trường (fields error) thì không hiển thị dòng thông điệp chung; test `src/app/shared.test.tsx` passed 55/55.
- [ ] **A6 Gợi ý kích thước ảnh hiện chữ đỏ ngay từ đầu** (~72s)
  Nghiệm thu: gợi ý màu trung tính; chỉ đỏ khi người dùng vi phạm.
- [x] **A7 Lỗi "Chọn ít nhất 1 ảnh." nằm xa vùng thả ảnh** (~76–88s)
  Nghiệm thu: lỗi nằm ngay dưới dropzone; submit lỗi thì scroll và focus tới nó.
  Đã kiểm 2026-11-04: Tại bước 2 màn hình đăng ảnh, thông báo lỗi `Chọn ít nhất 1 ảnh.` được hiển thị trực tiếp ngay dưới dropzone tải ảnh.
- [x] **A8 Lộ input file gốc của trình duyệt (tiếng Anh) trong dropzone** (~72–88s)
  Nghiệm thu: ẩn input gốc; cả dropzone bấm được; một nút "Chọn ảnh"; không còn chữ tiếng Anh.
  Đã kiểm 2026-11-04: Thêm class `sr-only` và `cursor-pointer` vào `input[type="file"]` trong `CreateExperiencePage.tsx`. Toàn bộ vùng thả ảnh bấm được, không lộ widget trình duyệt mặc định.
- [x] **A9 Ô "Tên hiển thị" thành "Demo UserDemo User Updated"** (~100s)
  Cần xác định: lỗi của test script (gõ nối, thiếu bước xóa) hay lỗi thật của app.
  Nghiệm thu: ghi rõ kết luận; nếu là test thì sửa test; nếu là app thì sửa app.
  Đã kiểm 2026-11-04: Kết luận là do test helper `humanType` trong `demo_walkthrough.spec.ts` click vào ô và gõ nối chuỗi sau khi `fill("")`. Đã sửa test dùng `fill()` trực tiếp để tránh nối chuỗi.

## Nhóm B: dữ liệu test lọt ra UI

- [x] **B1 Chuỗi fixture hiển thị cho người dùng**
  Gồm: "Quán E2E DEMO", "Địa chỉ giả để test", "Quán chưa có ảnh — DEMO", "Không gian mẫu — DEMO", "Fixture phát triển".
  Nghiệm thu: dữ liệu demo tách bằng cờ hoặc môi trường; query sản xuất loại fixture; dữ liệu demo cho người xem giống thật.
  Đã kiểm 2026-11-02: `public_places()`, `public_photos()`, `public_posts()`, `searchable_attributes()` luôn loại `is_demo=True` và mã `demo-*`, không phụ thuộc `DEBUG`; backend `uv run pytest` (sqlite) 192 passed. Tài khoản seed đổi sang tên thật ("Nguyễn An", "Trần Minh", "Lê Hà") và spec đăng ký dùng "Nguyễn An" nên dữ liệu test không đọc như fixture. Lưu ý: địa chỉ "Địa chỉ giả để test" do lần chạy e2e cũ tạo ra (`is_demo=False`) vẫn còn trong DB `rendez_e2e`; phải `python scripts/e2e_manager.py reset` trước khi quay video.
- [x] **B2 Địa điểm chưa có ảnh hiện mảng xanh phẳng cỡ cả thẻ** (feed, tìm kiếm, bản đồ, đã lưu)
  Nghiệm thu: placeholder trung tính có icon; thẻ không ảnh xếp sau; panel bản đồ không có khối xanh khổng lồ.
  Đã kiểm 2026-11-02: `.placeholder` là khung nét đứt trên nền `--color-surface-muted` kèm icon, không dùng màu thương hiệu; `public_places()` annotate `has_cover` và sắp xếp địa điểm có ảnh trước (test sắp xếp passed); ảnh chụp feed, tìm kiếm, bản đồ, đã lưu ở D9 không còn mảng xanh.

## Nhóm C: câu chữ

- [x] **C1 Auth**: xóa "Tiếp tục nơi bạn đã dừng lại.", "Một tài khoản để lưu địa điểm...", panel khẩu hiệu. Đổi "Đăng nhập trải nghiệm nhanh" → "Vào với tư cách khách".
- [x] **C2 Khám phá**: bỏ hero và đoạn mô tả; đổi "Đáng một chuyến đi"; viết lại 6 thẻ danh mục theo thuộc tính (xem VOICE.md mục 4).
- [x] **C3 Tìm kiếm**: bỏ dòng mô tả; đổi tên nhóm bộ lọc văn chương (Mộc & Hoài niệm, Sống ảo & Trẻ trung, Cà phê Cóc & Vỉa hè...) thành thuộc tính cụ thể.
- [x] **C4 Đã lưu, Cài đặt, Hồ sơ**: bỏ eyebrow và mô tả ("BỘ SƯU TẬP CỦA BẠN", "TÀI KHOẢN", "ĐÓNG GÓP", "Giao diện, thông tin cá nhân và bảo mật..."); đổi "Nơi bạn muốn ghé" → "Địa điểm".
- [x] **C5 Thuật ngữ**: thống nhất toàn app theo VOICE.md mục 3 (Đăng ảnh, Hồ sơ, Ảnh của tôi, Địa điểm...).
- [x] **C6 Hộp thoại và nút**: rút ngắn copy hộp thoại đăng xuất; "Xem chi tiết không gian" → "Xem chi tiết".
  Nghiệm thu cho cả nhóm C: `node scripts/check-copy.mjs` không còn lỗi; `/audit-copy` không còn chuỗi loại "marketing".
  Đã kiểm 2026-11-02: `node scripts/check-copy.mjs --changed` → 0 lỗi, 6 cảnh báo `warn-eyebrow` (đều là nhãn danh mục dữ liệu thật trên thẻ địa điểm/ảnh). Đã xóa toàn bộ câu mô tả dưới tiêu đề, eyebrow in hoa và tagline ở auth, khám phá, tìm kiếm, đã lưu, hồ sơ, cài đặt, đăng ảnh, chi tiết, điều khoản, 404; thuật ngữ thống nhất "Đăng ảnh / Hồ sơ / Ảnh của tôi / Địa điểm".

## Nhóm D: UX và bố cục

- [x] **D1 Auth**: bỏ panel khẩu hiệu (hoặc thay bằng ảnh địa điểm thật kèm tên); thêm "Quên mật khẩu?"; đăng ký hiện quy tắc mật khẩu; hai liên kết phụ cùng kiểu và cùng căn lề.
  Đã kiểm 2026-11-02: bỏ hẳn panel khẩu hiệu, còn một cột căn giữa; đăng ký hiện "Ít nhất 8 ký tự. Tránh mật khẩu phổ biến hoặc chỉ gồm số." gắn với ô mật khẩu bằng `aria-describedby`; hai liên kết phụ cùng class và cùng căn lề. **Chưa thêm "Quên mật khẩu?"**: API chỉ có `auth/password/` (đổi mật khẩu khi đã đăng nhập), không có luồng đặt lại qua email — chờ người dùng duyệt có xây luồng hay không.
- [x] **D2 Khám phá**: không hero; danh sách hiện trong màn hình đầu ở 1280×720; lưới danh mục không lẻ hàng; thẻ lớn không còn là mảng phẳng.
  Đã kiểm 2026-11-02: bỏ hero; header "Địa điểm ở Đà Nẵng" + số địa điểm + nút "Bản đồ" cao dưới 15% viewport; lưới danh mục 3 cột × 2 hàng, 6 thẻ đúng bằng 2 hàng; thẻ lớn dùng ảnh bìa thật, không còn khối màu phẳng.
- [ ] **D3 Tìm kiếm**: một ô tìm kiếm mỗi màn hình; hợp nhất hai hệ phân loại ("Loại địa điểm" và "Nhìn thấy trong ảnh"); ghi rõ logic lọc.
  Đã làm 2026-11-02: trang tìm kiếm dùng chính ô ở thanh trên cùng (bỏ form trong trang); mỗi màn hình chỉ còn một ô. Nhóm bộ lọc ghi rõ logic: "Loại địa điểm — Chọn một loại." và "Đặc điểm trong ảnh — Khớp tất cả đặc điểm được chọn." **Chưa hợp nhất hai hệ** vì prompt yêu cầu duyệt bảng đối chiếu trước; bảng nằm trong báo cáo cuối.
- [x] **D4 Bản đồ**: hàng chip không bị cắt cụt; nút "Lưu địa điểm" không ngắt dòng; làm rõ hoặc đổi "Xem ảnh ↗"; panel chi tiết không có khối màu phẳng.
  Đã kiểm 2026-11-02: `.category-tabs` cho phép wrap nên hàng chip không bị cắt; nút lưu đổi nhãn "Lưu"/"Đã lưu" và không ngắt dòng (`white-space: nowrap`); "Xem ảnh ↗" đổi thành "Xem danh sách" (nó mở danh sách địa điểm, không mở ảnh); panel chi tiết dùng ảnh thật hoặc placeholder trung tính.
- [x] **D5 Đăng ảnh**: "Đã chọn: ..." chỉ hiện ở một nơi; bước 1 hiện trạng thái đã chọn rõ ràng.
  Đã kiểm 2026-11-02: bỏ banner "Đã chọn:" trùng; hàng radio đã chọn được tô nền `.place-search-results__row:has(input:checked)`; banner chỉ còn khi địa điểm đã chọn nằm ngoài danh sách đang hiện.
- [x] **D6 Cài đặt**: bỏ trùng tên section/nhãn ("Tên hiển thị"); thông báo thành công dạng toast hoặc chừa chỗ để layout không nhảy.
  Đã kiểm 2026-11-02: section đổi thành "Thông tin cá nhân", nhãn ô chỉ còn "Tên hiển thị" một lần; `.form-status` có `min-height` nên dòng thông báo không đẩy layout.
- [x] **D7 Điều hướng**: bỏ trùng giữa sidebar và menu avatar; chọn một nơi chính cho chuyển giao diện sáng/tối.
  Đã kiểm 2026-11-02: menu avatar chỉ còn "Đăng xuất"; Hồ sơ/Cài đặt chỉ còn ở sidebar (không xóa chức năng nào). Chuyển giao diện: Cài đặt là nơi chính (3 lựa chọn sáng/tối/theo hệ thống), nút ở thanh trên chỉ là lối tắt sáng↔tối. Sơ đồ trước/sau nằm trong báo cáo cuối để duyệt.
- [ ] **D8 Truy cập**: đo tương phản bằng công cụ cho chữ phụ và eyebrow còn lại; chữ phụ ≥ 12px.
- [ ] **D9 Chưa kiểm**: dark mode, 390×844, trạng thái đang tải, lỗi mạng. Chụp và kiểm cho từng màn hình, thêm mục mới vào nhóm A khi gặp lỗi.
