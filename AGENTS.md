# Hợp đồng vận hành chung (Operating Contract)

Áp dụng cho mọi tác vụ trong repo này. Đây là quy tắc thao tác, không phải mô tả sản phẩm hay định hướng tính năng.

- **Phạm vi repository:** Chỉ làm việc trong repository hiện tại. Trước khi sửa, kiểm tra `git status`; bảo toàn mọi thay đổi có sẵn của người dùng.
- **Phân tích trước khi sửa:** Đọc các file liên quan, mọi caller, test, fixture, config và export trước khi sửa. Sửa nguyên nhân gốc; giữ nguyên hành vi không liên quan; dùng cách làm và dependency hiện có; chọn diff nhỏ nhất nhưng hoàn chỉnh.
- **Ranh giới an toàn & Môi trường:** Không thêm dependency, không cập nhật package, không cài package, không truy cập Internet, không gọi dịch vụ bên ngoài, không dùng credentials, không dùng sudo, không sửa file bên ngoài repository, không deploy, không push, không commit, không chạy migration lên dữ liệu thật, không xóa dữ liệu người dùng. Không chạy lệnh có khả năng yêu cầu cấp quyền hoặc xác nhận. Nếu một kiểm tra cần các điều kiện đó, bỏ qua kiểm tra ấy, dùng phương án cục bộ an toàn nếu có và ghi rõ phần chưa xác minh; tuyệt đối không hỏi người dùng cấp quyền.
- **Bảo toàn trạng thái:** Không dùng lệnh phá hủy hoặc hoàn tác thay đổi có sẵn như `git reset --hard`, `git clean`, hoặc xóa hàng loạt file. Không ghi đè file người dùng đã thay đổi.
- **Kiểm tra thực tế:** Không mặc định rằng hạng mục hoặc lỗ hổng tồn tại. Hãy kiểm tra trước; nếu không áp dụng hoặc đã đáp ứng đầy đủ, không tạo code thừa và nêu rõ kết quả.
- **Kiểm thử & Ranh giới tin cậy:** Mọi logic không tầm thường phải có test phù hợp. Không được bỏ validation tại trust boundary, xử lý lỗi có thể làm mất dữ liệu, bảo mật hoặc khả năng truy cập để giảm số dòng code.
- **Quy trình báo cáo sau mỗi prompt:** Sau mỗi prompt, chạy các test/kiểm tra liên quan bằng công cụ đã có và không cần cấp quyền. Báo cáo ngắn: thay đổi, test đã chạy cùng kết quả, test không chạy được, và rủi ro còn lại. Không tuyên bố một kiểm tra đã đạt nếu chưa thực sự chạy.
- **Dịch vụ bên thứ ba & Chi phí:** Mọi dịch vụ bên thứ ba được giữ hoặc thêm phải không phát sinh chi phí bắt buộc hay yêu cầu billing; ưu tiên phần mềm mã nguồn mở có thể tự vận hành. Không thêm dịch vụ hoặc dependency mới. Nếu chưa xác minh được giấy phép/chi phí từ tài liệu sẵn có, không tự khẳng định là đã tuân thủ; ghi rõ điểm chưa xác minh.

---

## Nguồn chân lý

Không có tài liệu quy chuẩn nào đứng trên mã nguồn. Khi cần biết hệ thống thực sự làm gì, đọc theo thứ tự:

1. Mã nguồn đang chạy (`backend/apps`, `frontend/src`).
2. Hợp đồng API sinh tự động: `backend/openapi.yaml`, `frontend/src/lib/api/generated.d.ts`.
3. Test hiện có.
4. Ảnh render thật của giao diện.

Không dùng file `.md` để kết luận một thiết kế hay một chuỗi chữ là "đúng" hoặc "sai".

---

## Đọc repository bằng repo-context

Khi cần nắm cấu trúc hoặc nội dung repository, **ưu tiên đọc digest do `scripts/repo_context.py` sinh ra** thay vì đọc từng file. Digest là snapshot; nếu source vừa thay đổi đáng kể thì chạy lại lệnh để làm mới trước khi đọc.

