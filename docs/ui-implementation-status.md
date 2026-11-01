# Rendez UI Implementation Status

> Cập nhật: sau khi hoàn tất redesign giao diện. Mọi trạng thái dưới đây đã được kiểm
> chứng bằng `bun run build`, `bun run test`, và kiểm tra DOM trực tiếp trên dev server.

---

## 1. Tổng quan

| Hạng mục | Trạng thái |
|---|---|
| Design system (token, typography, primitives) | ✅ Hoàn tất |
| Theme light / dark / system | ✅ Hoàn tất, có lưu lựa chọn |
| 12 màn hình mới | ✅ Hoàn tất |
| 4 màn hình legacy còn route | ⚠️ Chưa migrate |
| Responsive 5 kích thước | ✅ Không tràn ngang |
| Contrast WCAG AA | ✅ Đạt ở cả hai theme |
| Touch target 44px | ✅ Đạt trên `pointer: coarse` |
| Tài liệu | ✅ 4 tệp trong `docs/` |

---

## 2. Màn hình đã hoàn tất

| Màn hình | Route | Tệp | Ghi chú |
|---|---|---|---|
| Khám phá | `/discover` | `features/discovery/DiscoverPage.tsx` | Masthead biên tập, gợi ý chủ đề, hàng địa điểm tuyển chọn, danh mục |
| Tìm kiếm | `/search` | `features/search/SearchPage.tsx` | Ô tìm kiếm, chip danh mục, bộ lọc thuộc tính, sắp xếp, phân trang |
| Chi tiết địa điểm | `/places/:id` | `features/places/PlaceDetailPage.tsx` | Cover, thông tin, giờ mở cửa, thư viện ảnh, trải nghiệm cộng đồng, địa điểm liên quan |
| Chi tiết ảnh | `/photos/:id` | `features/experiences/PhotoDetailPage.tsx` | Ảnh lớn, like, bình luận, ảnh tương tự, quản lý ảnh của mình |
| Dòng trải nghiệm | `/posts` | `features/experiences/ExperiencesPage.tsx` | Công khai, cuộn tải thêm |
| Chi tiết trải nghiệm | `/posts/:id` | `features/experiences/PostDetailPage.tsx` | Công khai, media nhiều ảnh, like/lưu/chia sẻ, bình luận |
| Đã lưu | `/saved` | `features/saved/SavedPage.tsx` | Hai nhóm riêng: địa điểm (card) và trải nghiệm (hàng ngang) |
| Đăng trải nghiệm | `/create` | `features/contribute/CreateExperiencePage.tsx` | 3 bước, chọn địa điểm có tìm kiếm, geocode, ghim bản đồ, upload nhiều ảnh |
| Hồ sơ | `/profile` | `features/profile/ProfilePage.tsx` | Danh tính, thống kê, tab ảnh đã đăng / đã lưu |
| Cài đặt | `/settings` | `features/profile/SettingsPage.tsx` | Theme, tên hiển thị, mật khẩu, liên kết nội dung, đăng xuất có xác nhận |
| Đăng nhập | `/login` | `app/auth.tsx` | Bố cục bìa đôi, hiện/ẩn mật khẩu |
| Tạo tài khoản | `/register` | `app/auth.tsx` | Cùng component, thêm trường tên hiển thị |
| 404 | `*` | `features/shell/NotFoundPage.tsx` | Hai lối thoát thay vì chỉ lời xin lỗi |

---

## 3. Màn hình legacy còn sử dụng

