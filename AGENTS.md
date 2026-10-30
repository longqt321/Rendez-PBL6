# Hợp đồng vận hành chung (Operating Contract)

Áp dụng các điều kiện này cho tất cả 29 prompt. Đây là quy tắc thao tác, không phải mô tả sản phẩm hay định hướng tính năng.

- **Phạm vi repository:** Chỉ làm việc trong repository hiện tại. Trước khi sửa, đọc hướng dẫn agent hiện có và kiểm tra `git status`; bảo toàn mọi thay đổi có sẵn của người dùng.
- **Phân tích trước khi sửa:** Đọc các file liên quan, mọi caller, test, fixture, config và export trước khi sửa. Sửa nguyên nhân gốc; giữ nguyên hành vi không liên quan; dùng cách làm và dependency hiện có; chọn diff nhỏ nhất nhưng hoàn chỉnh.
- **Quy chuẩn văn phong & Skills:** Tuân thủ Ponytail nếu skill hoặc nội dung tương đương đã có sẵn tại máy. Chỉ đọc Humanizer nếu skill đã được cài sẵn; không cài hoặc tải skill. Humanizer chỉ dùng cho văn bản phù hợp, không áp dụng vào code, tên biến hay nội dung kỹ thuật để làm thay đổi nghĩa.
- **Ranh giới an toàn & Môi trường:** Không thêm dependency, không cập nhật package, không cài package, không truy cập Internet, không gọi dịch vụ bên ngoài, không dùng credentials, không dùng sudo, không sửa file bên ngoài repository, không deploy, không push, không commit, không chạy migration lên dữ liệu thật, không xóa dữ liệu người dùng. Không chạy lệnh có khả năng yêu cầu cấp quyền hoặc xác nhận. Nếu một kiểm tra cần các điều kiện đó, bỏ qua kiểm tra ấy, dùng phương án cục bộ an toàn nếu có và ghi rõ phần chưa xác minh; tuyệt đối không hỏi người dùng cấp quyền.
- **Bảo toàn trạng thái:** Không dùng lệnh phá hủy hoặc hoàn tác thay đổi có sẵn như `git reset --hard`, `git clean`, hoặc xóa hàng loạt file. Không ghi đè file người dùng đã thay đổi.
- **Kiểm tra thực tế:** Không mặc định rằng hạng mục hoặc lỗ hổng tồn tại. Hãy kiểm tra trước; nếu không áp dụng hoặc đã đáp ứng đầy đủ, không tạo code thừa và nêu rõ kết quả.
- **Kiểm thử & Ranh giới tin cậy:** Mọi logic không tầm thường phải có test phù hợp. Không được bỏ validation tại trust boundary, xử lý lỗi có thể làm mất dữ liệu, bảo mật hoặc khả năng truy cập để giảm số dòng code.
- **Quy trình báo cáo sau mỗi prompt:** Sau mỗi prompt, chạy các test/kiểm tra liên quan bằng công cụ đã có và không cần cấp quyền. Báo cáo ngắn: thay đổi, test đã chạy cùng kết quả, test không chạy được, và rủi ro còn lại. Không tuyên bố một kiểm tra đã đạt nếu chưa thực sự chạy.
- **Dịch vụ bên thứ ba & Chi phí:** Mọi dịch vụ bên thứ ba được giữ hoặc thêm phải không phát sinh chi phí bắt buộc hay yêu cầu billing; ưu tiên phần mềm mã nguồn mở có thể tự vận hành. Không thêm dịch vụ hoặc dependency mới. Nếu chưa xác minh được giấy phép/chi phí từ tài liệu sẵn có, không tự khẳng định là đã tuân thủ; ghi rõ điểm chưa xác minh.

---

## Điều Hướng Tài Liệu & Nhập Môn Dành Cho AI Agent (Documentation Navigation)

Để đảm bảo quá trình làm việc liên tục, an toàn và không làm sai lệch kiến trúc hoặc nghiệp vụ của Rendez, mọi AI coding agent khi tiếp nhận repository cần tuân thủ 8 quy tắc sau:

1. **Điểm khởi đầu bắt buộc:** Đọc [docs/PROJECT_GUIDE.md](file:///home/longtran/Projects/rendez-web/docs/PROJECT_GUIDE.md) khi bắt đầu bất kỳ công việc dự án quan trọng nào để hiểu cấu trúc toàn cục và lộ trình định hướng.
2. **Thẩm quyền ngôn ngữ miền tối cao:** Luôn đối chiếu [GLOSSARY.md](file:///home/longtran/Projects/rendez-web/GLOSSARY.md) cho toàn bộ thuật ngữ nghiệp vụ (Ubiquitous Language). Tuyệt đối không tự suy diễn hoặc định nghĩa lại khái niệm miền.
3. **Đọc tài liệu chuyên sâu trước khi sửa đổi:** Trước khi sửa đổi một mô-đun quan trọng, bắt buộc phải đọc tài liệu tương ứng trong [docs/project/](file:///home/longtran/Projects/rendez-web/docs/project/) (như `BACKEND.md`, `FRONTEND.md`, `ARCHITECTURE.md`, `DOMAIN_MODEL.md`).
4. **Đối chiếu thực tế mã nguồn:** Luôn kiểm chứng các khẳng định trong tài liệu với mã nguồn thực tế (`models`, `views`, `services`, `tests`, `migrations`) khi triển khai thay đổi.
5. **Bảo toàn phân định Hiện trạng (As-Is) vs Ý định (To-Be):** Phân biệt rạch ròi giữa tính năng đã kiểm chứng (`Verified`), ý định sản phẩm (`Intended`) và đề xuất (`Proposed`).
6. **Tôn trọng các điểm chờ quyết định (Decision Pending):** Tuyệt đối không tự ý chuyển các mục `Decision Pending` (như danh tính Place khi chuyển địa điểm, luồng VenueProposal, hiển thị Archived Photo) thành quyết định đã được duyệt (`Accepted`).
7. **Cập nhật tài liệu khi thay đổi:** Khi thực hiện các thay đổi mã nguồn đáng kể, luôn cập nhật các tài liệu kỹ thuật liên quan trong `docs/project/` để duy trì tính đồng bộ.
8. **Bảo mật & Quyền riêng tư:** Tuyệt đối không để lộ mật khẩu, khóa bí mật (secret keys), tokens, hay dữ liệu cá nhân nhạy cảm trong tài liệu hoặc nhật ký.
