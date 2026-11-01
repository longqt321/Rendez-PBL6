# Rendez — Tài Liệu Frontend Chuyên Sâu (Frontend Guide)

Tài liệu này đặc tả kiến trúc mã nguồn giao diện, cấu trúc định tuyến, tích hợp bản đồ số MapLibre GL, cơ chế quản lý dữ liệu với TanStack Query và giải pháp hiển thị lưới ảnh thích ứng của Rendez.

> **Đã cập nhật sau redesign giao diện.** Tài liệu chi tiết về hệ thống thiết kế, kiến trúc
> frontend và bản đồ route nằm ở:
> - [docs/design-system.md](file:///home/longtran/Projects/rendez-web/docs/design-system.md) — token, thang chữ, component, cơ chế theme, trợ năng
> - [docs/frontend-architecture.md](file:///home/longtran/Projects/rendez-web/docs/frontend-architecture.md) — tầng, chiến lược cache, trạng thái migrate
> - [docs/ui-route-map.md](file:///home/longtran/Projects/rendez-web/docs/ui-route-map.md) — route ↔ endpoint ↔ quyền
> - [docs/ui-implementation-status.md](file:///home/longtran/Projects/rendez-web/docs/ui-implementation-status.md) — việc đã xong, việc còn lại, kết quả kiểm chứng

---

## 1. Cấu Trúc Dự Án & Công Nghệ Frontend

Frontend được xây dựng dưới dạng ứng dụng đơn trang (Single Page Application - SPA) hiện đại:
- **Build Tool & Runtime:** Vite 7 kết hợp Bun 1.x.
- **Thư viện UI cốt lõi:** React 19 kết hợp TypeScript 5.9 (chế độ strict).
- **Định tuyến:** React Router v7.
- **Quản lý trạng thái từ xa & Cache:** TanStack Query v5 (`@tanstack/react-query`).
- **Bản đồ số:** MapLibre GL JS v5.
- **Hệ thống style:** CSS viết tay dùng design token; Tailwind v4 chỉ cung cấp utility.

**Tách chunk build (`vite.config.ts`):** các thư viện vendor ổn định (React, React DOM, React Router, TanStack Query) được tách vào chunk `vendor` qua `rollupOptions.output.manualChunks`, giữ chunk `index` nhỏ và giữ nguyên hash vendor giữa các lần chỉ sửa code ứng dụng. Chunk `map` (MapLibre GL) được tách sẵn và chỉ tải khi trang bản đồ mở — đây là chunk lớn duy nhất vượt ngưỡng cảnh báo mặc định của Vite, được chấp nhận vì nó lazy-load.

```text
frontend/src/
├── app/                        # Định tuyến + màn hình legacy
│   ├── App.tsx                 # Cây route duy nhất (layout route + guard)
│   ├── auth.tsx                # Đăng nhập / Đăng ký (đã redesign)
│   ├── layouts/
│   │   ├── AppShell.tsx        # Sidebar + topbar + <Outlet/>
│   │   └── nav.tsx             # SidebarNav, CreateAction, MobileNav
│   ├── discovery.tsx           # LEGACY — không còn được route
│   ├── contributions.tsx       # LEGACY — vẫn route /submissions*
│   ├── creator.tsx             # LEGACY — vẫn route /creators/:id
│   ├── map.tsx                 # Bản đồ số (lazy-load)
│   ├── social.tsx              # LEGACY — CommentSection, LikeButton
│   ├── shared.tsx              # Re-export session + Cover/State/ErrorText
│   ├── masonry.tsx             # LEGACY — MasonryFeed
│   ├── post_detail.tsx         # LEGACY — không còn được route
│   └── posts_feed.tsx          # LEGACY — không còn được route
│
├── components/ui/              # Primitives dùng chung
│   ├── button.tsx              # Button (CVA: primary/outline/ghost/accent/destructive)
│   ├── primitives.tsx          # IconButton, Field, Input, Textarea, Select, Chip, Badge, Avatar
│   ├── safe-image.tsx          # Ảnh có fallback + tỷ lệ khung cố định
│   ├── states.tsx              # LoadingState, ErrorState, EmptyState, AsyncState
│   └── confirm-dialog.tsx      # <dialog> xác nhận hành động phá huỷ
│
├── features/                   # Màn hình theo miền nghiệp vụ
│   ├── discovery/DiscoverPage.tsx
│   ├── search/SearchPage.tsx
│   ├── places/{PlaceCard,PlaceDetailPage}.tsx
│   ├── experiences/{ExperienceCard,ExperiencesPage,PhotoDetailPage,PostDetailPage}.tsx
│   ├── saved/SavedPage.tsx
│   ├── contribute/CreateExperiencePage.tsx
│   ├── profile/{ProfilePage,SettingsPage}.tsx
│   ├── moderation/ReportDialog.tsx
│   └── shell/NotFoundPage.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts           # Fetch wrapper: CSRF, credentials, chuẩn hoá lỗi
│   │   ├── queries.ts          # queryKeys + toàn bộ hook useQuery/useMutation
│   │   ├── types.ts            # Kiểu viết tay cho phần OpenAPI chưa mô tả
│   │   └── generated.d.ts      # Sinh từ backend/openapi.yaml
│   ├── session.tsx             # useMe, useLogout, sanitizeReturnTo (nguồn duy nhất)
│   ├── theme.tsx               # ThemeProvider, useTheme, useOptionalTheme
│   └── format.ts               # formatRelative, shortAddress, …
│
├── styles/                     # Xem design-system.md §6
│   ├── theme.css               # LEGACY palette (bị tokens.css ghi đè)
│   ├── tokens.css              # Nguồn sự thật duy nhất cho màu/kiểu/khoảng cách
│   ├── reset.css  typography.css  globals.css
│   ├── ui.css                  # Primitives
│   ├── shell.css               # Sidebar, topbar, mobile nav
│   ├── cards.css  discover.css  search.css  place.css  experiences.css
│   ├── saved.css  create.css  profile.css  auth.css
│   ├── layout.css  components.css  map.css   # LEGACY
│   └── (styles.css ở src/)     # Điểm vào, quy định thứ tự import
│
├── main.tsx                    # Entry: QueryClientProvider + ThemeProvider + Router
└── styles.css                  # Tệp CSS tổng hợp
```

---

## 2. Hệ Thống Tuyến Đường (Routing Architecture)

Ứng dụng định nghĩa các tuyến đường chính trong `frontend/src/app/App.tsx`. Cấu trúc lồng
nhau phản ánh **quyền truy cập thật của backend** (đọc từ `backend/openapi.yaml`):

| Đường dẫn (URL) | Màn hình | Phân quyền | Mô tả |
|---|---|---|---|
| `/` | Redirect | — | → `/discover` |
| `/discover` | `DiscoverPage` | `IsAuthenticated` | Trang chủ biên tập: masthead, gợi ý chủ đề, hàng địa điểm tuyển chọn |
| `/search` | `SearchPage` | `IsAuthenticated` | Tìm theo tên/địa chỉ, lọc danh mục + thuộc tính, sắp xếp |
| `/map` | `MapPage` (`map.tsx`, lazy) | `IsAuthenticated` | Bản đồ toàn màn hình, marker theo `bbox` |
| `/places/:id` | `PlaceDetailPage` | `IsAuthenticated` | Thông tin địa điểm, giờ mở cửa, thư viện ảnh, trải nghiệm cộng đồng |
| `/photos/:id` | `PhotoDetailPage` | `IsAuthenticated` | Ảnh lớn, like, bình luận, ảnh tương tự |
| `/posts` | `ExperiencesPage` | **AllowAny** | Dòng trải nghiệm cộng đồng (công khai) |
| `/posts/:id` | `PostDetailPage` | **AllowAny** | Một trải nghiệm cụ thể (công khai, chia sẻ link được) |
| `/terms` | `TermsPage` | **AllowAny** | Điều khoản sử dụng (công khai, đọc được trước khi đăng ký) |
| `/saved` | `SavedPage` | `IsAuthenticated` | Địa điểm đã lưu + trải nghiệm đã lưu |
| `/create` | `CreateExperiencePage` | `IsAuthenticated` | Wizard 3 bước đăng ảnh/trải nghiệm |
| `/profile` | `ProfilePage` | `IsAuthenticated` | Hồ sơ, thống kê, tab ảnh đã đăng / đã lưu |
| `/settings` | `SettingsPage` | `IsAuthenticated` | Theme, tên hiển thị, mật khẩu, đăng xuất |
| `/creators/:id` | `CreatorProfilePage` (`creator.tsx`) | `IsAuthenticated` | Hồ sơ tác giả (legacy) |
| `/submissions*` | `contributions.tsx` | `IsAuthenticated` | Lịch sử nộp ảnh (legacy) |
| `/login` | `Auth` | Công khai | Đăng nhập |
| `/register` | `Auth` (`register`) | Công khai | Tạo tài khoản |
| `*` | `NotFoundPage` | `IsAuthenticated` | 404 |

> **Vì sao `/posts` nằm ngoài guard:** backend khai báo `AllowAny` cho `/api/v1/posts/` và
> `/api/v1/posts/{id}/`. Chặn ở frontend sẽ mâu thuẫn hợp đồng API và làm mất khả năng chia
> sẻ link trải nghiệm cho khách.

`RequireLogin` là một **layout route**: `pending → <State pending />`, `error →
<State error onRetry />`, chưa có session → `<Navigate to="/login" state={{returnTo}} />`,
còn lại → `<Outlet />`.

---

## 3. Tích Hợp Bản Đồ Tương Tác: MapLibre GL 5 (`map.tsx`)

Mô-đun bản đồ tại `frontend/src/app/map.tsx` được tối ưu hóa đặc biệt cho dữ liệu không gian cục bộ:

### 3.1. Đồng Bộ Hai Chiều Với Tham Số URL (Two-Way URL Sync)
- Khi người dùng di chuyển hoặc phóng to/thu nhỏ bản đồ, sự kiện `moveend` tính toán lại khung nhìn hình chữ nhật hiện tại (`bbox = west,south,east,north`) và cập nhật trực tiếp lên URL search params mà không làm reload trang.
- Ngược lại, khi người dùng mở một đường link có chứa sẵn `?bbox=...` hoặc chọn một quán cụ thể, bản đồ tự động căn giữa và bay (`map.flyTo`) tới tọa độ tương ứng.

### 3.2. Nguồn Dữ Liệu Bản Đồ (Tile & Vector Sources)
- **Lớp gạch raster nền:** Tải từ dịch vụ gạch bản đồ công cộng thông qua cấu hình `public/map/style.json`.
- **Lớp vector đường phố địa phương:** Nạp từ tệp nội bộ `public/map/region.geojson` (bao phủ trục đường chính quận Liên Chiểu).
- **Bộ ký tự phông chữ tiếng Việt:** Tải từ thư mục nội bộ `public/map/glyphs/Noto Sans Regular/{range}.pbf`, bảo đảm các nhãn đường và tên cơ sở tiếng Việt hiển thị sắc nét mà không bị lỗi font.

### 3.3. Tương Tác Marker & Popup
- Marker cơ sở có hình giọt nước đặc trưng với viền sáng tương phản cao (`--color-map-halo`).
- Khi được chọn hoặc hover từ danh sách, marker chuyển sang màu nhấn (`--color-accent`) kèm hiệu ứng xung lan tỏa (pulse animation).
- Bấm vào marker mở ra một popup card chứa ảnh đại diện của quán, tên cơ sở, địa chỉ và nút dẫn đường nhanh.
- **Màu overlay đã token hoá** (`--color-surface`, `--shadow-md`, `--color-overlay`) nên panel và popup theo đúng theme. Riêng nền bản đồ raster vẫn sáng ở cả hai theme vì chỉ có một nguồn tile.

---

## 4. Lưới Ảnh Thích Ứng Masonry (`masonry.tsx`, legacy)

> Màn hình Khám phá mới **không dùng** masonry — đó là lựa chọn có chủ đích để tránh mô
> phỏng Pinterest. `MasonryFeed` vẫn tồn tại cho `creator.tsx` và các màn hình legacy.

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

Ứng dụng sử dụng TanStack Query để quản lý toàn bộ vòng đời dữ liệu từ máy chủ. Toàn bộ
hook tập trung tại `lib/api/queries.ts`.

### 5.1. Định Danh Khóa Truy Vấn (Query Keys)

`queryKeys` là **hàm**, không phải hằng chuỗi, để không thể vô tình dùng lại key giữa hai
tham số khác nhau:

```ts
queryKeys.feed(params, userId)      → ["feed", params, userId]
queryKeys.places(params, userId)    → ["places", params, userId]
queryKeys.savedPlaces(params, userId)
queryKeys.place(id, userId)         → ["place", id, userId]
queryKeys.placeGallery(id, params)
queryKeys.photo(id, userId)  /  similarPhotos(id, userId)
queryKeys.post(id, userId)   /  posts(params)  /  savedPosts(userId)
queryKeys.map(params, bbox)  /  creator(id)  /  creatorPhotos(id, page)
```

**Vì sao có `userId` trong key:** nếu không, đăng xuất rồi đăng nhập tài khoản khác sẽ đọc
lại cache `is_saved` / `liked` của người trước. Đây là lỗi bảo mật đã được phòng ngừa.

### 5.2. Cập Nhật Lạc Quan (Optimistic Updates) & Làm Tươi Dữ Liệu (Invalidation)
- **Hành động Thích ảnh (Like):** Khi người dùng bấm nút tim, giao diện tăng ngay số đếm lượt thích và đổi màu icon trong vòng 0ms. Nếu yêu cầu mạng thất bại, trạng thái được tự động hoàn tác về trước đó.
- **Hành động Lưu quán (Bookmark):** Trạng thái nút Lưu thay đổi tức thời trên thẻ quán và tự động cập nhật danh sách tại trang `/saved`.
- **Hành động Nộp ảnh thành công:** Khi wizard gửi thành công, hệ thống tự động gọi `queryClient.invalidateQueries({ queryKey: ["feed"] })`, `["places"]` và `["me"]`, giúp ảnh mới xuất hiện ngay mà người dùng không cần tải lại trang.
- **Đăng nhập / đăng xuất:** `cache.clear()` rồi `setQueryData(["me"], user)`, tránh rò dữ liệu giữa hai phiên.

---

## 6. Bộ Kiểm Thử Frontend (Vitest Suite)

Frontend duy trì **61 bài kiểm thử tự động Vitest** trên 10 tệp tại thư mục `frontend/src/`:
- `src/app/access.test.tsx` (26 tests): Kiểm tra toàn diện phân quyền các màn hình, chuyển hướng khi chưa đăng nhập, bảo vệ cookie phiên.
- `src/app/accessibility.test.tsx` (6 tests): Kiểm tra trợ năng WCAG AA, điều hướng bằng bàn phím (Tab/Esc), thẻ ARIA và tỷ lệ tương phản màu sắc.
- `src/app/image_perf.test.tsx` (3 tests): Kiểm tra hiệu năng tải ảnh, cờ `loading="lazy"`, `decoding="async"` và độ ổn định layout.
- `src/app/forms_and_navigation.test.tsx` (4 tests): Kiểm tra tính hợp lệ của form nộp ảnh, giới hạn số file, xác nhận điều khoản sử dụng.
- `src/app/map.test.tsx` (3 tests): Kiểm tra `style.json` hợp lệ, xử lý tham số `bbox` trên URL.
- `src/app/shared.test.tsx` (5 tests): `Cover`, `ErrorText`, `State`, `ConfirmDialog`.
- `src/features/shell/TermsPage.test.tsx` (3 tests): Trang điều khoản sử dụng đọc được khi chưa có phiên.
- `src/features/contribute/CreateExperiencePage.test.tsx` (3 tests): Hai trạng thái định vị địa chỉ (thành công kèm tên nguồn, thất bại báo không có ghim).
- `src/lib/api/client.test.ts` (7 tests): Kiểm tra logic gửi kèm `X-CSRFToken` và chuẩn hoá lỗi.
- `src/components/ui/button.test.tsx` (1 test): Biến thể và `asChild`.

Chạy toàn bộ kiểm thử frontend:
```bash
./scripts/check.sh frontend
```
hoặc chạy trực tiếp qua Bun:
```bash
bun run --cwd frontend test
```