| Màn hình | Route | Tệp | Vì sao chưa migrate |
|---|---|---|---|
| Bản đồ | `/map` | `app/map.tsx` | MapLibre + popup/rail riêng; màu đã token hoá nhưng markup chưa chuyển sang primitives |
| Hồ sơ tác giả | `/creators/:id` | `app/creator.tsx` | Không nằm trong 9 màn hình bắt buộc; vẫn dùng `.profile-header` legacy |
| Lịch sử đăng ảnh | `/submissions` | `app/contributions.tsx` | Luồng nộp ảnh cũ; `/create` đã thay thế về mặt chức năng |
| Nộp ảnh (cũ) | `/submissions/new` | `app/contributions.tsx` | Trùng chức năng với `/create` |
| Chi tiết lượt nộp | `/submissions/:id` | `app/contributions.tsx` | Chưa có thiết kế mới |

Các tệp **không còn được route**: `app/discovery.tsx`, `app/post_detail.tsx`,
`app/posts_feed.tsx`. Vẫn giữ vì test và `social.tsx` còn import.

---

## 4. Kiểm chứng đã thực sự chạy

### 4.1. Build & test

| Lệnh | Kết quả |
|---|---|
| `bun run typecheck` (`tsc -b`) | ✅ Không lỗi |
| `bun run test` (`vitest run`) | ✅ **61/61 test, 10/10 tệp** |
| `bun run build` (`tsc -b && vite build`) | ✅ Thành công, 1806 module |
| `bun run lint` (`eslint .`) | ✅ Không lỗi, không cảnh báo |
| `bun run format:check` (`prettier --check .`) | ✅ Toàn bộ tệp đúng chuẩn |
| `./scripts/check.sh all` | ✅ **9/9 PASS**, exit 0 (gồm ruff, ruff format, `makemigrations --check`, 222 test backend, `manage.py check`, lint, format, 61 test frontend, build) |
| `bunx playwright test` (toàn bộ e2e) | ✅ Xem mục 4.5 — 8 spec, tất cả pass |

Cảnh báo build còn lại (không phải lỗi):

- `maplibre-gl` chunk 1.05 MB — đã lazy-load, chỉ tải khi mở `/map`.
- Vài comment `@__PURE__` trong `zod` mà Rollup không đọc được vị trí.

### 4.2. Kiểm tra DOM trên dev server

Chạy Playwright trực tiếp trên `http://127.0.0.1:5173` với backend thật, session hợp lệ.

**Không tràn ngang** — 11 route × 5 viewport (1440×900, 1280×800, 768×1024, 390×844,
360×800) × 2 theme:

```
problems: 0
```

**Contrast, dark-mode leak, touch target** — 8 route × 2 theme, tại 1440px và 390px:

```
OK  light /discover          OK  dark /discover
OK  light /search?q=cafe     OK  dark /search?q=cafe
OK  light /places/:id        OK  dark /places/:id
OK  light /posts/:id         OK  dark /posts/:id
OK  light /saved             OK  dark /saved
OK  light /create            OK  dark /create
OK  light /profile           OK  dark /profile
OK  light /settings          OK  dark /settings
```

**Trang công khai** — `/login`, `/register`, 404 ở 1440px và 390px, cả hai theme: không
tràn ngang, không rò màu sáng ở dark mode. Nút hiện/ẩn mật khẩu có `textContent` rỗng và
`aria-pressed="false"` (đúng như `e2e/access.spec.ts` yêu cầu).

### 4.3. Lỗi đã tìm thấy và đã sửa trong quá trình kiểm chứng

