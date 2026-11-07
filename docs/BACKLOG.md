# BACKLOG

Việc phát hiện trong quá trình kiểm tra/sửa nhưng **chưa làm** (ngoài phạm vi được giao).

## Cần backend implement (chặn khi bỏ mock)

- [ ] **Toàn bộ hợp đồng API ở `DECISIONS.md` D-011** phải được backend implement đúng path/shape:
      `GET /places`, `GET /places/:id`, `GET /places/suggestions`, `GET /posts`, `POST /posts`,
      `PATCH /posts/:id/place|like|save`, `GET /notifications`, `PATCH /notifications[/:id]`.
- [ ] **`GET /places/suggestions?q=&limit=`** — endpoint quan trọng nhất: xếp hạng đề xuất địa điểm
      theo nội dung bài đăng. Frontend không có logic này; nếu backend chưa có, tính năng gợi ý
      không hoạt động.
- [ ] **Job phát hiện địa điểm mới** — server quét bài chưa gắn địa điểm, tìm địa điểm chưa publish
      khớp nội dung, sinh thông báo `place-suggestion`. Hiện `syncPlaceSuggestions()` chạy mỗi lần
      client tải `/notifications` — đó là mô phỏng, backend thật phải là job nền.
- [ ] **Xoá `src/mocks/` và bỏ `adapter` trong `src/lib/axios.ts`** khi backend sẵn sàng. Không phải
      sửa feature api/hook/component.
- [ ] **Server phải nhúng `place` vào `Post`** và `isPublished` vào `PlaceSummary`. Nếu backend chỉ
      trả `placeId`, frontend sẽ phải tra cứu id → quay lại nguồn sự thật thứ hai (xem L-001).
- [ ] **`GET /posts` cần phân trang cursor** — hiện mock trả `next: null` (10 bài, một trang). Hợp
      đồng đã là `Page<Post>` nên không phải đổi type, chỉ cần backend trả `next` thật.

## Ưu tiên cao

- [ ] **Chưa có test runner.** Không có Vitest/Playwright, không có script `test`. Nên thêm Vitest +
      Testing Library trước khi viết component đầu tiên.
- [ ] **Chưa có CI.** Không có `.github/workflows`. Nên chạy `typecheck` + `lint` + `format:check` + `build`
      trên mỗi PR.
- [ ] **Chưa có pre-commit hook.** Husky + lint-staged để chặn commit lỗi.
- [ ] **Dependency còn chưa dùng:** `zustand`, `zod`, `react-hook-form`, `@hookform/resolvers`, `sonner`.
      Quyết định: giữ (nếu sắp dùng) hay bỏ. (`react-router`, `axios`, `@tanstack/react-query`,
      `lucide-react` đã dùng.)
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
- [ ] **Bundle 715.82 KB (gzip 229.59 KB)** — tăng từ 649.96 kB sau khi thêm mock adapter + fixtures
      (xem D-011). Phần tăng này biến mất khi xoá `src/mocks/`. Vẫn nên code-split theo route
      (hiện chưa làm) để giảm bundle thật.
- [ ] **Chưa có component nào cho form thật** — `react-hook-form` + `zod` + `@hookform/resolvers`
      vẫn chưa được dùng. Trang showcase chỉ có `Input` + `Label` đơn lẻ.
- [ ] **Chưa có `error boundary`** cho route; nếu một page throw thì cả app trắng.

## Phát hiện khi làm skin retro (2026-11-07)

- [ ] **Chưa xem giao diện bằng mắt người.** Đã chụp 4 ảnh (`scratch/shot-*.png`) và phân tích pixel
      (màu chủ đạo, số màu khác nhau, độ sáng) nhưng mô hình hiện tại không đọc được file ảnh.
      Cần người dùng mở `/design` và bấm nút palette để đánh giá thẩm mỹ thật.
- [ ] **Chưa test trên trình duyệt khác.** Toàn bộ kiểm chứng chạy trên Chrome 156 (CDP).
      Firefox/Safari có thể xử lý `oklch`, `font-variation-settings`, `repeating-linear-gradient`
      khác — đặc biệt Safari cũ (< 15.4) không hỗ trợ `oklch`.
