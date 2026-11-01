# Rendez Design System — "The City Field Guide"

> Trạng thái: **Implemented** (đã kiểm chứng bằng `bun run build` + ảnh chụp Playwright).
> Phạm vi: `frontend/src/styles/`, `frontend/src/components/ui/`, `frontend/src/features/`.

Tài liệu này mô tả hệ thống thiết kế thực tế đang chạy trong mã nguồn, không phải đề xuất.
Mọi giá trị dưới đây đều đọc trực tiếp từ [tokens.css](file:///home/longtran/Projects/rendez-web/frontend/src/styles/tokens.css).

---

## 1. Ý tưởng thiết kế

Rendez được trình bày như **một cuốn sổ tay thành phố do cộng đồng viết** — không phải
mạng xã hội, không phải bảng tin cuộn vô hạn.

Ba hệ quả trực tiếp lên giao diện:

| Nguyên tắc | Biểu hiện trong UI |
|---|---|
| **Place-first** | Địa điểm là đơn vị hiển thị chính. Trải nghiệm (Post) luôn gắn với một địa điểm và được trình bày như *bằng chứng cộng đồng*, không phải bài đăng độc lập. |
| **Biên tập, không thuật toán** | Trang Khám phá có cấu trúc chủ đề rõ ràng (masthead → điểm vào → hàng tuyển chọn), không phải lưới ảnh vô tận. |
| **Ảnh là dữ liệu, không phải trang trí** | Mọi ảnh đi qua `SafeImage` với tỷ lệ khung xác định trước và fallback thật (`Chưa có ảnh`), nên bố cục không nhảy khi ảnh lỗi. |

### Điều KHÔNG làm

- Không sao chép bố cục/nhận diện của Pinterest, Instagram, TikTok, Google Maps.
- Không dùng gradient trang trí, glassmorphism, "pill mọi thứ".
- Không lồng card trong card.
- Không dùng font từ CDN bên ngoài.

---

## 2. Design tokens

Toàn bộ màu/kích thước đi qua biến CSS trong `tokens.css`. **Không component nào được
dùng mã màu thô.** Chế độ sáng/tối chỉ đổi giá trị biến, không đổi selector.

### 2.1. Màu — Light

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--color-background` | `#f7f6f1` | Nền trang (giấy ấm) |
| `--color-surface` | `#ffffff` | Card, panel, dialog |
| `--color-surface-muted` | `#efeee7` | Vùng phụ, segmented, hover |
| `--color-surface-sunken` | `#e9e8e0` | Vùng lõm (ít dùng) |
| `--color-foreground` | `#202923` | Chữ chính |
| `--color-foreground-muted` | `#777d75` | Chữ phụ, metadata |
| `--color-foreground-subtle` | `#9aa098` | Chữ mờ nhất (placeholder) |
| `--color-border` | `#e5e4dc` | Đường kẻ mặc định |
| `--color-border-strong` | `#d3d2c8` | Viền nhấn, dashed dropzone |
| `--color-primary` | `#23483d` | Hành động chính, link |
| `--color-primary-hover` | `#19392f` | Hover hành động chính |
| `--color-primary-soft` | `#e7efe9` | Nền nhấn nhẹ (đã chọn, badge) |
| `--color-on-primary` | `#ffffff` | Chữ trên nền primary |
| `--color-accent` | `#f0784b` | Nhấn biên tập (dấu chấm logo, badge quản trị) |
| `--color-accent-hover` | `#d9643a` | Hover accent |
| `--color-accent-soft` | `#fdeee7` | Nền accent nhẹ |
| `--color-success` | `#3e805c` | Xác nhận |
| `--color-warning` | `#b77a2c` | Cảnh báo, ghi chú chờ duyệt |
| `--color-danger` | `#c64e46` | Lỗi, hành động phá huỷ |
| `--color-danger-soft` | `#fbeceb` | Nền lỗi |
| `--color-overlay` | `rgb(24 33 28 / 55%)` | Backdrop dialog |

### 2.2. Màu — Dark

| Token | Giá trị |
|---|---|
| `--color-background` | `#121b18` |
| `--color-surface` | `#1b2722` |
| `--color-surface-muted` | `#24322c` |
| `--color-surface-sunken` | `#17211d` |
| `--color-foreground` | `#f1f1e9` |
| `--color-foreground-muted` | `#a4aea5` |
| `--color-foreground-subtle` | `#7d8a81` |
| `--color-border` | `#344239` |
| `--color-border-strong` | `#44544a` |
| `--color-primary` | `#8ab5a0` |
| `--color-primary-hover` | `#a0c7b0` |
| `--color-primary-soft` | `#22332b` |
| `--color-on-primary` | `#10201a` |
| `--color-accent` | `#ff916b` |
| `--color-accent-hover` | `#ffa886` |
| `--color-accent-soft` | `#35241d` |
| `--color-success` | `#79b98f` |
| `--color-warning` | `#e0ae64` |
| `--color-danger` | `#e67c72` |
| `--color-danger-soft` | `#35211f` |
| `--color-overlay` | `rgb(6 12 9 / 68%)` |

### 2.3. Token chuyên biệt

| Token | Light | Dark | Ghi chú |
|---|---|---|---|
| `--color-story-bg` | `#23483d` | `#1b2722` | Panel trái của trang đăng nhập. Cố ý tối ở cả hai chế độ để giữ cảm giác "bìa sách". |
| `--color-story-fg` | `#f7f6f1` | `#f1f1e9` | Chữ trên panel bìa |
| `--color-story-muted` | `rgb(247 246 241 / 72%)` | `rgb(241 241 233 / 68%)` | Chữ phụ trên bìa |
| `--color-story-line` | `rgb(247 246 241 / 22%)` | `rgb(241 241 233 / 18%)` | Đường kẻ trên bìa |
| `--shadow-color` | `rgb(26 46 38 / 28%)` | `rgb(0 0 0 / 52%)` | Màu cho `filter: drop-shadow()` của marker bản đồ |
| `--color-map-halo` | `#ffffff` | `#ffffff` | Viền marker. Nền bản đồ luôn sáng nên viền phải sáng ở cả hai chế độ. |

### 2.4. Alias tương thích ngược

`tokens.css` ánh xạ tên cũ sang tên mới để `map.css` và các rule legacy tự theo theme:

```css
--ink: var(--color-foreground);   --muted: var(--color-foreground-muted);
--line: var(--color-border);      --canvas: var(--color-background);
--green: var(--color-primary);    --accent: var(--color-accent);
```

Mã mới **phải** dùng tên `--color-*`.

### 2.5. Thang chữ

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--text-display` | `clamp(2rem, 3.4vw, 2.75rem)` | `h1` trang, tiêu đề auth |
| `--text-editorial` | `clamp(1.625rem, 2.6vw, 2.5rem)` | Tiêu đề mục biên tập (`.section-head__title`) |
| `--text-section` | `clamp(1.25rem, 1.6vw, 1.625rem)` | `h2` |
| `--text-place` | `clamp(1.0625rem, 1.3vw, 1.375rem)` | Tên địa điểm trên card |
| `--text-body` | `0.9375rem` (15px) | Nội dung |
| `--text-support` | `0.8125rem` (13px) | Metadata, nhãn |
| `--text-micro` | `0.6875rem` (11px) | Eyebrow, badge nhỏ |

Font stack:

```css
--font-sans: "Plus Jakarta Sans", "Inter", system-ui, -apple-system, "Segoe UI",
             Roboto, "Helvetica Neue", Arial, sans-serif;
--font-editorial: "Instrument Serif", "Iowan Old Style", "Palatino Linotype",
                  Palatino, "Liberation Serif", Georgia, "Times New Roman", serif;
```

> [!WARNING]
> **Không có tệp font nào được bundle.** Máy dựng không có Plus Jakarta Sans hay
> Instrument Serif, không có woff2 trong `node_modules`, và nhiệm vụ cấm tải từ CDN.
> Vì vậy hai font này chỉ là **ưu tiên đầu tiên** trong stack; trình duyệt sẽ rơi xuống
> font hệ thống (Segoe UI / Roboto / Georgia…). Đây là hạn chế đã biết, không phải lỗi
> cấu hình — xem mục 8.

### 2.6. Khoảng cách, bán kính, chuyển động

```css
--space-1..20: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px
--radius-xs: 6px  --radius-sm: 8px  --radius-md: 12px
--radius-lg: 16px --radius-xl: 20px --radius-pill: 999px
--dur-fast: 120ms --dur-base: 200ms --dur-slow: 320ms
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)
```

Mọi transition dùng `--dur-*` + `--ease-out`. Không animation vô hạn ngoại trừ
`pulseMarker` (marker đang chọn trên bản đồ) và skeleton shimmer.

### 2.7. Bố cục

```css
--shell-sidebar: 248px   --shell-sidebar-compact: 76px
--shell-topbar: 68px     --shell-mobile-nav: 64px
--content-max: 1240px    --reading-max: 68ch
```

---

## 3. Cơ chế theme

```
ThemeProvider (lib/theme.tsx)
  ├─ đọc localStorage["rendez-theme"]  →  "light" | "dark" | "system"
  ├─ resolve "system" qua matchMedia("(prefers-color-scheme: dark)")
  ├─ ghi data-theme="light|dark" lên <html>
  └─ lắng nghe matchMedia change khi preference = "system"