Sáu lỗi thật, không phải giả định:

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Tràn ngang 23px ở mọi viewport trên `/discover` | `.place-card__body` là flex column `align-items: flex-start`, nên `.place-card__meta` co theo `max-content`; địa chỉ dài làm rộng cả trang | Thêm `max-width: 100%` cho `.place-card__meta` và `.place-card__body > *`, `overflow-wrap: anywhere` cho tiêu đề |
| Chữ phụ chỉ đạt 3.9–4.2:1 (dưới 4.5:1) | `--color-foreground-muted: #777d75` quá nhạt trên nền `#f7f6f1` | Đổi sang `#5f665f` (5.46:1 trên nền, 5.91:1 trên trắng) |
| Chữ trắng trên nền accent chỉ 2.8:1 | `.shell-create` và `.btn--accent` dùng `color: #fff` trên `#f0784b` | Thêm token `--color-on-accent` (`#202923` ở light, `#10201a` ở dark) → 5.34:1 |
| Touch target 42px thay vì 44px | Rule 44px trong `globals.css` dùng `:where()` (specificity 0) nên `.shell-nav__link { min-height: 42px }` luôn thắng | Đổi sang `:root :is(…)` để thắng mọi rule một class, và liệt kê đầy đủ control |
| Badge success/warning dưới 4.5:1 | `color-mix(…, transparent)` tạo nền quá nhạt so với màu chữ | Thêm token `--color-success-soft` / `--color-warning-soft` và dùng trực tiếp |
| Nút trong panel kết quả `/map` tràn 350px ở viewport 360px | `.btn` là `inline-flex` với `white-space` mặc định, nhãn dài "Khám phá các quán tại khu vực Liên Chiểu" không co được trong panel rộng 328px | `.map-results .btn { max-width: 100%; white-space: normal; line-height: 1.3 }` |

Hai lỗi hành vi phát hiện sau đó, khi chạy lại `e2e/visual.spec.ts`:

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `/search` không phân trang được | `SearchPage` không bao giờ gửi `?page=`; backend trả `page_size=20` nên kết quả từ trang 2 trở đi không thể truy cập | Đọc `page` từ URL, ghép vào query của `usePlaces`, thêm `goToPage()` và `<nav class="pagination">` (chỉ hiện khi có `next` hoặc `previous`) |
| "Quay lại" từ trang ảnh rơi về `/discover` thay vì về địa điểm | `PhotoDetailPage` đọc `location.state.from` nhưng link trong `PlaceGallery` không truyền `state` | `PlaceGallery` và `ExperienceTile` nhận `from` và truyền `state={{ from }}`; `PlaceDetailPage` truyền `location.pathname` |

Ngoài ra `--color-accent` không thể dùng làm **màu chữ** (2.5:1 trên nền soft của chính
nó), nên đã tách `--color-accent-ink` (`#b34c25` light / `#ffa886` dark) cho badge và chip
accent.

### 4.4. Lỗi lint phát hiện bởi `scripts/check.sh all` và đã sửa

Lần chạy gate đầu tiên **thất bại** ở `frontend-lint` và `frontend-format`. Đây là các lỗi
thật, đã sửa và đã chạy lại:

| Tệp | Lỗi | Cách sửa |
|---|---|---|
| `features/search/SearchPage.tsx` | `react-hooks/set-state-in-effect` — đồng bộ `draft` với `filters.q` trong `useEffect` | Chuyển sang pattern "derive state during render" của React: so sánh với `syncedQuery` và `setDraft` ngay trong thân render |
| `features/contribute/CreateExperiencePage.tsx` | 3 × `set-state-in-effect` — mặc định category, reset geocode, và `FilePreview` tạo object URL trong effect | Category suy ra bằng biến `categorySlug`; geocode chỉ `setState` trong callback async và dùng `geocodeView` để suy ra trạng thái rỗng; `FilePreview` dùng `useMemo` cho object URL và chỉ revoke trong cleanup |
| `features/experiences/PhotoDetailPage.tsx` | `@typescript-eslint/no-unused-vars` — `Bookmark` import không dùng | Xoá import |
| 21 tệp | Prettier sai định dạng | `prettier --write` |

Hai thay đổi hành vi (SearchPage, CreateExperiencePage) đã được kiểm chứng lại bằng
Playwright trên dev server thật, không chỉ dựa vào việc lint qua:

