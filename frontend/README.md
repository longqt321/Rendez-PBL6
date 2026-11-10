# Đà Nẵng Ăn & Đi

Web app khám phá quán ăn / địa điểm ở Đà Nẵng: tìm kiếm và lọc theo loại hình, quận,
mức giá, xem trên bản đồ, lưu địa điểm vào bộ sưu tập, đọc/đăng bài cộng đồng, và
**lọc nhóm** — nhiều người cùng đề xuất include/exclude để ra một kết quả chung.

Frontend hoàn chỉnh, chạy được độc lập bằng mock server in-memory. Backend thật chỉ
cần implement đúng hợp đồng API ở `../docs/DECISIONS.md` (D-011) rồi tắt mock.

## Stack

React 19 · Vite 8 · TypeScript strict · Tailwind CSS 4 · shadcn (base-nova trên
`@base-ui/react`) · React Router 8 · TanStack Query 5 · Leaflet · zod + react-hook-form ·
Vitest + Testing Library. Chi tiết phiên bản: `../docs/STACK.md`.

## Chạy dự án

```bash
bun install
cp .env.example .env   # tuỳ chọn — mặc định đã chạy được với mock
bun run dev            # http://localhost:5173
```

| Lệnh                              | Việc                                    |
| --------------------------------- | --------------------------------------- |
| `bun run dev`                     | Dev server (mock bật mặc định)          |
| `bun run build`                   | Typecheck + build production (mock tắt) |
| `bun run preview`                 | Xem bản build                           |
| `bun run typecheck`               | `tsc -b`                                |
| `bun run lint`                    | ESLint (type-aware)                     |
| `bun run format` / `format:check` | Prettier                                |
| `bun run test` / `test:watch`     | Vitest                                  |

## Biến môi trường

Xem `.env.example`.

| Biến                | Ý nghĩa                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL API trình duyệt gọi. Mặc định `/api` (đi qua proxy dev). |
| `VITE_PROXY_TARGET` | Chỉ dùng ở dev server: đích thật của proxy `/api`.                |
| `VITE_ENABLE_MOCKS` | `true`/`false`. Bỏ trống: dev bật, build production tắt.          |

## Mock và chuyển sang backend thật

- Mock nằm ở `src/mocks/` (axios adapter, db in-memory **theo từng tab**). Dữ liệu phòng
  lọc nhóm dùng chung giữa các tab cùng trình duyệt qua `localStorage`; đa thiết bị cần backend.
- `src/lib/axios.ts` chỉ nạp mock khi `VITE_ENABLE_MOCKS=true` (dynamic import) nên bundle
  production không chứa mock.
- Chuyển backend: đặt `VITE_API_BASE_URL` trỏ backend thật + `VITE_ENABLE_MOCKS=false`.
  Không phải sửa feature/api/hook/component. Các việc backend cần làm: `../docs/BACKLOG.md`
  mục "Cần backend implement".

## Cấu trúc

```
src/
├── app/          # providers, router, cấu hình cấp ứng dụng
├── components/   # layout (shell/nav), shared, ui (shadcn)
├── features/     # places, social, collections, profile, rooms, search, saved, …
│   └── <feature>/{api,components,hooks,lib,pages,types}
├── hooks/        # hook dùng chung
├── lib/          # axios, env, format, constants, share, utils
├── mocks/        # mock server + fixtures (xoá khi có backend)
└── test/         # setup Vitest
```

Quy ước code: `../docs/CONVENTIONS.md`. Quyết định kiến trúc: `../docs/DECISIONS.md`.

## Chất lượng

- CI (`.github/workflows/ci.yml`): typecheck → lint → format:check → test → build.
- Pre-commit (husky + lint-staged): prettier + eslint trên file staged.
- Test: logic thuần (`lib/format`, `features/rooms/lib/room`) và component có tương tác
  (`RatingStars`).