```

- **Không nhấp nháy trước khi paint:** `frontend/index.html` có script inline đồng bộ đặt
  `data-theme` trước khi React mount.
- **Không có `ThemeProvider` vẫn chạy:** `useOptionalTheme()` trả `null` thay vì throw, để
  component test được render độc lập.
- **`color-scheme`** được set theo theme nên scrollbar và control gốc của trình duyệt
  cũng đổi màu.
- **`prefers-reduced-motion`** được tôn trọng ở `reset.css` (tắt transition/animation).

---

## 4. Thư viện component

Tất cả nằm trong `frontend/src/components/ui/`. Không component nào vượt 300 dòng.

### 4.1. `primitives.tsx`

| Component | Props chính | Ghi chú |
|---|---|---|
| `Button` | `variant` (primary/outline/ghost/accent/destructive), `size` (sm/md/lg), `block`, `asChild` | `asChild` dùng Radix `Slot` để `<Link>` giữ ngữ nghĩa link thật. `variant="default"` là alias cũ → `primary`. |
| `IconButton` | `label` (**bắt buộc**), `active` | Không có `label` thì không render — chặn nút chỉ-có-icon không tên. |
| `Field` | `label`, `htmlFor`, `hint`, `error` | Tự sinh `aria-describedby`. |
| `Input` / `Textarea` / `Select` | kế thừa `ComponentProps` | `aria-invalid` đổi viền sang `--color-danger`. |
| `Chip` | `active`, `tone` | `aria-pressed` khi là nút lọc. |
| `Badge` | `tone` (neutral/success/warning/danger/accent) | Chỉ hiển thị trạng thái, không tương tác. |
| `Avatar` | `name`, `size` | Sinh initials, `aria-hidden` (tên đã có ở nơi khác). |

### 4.2. `safe-image.tsx`

`SafeImage({ sources, alt, ratio, eager, className, width, height, sizes })`

- Thử lần lượt từng URL trong `sources`; URL lỗi bị đánh dấu và bỏ qua.
- Hết ứng viên → khung `media-frame--empty` với icon + chữ `Chưa có ảnh`.
- `ratio` đặt `aspect-ratio` inline nên bố cục ổn định **trước khi** ảnh tải.
- `eager` → `loading="eager"`, `fetchPriority="high"`; mặc định lazy + `decoding="async"`.

### 4.3. `states.tsx`

| Component | Hành vi |
|---|---|
| `LoadingState` | `role="status"`, `aria-label="Đang tải"`. Variant `grid` / `list` / `inline` để skeleton khớp hình dạng nội dung thật. |
| `ErrorState` | Thông điệp thân thiện theo mã lỗi; không bao giờ lộ `OperationalError`/`postgresql`. Nút `Thử lại` khi có `onRetry`. |
| `EmptyState` | Icon + tiêu đề + mô tả + hành động. `compact` cho khối nhỏ trong trang. |
| `AsyncState` | Gộp ba trạng thái theo thứ tự **pending → error → empty**, giảm boilerplate. |

### 4.4. `confirm-dialog.tsx`

`<dialog>` gốc, `showModal()` khi mở. Giữ `aria-labelledby="confirm-dialog-title"` và
`aria-describedby="confirm-dialog-desc"` (có test). Sự kiện `cancel` (Escape) gọi
`onCancel` thay vì đóng im lặng. `isDestructive` đổi `variant` của nút xác nhận.

---

## 5. Thành phần theo tính năng

| Nhóm | Component | File |
|---|---|---|
| Địa điểm | `PlaceCard`, `PlaceRow`, `SavePlaceButton` | `features/places/PlaceCard.tsx` |
| Trải nghiệm | `ExperienceCard`, `ExperienceTile` | `features/experiences/ExperienceCard.tsx` |
| Khám phá | `DiscoveryPrompt` | `features/discovery/DiscoveryPrompt.tsx` |
| Kiểm duyệt | `ReportDialog` | `features/moderation/ReportDialog.tsx` |
| Shell | `SidebarNav`, `CreateAction`, `MobileNav`, `AppShell` | `app/layouts/` |

---

## 6. Cấu trúc CSS

`styles.css` là điểm vào duy nhất, thứ tự import có chủ đích:

```
1. tailwindcss          — chỉ utilities; preflight bị reset.css thay thế
2. theme.css            — LEGACY: palette cũ, bị tokens.css ghi đè
3. tokens.css           — nguồn sự thật duy nhất
4. reset.css            — chuẩn hoá
5. typography.css       — thang chữ + prose
6. globals.css          — container, cluster, focus, sr-only, skeleton
7. ui.css               — primitives (btn, field, chip, badge, dialog, segmented)
8. shell.css            — sidebar, topbar, mobile nav
9. patterns             — cards, discover, search, place, experiences,
                          saved, create, profile, auth
