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
| @fontsource-variable/geist            | 5.3.0          | Font self-hosted                                       |
| tw-animate-css                        | 1.4.0          | Animation utilities cho Tailwind 4                     |
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
