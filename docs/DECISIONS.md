# DECISIONS

Mỗi quyết định một mục. Không xóa mục cũ; nếu đảo ngược, thêm mục mới và ghi "thay thế D-###".

## D-001 Bộ quy tắc agent được áp dụng
- Ngày: 2026-11-02
- Dự án: rendez-web
- Stack: Monorepo gồm Frontend (React 19, TypeScript, Vite, Tailwind CSS, Vitest, Bun) và Backend (Django 5.2, Django REST Framework, Python 3.12/3.14, Ruff, Pytest)
- Quyết định: Áp dụng hạ tầng agent-kit nâng cao cho Antigravity và Git: quy tắc tại .agents/rules, workflows tại .agents/workflows (bổ sung /quality), skills tại .agents/skills, git hook tại .githooks, và scripts hỗ trợ tại scripts/agent/.
- Cấu hình kiểm chất lượng tĩnh (.agent/quality.json):
  - scanDirs: `frontend/src`, `backend/apps`, `backend/config`. Bỏ qua các thư mục không thuộc mã nguồn dự án như `.venv`, `.local`.
  - Layers: khai báo ranh giới giao diện dùng chung `frontend/src/components/ui/` không được phụ thuộc trực tiếp vào `frontend/src/features/`.
  - Fail (các kiểm chặn): `["cycles", "arch", "authz", "contract", "tests"]`.
  - Kết quả baseline chất lượng: 54 phát hiện có sẵn từ mã nguồn hiện tại (a11y: 26, tests: 20, size: 6, contract: 1 cảnh báo không tìm thấy route backend Node do backend viết bằng Django Python, design: 1) đã được ghi nhận vào `.agent/quality.baseline.json` để không chặn công việc mới.
- Kết quả kiểm chứng hạ tầng:
  - scripts/agent/selftest.mjs: 65 đạt, 0 thất bại
  - scripts/agent/guard.mjs: chặn lệnh nguy hiểm (exit 2 với git reset --hard, exit 0 với ls -la)
  - git config core.hooksPath: .githooks
  - verify: đã cấu hình trong .agent/config.json và đạt 5/5 bước (copy, quality, frontend-typecheck, frontend-test, backend-ruff)
- Lý do: Giảm lặp lỗi giữa các phiên; quy tắc máy kiểm được thay vì chỉ viết bằng chữ.
- Phương án bị loại: Chỉ dùng prompt viết tay (dễ quên khi ngữ cảnh dài).
- Ảnh hưởng: Mọi tác vụ phải qua verify và reviewer trước khi báo xong.
