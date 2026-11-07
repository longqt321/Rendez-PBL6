# STACK

Phiên bản đã cài thực tế (đọc từ `node_modules/*/package.json`), không phải version trong `package.json`.

| Gói                                   | Version cài    | Vai trò                                                |
| ------------------------------------- | -------------- | ------------------------------------------------------ |
| react / react-dom                     | 19.3.1         | UI runtime                                             |
| vite                                  | 8.3.6          | Build tool (dùng rolldown)                             |
| typescript                            | 6.0.3          | Type checker                                           |
| tailwindcss / @tailwindcss/vite       | 4.3.5          | Styling (CSS-first, không có `tailwind.config.js`)     |
| @base-ui/react                        | 1.9.0          | Headless primitives (nền của shadcn style `base-nova`) |
| shadcn                                | 4.23.0         | CLI sinh component + `shadcn/tailwind.css`             |
| cn                                    | 0.2.6          | Merge class Tailwind (thay `clsx` + `tailwind-merge`)  |
| class-variance-authority              | 0.7.1          | Variant API cho component                              |
| @fontsource-variable/geist            | 5.3.0          | Font self-hosted — skin mặc định                       |
| @fontsource-variable/fraunces         | 5.3.0          | Font serif self-hosted — skin retro                    |
| tw-animate-css                        | 1.4.0          | Animation utilities cho Tailwind 4                     |
| next-themes                           | 0.4.6          | Sáng/tối, gắn class `dark` lên `<html>`                |
| react-router                          | 8.5.1          | Routing — **chưa dùng**                                |
| @tanstack/react-query                 | 5.106.1        | Server state — **chưa dùng**                           |
| zustand                               | 5.1.0          | Client state — **chưa dùng**                           |
| zod                                   | 4.6.7          | Schema validation — **chưa dùng**                      |
| react-hook-form / @hookform/resolvers | 7.91.0 / 7.0.3 | Form — **chưa dùng**                                   |
| axios                                 | 1.21.0         | HTTP client — **chưa dùng**                            |
| sonner                                | 2.0.8          | Toast — **chưa dùng**                                  |
| lucide-react                          | 1.70.0         | Icon — **chưa dùng**                                   |

## Runtime

- Node `v26.13.0`, Bun `1.3.14`
- Package manager: **Bun** (`bun.lock`, `packageManager: bun@1.3.14`)

## Lệnh

```bash
bun run dev          # vite dev server :5173
bun run build        # tsc -b && vite build
bun run typecheck    # tsc -b --pretty
bun run lint         # eslint .
bun run format       # prettier --write .
bun run format:check # prettier --check .
```

## Alias

`@/*` → `src/*`, khai báo ở 3 nơi phải khớp nhau:
`vite.config.ts` (`resolve.alias`), `tsconfig.app.json` (`paths`), `tsconfig.json` (`paths`).

## Cấu trúc thư mục

Kiến trúc: **Feature-based + App-level**. Chi tiết lý do ở `DECISIONS.md` D-005.

```
src/
├── app/                    # cấu hình cấp ứng dụng, KHÔNG chứa business logic
│   ├── providers/
│   │   ├── app-provider.tsx    # gộp toàn bộ provider
│   │   ├── query-provider.tsx  # QueryClientProvider
│   │   ├── theme-provider.tsx  # next-themes (sáng/tối)
│   │   ├── skin-context.ts     # SkinContext + useSkin()
│   │   └── skin-provider.tsx   # skin (mặc định/retro), gắn data-skin
│   ├── router/
│   │   ├── index.tsx           # createBrowserRouter + RouterProvider
│   │   └── routes.tsx          # khai báo route
│   └── app.tsx             # root component
│
├── assets/                 # tài nguyên tĩnh
│   ├── fonts/
│   ├── icons/
│   └── images/
│
├── components/             # chỉ component dùng ở NHIỀU nơi
│   ├── ui/                 # shadcn sinh ra, không sửa tay
│   ├── layout/             # app-shell, nav, theme/skin toggle
│   └── shared/             # component dùng chung (seed-image…)
│
├── features/               # mỗi feature tự quản api/components/hooks/types/pages
│   ├── places/             # /discover: api, components, hooks, lib, pages, types
│   ├── social/             # /social: api, components, pages, types
│   └── notification/       # /notification: components, pages, types
│
├── hooks/                  # hook dùng chung (use-infinite-scroll)
├── lib/                    # tiện ích & cấu hình thư viện dùng chung
│   ├── axios.ts            # axios instance, baseURL từ VITE_API_BASE_URL
│   ├── format.ts           # formatRelativeTime, formatCount
│   ├── seed-color.ts       # gradient ổn định từ seed
│   └── utils.ts            # cn()
│
├── stores/                 # Zustand — global CLIENT state
│   └── app-store.ts        # bài đăng, địa điểm đã duyệt, thông báo
├── types/                  # type dùng chung toàn app
├── index.css
├── main.tsx
└── vite-env.d.ts           # khai báo type cho import.meta.env
```