- Toàn repository: `uv run python scripts/repo_context.py` → đọc `.repo-context/repository.txt`
- Chỉ backend: `uv run python scripts/repo_context.py backend` → đọc `.repo-context/backend.txt`
- Chỉ frontend: `uv run python scripts/repo_context.py frontend` → đọc `.repo-context/frontend.txt`
- Thư mục con bất kỳ: `uv run python scripts/repo_context.py <đường-dẫn-tương-đối>` → digest nằm ở `.repo-context/<đường-dẫn>.txt` (giữ nguyên cấu trúc thư mục, VD `frontend/src` → `.repo-context/frontend/src.txt`).

Quy tắc phạm vi đọc:

- Nhiệm vụ chỉ đụng frontend (sửa frontend, audit frontend, UI, layout, chữ) → **chỉ được đọc `.repo-context/frontend.txt`**, không đọc digest backend hay toàn repo.
- Nhiệm vụ chỉ đụng backend (API, models, migrations, settings) → **chỉ được đọc `.repo-context/backend.txt`**.
- Nhiệm vụ xuyên suốt (full-stack, API contract, kiến trúc chung) → đọc `.repo-context/repository.txt`.
- **Chọn phạm vi hẹp nhất đủ dùng**: sửa một module (VD `frontend/src/lib`, `backend/apps/photos`) thì digest đúng module đó, không đọc digest cấp trên. Đọc theo cấp: module → backend/frontend → toàn repo, chỉ nâng cấp khi phạm vi nhiệm vụ thật sự rộng hơn.
- Digest đã loại sẵn tests, E2E, lockfile, ảnh, binary. Cần xem file bị loại (test, schema lớn) thì đọc trực tiếp file đó, đừng nới ignore rule cho cả repo.
- Đọc digest theo phần: overview + directory tree ở đầu file để định vị, sau đó đọc đúng range dòng của module cần sửa (các file đánh dấu bằng `FILE: <path>`, sort theo path nên cùng module nằm cạnh nhau). Đừng đọc lại toàn bộ digest nhiều lượt.
- Không sửa file trong `.repo-context/` bằng tay; chúng là output của công cụ và bị Git bỏ qua.

---

## Quy tắc viết code (bắt buộc)

Khi viết hoặc sửa code:

- **Tuân thủ convention hiện tại của dự án** — bắt buộc. Bắt chước style của code xung quanh và cùng module: cách đặt tên, cấu trúc import, tổ chức file, error handling, pattern của framework đang dùng. Không áp dụng style riêng của agent. Lint config là nguồn tham chiếu chính thức (`backend/pyproject.toml` cho ruff, `frontend/eslint.config.js` cho ESLint/Prettier).
- **Code phải clean và readable**: tên nói được ý nghĩa, hàm ngắn, tránh lồng nhau nhiều cấp, comment chỉ khi giải thích "tại sao".
- **Dùng lại package và dependency đã cài sẵn** trước khi viết logic tương đương. Kiểm tra `backend/pyproject.toml`, `frontend/package.json` xem đã có gì; dùng phiên bản hiện đại theo range đã khoá trong đó. Không thêm dependency mới.
- **Không tự viết lại mọi thứ**: trước khi viết utility, component hay helper mới, tìm phần đã có trong codebase và tái sử dụng. Viết lại làm trùng logic và tạo chỗ phải bảo trì hai nơi.
- Không xóa test, snapshot, lint rule hay cấu hình chỉ để bước kiểm tra xanh dễ hơn.

---

## Kiểm tra trước khi báo xong

Chạy bằng công cụ đã có, không cần cấp quyền:

- `cd frontend && bunx tsc --noEmit`
- `cd frontend && bun run test`
- `cd frontend && bun run lint`
- `bash scripts/check.sh` (backend + frontend, nếu môi trường cho phép)
