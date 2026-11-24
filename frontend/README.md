# Frontend — Rendez

SPA khám phá địa điểm ăn uống tại Đà Nẵng, tương tác bản đồ, mạng xã hội, tin nhắn trực tiếp và điều phối phòng nhóm. Kết nối trực tiếp backend qua proxy `/api/v1` khi dev và production; chỉ bật mock in-memory khi chạy unit test hoặc `bun run dev:mock`.

## Stack

React 19 · Vite 8 · TypeScript strict · Tailwind CSS 4 · shadcn (`@base-ui/react`) · React Router 8 · TanStack Query 5 · TanStack Table 9 · React Hook Form + Zod · Leaflet + Supercluster · Motion · Vitest + Testing Library · Playwright. Chi tiết phiên bản xem tại [`../docs/STACK.md`](../docs/STACK.md).

## Lệnh thường dùng

```bash
bun install
cp .env.example .env
bun run dev            # http://localhost:5173 (nối backend :8000)
bun run dev:mock       # http://localhost:5173 (chạy độc lập bằng mock in-memory)
```

| Lệnh                              | Tác vụ                                         |
| --------------------------------- | ---------------------------------------------- |
| `bun run dev` / `dev:mock`        | Khởi chạy dev server (thật hoặc mock)          |
| `bun run build`                   | `tsc -b` + build production (tự động tắt mock) |
| `bun run preview`                 | Xem bản build cục bộ                           |
| `bun run typecheck`               | Kiểm tra kiểu TypeScript (`tsc -b --pretty`)   |
| `bun run lint`                    | ESLint                                         |
| `bun run format` / `format:check` | Prettier                                       |
| `bun run test` / `test:watch`     | Vitest (50 file test, 230 ca kiểm thử)         |
| `bun run e2e`                     | Playwright E2E (21 spec)                       |

## Biến môi trường

Xem mẫu tại `.env.example`.

| Biến                | Ý nghĩa                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL API trình duyệt gọi (mặc định `/api/v1`).                                                            |
| `VITE_PROXY_TARGET` | Đích thật của proxy `/api` ở dev server (mặc định `http://localhost:8000`).                                   |
| `VITE_ENABLE_MOCKS` | `"true"` để bật mock adapter (`src/mocks/`); mặc định tắt ở dev/prod, bật tự động trong `MODE === "test"`.    |
| `VITE_APP_ORIGIN`   | Origin công khai khi build production để sinh canonical/OG, `robots.txt` và `sitemap.xml` (`vite.config.ts`). |

## Cấu trúc thư mục

```
src/
├── app/          # Providers, router, cấu hình cấp ứng dụng
├── components/   # layout (app-shell, shell-nav, top-bar), shared, ui (shadcn)
├── features/     # admin, auth, collections, location, messages, notification,
│                 # places, profile, rooms, saved, search, settings, social, static, system
│   └── <feature>/{api,components,hooks,lib,pages,types}
├── hooks/        # Hooks dùng chung (breakpoint, geolocation, infinite-scroll)
├── lib/          # axios, env, format, constants, telemetry, share, utils
├── mocks/        # Mock server & fixtures (chỉ nạp khi VITE_ENABLE_MOCKS=true)
└── test/         # Setup Vitest & query test helpers
```

Quy ước lập trình xem tại [`../docs/CONVENTIONS.md`](../docs/CONVENTIONS.md) và quyết định kiến trúc tại [`../docs/DECISIONS.md`](../docs/DECISIONS.md).
