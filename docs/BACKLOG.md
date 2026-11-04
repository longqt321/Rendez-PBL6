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

## Nhóm E: thẩm mỹ và nhận diện thiết kế (từ audit thiết kế 2026-11-04)

Audit bằng tasteskill v2 (inspector + lint + juror trên screenshot 1440/390, app chạy thật tại :8080). Điểm trung bình các màn: 3,7–4,3/10. Xương layout tốt, thiếu "da": ảnh thật, màu nhận diện, mật độ desktop.

**Cập nhật 2026-11-04 (đợt redesign 2):** E2, E3, E4, E6 đã xử lý xong — tokens brand (sand + brand xanh rêu) trong `styles.css`, Geist đã đăng ký `@font-face`, Khám phá có panel phải, meta ≥ 12px. Juror chấm lại: Khám phá light 7.5 + dark 7.8 (ĐẠT cả hai theme). Các mục còn lại giữ nguyên.

- [ ] **E1 Ảnh fixture 1 màu bị serve làm ảnh chính trong feed**
  Trong `.local/media/visual/derivatives/` (338 file) có 2 fixture rác 1 màu 200×150 (1,1KB): `f6cb4efc-*` xanh `(0,0,254)` và `2a116665-*` đỏ `(254,0,0)` — nguồn không rõ (không tìm thấy trong code seed/test hiện tại, nghi từ lần chạy test cũ). Feed desktop hiện khối xanh 633×474 chiếm ~23% màn hình.
  Nghiệm thu: xoá 2 file fixture khỏi media + DB record tương ứng; rà query feed không serve ảnh < 5KB; chụp lại feed không còn khối màu trơn.
- [ ] **E2 Font Geist được preload nhưng không hề đăng ký — app chạy system font**
  `index.html` preload 2 file woff2 Geist nhưng không có `@font-face` nào trong `src/` hay CSS build (đã grep: 0 kết quả). Toàn app render bằng system-ui.
  Nghiệm thu: khai báo `@font-face` cho Geist (latin + vietnamese subset) + `--font-sans` trong `styles.css`; xác minh computed font trên text thật.
- [ ] **E3 Không có design token riêng — palette thuần Tailwind mặc định**
  `styles.css` chỉ có 1 dòng `@import "tailwindcss"`. Map style.json đã có sẵn beige `#f3f0e8` + xanh đậm `#1f382b` chưa được dùng cho UI. Accent duy nhất là blue-600 Tailwind.
  Nghiệm thu: định nghĩa `@theme` tokens (màu thương hiệu từ map style, thang chữ 5 cấp, radius, spacing) trong `styles.css`; các component dùng token thay vì hardcode neutral/blue.
- [ ] **E4 Màn Khám phá desktop trống ~55% bên phải**
  Feed 1 cột max-w-2xl (672px) giữa canvas 1440px; profile cũng có dải trống lớn giữa banner và grid.
  Nghiệm thu: bố cục 2 cột (feed + panel gợi ý địa điểm/map mini) hoặc masonry 2–3 cột kiểu Pinterest; kiểm ở 1440 và 1280.
- [ ] **E5 Bản đồ trắng trơn khi tile lỗi, không có fallback có thiết kế**
  Tile Esri offline không tải → canvas trắng ~60% màn hình, chỉ còn text lỗi + nút.
  Nghiệm thu: fallback nền beige từ map style + marker tĩnh từ region.geojson + panel kết quả dạng card list có thumbnail.
- [ ] **E6 Thang chữ phẳng, meta 11px quá nhỏ**
  Mọi thứ 11–12px ngoài h1 24px; meta card 11px dưới chuẩn đọc (D8 liên quan).
  Nghiệm thu: meta card ≥ 12px; xây thang chữ khi làm E3; đo lại tương phản (D8).
- [ ] **E7 Lint tasteskill: 40 FAIL (shadow 11, hairline 25, mono 1, micro-label 3) + glass 2, transition-all 6**
  Không phải sửa hàng loạt — app screen được phép 1px border; chỉ xử lý: micro-label uppercase 3 chỗ trong SearchPage, font-mono ngoài code 1 chỗ, glass ngoài sticky bar 1 chỗ, shadow trên card nghỉ (ExperienceCard shadow-md, hover shadow-md).
  Nghiệm thu: lint lại còn < 10 FAIL, mỗi FAIL còn lại có lý do hoặc comment taste-skill-ignore.
- [ ] **E8 Chưa có bằng chứng dark mode và 390px sau thay đổi thiết kế**
  5 ảnh audit đều light mode; 2 ảnh mobile trùng nhau (lỗi chụp). Gắn với D9.
  Nghiệm thu: khi làm E1–E7 xong, chụp lại đủ light/dark × 1440/390 cho các màn chính.

## Nhóm F: phát hiện thêm khi làm redesign 2026-11-04 (đợt 2)

**Cập nhật đợt 3 (cùng ngày, sau juror đối chiếu):** juror vòng 4 xác nhận đã hết: marker bản đồ (12 pin hiển thị nhờ mock trải toạ độ khắp các quận), card panel map co rúm chữ (media frame 64px cố định), gap 240px mobile (ảnh fill khung 4/5), nhãn tab mobile cắt 1 chữ (nhãn đầy đủ), chữ profile dark chìm (EmptyState đổi token + khai báo `@custom-variant dark` theo `data-theme`), tile bản đồ dark chói (CSS filter). Chờ điểm juror cuối để đóng F3.

- [ ] **F1 3 lỗi ESLint có sẵn trên main, nằm ngoài phạm vi redesign**
  `CreateExperiencePage.tsx:11` — `Controller` import không dùng; `PostDetailPage.tsx:55` — react-hooks/immutability "Cannot access variable before it is declared"; `client.ts:60` — `schemaPath` khai báo nhưng không dùng trong `onRequest`. (1 warning react-hooks/incompatible-library ở CreateExperiencePage do react-hook-form.)
  Nghiệm thu: sửa từng lỗi + chạy `bunx eslint src` sạch.
- [ ] **F2 Panel phải Khám phá mới chỉ có CTA bản đồ tĩnh, chưa có map mini**
  A1 đã chốt "feed 1 cột + panel phải (gợi ý địa điểm + map mini)"; hiện panel có list địa điểm mới + card "Xem trên bản đồ" (nền accent-soft). Map mini thật cần maplibre instance thứ 2 — cân nhắc chi phí bundle (maplibre ~1MB) trước khi làm.
  Nghiệm thu: quyết định map mini (lazy chunk riêng) hoặc bỏ mục tiêu này khỏi A1.
- [ ] **F3 Dark mode chưa có ảnh nghiệm thu sau redesign**
  Đã chụp đủ 5 màn × light/dark × 1440/390 (`.taste-skill/v4/` + `.taste-skill/final/`); `@custom-variant dark` khai báo theo `data-theme` để mọi tiện ích `dark:*` hoạt động đúng với cơ chế theme của app. Điểm juror: Khám phá light/dark ĐẠT; các màn còn lại theo báo cáo juror vòng 4.
