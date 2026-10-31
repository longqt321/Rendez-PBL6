# Nghiên Cứu Chuyên Sâu Về Playwright MCP & Cẩm Nang Áp Dụng Cho Dự Án Rendez
# Playwright Model Context Protocol (MCP) Research & Engineering Integration Guide

*Tài liệu kỹ thuật lưu hành nội bộ — Dự án Rendez*
*Phiên bản Playwright tích hợp: 1.64.0 (hỗ trợ Native MCP Server)*
*Thời gian cập nhật: 2026-10-30*

---

## 1. Tổng Quan & Bản Chất Của Playwright MCP

### 1.1. Model Context Protocol (MCP) Là Gì?
**Model Context Protocol (MCP)** là một chuẩn giao tiếp mở (Open Standard) do Anthropic khởi xướng vào cuối năm 2024 và nhanh chóng trở thành tiêu chuẩn công nghiệp được hỗ trợ rộng rãi bởi Google Antigravity, Claude Desktop/Code, Cursor, Windsurf và OpenAI.

MCP giải quyết bài toán cốt tử của các mô hình ngôn ngữ lớn (LLMs): **làm thế nào để tác nhân AI có thể tương tác an toàn, có cấu trúc với các hệ thống bên ngoài** (cơ sở dữ liệu, kho tài liệu, API và trình duyệt web) thông qua giao thức RPC (thường qua `stdio` hoặc `SSE` dạng JSON-RPC 2.0) thay vì các đoạn mã script rời rạc khó kiểm soát.

### 1.2. Playwright MCP Server Là Gì?
**Playwright MCP** là máy chủ MCP chuyên dụng biến toàn bộ sức mạnh tự động hóa trình duyệt của **Microsoft Playwright** (Chromium, Firefox, WebKit) thành một tập hợp các công cụ (Tools) có cấu trúc chuẩn mà AI Agent có thể trực tiếp triệu gọi trong thời gian thực.

Trong phiên bản mới nhất (**Playwright 1.50+ / 1.64.0** đã được cài đặt sẵn trong `frontend/node_modules/`), Playwright đã tích hợp **Native MCP Server** trực tiếp vào gói cốt lõi mà không cần cài đặt thêm bất kỳ thư viện bên thứ ba nào thông qua lệnh:
```bash
npx playwright mcp [options]
# hoặc trong môi trường Bun của Rendez:
bun run --cwd frontend playwright mcp [options]
```

### 1.3. Sơ Đồ Kiến Trúc Hoạt Động (Architecture Diagram)

```mermaid
flowchart TD
    subgraph Agentic_Client [Tác Nhân AI / IDE]
        Agent["AI Coding Agent<br/>(Google Antigravity / Claude Code / Cursor)"]
        LLM["Large Language Model<br/>(Hiểu ngữ cảnh & Lập luận)"]
        Agent <--> LLM
    end

    subgraph MCP_Boundary [Giao Thức MCP (JSON-RPC qua Stdio/SSE)]
        Agent <-->|Tools List / Call Tool| MCP_Server["Playwright MCP Server<br/>(playwright mcp --allowed-origins=...)"]
    end

    subgraph Browser_Runtime [Môi Trường Trình Duyệt Thực Tế]
        MCP_Server <-->|DevTools Protocol / CDP| Browser["Chromium / Headless Engine<br/>(~/.cache/ms-playwright/)"]
        Browser <-->|HTTP / WebSocket| Rendez_Frontend["Rendez Frontend<br/>http://localhost:5173 (React 19 + Vite)"]
        Browser <-->|REST API| Rendez_Backend["Rendez Backend<br/>http://localhost:8000 (Django 5.2 + DRF)"]
    end
```

---

## 2. So Sánh: Playwright Test Truyền Thống vs. Playwright MCP

| Tiêu Chí | Playwright Test Truyền Thống (`*.spec.ts`) | Playwright MCP Server (Agentic Automation) |
| :--- | :--- | :--- |
| **Bản chất** | Kịch bản kiểm thử tĩnh, viết trước bằng code TypeScript/JavaScript. | Công cụ tương tác động, mở hai chiều cho AI Agent tự suy luận và điều khiển. |
| **Cách phản ứng với thay đổi** | Dễ bị gãy (fragile) khi thay đổi selector, class CSS hoặc DOM hierarchy. | Agent tự quan sát lại Accessibility Tree và điều chỉnh hành động linh hoạt (Self-Healing). |
| **Mức độ phụ thuộc con người** | Lập trình viên phải tự đoán các ca kiểm thử, tự viết assert, tự chụp ảnh debug. | Agent tự động khám phá giao diện (Exploratory Testing), tự sinh ca kiểm thử và báo cáo lỗi runtime. |
| **Phân tích lỗi (Root Cause)** | Chỉ có stack trace và file trace viewer sau khi test đã chạy xong và thất bại. | Bắt trực tiếp console log và network request tại đúng thời điểm xảy ra lỗi để chẩn đoán gốc rễ. |
| **Hiệu quả tiêu thụ Token** | Không áp dụng trực tiếp cho LLM. | Sử dụng **Accessibility Snapshot** dạng text phân cấp, tiết kiệm 80-90% token so với gửi ảnh chụp màn hình liên tục. |