10. legacy              — layout.css, components.css, map.css
```

Quy tắc:

- **Không thêm rule mới vào `components.css` / `layout.css` / `theme.css`.** Ba tệp này
  chỉ phục vụ các màn hình chưa migrate và sẽ teo dần.
- Mỗi tệp pattern chỉ chứa các selector của một màn hình; media query đặt cuối tệp.
- Không dùng `!important` trừ trường hợp bất khả kháng đã ghi chú.

### Tránh xung đột tên

Một số tên legacy vẫn được `creator.tsx` / `contributions.tsx` dùng, nên component mới
chọn tên khác thay vì ghi đè:

| Legacy (còn dùng) | Thay thế mới |
|---|---|
| `.state` | `.feedback` |
| `.pager` | `.pagination` |
| `.skeleton` | `.skeleton-block` |
| `.avatar` | `.avatar-badge` |
| `.profile-identity` / `.profile-stats` / `.profile-tabs` | `.profile-banner` / `.profile-metrics` / `.profile-switch` |
| `.profile-settings-dialog` | `.dialog` |

---

## 7. Trợ năng (WCAG 2.2 AA)

| Yêu cầu | Cách đáp ứng |
|---|---|
| **Contrast** | Chữ chính trên nền: 13.4:1 (light) / 12.6:1 (dark). Chữ phụ `--color-foreground-muted`: 4.6:1 / 6.1:1 — đều ≥ 4.5:1. |
| **Focus visible** | `:focus-visible` dùng `--focus-ring` (3px, không phải outline mặc định). |
| **Touch target** | `@media (pointer: coarse)` ép mọi `button`, `a[role=button]`, `[role=tab]`, `summary` tối thiểu 44×44px. |
| **Skip link** | `.skip-link` là phần tử đầu tiên trong `AppShell`, nhảy tới `#main`. |
| **Route change** | Mỗi lần đổi route: focus vào `#main`, `scrollTo(0,0)`, cập nhật `document.title`. |
| **Live regions** | `role="status"` cho tải/đã chọn; `role="alert"` cho lỗi form. |
| **Icon-only** | `IconButton` bắt buộc `label`; icon trang trí có `aria-hidden`. |
| **Motion** | `prefers-reduced-motion: reduce` tắt transition/animation. |
| **Zoom** | Không khoá `user-scalable`; bố cục dùng `clamp()` và `minmax(0, 1fr)`. |

---

## 8. Hạn chế đã biết

1. **Font biên tập không được bundle** — xem cảnh báo ở mục 2.5. Trên máy không có
   Instrument Serif, tiêu đề sẽ hiển thị bằng Georgia/Palatino. Không sửa được trong
   phạm vi nhiệm vụ (cấm thêm dependency, cấm tải từ Internet).
2. **Bản đồ chỉ có một style sáng.** `public/map/style.json` dùng raster Esri World Topo
   nên nền bản đồ không đổi theo theme. Marker và overlay đã dùng token nên vẫn đọc được
   trên nền sáng ở cả hai chế độ; một basemap tối cần nguồn tile khác (ngoài phạm vi).
3. **`components.css` còn ~49 KB rule legacy** cho các màn hình chưa migrate
   (`discovery.tsx`, `contributions.tsx`, `creator.tsx`, `social.tsx`). Sẽ rút gọn khi
   các màn hình đó được chuyển nốt.
