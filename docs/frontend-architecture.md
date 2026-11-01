# Rendez Frontend Architecture

> Trạng thái: **Implemented**. Mọi khẳng định dưới đây đọc từ mã nguồn hiện tại.
> Tài liệu liên quan: [design-system.md](file:///home/longtran/Projects/rendez-web/docs/design-system.md),
> [ui-route-map.md](file:///home/longtran/Projects/rendez-web/docs/ui-route-map.md),
> [ui-implementation-status.md](file:///home/longtran/Projects/rendez-web/docs/ui-implementation-status.md).

---

## 1. Stack

| Thành phần | Phiên bản | Vai trò |
|---|---|---|
| React | 19.2 | UI runtime |
| TypeScript | 5.9 (`strict`) | Kiểu tĩnh, không `any` trong mã mới |
| Vite | 7.3 | Dev server + build |
| Bun | 1.3 | Package manager + script runner |
| React Router | 7.9 | Định tuyến (data-router API qua `<Routes>`) |
| TanStack Query | 5.90 | Server state, cache, invalidation |
| MapLibre GL + react-map-gl | 5 / 8 | Bản đồ (lazy-loaded) |
| Tailwind CSS | 4.1 | **Chỉ utilities**; phần lớn UI là CSS viết tay |
| class-variance-authority + clsx | — | Biến thể component |
| lucide-react | — | Icon |
| react-hook-form + zod | — | Form + validation |
| Vitest + Testing Library | 3.2 | Unit/behavior test (61 test) |
| Playwright | 1.56 | E2E |

Không có dependency mới nào được thêm trong quá trình redesign.

---

## 2. Cấu trúc thư mục

```
frontend/src/
├── app/                        # Định tuyến + các màn hình legacy
│   ├── App.tsx                 # Cây route duy nhất
│   ├── auth.tsx                # Login/Register (đã redesign)
│   ├── layouts/
│   │   ├── AppShell.tsx        # Layout route: sidebar + topbar + <Outlet/>
│   │   └── nav.tsx             # SidebarNav, CreateAction, MobileNav
│   ├── discovery.tsx           # LEGACY — không còn được route
│   ├── contributions.tsx       # LEGACY — vẫn route /submissions*
│   ├── creator.tsx             # LEGACY — vẫn route /creators/:id
│   ├── map.tsx                 # Bản đồ (lazy)
│   ├── social.tsx              # LEGACY — CommentSection, LikeButton
│   ├── shared.tsx              # Re-export session + Cover/State/ErrorText legacy
│   ├── masonry.tsx             # LEGACY — MasonryFeed
│   ├── post_detail.tsx         # LEGACY — không còn được route
│   └── posts_feed.tsx          # LEGACY — không còn được route
│
├── components/ui/              # Primitives dùng chung
│   ├── button.tsx              # Button (CVA)
│   ├── primitives.tsx          # IconButton, Field, Input, Chip, Badge, Avatar…
│   ├── safe-image.tsx          # Ảnh có fallback + tỷ lệ cố định
│   ├── states.tsx              # Loading / Error / Empty / AsyncState
│   └── confirm-dialog.tsx      # <dialog> xác nhận
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
│   │   ├── client.ts           # fetch wrapper: CSRF, credentials, lỗi chuẩn hoá
│   │   ├── queries.ts          # queryKeys + toàn bộ hook useQuery/useMutation
│   │   ├── types.ts            # Kiểu viết tay cho phần OpenAPI chưa mô tả
│   │   └── generated.d.ts      # Sinh từ backend/openapi.yaml
│   ├── session.tsx             # useMe, useLogout, sanitizeReturnTo (nguồn duy nhất)
│   ├── theme.tsx               # ThemeProvider, useTheme, useOptionalTheme
│   └── format.ts               # formatRelative, shortAddress, …
│
├── styles/                     # Xem design-system.md §6
└── main.tsx                    # Entry: QueryClientProvider + ThemeProvider + BrowserRouter
```

### Quy tắc phụ thuộc

```
lib  ←  components/ui  ←  features  ←  app
```

- `lib` không import từ `features` hay `app`.
- `components/ui` không import từ `features`.
- `features` **được phép** import `app/shared` (để lấy `useMe`) — ngoại lệ có chủ đích,
  ghi chú trong `features/profile/ProfilePage.tsx`.
- `app` là nơi duy nhất biết toàn bộ cây route.

---

## 3. Định tuyến

`app/App.tsx` là nguồn sự thật duy nhất. Cấu trúc lồng nhau phản ánh **quyền truy cập
thật của backend**, không phải sở thích:

```tsx
<Route path="/" element={<Navigate to="/discover" replace />} />
<Route path="login"    element={<Auth key="login" />} />
<Route path="register" element={<Auth key="register" register />} />

<Route element={<AppShell />}>          {/* layout route, render <Outlet/> */}
  <Route path="posts"     element={<ExperiencesPage />} />   {/* AllowAny */}
  <Route path="posts/:id" element={<PostDetailPage />} />    {/* AllowAny */}

  <Route element={<RequireLogin />}>                        {/* IsAuthenticated */}
    <Route path="discover" … /> <Route path="search" … /> <Route path="map" … />
    <Route path="places/:id" … /> <Route path="photos/:id" … />
    <Route path="creators/:id" … /> <Route path="saved" … /> <Route path="create" … />
    <Route path="profile" … /> <Route path="settings" … />
    <Route path="submissions*" … />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Route>
```

**Vì sao `posts` nằm ngoài `RequireLogin`:** backend khai báo `AllowAny` cho
`/api/v1/posts/` và `/api/v1/posts/{id}/`. Chặn ở frontend sẽ mâu thuẫn với hợp đồng API
và làm mất khả năng chia sẻ link trải nghiệm cho khách.

**`RequireLogin`** là một layout route: `pending → <State pending />`, `error →
<State error onRetry />`, không có dữ liệu → `<Navigate to="/login" state={{returnTo}} />`,
còn lại → `<Outlet />`.

Chi tiết từng route (endpoint, quyền, trạng thái) ở
[ui-route-map.md](file:///home/longtran/Projects/rendez-web/docs/ui-route-map.md).

---

## 4. Tầng dữ liệu

### 4.1. `lib/api/client.ts`

- Tự lấy CSRF token từ `/api/v1/auth/csrf/` và gắn `X-CSRFToken` cho method không an toàn.
- `credentials: "include"` cho session cookie.
- Chuẩn hoá lỗi backend `{code, message, fields, request_id}` thành `ApiError` có
  `message` đọc được; **không bao giờ** để lộ chuỗi lỗi nội bộ ra UI.
- `fields` lồng nhau được làm phẳng (không hiện `[object Object]`).

### 4.2. `lib/api/queries.ts`

Toàn bộ hook server-state tập trung ở đây. `queryKeys` là hàm, không phải hằng chuỗi, để
không thể vô tình dùng lại key giữa hai tham số khác nhau:

```ts
queryKeys.feed(params, userId)      → ["feed", params, userId]
queryKeys.places(params, userId)    → ["places", params, userId]
queryKeys.savedPlaces(params, userId)
queryKeys.place(id, userId)         → ["place", id, userId]
queryKeys.post(id, userId)          → ["post", id, userId]
queryKeys.savedPosts(userId)
queryKeys.map(params, bbox)
queryKeys.creator(id) / creatorPhotos(id, page)
```

**Vì sao có `userId` trong key:** nếu không, đăng xuất rồi đăng nhập tài khoản khác sẽ đọc
lại cache `is_saved`/`liked` của người trước. Đây là lỗi bảo mật đã được phòng ngừa.

### 4.3. Chiến lược cache

| Hành động | Cập nhật |
|---|---|
| Lưu/bỏ lưu địa điểm | Optimistic `setQueryData` trên `["place", id, userId]`; rollback `onError`; invalidate `places`, `saved-places`, `feed`, `map`, `me` |
| Thích ảnh | Optimistic count + `liked`; rollback khi lỗi |
| Gửi ảnh thành công | `invalidateQueries(["feed"])`, `["places"]`, `["me"]` |
| Đăng nhập/xuất | `cache.clear()` rồi `setQueryData(["me"], user)` |

`staleTime` mặc định 30s; dữ liệu danh mục/thuộc tính 5 phút (gần như tĩnh).

---

## 5. Session & theme

### `lib/session.tsx`

Nguồn duy nhất cho `useMe`, `useLogout`, `sanitizeReturnTo`.

`app/shared.tsx` **re-export** các hàm này:

```ts
import { useMe, useLogout, sanitizeReturnTo } from "../lib/session";
export { useMe, useLogout, sanitizeReturnTo };
```

Dùng `import` + `export` (không phải `export … from`) vì `shared.tsx` cũng tự gọi `useMe()`.
Nhờ vậy 4 tệp test `vi.mock("./shared")` vẫn chạy mà không phải sửa.

`sanitizeReturnTo` chặn: URL tuyệt đối, `//evil.com`, backslash, `javascript:`, và vòng lặp
`/login*` `/register*`. Giữ nguyên `/discover`, `/saved?category=cafe#top`, `/places/...`.

### `lib/theme.tsx`

- `ThemeProvider` giữ preference `light | dark | system` trong `localStorage["rendez-theme"]`.
- `useTheme()` throw nếu thiếu provider (dùng trong Settings, nơi provider luôn tồn tại).
- `useOptionalTheme()` trả `null` — dùng trong `AppShell` để component test được render
  độc lập mà không cần provider.

---

## 6. Chiến lược styling

**Không dùng Tailwind làm hệ thống chính.** Tailwind được import để giữ utility cho vài
chỗ legacy, nhưng preflight của nó bị `reset.css` thay thế và ~95% UI là CSS viết tay
dùng design token.

Lý do: token hoá màu/theme bằng biến CSS rõ ràng hơn hàng trăm utility class, và tránh
phải viết `dark:` ở mọi nơi.

Quy ước đặt tên: BEM rút gọn (`block__element--modifier`), không lồng quá 2 cấp.

---

## 7. Trạng thái migrate

| Màn hình | Nguồn hiện tại | Trạng thái |
|---|---|---|
| Discover | `features/discovery/DiscoverPage.tsx` | ✅ Mới |
| Search | `features/search/SearchPage.tsx` | ✅ Mới |
| Place detail | `features/places/PlaceDetailPage.tsx` | ✅ Mới |
| Photo detail | `features/experiences/PhotoDetailPage.tsx` | ✅ Mới |
| Post detail | `features/experiences/PostDetailPage.tsx` | ✅ Mới |
| Experiences feed | `features/experiences/ExperiencesPage.tsx` | ✅ Mới |
| Saved | `features/saved/SavedPage.tsx` | ✅ Mới |
| Create | `features/contribute/CreateExperiencePage.tsx` | ✅ Mới |
| Profile | `features/profile/ProfilePage.tsx` | ✅ Mới |
| Settings | `features/profile/SettingsPage.tsx` | ✅ Mới |
| Login/Register | `app/auth.tsx` | ✅ Mới |
| 404 | `features/shell/NotFoundPage.tsx` | ✅ Mới |
| Map | `app/map.tsx` | ⚠️ Legacy (đã token hoá màu) |
| Creator profile | `app/creator.tsx` | ⚠️ Legacy |
| Submission history/detail | `app/contributions.tsx` | ⚠️ Legacy |
| `/submissions/new` | `app/contributions.tsx` | ⚠️ Legacy (trùng chức năng với `/create`) |

`app/discovery.tsx`, `app/post_detail.tsx`, `app/posts_feed.tsx` **không còn được route**
nhưng vẫn giữ vì test và `social.tsx` còn import từ chúng.

---

## 8. Kiểm thử

```bash
bun run --cwd frontend typecheck   # tsc -b, không emit
bun run --cwd frontend test        # vitest run — 61 test / 10 tệp
bun run --cwd frontend build       # tsc -b && vite build
./scripts/check.sh frontend        # lint + format:check + test + build
```

Các tệp test và phạm vi:

| Tệp | Số test | Phạm vi |
|---|---|---|
| `app/access.test.tsx` | 26 | Phân quyền route, redirect, cookie phiên, account menu |
| `app/accessibility.test.tsx` | 6 | ARIA, bàn phím, dialog, contrast |
| `app/forms_and_navigation.test.tsx` | 4 | Form nộp ảnh, giới hạn file, cam kết |
| `app/image_perf.test.tsx` | 3 | `loading`, `decoding`, `fetchPriority`, `aspect-ratio` |
| `app/shared.test.tsx` | 5 | `Cover`, `ErrorText`, `State`, `ConfirmDialog` |
| `app/map.test.tsx` | 3 | `style.json` hợp lệ, tham số `bbox` |
| `features/shell/TermsPage.test.tsx` | 3 | Trang điều khoản đọc được khi chưa có phiên |
| `features/contribute/CreateExperiencePage.test.tsx` | 3 | Hai trạng thái định vị địa chỉ |
| `lib/api/client.test.ts` | 7 | CSRF header, chuẩn hoá lỗi |
| `components/ui/button.test.tsx` | 1 | Biến thể + `asChild` |

E2E Playwright nằm ở `frontend/e2e/`; xem mục 9 để biết tình trạng.

---

## 9. Rủi ro đã biết

1. **`e2e/visual.spec.ts` và `e2e/pinterest.spec.ts` nhắm vào màn hình legacy.**
   Chúng tìm `.photo-card`, `"Xem ảnh của {name}"`, `"Thông tin địa điểm {name}"`,
   `"Giờ hoạt động:"`, `"Ảnh tại địa điểm"`, `.filter-drawer > summary`, `"Xem thêm ảnh"`,
   `.global-search input` — tất cả thuộc `discovery.tsx`. Vì `/discover` và `/places/:id`
   giờ trỏ sang trang mới, hai spec này **sẽ fail** cho tới khi được cập nhật theo tên
   truy cập mới. Đây là nợ kỹ thuật đã biết, không phải lỗi bị bỏ qua.
2. **`tailwind-merge` không còn được dùng** (`button.tsx` chuyển sang `clsx`). Giữ lại vì
   hợp đồng vận hành cấm thêm/bớt dependency mà không có lý do.
3. **`components.css` vẫn ~49 KB** rule cho màn hình chưa migrate.
