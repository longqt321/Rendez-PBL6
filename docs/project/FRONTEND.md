# Rendez — Tài Liệu Frontend Chuyên Sâu (Frontend Guide)

Tài liệu này đặc tả kiến trúc mã nguồn giao diện, cấu trúc định tuyến, tích hợp bản đồ số MapLibre GL, cơ chế quản lý dữ liệu với TanStack Query và giải pháp hiển thị lưới ảnh thích ứng của Rendez.

---

## 1. Cấu Trúc Dự Án & Công Nghệ Frontend

Frontend được xây dựng dưới dạng ứng dụng đơn trang (Single Page Application - SPA) hiện đại:
- **Build Tool & Runtime:** Vite 7 kết hợp Bun 1.x.
- **Thư viện UI cốt lõi:** React 19 kết hợp TypeScript 5.9 (chế độ strict).
- **Định tuyến:** React Router v7.
- **Quản lý trạng thái từ xa & Cache:** TanStack Query v5 (`@tanstack/react-query`).
- **Bản đồ số:** MapLibre GL JS v5.

```text
frontend/
├── public/                     # Tài nguyên tĩnh phục vụ trực tiếp
│   ├── map/
│   │   ├── region.geojson      # Dữ liệu vector đường bộ địa phương (Liên Chiểu)
│   │   ├── style.json          # Cấu hình kiểu bản đồ MapLibre
│   │   └── glyphs/             # Bộ phông chữ Noto Sans tiếng Việt phục vụ bản đồ
│   └── photos/                 # Tệp ảnh tĩnh minh họa
│
├── src/
│   ├── app/                    # Các màn hình và luồng giao diện chính
│   │   ├── App.tsx             # Component gốc, cấu hình Router và Layout shell
│   │   ├── discovery.tsx       # Màn hình Khám phá chính (Masonry Feed + Bộ lọc)
│   │   ├── map.tsx             # Màn hình Bản đồ số tương tác (MapLibre GL)
│   │   ├── masonry.tsx         # Thành phần Lưới ảnh thích ứng tỷ lệ tự nhiên
│   │   ├── creator.tsx         # Màn hình Hồ sơ tác giả ảnh (/creators/:id)
│   │   ├── auth.tsx            # Form Đăng nhập, Đăng ký và Quản lý tài khoản
│   │   ├── contributions.tsx   # Modal Đóng góp ảnh (1–5 ảnh, geocoding)
│   │   ├── social.tsx          # Thành phần Bình luận, Thích ảnh, Báo cáo vi phạm
│   │   └── shared.tsx          # Các thành phần giao diện tiện ích chung
│   │
│   ├── components/ui/          # Thư viện thành phần UI nguyên tử (Atomic Primitives)
│   │   ├── button.tsx          # Nút bấm chuẩn hóa theo Design Tokens
│   │   └── confirm-dialog.tsx  # Hộp thoại xác nhận hành vi nguy hiểm
│   │
│   ├── lib/api/                # Tầng giao tiếp mạng (API Client)
│   │   ├── client.ts           # Fetch wrapper quản lý CSRF Token và Session
│   │   ├── visual.ts           # Các hàm gọi API Feed, Photos, Places
│   │   └── generated.d.ts      # Định nghĩa kiểu dữ liệu đồng bộ từ Backend
│   │
│   ├── styles/                 # Hệ thống CSS tổ chức theo mô-đun
│   │   ├── theme.css           # Bảng màu, thang phông chữ, biến Design Tokens
│   │   ├── layout.css          # Bố cục Desktop Left Rail & Mobile Bottom Bar
│   │   ├── components.css      # Kiểu dáng chi tiết cho thẻ ảnh, chip, modal
│   │   └── map.css             # Tùy biến thanh điều khiển và popup của MapLibre
│   │
│   ├── main.tsx                # Điểm khởi tạo ứng dụng (Entry Point)
│   └── styles.css              # Tệp CSS tổng hợp
│
└── package.json                # Quản lý dependency và kịch bản chạy
```

---

## 2. Hệ Thống Tuyến Đường (Routing Architecture)

Ứng dụng định nghĩa các tuyến đường chính trong `frontend/src/app/App.tsx`:

