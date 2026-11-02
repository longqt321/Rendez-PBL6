# PROGRESS

Mục mới nhất ở cuối file. Mỗi mục: ngày · tác vụ · đã làm (kèm bằng chứng) · chưa làm · bước tiếp theo · rủi ro.

<!-- Mục đầu tiên sẽ được thêm bởi /task-start hoặc /finish-task. -->

## 2026-11-02 · Nâng cấp bộ agent-kit mới (kiểm chất lượng quality và selftest 65/65)
- Đã làm:
  - Cài đặt thêm công cụ kiểm chất lượng tĩnh `scripts/agent/quality.mjs`, workflow `.agents/workflows/quality.md`, và cấu hình `.agent/quality.json`.
  - Cập nhật `.agents/workflows/verify.md` và `scripts/agent/selftest.mjs` từ kit mới.
  - Cấu hình `.agent/quality.json` khớp với cấu trúc thư mục thật của monorepo (`frontend/src`, `backend/apps`, `backend/config`), loại trừ `.venv` và `.local`.
  - Thiết lập baseline cho 54 phát hiện có sẵn trong `.agent/quality.baseline.json` để ngăn chặn lỗi mới mà không làm gián đoạn mã cũ.
  - Tích hợp bước kiểm chất lượng `quality` vào `.agent/config.json` để chạy tự động trong `verify.mjs`.
  - Bằng chứng:
    - `node scripts/agent/selftest.mjs`: 65 đạt, 0 thất bại.
    - `node scripts/agent/guard.mjs --cmd "git reset --hard"`: chặn thành công (exit 2).
    - `node scripts/agent/guard.mjs --cmd "ls -la"`: qua thành công (exit 0).
    - `git config core.hooksPath`: `.githooks`.
    - `grep -c "agent-kit:begin" ~/.gemini/GEMINI.md`: 1.
    - `node scripts/agent/verify.mjs`: ĐẠT 5 bước (copy, quality, frontend-typecheck, frontend-test, backend-ruff).
- Chưa làm:
  - 54 cảnh báo và thiếu test có sẵn trong mã dự án được lưu vào baseline, người dùng sẽ duyệt để xử lý dần theo backlog.
  - Backend pytest trong verify cần kết nối PostgreSQL cục bộ port 55432.
- Bước tiếp theo:
  - Người dùng kiểm tra `git status` và duyệt commit bộ công cụ agent-kit mới.
- Rủi ro:
  - Không có rủi ro đến logic nghiệp vụ ứng dụng.
