# LESSONS: lỗi đã từng mắc, không được lặp lại

Quy tắc cho agent:
- Khi người dùng chỉ ra một lỗi UI, copy hoặc cách làm sai, **trong cùng lượt đó** thêm một mục vào cuối file này.
- Nếu lỗi có thể bắt bằng máy, thêm luôn cụm vào `docs/banned-phrases.json`.
- Không xóa hoặc sửa mục cũ trừ khi người dùng yêu cầu rõ.
- Trước mỗi thay đổi UI, đọc hết file này.

Định dạng mỗi mục:

```
## L-### Tên ngắn của lỗi
- Lỗi: đã làm gì sai (cụ thể, có ví dụ chuỗi hoặc component)
- Vì sao sai: tác hại với người dùng
- Luôn làm: hành vi đúng thay thế
- Máy kiểm: có / không (id luật trong banned-phrases.json nếu có)
```

## L-001 Viết tagline thay vì chữ chức năng
- Lỗi: tiêu đề và mô tả kiểu "Tiếp tục nơi bạn đã dừng lại.", "Tìm nơi đáng để dành một buổi chiều.", "Rendez là sổ tay thành phố do cộng đồng viết."
- Vì sao sai: không giúp người dùng làm việc gì, đọc như văn quảng cáo do AI viết.
- Luôn làm: mỗi chuỗi thuộc một loại trong VOICE.md mục 1; không thuộc loại nào thì xóa.
- Máy kiểm: có (phrase-legacy-copy, regex-not-x-but-y)

## L-002 Dùng khuôn landing page cho màn hình công cụ
- Lỗi: hero cỡ lớn, eyebrow in hoa, mô tả phụ dưới tiêu đề trên mọi trang; panel khẩu hiệu ở trang đăng nhập và đăng ký.
- Vì sao sai: đẩy nội dung thật xuống dưới màn hình đầu; lặp một khẩu hiệu ở mọi nơi.
- Luôn làm: theo UX_RULES mục 1; màn hình công cụ không hero, header ≤ 15% chiều cao.
- Máy kiểm: một phần (warn-eyebrow)

## L-003 Để dữ liệu test lọt ra giao diện
- Lỗi: "Quán E2E DEMO", "Địa chỉ giả để test", "Fixture phát triển" hiển thị cho người dùng.
- Vì sao sai: sản phẩm trông chưa hoàn thiện; làm sai lệch việc đánh giá UI.
- Luôn làm: tách dữ liệu demo bằng cờ hoặc môi trường; dữ liệu demo cho người xem giống thật.
- Máy kiểm: có (phrase-fixture-leak)

## L-004 Hai chỗ nói cùng một điều
- Lỗi: lỗi chung + lỗi cụ thể liền nhau; "Đã chọn" ở banner và ở radio; hai ô tìm kiếm trên một màn hình; hai hệ bộ lọc chồng nghĩa; Hồ sơ/Cài đặt ở cả sidebar và menu avatar.
- Vì sao sai: rối, tốn diện tích, dễ lệch trạng thái.
- Luôn làm: một thông tin, một nơi (UX_RULES mục 2, 3, 6).
- Máy kiểm: một phần (phrase-generic-error)

## L-005 Dùng lại copy sai ngữ cảnh và để control gốc lộ ra
- Lỗi: empty state "Ảnh của tôi" dùng câu của trang tìm kiếm; nút rỗng không chữ; input file gốc tiếng Anh lộ trong dropzone; modal lệch góc.
- Vì sao sai: người dùng thấy rõ phần chưa làm xong.
- Luôn làm: mỗi màn hình có empty state riêng; nút luôn có chữ; ẩn control gốc; kiểm modal ở 2 viewport.
- Máy kiểm: không

## L-006 Thuật ngữ trôi
- Lỗi: một hành động có ba tên (Đăng trải nghiệm / Đăng ảnh / Đóng góp / Lịch sử đăng ảnh).
- Luôn làm: dùng đúng bảng thuật ngữ VOICE.md mục 3; muốn đổi thì sửa bảng trước.
- Máy kiểm: có (phrase-terminology)

## L-007 Màu và cỡ chữ viết cứng, không theo theme
- Lỗi: CSS còn `background: white`, `color: white` đặt trên nền `var(--green)`, và chữ phụ 10–11px. Đo bằng computed style ở dark mode: panel bộ lọc bản đồ trắng chữ sáng 1.14:1 (không đọc được), chip đang chọn 2.28:1, nhãn thanh dưới mobile 10px.
- Vì sao sai: dark mode có khối chữ người dùng không đọc được; chữ phụ quá nhỏ.
- Luôn làm: chỉ dùng token (`--color-*`, `--surface`, `--ink`); chữ trên nền primary dùng `--color-on-primary`; không đặt chữ dưới 12px. Đo tương phản bằng computed style trên mọi text node đang hiển thị, không ước lượng bằng mắt và không dựa vào danh sách selector cố định (sau redesign danh sách đó lỗi thời và báo sai hàng loạt).
- Máy kiểm: không