- [ ] **Chưa test dark mode của `prefers-color-scheme`.** `next-themes` đặt `defaultTheme="system"`;
      mới test chuyển tay, chưa test trường hợp OS đổi theme khi app đang mở.
- [ ] **Chưa có ảnh chụp nào được commit.** Nếu muốn review trực quan trong PR, cần thêm ảnh vào `docs/`.
- [ ] **Trục `SOFT` của Fraunces chưa dùng.** `wonk.css` không có trục này. Nếu muốn chữ mềm hơn
      phải đổi sang `full.css` (+68 kB latin) — cân nhắc khi có yêu cầu cụ thể.
- [ ] **Chưa xử lý `prefers-reduced-motion`.** Nút retro có `transform: translate(2px,2px)` khi bấm
      và `transition-all` 150ms của shadcn. Nên thêm `@media (prefers-reduced-motion: reduce)`.
- [ ] **Chưa có skin nào khác ngoài `retro`.** `Skin` type đang là union cứng `"default" | "retro"`.
      Khi thêm skin thứ ba, cần sửa type + `readStoredSkin()` + `SkinToggle` (hiện là if/else 2 nhánh).
- [ ] **`SkinToggle` chỉ có icon, không có chữ.** Có `aria-label` + `title` nhưng người dùng mới
      có thể không hiểu icon `Palette` nghĩa là gì. Cân nhắc thêm tooltip hoặc label ở header thật.

## Phát hiện khi làm 3 route giao diện (2026-11-07)

- [ ] **Bundle 650 kB (gzip 206 kB) — vượt ngưỡng cảnh báo 500 kB.** Chưa code-split theo route.
      Nên dùng `lazy()` + `Suspense` cho `/social` và `/notification`, hoặc `codeSplitting` của rolldown.
- [ ] **Toàn bộ dữ liệu là mock trong bộ nhớ.** Tải lại trang sẽ mất bài đăng vừa tạo và thông báo
      vừa sinh. Khi có backend: chuyển `MOCK_PLACES`/`MOCK_POSTS` sang gọi API qua `lib/axios`,
      giữ Zustand chỉ cho optimistic update.
- [ ] **Ảnh là gradient tự sinh, không phải ảnh thật.** Người dùng đã chọn picsum.photos nhưng
      không dùng vì phụ thuộc mạng — xem `DECISIONS.md` D-010. Nếu muốn ảnh thật, đổi thân
      `SeedImage` sang `<img loading="lazy">`.
- [ ] **Search bar ở topbar chưa hoạt động.** Chỉ `preventDefault()`, chưa nối vào bộ lọc của
      `/discover` hay `/social`. Cần thống nhất: search toàn cục hay search theo trang?
- [ ] **`/notification` chưa có infinite scroll.** Danh sách thông báo render toàn bộ. Hiện chỉ có
      4 mục nên chưa cần, nhưng khi nối backend phải phân trang.
- [ ] **`/social` chưa có infinite scroll.** Feed render toàn bộ 10 bài. Yêu cầu ban đầu chỉ nói
      infinity scroll cho `/discover` và `/social` — `/social` hiện chưa làm.
- [ ] **Chưa có trang chi tiết địa điểm.** `PlaceCard` link tới `/discover` (chính nó) vì chưa có
      route `/discover/:id`.
- [ ] **Nút "Bình luận" và "Đăng xuất" chưa có hành vi.** Chỉ là UI.
- [ ] **`runPlaceDetection` là nút bấm tay, không tự chạy.** Đúng cho mục đích demo, nhưng khi có
      backend thì đây phải là job phía server.
- [ ] **Chưa có test tự động.** Toàn bộ kiểm chứng là script CDP trong `scratch/`, không nằm trong
      repo và không chạy được trong CI. Cần Vitest cho `rankPlaceSuggestions` + `filterPlaces`.
- [ ] **Chưa xem giao diện bằng mắt người.** Đã chụp 5 ảnh và phân tích pixel (bảng màu, số màu,
      dải trái/phải) nhưng model không đọc được file ảnh.
- [ ] **Chưa test Firefox/Safari.** Chỉ Chrome 156.
- [ ] **`SkinSwitch` đặt trong dropdown avatar ở mobile** — chưa kiểm tra trực quan dropdown này
      có bị tràn màn hình 390px không.
