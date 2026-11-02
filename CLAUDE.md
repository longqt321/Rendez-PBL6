# Rendez: hướng dẫn cho agent

Rendez là ứng dụng tìm, lưu và đăng ảnh địa điểm ở Đà Nẵng, giao diện tiếng Việt.
Đây là công cụ dùng hằng ngày, không phải landing page.

## Đọc trước khi đụng vào UI, chữ hoặc layout

@docs/VOICE.md
@docs/UX_RULES.md
@docs/LESSONS.md

Việc còn tồn nằm ở `docs/BACKLOG.md`. Chỉ đọc và làm khi được giao sửa lỗi UI. Không tự làm ngoài phạm vi được giao.

## Quy tắc không thương lượng

1. Không viết tagline, slogan, câu truyền cảm hứng, câu hỏi tu từ, "Không phải X mà là Y".
2. Mỗi chuỗi chữ phải thuộc một loại trong VOICE.md mục 1. Không thuộc loại nào thì xóa, đừng viết lại cho hay hơn.
3. Màn hình công cụ không có hero, không eyebrow in hoa, không mô tả phụ dưới tiêu đề, không panel khẩu hiệu.
4. Thuật ngữ theo bảng VOICE.md mục 3. Một hành động chỉ có một tên.
5. Không để chuỗi dữ liệu test (E2E, DEMO, Fixture, "giả để test") xuất hiện trong UI.
6. Một thông tin chỉ hiện ở một nơi. Một lỗi chỉ một dòng, là dòng cụ thể.
7. Mỗi màn hình có empty state riêng; nút luôn có chữ; không để lộ control gốc của trình duyệt.
8. Không tự thêm tính năng, đổi logic hoặc đổi thiết kế ngoài yêu cầu. Việc phát hiện thêm thì ghi vào BACKLOG, đừng làm lén.

## Quy trình cho mọi thay đổi UI

Trước khi sửa:
- Đọc các file ở trên. Nếu thấy yêu cầu hiện tại mâu thuẫn với quy tắc, hỏi lại người dùng. Không âm thầm bỏ quy tắc.

Trong khi sửa:
- Chuỗi mới phải qua phép thử: "bỏ dòng này đi mà người dùng vẫn dùng được y hệt thì bỏ".
- Dùng dữ liệu thật hoặc giống thật. Không bịa chữ để lấp chỗ trống.

Sau khi sửa:
- Chạy `node scripts/check-copy.mjs --changed`. Phải sạch lỗi mới được báo xong. Hook sẽ tự chạy khi bạn ghi file, nhưng vẫn phải chạy lại lần cuối.
- Kiểm ở 1280×720 và 390×844, giao diện sáng và tối, đối chiếu UX_RULES mục 10.
- Cập nhật mục tương ứng trong `docs/BACKLOG.md` (tick và ghi cách đã kiểm).

## Khi người dùng sửa lại hoặc chỉ ra lỗi

Trong cùng lượt đó, thêm một mục vào cuối `docs/LESSONS.md` theo định dạng ở đầu file. Nếu lỗi bắt được bằng máy, thêm luôn cụm vào `docs/banned-phrases.json`. Không xóa hoặc làm yếu mục cũ.

## Báo cáo cuối mỗi tác vụ UI

Ngắn gọn, đúng thứ tự:
1. Đã sửa những ID nào trong BACKLOG.
2. Kết quả `check-copy` (số lỗi, số cảnh báo).
3. Đã kiểm ở viewport/chế độ nào, và điều gì chưa kiểm được.
4. Việc phát hiện thêm nhưng chưa làm (đã ghi vào BACKLOG chưa).

Lệnh có sẵn: `/audit-copy`, `/fix-backlog`, `/review-ui`. Skill `ui-copy-and-layout` tự kích hoạt khi đụng vào UI.
