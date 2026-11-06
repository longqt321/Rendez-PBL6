# BACKLOG

Việc phát hiện trong quá trình kiểm tra/sửa nhưng **chưa làm** (ngoài phạm vi được giao).

## Ưu tiên cao

- [ ] **Chưa có test runner.** Không có Vitest/Playwright, không có script `test`. Nên thêm Vitest +
      Testing Library trước khi viết component đầu tiên.
- [ ] **Chưa có CI.** Không có `.github/workflows`. Nên chạy `typecheck` + `lint` + `format:check` + `build`
      trên mỗi PR.
- [ ] **Chưa có pre-commit hook.** Husky + lint-staged để chặn commit lỗi.
- [ ] **11 dependency chưa dùng:** `react-router`, `@tanstack/react-query`, `zustand`, `zod`,
      `react-hook-form`, `@hookform/resolvers`, `axios`, `sonner`, `lucide-react`.
      Quyết định: giữ (nếu sắp dùng) hay bỏ. Nếu giữ thì phải wire provider vào `main.tsx`
      (`QueryClientProvider`, `BrowserRouter`, `<Toaster />`) — hiện chưa có.
- [ ] **`src/App.tsx` vẫn là template Vite** (logo, counter, link docs/social). Cần thay bằng UI thật.
      Khi thay thì xóa luôn `src/App.css` và `src/assets/{hero.png,react.svg,vite.svg}`.
- [ ] **`index.html`:** `lang="en"` và `<title>frontend</title>` vẫn là placeholder.

## Ưu tiên trung bình

- [ ] **ESLint chưa type-aware.** Đang dùng `tseslint.configs.recommended`. Cân nhắc
      `recommendedTypeChecked` + `parserOptions.project` (bắt floating promise, unsafe `any`).
- [ ] **Chưa có `eslint-plugin-react` / `react-x` / `react-dom`** — rule React-specific.
- [ ] **Chưa có `.editorconfig`, `.nvmrc`** — dễ lệch whitespace/Node version giữa máy.
- [ ] **Chưa có `.env.example`** và chưa dùng `import.meta.env` ở đâu.
- [ ] **`vite.config.ts` chưa có `server.proxy`** cho API backend, chưa bật `build.sourcemap`.
- [ ] **Chưa có `error boundary` / route-level error UI.**
- [ ] **`public/favicon.svg` (9.5 kB) và `public/icons.svg` (5 kB)** vẫn là asset của Vite template.

## Ưu tiên thấp

- [ ] **Chưa audit a11y.** `App.tsx` dùng `<svg role="presentation" aria-hidden>` đúng, nhưng chưa
      kiểm contrast, focus order, keyboard nav.
- [ ] **Chưa có README mô tả dự án** — vẫn là README mặc định của Vite.
- [ ] **Chưa cấu hình `base` cho Vite** nếu deploy dưới subpath.

## Phát hiện khi dùng design stack (2026-11-06)

- [ ] **Cảnh báo `<script>` trong `#root` ở chế độ dev.** `next-themes` render script chống nháy
      theme bên trong React tree → React 19 cảnh báo script không thực thi. Đã xác minh:
      chỉ ở dev, production sạch, không phải code dự án. Chi tiết ở `DECISIONS.md` D-008.
      Nếu muốn sạch console: tự viết theme provider và sửa `src/components/ui/sonner.tsx`.
- [ ] **`src/components/shared/design-showcase-page.tsx` là trang tạm** để kiểm tra design stack.
      Xóa cùng route `/design` khi bắt đầu làm giao diện thật.
- [ ] **Bundle tăng lên 490 KB (gzip 156 KB)** sau khi thêm router + query + sonner + dialog.
      Chưa cần tối ưu, nhưng nên theo dõi khi thêm feature.
- [ ] **Chưa có component nào cho form thật** — `react-hook-form` + `zod` + `@hookform/resolvers`
      vẫn chưa được dùng. Trang showcase chỉ có `Input` + `Label` đơn lẻ.
- [ ] **Chưa có `error boundary`** cho route; nếu một page throw thì cả app trắng.