```json
{
  "searchUrlAfterTyping": "?q=c%C3%A0+ph%C3%AA",
  "searchInputAfterExternalChange": "ban cong",
  "searchUrlAfterClear": "",
  "categoryValue": "cafe",
  "categoryOptions": 6,
  "geocodeNote": "Đã định vị: Đường Phạm Như Xương, Phường Liên Chiểu, Thành phố Đà Nẵng, 51000, Việt Nam — Nguồn: OpenStreetMap",
  "consoleErrors": []
}
```

Và `FilePreview` sau khi đổi sang `useMemo`:

```json
{ "previewTag": "IMG", "previewSrcScheme": "blob", "skeletonCount": 0, "fileCountText": "Đã chọn 1/5 ảnh." }
```

### 4.5. E2E Playwright

Chạy `bunx playwright test` (backend E2E trên `:8001`, Vite trên `:5174`, `workers: 1`):

| Spec | Kết quả |
|---|---|
| `access.spec.ts` | ✅ 2/2 |
| `guest_flows.spec.ts` | ✅ 2/2 |
| `auth_post_lifecycle.spec.ts` | ✅ 2/2 |
| `smoke_e2e_foundation.spec.ts` | ✅ 6/6 |
| `social_e2e.spec.ts` | ✅ 2/2 |
| `coffee_discovery_verify.spec.ts` | ✅ 3/3 |
| `pinterest.spec.ts` | ✅ 1/1 |
| `visual.spec.ts` | ✅ 11/11 |

Ba spec được viết lại hoàn toàn theo UI mới: `visual.spec.ts`, `pinterest.spec.ts`,
`coffee_discovery_verify.spec.ts`. `visual.spec.ts` chạy hành trình
`/discover → /places/:id → /photos/:id → Quay lại` ở cả 4 viewport 360/390/768/1440.

`smoke_e2e_foundation.spec.ts` từng assert `"Trình Cà Phê"` trên `/discover`. Assertion đó
phụ thuộc thứ tự: `/discover` chỉ hiển thị 8 địa điểm mới nhất, và chính `visual.spec.ts`
tạo thêm địa điểm mỗi lần chạy nên dataset thật bị đẩy ra khỏi trang đầu. Đã đổi sang kiểm
tra qua `/search`, nơi kết quả không phụ thuộc thứ tự thời gian.

---

## 5. Việc còn lại (nợ kỹ thuật đã biết)

| # | Việc | Mức độ |
|---|---|---|
| 1 | `e2e/visual.spec.ts` và `e2e/pinterest.spec.ts` đã được viết lại theo UI mới và **pass toàn bộ** (`visual` 11/11, `pinterest` 1/1). `e2e/coffee_discovery_verify.spec.ts` cũng đã viết lại và pass 3/3, nhưng phụ thuộc `data/danang.json` — môi trường E2E seed bằng `import_danang` nên chỉ pass khi seed đó chạy. | Đã xong |
| 2 | Migrate `app/map.tsx` sang primitives | Trung bình |
| 3 | Migrate `app/creator.tsx` và `app/contributions.tsx` | Trung bình |
| 4 | Xoá `app/discovery.tsx`, `app/post_detail.tsx`, `app/posts_feed.tsx` sau khi migrate test tương ứng | Thấp |
| 5 | Rút gọn `components.css` / `layout.css` / `theme.css` khi consumer cuối cùng migrate xong | Thấp |
| 6 | Bundle font Plus Jakarta Sans + Instrument Serif (cần tệp font, hiện không có) | Thấp |
| 7 | Basemap tối cho `/map` (cần nguồn tile khác) | Thấp |
| 8 | `tailwind-merge` không còn dùng — chỉ xoá khi có quyết định về dependency | Thấp |

---

## 6. Cách chạy lại kiểm chứng

```bash
# 1. Build + test
cd frontend
bun run typecheck
bun run test
bun run build

# 2. Dev server (hai terminal)
make backend     # Django :8000
make frontend    # Vite :5173

# 3. Kiểm tra toàn bộ (backend + frontend), ~4–5 phút
./scripts/check.sh all
```