| Đường dẫn (URL) | Màn hình tương ứng | Phân quyền truy cập | Mô tả chức năng |
|---|---|---|---|
| `/` | `DiscoveryPage` (`discovery.tsx`) | Session bắt buộc | Feed ảnh Masonry trang chủ, thanh tìm kiếm, bộ lọc danh mục và thuộc tính thị giác |
| `/map` | `MapPage` (`map.tsx`) | Session bắt buộc | Bản đồ toàn màn hình, hiển thị marker các cơ sở theo khung nhìn tọa độ `bbox` |
| `/saved` | `SavedPlacesPage` | Session bắt buộc | Danh sách các quán cà phê người dùng đã bấm Lưu (Bookmark) |
| `/creators/:id` | `CreatorPage` (`creator.tsx`) | Session bắt buộc | Xem hồ sơ người chụp, thống kê số ảnh và lưới ảnh do họ đóng góp |
| `/login` | `LoginPage` (`auth.tsx`) | Công khai (Public) | Đăng nhập bằng email và mật khẩu |
| `/register` | `RegisterPage` (`auth.tsx`) | Công khai (Public) | Đăng ký tài khoản thành viên mới |

---

## 3. Tích Hợp Bản Đồ Tương Tác: MapLibre GL 5 (`map.tsx`)

Mô-đun bản đồ tại `frontend/src/app/map.tsx` được tối ưu hóa đặc biệt cho dữ liệu không gian cục bộ:

### 3.1. Đồng Bộ Hai Chiều Với Tham Số URL (Two-Way URL Sync)
- Khi người dùng di chuyển hoặc phóng to/thu nhỏ bản đồ, sự kiện `moveend` tính toán lại khung nhìn hình chữ nhật hiện tại (`bbox = west,south,east,north`) và cập nhật trực tiếp lên URL search params mà không làm reload trang.
- Ngược lại, khi người dùng mở một đường link có chứa sẵn `?bbox=...` hoặc chọn một quán cụ thể, bản đồ tự động căn giữa và bay (`map.flyTo`) tới tọa độ tương ứng.

### 3.2. Nguồn Dữ Liệu Bản Đồ (Tile & Vector Sources)
- **Lớp gạch raster nền:** Tải từ Esri World Topo Map thông qua cấu hình `public/map/style.json`.
- **Lớp vector đường phố địa phương:** Nạp từ tệp nội bộ `public/map/region.geojson` (bao phủ trục đường chính quận Liên Chiểu).
- **Bộ ký tự phông chữ tiếng Việt:** Tải từ thư mục nội bộ `public/map/glyphs/Noto Sans Regular/{range}.pbf`, bảo đảm các nhãn đường và tên cơ sở tiếng Việt hiển thị sắc nét mà không bị lỗi font.

### 3.3. Tương Tác Marker & Popup
- Marker cơ sở có hình giọt nước đặc trưng với viền trắng tương phản cao.
- Khi được chọn hoặc hover từ danh sách, marker chuyển sang màu đỏ ngói (`#c45c3d`) kèm hiệu ứng xung lan tỏa (pulse animation).
- Bấm vào marker mở ra một popup card chứa ảnh đại diện của quán, tên cơ sở, địa chỉ và nút dẫn đường nhanh.

---

## 4. Trái Tim Giao Diện: Lưới Ảnh Thích Ứng Masonry (`masonry.tsx`)

Để thực thi triệt để nguyên lý **Visual Truth**, tệp `frontend/src/app/masonry.tsx` triển khai giải pháp lưới ảnh Masonry thuần CSS Grid kết hợp JavaScript hiện đại:

### 4.1. Giải Pháp Kỹ Thuật
- **Cấu trúc hàng siêu mịn (Micro-Row Grid):** Sử dụng CSS Grid với các hàng tự động có chiều cao chỉ 8px: `grid-auto-rows: 8px`.
- **Tính toán chiều cao thích ứng:** Mỗi thẻ ảnh được gắn một `ResizeObserver`. Khi ảnh tải xong và văn bản hiển thị đầy đủ, component đo chiều cao thực tế của thẻ nội dung và tính toán số hàng cần chiếm dụng:
  $$\text{span} = \lceil \frac{\text{contentHeight} + \text{gap}}{\text{rowHeight} + \text{gap}} \rceil$$
  sau đó gán giá trị vào thuộc tính CSS `grid-row-end: span N`.