---

## 3. Danh Mục 25 Công Cụ (Tools) Của Playwright MCP

Playwright MCP Server cung cấp trọn vẹn 25 công cụ điều khiển và quan sát chuyên sâu:

### A. Nhóm Tương Tác Người Dùng (User Interactions)
1. `browser_navigate`: Điều hướng trình duyệt tới URL chỉ định (ví dụ: `http://localhost:5173/discover`).
2. `browser_navigate_back`: Quay lại trang trước trong lịch sử duyệt.
3. `browser_click`: Click chuột vào phần tử thông qua selector hoặc tọa độ.
4. `browser_type`: Gõ văn bản vào trường nhập liệu.
5. `browser_fill_form`: Điền đồng thời nhiều trường trong biểu mẫu để tối ưu lượt gọi tool.
6. `browser_press_key`: Bấm phím bàn phím (`Enter`, `Escape`, `ArrowLeft`, `ArrowRight`, `Tab`).
7. `browser_hover`: Rê chuột lên phần tử (kích hoạt hover effects, dropdowns, tooltip).
8. `browser_drag` & `browser_drop`: Kéo thả phần tử hoặc tải tệp mô phỏng thao tác kéo thả.
9. `browser_select_option`: Chọn giá trị trong menu thả xuống `<select>`.
10. `browser_file_upload`: Tải tệp lên biểu mẫu (đặc biệt phù hợp cho tính năng đóng góp ảnh Rendez).
11. `browser_handle_dialog`: Tự động xử lý hộp thoại xác nhận hoặc thông báo của trình duyệt.

### B. Nhóm Quan Sát & Thu Nhận Ngữ Cảnh (Observability & Perception)
12. `browser_snapshot`: **(Cốt lõi)** Chụp cây Accessibility Snapshot (DOM phân cấp gồm role và name). Cực kỳ nhẹ, giúp LLM hiểu toàn bộ cấu trúc trang mà không cần tải HTML rác hay tốn token chụp ảnh.
13. `browser_take_screenshot`: Chụp ảnh màn hình thực tế (hỗ trợ kiểm tra trực quan bố cục Masonry và bản đồ MapLibre).
14. `browser_find`: Tìm kiếm chuỗi văn bản hoặc regex trong Accessibility Snapshot.
15. `browser_console_messages`: Thu thập toàn bộ log trình duyệt (`console.log`, `console.error`, `console.warn`) để phát hiện biệt lập lỗi JavaScript.
16. `browser_network_requests`: Liệt kê toàn bộ các yêu cầu mạng đã gửi kèm mã trạng thái HTTP (200, 400, 403, 500).
17. `browser_network_request`: Trích xuất chi tiết headers, query params và body của một yêu cầu cụ thể.

### C. Nhóm Mô Phỏng Môi Trường & Thực Thi Nâng Cao
18. `browser_resize`: Thay đổi kích thước viewport để kiểm tra giao diện Responsive (Mobile 375x667 vs Desktop 1440x900).
19. `browser_emulate_media`: Mô phỏng chế độ giao diện sáng/tối (`light`/`dark`) hoặc in ấn.
20. `browser_tabs`: Quản lý danh sách các tab trình duyệt.
21. `browser_wait_for`: Chờ đợi một trạng thái DOM hoặc một khoảng thời gian nhất định để giao diện ổn định.
22. `browser_evaluate`: Thực thi biểu thức JavaScript tùy biến trong ngữ cảnh trang web.
23. `browser_run_code_unsafe`: Thực thi một đoạn mã Playwright script trực tiếp.
24. `browser_close`: Đóng phiên làm việc trình duyệt.

---

## 4. Giá Trị Thực Chiến & Ứng Dụng Vào Dự Án Rendez

