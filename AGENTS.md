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

---

## Bộ quy tắc UI và chữ (bổ sung cho hợp đồng vận hành ở trên)

Trước khi sửa bất kỳ màn hình, component, chuỗi chữ hoặc layout nào, đọc theo thứ tự:

1. [CLAUDE.md](file:///home/longtran/Projects/rendez-web/CLAUDE.md) — mô tả dự án, quy tắc không thương lượng, quy trình, cách báo cáo.
2. [docs/VOICE.md](file:///home/longtran/Projects/rendez-web/docs/VOICE.md) — quy tắc chữ, thuật ngữ cố định, bảng trước/sau.
3. [docs/UX_RULES.md](file:///home/longtran/Projects/rendez-web/docs/UX_RULES.md) — bố cục, form, trạng thái, tìm kiếm, điều hướng, truy cập.
4. [docs/LESSONS.md](file:///home/longtran/Projects/rendez-web/docs/LESSONS.md) — các lỗi đã mắc, không được lặp lại.
5. [docs/BACKLOG.md](file:///home/longtran/Projects/rendez-web/docs/BACKLOG.md) — việc tồn đọng, chỉ làm phần được giao.

Sau khi sửa, chạy `node scripts/check-copy.mjs --changed` và chỉ báo xong khi không còn lỗi.
Khi người dùng chỉ ra lỗi, ghi ngay một mục vào `docs/LESSONS.md` trong cùng lượt.
Cụm cấm tự động nằm ở `docs/banned-phrases.json`.

---

## Đọc repository bằng repo-context (bắt buộc)

Khi cần nắm cấu trúc hoặc nội dung repository, **ưu tiên đọc digest do `scripts/repo_context.py` sinh ra** thay vì đọc từng file bằng công cụ READ. Digest là snapshot; nếu source vừa thay đổi đáng kể thì chạy lại lệnh để làm mới trước khi đọc.

- Toàn repository: `uv run python scripts/repo_context.py` → đọc `.repo-context/repository.txt`
- Chỉ backend: `uv run python scripts/repo_context.py backend` → đọc `.repo-context/backend.txt`
- Chỉ frontend: `uv run python scripts/repo_context.py frontend` → đọc `.repo-context/frontend.txt`
- Thư mục con bất kỳ: `uv run python scripts/repo_context.py <đường-dẫn-tương-đối>` → digest nằm ở `.repo-context/<đường-dẫn>.txt` (giữ nguyên cấu trúc thư mục, VD `frontend/src` → `.repo-context/frontend/src.txt`). Chỉ dùng khi phạm vi backend/frontend vẫn quá rộng so với việc cần làm.

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
- **Dùng lại package và dependency đã cài sẵn** trước khi viết logic tương đương. Kiểm tra `backend/pyproject.toml`, `frontend/package.json` xem đã có gì; dùng phiên bản hiện đại theo range đã khoá trong đó. Không thêm dependency mới mà không ghi lý do vào `docs/DECISIONS.md`.
- **Không tự viết lại mọi thứ**: trước khi viết utility, component hay helper mới, tìm phần đã có trong codebase và tái sử dụng. Viết lại làm trùng logic và tạo chỗ phải bảo trì hai nơi.
- Không xóa test, snapshot, lint rule hay cấu hình chỉ để bước kiểm tra xanh dễ hơn.

---

## Agent-kit

Quy tắc và workflow bổ sung cho Antigravity / Agents:
- Quy tắc cốt lõi: `.agents/rules/01-core.md`, `.agents/rules/02-ui-copy.md`, `.agents/rules/03-memory.md`
- Workflows (gọi bằng `/tên-lệnh` trong chat):
  - `/task-start`: Khởi động task mới, đọc ngữ cảnh và bộ nhớ
  - `/verify`: Chạy bộ kiểm thử và kiểm tra chất lượng
  - `/finish-task`: Hoàn thành task, cập nhật PROGRESS/LESSONS
  - `/review`: Rà soát thay đổi trước khi bàn giao
  - `/review-ui`: Kiểm tra giao diện và tính nhất quán
  - `/fix-issue`: Tiếp nhận và xử lý issue theo quy trình chuẩn
  - `/fix-backlog`: Xử lý việc tồn đọng từ BACKLOG.md
  - `/audit-copy`: Rà soát từ ngữ giao diện
  - `/audit-design`: Rà soát thiết kế và token