- **Chống Giật Bố Cục (Zero Layout Thrashing):** Toàn bộ thao tác đo chiều cao (Read) được gom nhóm trước khi thực hiện ghi CSS (Write), ngăn ngừa trình duyệt phải tính toán lại layout liên tục.
- **Bảo Toàn Tỷ Lệ Thật 100%:** Tuyệt đối không ép ảnh vào khung vuông cố định `1:1` hay `16:9`. Mọi bức ảnh đứng (portrait), ảnh ngang (landscape) hay ảnh vuông đều hiển thị trọn vẹn không gian thực tế.

---

## 5. Quản Lý Dữ Liệu & Cache: TanStack Query v5

Ứng dụng sử dụng TanStack Query để quản lý toàn bộ vòng đời dữ liệu từ máy chủ:

### 5.1. Định Danh Khóa Truy Vấn (Query Keys)
- `["feed", { category, attributes, search }]`: Danh sách ảnh trên trang chủ.
- `["places", { bbox, category }]`: Danh sách cơ sở trong khung nhìn bản đồ.
- `["photo", photoId]`: Chi tiết một bức ảnh cụ thể kèm danh sách bình luận.
- `["favorites"]`: Danh sách quán đã lưu của người dùng hiện tại.
- `["creator", creatorId]`: Thông tin và ảnh của một tác giả cụ thể.

### 5.2. Cập Nhật Lạc Quan (Optimistic Updates) & Làm Tươi Dữ Liệu (Invalidation)
- **Hành động Thích ảnh (Like):** Khi người dùng bấm nút tim, giao diện tăng ngay số đếm lượt thích và đổi màu icon trong vòng 0ms. Nếu yêu cầu mạng thất bại, trạng thái được tự động hoàn tác về trước đó.
- **Hành động Lưu quán (Bookmark):** Trạng thái nút Lưu thay đổi tức thời trên thẻ quán và tự động cập nhật danh sách tại trang `/saved`.
- **Hành động Nộp ảnh thành công:** Khi modal nộp ảnh gửi thành công dữ liệu, hệ thống tự động gọi `queryClient.invalidateQueries({ queryKey: ["feed"] })` và `["places"]`, giúp ảnh mới xuất hiện ngay trên feed mà người dùng không cần tải lại trang.

---

## 6. Bộ Kiểm Thử Frontend (Vitest Suite)

Frontend duy trì **56 bài kiểm thử tự động Vitest** tại thư mục `frontend/src/`:
- `src/app/access.test.tsx` (26 tests): Kiểm tra toàn diện phân quyền các màn hình, chuyển hướng khi chưa đăng nhập, bảo vệ cookie phiên.
- `src/app/accessibility.test.tsx` (6 tests): Kiểm tra trợ năng WCAG 2.1 AA, điều hướng bằng bàn phím (Tab/Esc), thẻ ARIA và tỷ lệ tương phản màu sắc.
- `src/app/image_perf.test.tsx` (3 tests): Kiểm tra hiệu năng tải ảnh, cờ `loading="lazy"`, `decoding="async"` và độ ổn định layout.
- `src/app/forms_and_navigation.test.tsx` (4 tests): Kiểm tra tính hợp lệ của form nộp ảnh, giới hạn 1–5 file, xác nhận cam kết bản quyền.
- `src/app/map.test.tsx` (3 tests): Kiểm tra khởi tạo MapLibre, xử lý tham số `bbox` trên URL.
- `src/app/social.test.tsx` (3 tests): Kiểm tra tương tác thích, bình luận và cập nhật lạc quan.
- `src/lib/api/client.test.ts` (5 tests): Kiểm tra logic gửi kèm `X-CSRFToken` trong header.

Chạy toàn bộ kiểm thử frontend:
```bash
./scripts/check.sh frontend
```
hoặc chạy trực tiếp qua Bun:
```bash
bun run --cwd frontend test
```