Dự án **Rendez** là một nền tảng khám phá Đà Nẵng qua ảnh và bản đồ với các đặc thù kỹ thuật phức tạp:
- **MapLibre GL Canvas:** Khung bản đồ WebGL không thể kiểm thử đầy đủ qua JSDOM/Vitest.
- **Masonry Grid Layout:** Bố cục so le động đòi hỏi đo đạc chính xác chiều cao ảnh và chống layout thrashing.
- **Bộ dữ liệu cà phê sinh viên Bách Khoa:** Các địa điểm thực tế đòi hỏi xác thực tính chính xác của popup, marker và tọa độ.
- **Tương tác mạng xã hội:** Form gửi bình luận, like ảnh, báo cáo vi phạm, xem hồ sơ Creator.

Dưới đây là 4 kịch bản áp dụng thực tế của Playwright MCP trong dự án Rendez:

### Kịch Bản 1: Kiểm Thử Trực Quan Bản Đồ MapLibre GL & Markers
* **Thách thức:** Unit test bằng Vitest sử dụng môi trường giả lập `jsdom` không hỗ trợ context WebGL 2D/3D của MapLibre. Các lỗi như marker không hiển thị, popup bị lệch tọa độ hoặc lỗi tải file `style.json` thường lọt qua khâu test tự động.
* **Cách Playwright MCP xử lý:**
  1. Agent gọi `browser_navigate("http://localhost:5173/map")`.
  2. Agent gọi `browser_network_requests` để xác nhận `style.json` và `region.geojson` trả về mã HTTP `200 OK`.
  3. Agent gọi `browser_snapshot` để kiểm tra danh sách các quán cà phê (ví dụ: *Góc Ban Mê*, *Cà Phê Bách Khoa*) có hiện diện trong danh sách tương tác.
  4. Agent gọi `browser_click` vào một marker và kiểm tra popup chi tiết địa điểm có mở đúng thông tin hay không.

### Kịch Bản 2: Thẩm Định Bố Cục Masonry Grid & Responsive
* **Thách thức:** Khi tái cấu trúc CSS hoặc sửa component `Masonry.tsx`, các ảnh có tỷ lệ khung hình khác nhau (dọc 2:3, ngang 16:9) có thể bị chồng đè hoặc gây vỡ layout trên mobile.
* **Cách Playwright MCP xử lý:**
  1. Agent gọi `browser_resize(width: 375, height: 812)` (viewport iPhone).
  2. Agent gọi `browser_navigate("http://localhost:5173/discover")`.
  3. Agent gọi `browser_snapshot` để kiểm tra Bottom Navigation Mobile xuất hiện thay cho Left Rail Desktop.
  4. Agent chụp ảnh `browser_take_screenshot` để xác minh bố cục lưới co giãn về 1 hoặc 2 cột mượt mà.

### Kịch Bản 3: Tự Động Sinh Kịch Bản E2E & Tự Chữa Lành Test (Self-Healing Tests)
* **Thách thức:** Khi thêm tính năng mới (ví dụ: trang Creator `/creators/:id` hoặc hộp thoại `ConfirmDialog`), kỹ sư phải tốn nhiều thời gian viết kịch bản E2E thủ công.
* **Cách Playwright MCP xử lý:**
  - Kết hợp bộ 3 agent có sẵn của Playwright (`playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`):
    - **Planner Agent:** Khám phá trang web qua `browser_snapshot` và vạch ra kế hoạch test luồng người dùng (User Flows).
    - **Generator Agent:** Thao tác thực tế qua các lệnh `browser_click`, `browser_type` trên trình duyệt thật và tự động xuất ra file `frontend/e2e/creator_flow.spec.ts`.
    - **Healer Agent:** Khi backend thay đổi API hoặc frontend đổi label nút bấm làm hỏng test E2E, Healer tự động mở trace, định vị selector mới bền vững hơn và sửa trực tiếp mã test.

### Kịch Bản 4: Chẩn Đoán Lỗi Tích Hợp Frontend - Backend (Full-Stack Debugging)
* **Thách thức:** Khi người dùng gửi bình luận nhưng giao diện báo lỗi hoặc không cập nhật danh sách.
* **Cách Playwright MCP xử lý:**
  1. Agent thao tác gửi bình luận qua `browser_type` và `browser_click`.
  2. Agent lập tức gọi `browser_console_messages` để xem có lỗi React exception nào không.
  3. Agent gọi `browser_network_requests` để soi mã HTTP của endpoint `POST /api/photos/<id>/comments/`. Nếu trả về 429 (Throttle Rate Limit) hay 403 (CSRF Cookie Missing), Agent sẽ chỉ ra ngay nguyên nhân gốc rễ mà không phải phỏng đoán.

---