### Route

| Route           | Trang                   | Ghi chú                                          |
| --------------- | ----------------------- | ------------------------------------------------ |
| `/`             | redirect → `/discover`  |                                                  |
| `/discover`     | `features/places`       | 3 cột PC / 2 cột masonry mobile, infinity scroll |
| `/social`       | `features/social`       | feed dọc + ô soạn bài có gợi ý địa điểm          |
| `/notification` | `features/notification` | thẻ "Đề xuất thêm địa điểm" với 3 gợi ý          |
| `/design`       | `components/shared`     | trang kiểm tra design stack (tạm)                |

### Phân chia state

| Loại dữ liệu                           | Nơi quản lý                          |
| -------------------------------------- | ------------------------------------ |
| Danh sách địa điểm phân trang          | TanStack Query (`useDiscoverPlaces`) |
| Bài đăng, địa điểm đã duyệt, thông báo | Zustand (`app-store.ts`)             |
| Sáng/tối                               | `next-themes`                        |
| Skin (mặc định/retro)                  | `SkinProvider` + `data-skin`         |
| Bộ lọc, trạng thái form                | React `useState`                     |

### Quy tắc

1. Component chỉ dùng trong một feature → đặt trong `features/<feature>/components/`, **không** lên `components/`.
2. Page chỉ ghép component và gọi hook. Không viết axios trực tiếp trong component.
3. Luồng API: Page → feature hook (`useQuery`) → feature api → `lib/axios` → backend.
4. Không dùng Zustand/Context/TanStack Query chồng chéo cho cùng một dữ liệu.
5. Không tạo `index.ts` barrel cho toàn bộ thư mục — chỉ cho `features/<feature>/index.ts` khi thực sự cần.
6. Tên file `kebab-case`, component `PascalCase`, hàm/biến `camelCase`.

### Chưa tạo (theo hướng dẫn: không tạo thư mục trống)

- `services/` — chỉ thêm khi có tích hợp ngoài (upload, maps) dùng ở nhiều feature.
- Các feature cụ thể — mở rộng dần khi làm tính năng.
- `src/hooks/` — hook dùng chung chỉ tạo khi có hook thứ hai thực sự dùng chung.

## Hệ thống skin (giao diện)

Hai lớp tuỳ biến **độc lập nhau**, có thể kết hợp tự do (4 tổ hợp):

| Lớp      | Cơ chế                               | Giá trị                      | Lưu ở                   |
| -------- | ------------------------------------ | ---------------------------- | ----------------------- |
| Sáng/tối | class `light` / `dark` trên `<html>` | `next-themes`                | `localStorage["theme"]` |
| Skin     | attribute `data-skin` trên `<html>`  | `SkinProvider` + `useSkin()` | `localStorage["skin"]`  |

- Skin mặc định: **không có** attribute `data-skin` → dùng token gốc trong `:root` / `.dark`.
- Skin retro: `data-skin="retro"` → khối `[data-skin="retro"]` trong `src/index.css` ghi đè token.
- Chuyển skin: [`skin-toggle.tsx`](../src/components/layout/skin-toggle.tsx) (icon `Palette` / `Type`).
- Chuyển sáng/tối: [`theme-toggle.tsx`](../src/components/layout/theme-toggle.tsx).

> [!IMPORTANT]
> Không sửa file trong `src/components/ui/` để đổi giao diện. Mọi tuỳ biến skin đi qua
> CSS selector bám vào `data-slot` (ví dụ `[data-skin="retro"] [data-slot="card"]`),
> nhờ vậy `shadcn add --overwrite` không xoá mất tuỳ biến.

### Font

| Skin     | Font body/heading           | File import                              |
| -------- | --------------------------- | ---------------------------------------- |
| Mặc định | `Geist Variable` (sans)     | `@fontsource-variable/geist`             |
| Retro    | `Fraunces Variable` (serif) | `@fontsource-variable/fraunces/wonk.css` |

Retro dùng biến thể `wonk.css` chứ không phải `index.css` mặc định, vì đã kiểm bằng `fontTools`:

| File CSS    | Trục biến thiên có trong file  | Latin woff2 |
| ----------- | ------------------------------ | ----------- |
| `index.css` | `wght`                         | 36.6 kB     |
| `wonk.css`  | `wght`, `WONK`                 | 36.6 kB     |
| `soft.css`  | `wght`, `SOFT`                 | 56.0 kB     |
| `full.css`  | `opsz`, `wght`, `SOFT`, `WONK` | 105.2 kB    |

`wonk.css` cùng kích thước với `index.css` nhưng có thêm trục `WONK` — dùng được
`font-variation-settings: "WONK" 1` cho heading mà không tăng bundle.