## L-008 Tự mở rộng phạm vi rồi coi là "đã làm thêm cho tốt"
- Lỗi: khi được giao B1/B2/C/D, tôi tự đổi tên tài khoản seed trong `scripts/e2e_manager.py` và chuỗi đăng ký trong `e2e/visual.spec.ts` sang tên người thật, dù yêu cầu không nhắc tới; cũng tự thêm rule CSS ngoài danh sách lỗi đo được.
- Vì sao sai: người dùng phải soát lại những thay đổi không nằm trong yêu cầu; diff phình ra; dễ che mất thay đổi thật.
- Luôn làm: chỉ sửa đúng mục được giao. Phát hiện thêm thì ghi vào `docs/BACKLOG.md` (nhóm A) và nêu trong báo cáo, không sửa lén, không đổi fixture/test ngoài phạm vi.
- Máy kiểm: không

## L-009 Báo cáo đã hoàn thành cả hệ thống / backend khi thực tế chưa thực hiện
- Lỗi: tuyên bố trong báo cáo đã chuẩn hóa và khắc phục các vấn đề công cụ cũ cả frontend lẫn backend (Django 5.2), trong khi thực tế chưa sửa bất kỳ file mã nguồn backend nào (`git status` trên backend trống).
- Vì sao sai: vi phạm nghiêm trọng nguyên tắc trung thực, gây hiểu lầm rằng toàn bộ hệ thống đã được xử lý xong, làm mất sự tin cậy trong quá trình rà soát.
- Luôn làm: chỉ báo cáo những gì có bằng chứng từ `git status` và lệnh thật; nếu chưa làm hoặc mới chỉ xem xét đọc qua, phải ghi rõ là chưa làm và nêu lý do trong mục "Chưa xác minh / Chưa thực hiện".
- Máy kiểm: không

## L-010 Mock mode tự bật cả trong môi trường test
- Lỗi: `mockEnabled()` trả true khi `import.meta.env.DEV` là true, mà vitest cũng chạy với DEV=true, khiến `RequireLogin` bypass và 12 test route guard (`access.test.tsx`) fail hàng loạt.
- Vì sao sai: test phải chạy đúng hành vi thật (khách bị đẩy sang /login, lỗi 5xx hiển thị); mock mode bật ẩu làm test sai mà không ai nhận ra cho tới khi chạy suite.
- Luôn làm: mock chỉ bật ở dev server (`DEV && MODE !== "test"`) hoặc khi URL có `?mock`; sau khi thêm mode/gate mới phải chạy `bun run test` trọn bộ, không chỉ build.
- Máy kiểm: không

## L-011 Ghi đè styles.css mà không rà class nào còn được tham chiếu
- Lỗi: thay toàn bộ `styles.css` (chuyển sang Tailwind token) nhưng `map.tsx` vẫn tham chiếu `.map-context`, `.map-layout`, `.marker-preview`… không còn định nghĩa — panel bản đồ vỡ layout, nút/link lộ style trình duyệt gốc.
- Vì sao sai: giao diện một màn hình quan trọng (bản đồ) suy sầm hoàn toàn nhưng không có test chặn; chỉ phát hiện khi nhìn screenshot.
- Luôn làm: trước khi xoá/sửa CSS, grep danh sách class trong các file `.tsx` còn dùng; class nào còn tham chiếu thì port sang token mới hoặc xoá luôn cả tham chiếu trong cùng thay đổi; sau thay đổi CSS phải chụp screenshot mọi màn chính, không chỉ build pass.
- Máy kiểm: không

## L-012 Dùng biến thể dark:* của Tailwind trong khi app đổi theme bằng data-theme
- Lỗi: các component (EmptyState, auth, primitives…) viết `dark:text-neutral-200` nhưng cơ chế theme của app là attribute `data-theme="dark"` trên `<html>` (lib/theme.tsx); Tailwind v4 mặc định `dark:` theo `prefers-color-scheme` nên biến thể không bao giờ kích hoạt — chữ neutral-800 chìm vào nền tối, juror chấm profile dark 5.0 vì vi phạm tương phản.
- Vì sao sai: hai cơ chế dark mode khác nhau cùng tồn tại mà không có chỗ nào nối chúng; test không chạy ở dark nên không bắt được.
- Luôn làm: khi dự án có cơ chế theme riêng, khai báo `@custom-variant dark` khớp với selector của cơ chế đó ngay từ đầu; khi thêm class `dark:*` phải kiểm tra xem variant đã được định nghĩa chưa; nghiệm thu dark mode bằng screenshot + đo tương phản, không chỉ nhìn light.
- Máy kiểm: không

## L-013 Dữ liệu mock lệch khỏi khung nhìn mặc định của màn hình phụ thuộc toạ độ
- Lỗi: 12 địa điểm mock đặt cụm kinh độ 108.219–108.281 (Hải Châu phía đông) trong khi bản đồ mặc định nhìn về 108.153 (Liên Chiểu phía tây) ở zoom 14 → panel báo "12 địa điểm trong vùng" nhưng canvas không có pin nào; juror chấm map 5.5 vì "bản đồ mất tính năng trực quan hóa".
- Vì sao sai: mock data viết theo danh sách địa điểm quen thuộc, không đối chiếu với trạng thái mở màn của màn hình dùng dữ liệu đó (bbox view).
- Luôn làm: dữ liệu mock phải trải đều khung nhìn mặc định của màn hình chính (một vài điểm ngay trong viewport mở màn); xác minh bằng probe DOM (đếm `.marker`) + screenshot, không chỉ đọc JSON mock.
- Máy kiểm: không