## 5. Hướng Dẫn Cấu Hình Kết Nối Playwright MCP Vào Các AI Agents

### 5.1. Cấu hình cho Google Antigravity & Claude Desktop / Claude Code
Thêm khối cấu hình Playwright MCP Server vào tệp cấu hình MCP của client (thường tại `~/.config/antigravity/mcp.json` hoặc `.mcp.json` ở thư mục gốc dự án):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "bun",
      "args": [
        "run",
        "--cwd",
        "frontend",
        "playwright",
        "mcp",
        "--allowed-origins=http://localhost:5173;http://127.0.0.1:5173;http://localhost:8000;http://127.0.0.1:8000",
        "--viewport-size=1280x720"
      ]
    }
  }
}
```

### 5.2. Cấu hình cho Cursor IDE (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "playwright-rendez": {
      "command": "node",
      "args": [
        "frontend/node_modules/playwright/cli.js",
        "mcp",
        "--allowed-origins=http://localhost:5173;http://127.0.0.1:5173",
        "--viewport-size=1280x800"
      ]
    }
  }
}
```

### 5.3. Tích hợp lệnh vào `Makefile` của Rendez
Để tiện lợi cho việc kiểm tra và khởi chạy thủ công, có thể bổ sung target vào `Makefile`:

```makefile
mcp:
	bun run --cwd frontend playwright mcp --allowed-origins='http://localhost:5173;http://127.0.0.1:5173;http://localhost:8000;http://127.0.0.1:8000'
```

---

## 6. Rào Chắn An Toàn & Thực Hành Tốt Nhất (Safety & Best Practices)

Khi vận hành Playwright MCP trong môi trường tự động hóa:

1. **Ranh Giới Nguồn Tin Cậy (`--allowed-origins`):** Luôn giới hạn trình duyệt chỉ được phép truy cập vào các nguồn nội bộ (`http://localhost:5173`, `http://localhost:8000`). Tránh để Agent điều hướng ra các trang web công cộng không rõ nguồn gốc.
2. **Ưu Tiên Accessibility Snapshot (`browser_snapshot`):** Tuyệt đối không lạm dụng việc chụp ảnh màn hình (`browser_take_screenshot`) liên tục sau mỗi thao tác. Accessibility Snapshot cung cấp đầy đủ thông tin ngữ nghĩa mà chỉ tiêu tốn 100-300 tokens, giúp tốc độ phản hồi của Agent nhanh hơn gấp 5 lần.
3. **Bảo Vệ Dữ Liệu Thực Tế:** Trong các bài test tương tác ghi dữ liệu (đóng góp ảnh, xóa bình luận), sử dụng tài khoản kiểm thử hoặc môi trường cơ sở dữ liệu test được khởi tạo bởi `scripts/backup-local.sh` và `scripts/restore-local.sh`.
4. **Cô Lập Phiên Duyệt (`--isolated`):** Khuyến nghị kích hoạt cờ `--isolated` khi chạy các bài test độc lập để cookie và local storage không bị lưu lại giữa các lần chạy kiểm thử.

---

## 7. Kết Luận & Lộ Trình Triển Khai Tiếp Theo

Playwright MCP là một bước tiến vượt bậc trong kỹ thuật tự động hóa phần mềm thế hệ mới. Với việc Playwright 1.64.0 đã có sẵn trong dự án Rendez cùng các trình duyệt Chromium đã cài đặt cục bộ, nhóm phát triển có thể:
1. Kích hoạt Playwright MCP ngay lập tức mà **không cần cài thêm dependency mới** hay kết nối Internet.
2. Tận dụng sức mạnh của các AI Coding Agent để thực hiện **Visual QA**, kiểm tra tính năng bản đồ và **tự động bảo trì bộ test E2E**.
3. Nâng cao tiêu chuẩn chất lượng kỹ thuật của dự án Rendez lên chuẩn mực cao nhất của công nghiệp phần mềm hiện đại.

---

## 8. Giai Đoạn 1 — Nền Tảng Môi Trường E2E Chuyên Biệt (Phase 1 Dedicated Foundation)

Trong khuôn khổ Phase 1, hệ thống đã thiết lập nền tảng môi trường kiểm thử E2E độc lập, tự vận hành hoàn chỉnh và bảo vệ tuyệt đối cơ sở dữ liệu phát triển:

### 8.1. Cơ Chế Cô Lập Tài Nguyên & Rào Chắn An Toàn (Resource Isolation & Hardening)
- **Cơ sở dữ liệu độc lập (`rendez_e2e`):** Toàn bộ migration và seed data thực thi riêng biệt trên `rendez_e2e`. Cơ sở dữ liệu phát triển `rendez_local` được bảo vệ 100% (kiểm chứng bằng chữ ký mật mã SHA-256 trên toàn bộ 23 bảng).
- **Phân tách quyền hạn PostgreSQL (Role Privilege Separation):**
  - Quản trị DDL (`rendez`): Phục vụ tác vụ tạo/drop database và nạp schema trong `e2e_manager.py`.
  - Ứng dụng E2E Runtime (`rendez_e2e_app`): Phục vụ máy chủ Django backend khi chạy test E2E với đặc quyền tối thiểu (`NOSUPERUSER NOCREATEDB NOCREATEROLE`), triệt tiêu rủi ro leo thang đặc quyền từ ứng dụng.
- **Ánh xạ cổng PostgreSQL & Không phụ thuộc PostGIS:**
  - Container PostgreSQL lắng nghe tại host port `55433` (ánh xạ từ container port `5432`).
  - Container `postgres:17-alpine` không cài PostGIS; Rendez sử dụng `DecimalField` với thuật toán BBox số học độc lập.
- **Thư mục Media chuyên biệt (`.local/e2e_media/`):** Tách biệt hoàn toàn tệp ảnh tải lên và phái sinh giữa test và development. Quá trình dọn dẹp chỉ xóa trong phạm vi thư mục con E2E được kiểm chứng an toàn (bảo vệ `.local/media` với 150 file nguyên vẹn 100%).
- **Phân tách Port mạng:** Backend E2E vận hành tại `127.0.0.1:8001`, Frontend E2E tại `127.0.0.1:5174`, tránh xung đột hoặc tái sử dụng nhầm máy chủ phát triển (port 8000/5173).
- **Rào chắn an toàn (Safety Guards):** Hàm bảo vệ kiểm tra kết nối thực tế `validate_safe_database_for_drop` từ chối tuyệt đối `rendez_local`, `postgres`, `template*` và chỉ chấp nhận định danh chính xác `rendez_e2e`. Hàm `validate_safe_media_path` chặn symlink và path traversal.

### 8.2. Phân Quyền Tài Khoản Kiểm Thử & Quản Lý Thông Tin Xác Thực (Zero Plaintext Credentials)
- **Normal User (`e2e-user@rendez.test`):** `is_staff=False`, `is_superuser=False` (phục vụ duyệt feed, tương tác ảnh, kiểm tra quyền truy cập).
- **Moderator (`e2e-moderator@rendez.test`):** `is_staff=True`, `is_superuser=False`, được cấp thẩm quyền kiểm duyệt cụ thể `photos.review_photosubmission` (không dùng superuser để kiểm thử quyền moderator).
- **Unprivileged Staff (`e2e-staff-unprivileged@rendez.test`):** `is_staff=True`, `is_superuser=False` không có quyền kiểm duyệt ảnh để kiểm thử ranh giới 404/403.
- **Quản lý mật khẩu động:** Toàn bộ mật khẩu được sinh ngẫu nhiên an toàn qua `secrets.token_urlsafe(24)` và lưu vào `.local/e2e_credentials.json` (chế độ phân quyền POSIX `0600`, được gitignore bảo vệ), không in mật khẩu ra console và không lưu trữ plaintext trong mã nguồn.
- **Dữ liệu quán cà phê:** 12 địa điểm và 36 tệp ảnh **minh hoạ sinh tự động** (placeholder) khu vực Bách Khoa — Đà Nẵng từ `data/danang.json`.

### 8.3. Tập Lệnh Vận Hành
Quản lý môi trường E2E thông qua công cụ trung tâm `scripts/e2e_manager.py`:
- `uv run --project backend python scripts/e2e_manager.py preflight`: Kiểm tra quyền PostgreSQL, role attributes và phần mở rộng.
- `uv run --project backend python scripts/e2e_manager.py snapshot`: Tạo chữ ký mật mã SHA-256 cho dev DB và dev media.
- `uv run --project backend python scripts/e2e_manager.py setup`: Khởi tạo DB `rendez_e2e`, role `rendez_e2e_app`, chạy migration, nạp dataset và tạo test accounts.
- `uv run --project backend python scripts/e2e_manager.py reset`: Phá hủy và tái tạo môi trường E2E an toàn.
- `uv run --project backend python scripts/e2e_manager.py verify`: So sánh SHA-256 bảng dữ liệu và thư mục media phát triển trước và sau test.
- `bun run --cwd frontend playwright test e2e/smoke_e2e_foundation.spec.ts`: Chạy bộ kiểm thử smoke E2E nền tảng.

