---
description: Hợp đồng vận hành chung cho 29 prompt
globs: *
---

# Hợp đồng vận hành chung

Áp dụng các điều kiện này cho tất cả 29 prompt. Đây là quy tắc thao tác, không phải mô tả sản phẩm hay định hướng tính năng.

- Chỉ làm việc trong repository hiện tại. Trước khi sửa, đọc hướng dẫn agent hiện có và kiểm tra git status; bảo toàn mọi thay đổi có sẵn của người dùng.
- Đọc các file liên quan, mọi caller, test, fixture, config và export trước khi sửa. Sửa nguyên nhân gốc; giữ nguyên hành vi không liên quan; dùng cách làm và dependency hiện có; chọn diff nhỏ nhất nhưng hoàn chỉnh.
- Tuân thủ Ponytail nếu skill hoặc nội dung tương đương đã có sẵn tại máy. Chỉ đọc Humanizer nếu skill đã được cài sẵn; không cài hoặc tải skill. Humanizer chỉ dùng cho văn bản phù hợp, không áp dụng vào code, tên biến hay nội dung kỹ thuật để làm thay đổi nghĩa.
- Không thêm dependency, không cập nhật package, không cài package, không truy cập Internet, không gọi dịch vụ bên ngoài, không dùng credentials, không dùng sudo, không sửa file bên ngoài repository, không deploy, không push, không commit, không chạy migration lên dữ liệu thật, không xóa dữ liệu người dùng. Không chạy lệnh có khả năng yêu cầu cấp quyền hoặc xác nhận. Nếu một kiểm tra cần các điều kiện đó, bỏ qua kiểm tra ấy, dùng phương án cục bộ an toàn nếu có và ghi rõ phần chưa xác minh; tuyệt đối không hỏi người dùng cấp quyền.
- Không dùng lệnh phá hủy hoặc hoàn tác thay đổi có sẵn như git reset --hard, git clean, hoặc xóa hàng loạt file. Không ghi đè file người dùng đã thay đổi.
- Không mặc định rằng hạng mục hoặc lỗ hổng tồn tại. Hãy kiểm tra trước; nếu không áp dụng hoặc đã đáp ứng đầy đủ, không tạo code thừa và nêu rõ kết quả.
- Mọi logic không tầm thường phải có test phù hợp. Không được bỏ validation tại trust boundary, xử lý lỗi có thể làm mất dữ liệu, bảo mật hoặc khả năng truy cập để giảm số dòng code.
- Sau mỗi prompt, chạy các test/kiểm tra liên quan bằng công cụ đã có và không cần cấp quyền. Báo cáo ngắn: thay đổi, test đã chạy cùng kết quả, test không chạy được, và rủi ro còn lại. Không tuyên bố một kiểm tra đã đạt nếu chưa thực sự chạy.
- Mọi dịch vụ bên thứ ba được giữ hoặc thêm phải không phát sinh chi phí bắt buộc hay yêu cầu billing; ưu tiên phần mềm mã nguồn mở có thể tự vận hành. Không thêm dịch vụ hoặc dependency mới. Nếu chưa xác minh được giấy phép/chi phí từ tài liệu sẵn có, không tự khẳng định là đã tuân thủ; ghi rõ điểm chưa xác minh.
