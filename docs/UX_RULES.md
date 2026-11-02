# UX_RULES: quy tắc bố cục và hành vi giao diện Rendez

## 1. Phân loại màn hình

- **Màn hình công cụ**: đăng nhập, đăng ký, khám phá, tìm kiếm, bản đồ, đã lưu, hồ sơ, cài đặt, đăng ảnh. Đây là mặc định.
- **Màn hình giới thiệu**: chỉ khi người dùng yêu cầu rõ bằng chữ "landing" hoặc "onboarding".

Màn hình công cụ:
- Không hero. Tiêu đề trang cỡ vừa. Phần header (tiêu đề + mô tả nếu có) không quá 15% chiều cao viewport.
- Nội dung chính (danh sách, form, bản đồ) phải hiện trong màn hình đầu ở viewport 1280×720.
- Không có panel khẩu hiệu. Panel phụ chỉ được chứa dữ liệu thật (ảnh địa điểm thật kèm tên).

## 2. Bố cục

- Lưới thẻ: xếp sao cho không để lại hàng lẻ. Chọn số cột theo số thẻ (6 thẻ → 3×2 hoặc 6×1).
- Hàng chip cuộn ngang phải có dấu hiệu còn nội dung (fade mép) hoặc tự xuống dòng. Không cắt cụt chip.
- Nút trong panel hẹp không được ngắt chữ thành hai dòng. Dùng icon + chữ ngắn hoặc xếp dọc.
- Một thông tin hiện ở một nơi. Không lặp trạng thái (banner "đã chọn" + radio đã chọn).
- Một màn hình có một ô tìm kiếm. Nếu thanh trên cùng đã có, trang tìm kiếm dùng chính ô đó.

## 3. Form

- Đăng nhập có "Quên mật khẩu?". Đăng ký hiện sẵn quy tắc mật khẩu giống trang đổi mật khẩu.
- Hai liên kết phụ cùng kiểu, cùng căn lề (không để một cái giữa, một cái trái).
- Mỗi ô tối đa một lỗi, đặt ngay dưới ô đó. Khi submit lỗi, focus và scroll tới lỗi đầu tiên.
- Gợi ý giới hạn (kích thước ảnh, độ dài) dùng màu trung tính. Chỉ đổi đỏ khi vi phạm.
- Không để lộ `<input type="file">` gốc của trình duyệt. Cả dropzone là vùng bấm, kèm một nút "Chọn ảnh".
- Không có hai dòng lỗi liền nhau (chung chung + cụ thể). Chỉ giữ dòng cụ thể.
- Tên section và nhãn ô không được trùng nhau ("Tên hiển thị" hai lần).

## 4. Trạng thái

- **Rỗng**: mỗi màn hình có empty state riêng, đúng ngữ cảnh. Không dùng lại copy của màn hình khác. Nút luôn có chữ.
- **Phân trang**: ẩn khi tổng số trang ≤ 1.
- **Thành công**: dùng toast hoặc chừa sẵn chỗ, không làm layout nhảy.
- **Đang tải / lỗi mạng**: mọi danh sách và form phải có. Kiểm tra trước khi báo xong.
- **Chưa có ảnh**: placeholder trung tính có icon, không dùng mảng màu phẳng cỡ cả thẻ. Địa điểm chưa có ảnh xếp sau địa điểm có ảnh.

## 5. Tìm kiếm và lọc

- Chuẩn hóa tiếng Việt khi so khớp: hạ chữ thường, bỏ dấu cả hai phía.
- Tìm trên tên, địa chỉ, danh mục, tag.
- Từ khóa trùng tên danh mục thì chuyển thành chip lọc, không tạo thêm chip thứ hai.
- Chỉ một hệ phân loại. Không để hai nhóm bộ lọc có nghĩa chồng nhau.
- Ghi rõ logic lọc ngay tại bộ lọc ("Khớp tất cả" hoặc "Khớp một trong").
- Tên bộ lọc là thuộc tính cụ thể ("Có ổ cắm", "Mở sau 21h"), không phải phong cách văn chương.
- Quy tắc kiểm tra: tìm X + lọc X không bao giờ ra ít kết quả hơn lọc X một mình, trừ khi hai điều kiện thật sự khác nhau.

## 6. Điều hướng

- Mỗi đích đến xuất hiện đúng một nơi chính (sidebar). Menu avatar chỉ giữ "Đăng xuất" (kèm "Hồ sơ" nếu sidebar không có).
- Chuyển giao diện sáng/tối có một nơi chính. Nơi còn lại là lối tắt, không lặp nhãn.
- Một hành động chính có một tên duy nhất trong toàn app (xem bảng thuật ngữ trong VOICE.md).

## 7. Hộp thoại

- Render bằng portal, `position: fixed`, căn giữa viewport, có lớp phủ.
- Focus trap, Esc đóng, trả focus về nút mở.
- Kiểm tra ở 1280×720 và 390×844.

## 8. Dữ liệu

- UI không bao giờ hiển thị chuỗi fixture (E2E, DEMO, "giả để test", "Fixture phát triển").
- Dữ liệu demo tách khỏi dữ liệu thật bằng cờ riêng, loại bằng query, hoặc dùng môi trường riêng.
- Dữ liệu demo cho người xem phải giống thật: tên quán, địa chỉ, giờ mở cửa có thật.

## 9. Khả năng đọc và truy cập

- Tương phản chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1. Đo bằng công cụ, không ước lượng bằng mắt.
- Chữ phụ không nhỏ hơn 12px (khuyến nghị 13px).
- Vùng bấm tối thiểu 40×40px. Mọi ô nhập có label. Focus nhìn thấy được.
- Kiểm tra dark mode và viewport 390px trước khi báo xong.

## 10. Định nghĩa "xong"

Một thay đổi UI chỉ xong khi:
1. `node scripts/check-copy.mjs --changed` sạch lỗi.
2. Đã đối chiếu mục 1–9 cho màn hình bị đụng tới.
3. Đã kiểm ở 1280×720 và 390×844, sáng và tối.
4. Mục tương ứng trong `docs/BACKLOG.md` được tick và ghi cách kiểm.
5. Nếu bị người dùng sửa lại: đã thêm mục vào `docs/LESSONS.md`.
