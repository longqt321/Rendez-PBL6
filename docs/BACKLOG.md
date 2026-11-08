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
- [ ] **Dependency còn chưa dùng:** `zustand`. Quyết định: giữ (nếu sắp dùng) hay bỏ.
      (`zod`, `react-hook-form`, `@hookform/resolvers`, `sonner` đã dùng — xem `docs/STACK.md`.)
- [ ] **Asset template Vite còn sót:** `src/assets/images/hero.png`, `src/assets/icons/react.svg`,
      `src/assets/icons/vite.svg` — 0 import. (`index.html` đã là `lang="vi"` +
      `<title>Đà Nẵng Ăn &amp; Đi</title>`, không còn là placeholder.)

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
- [ ] **Search bar ở topbar chưa hoạt động.** Chỉ `preventDefault()`, chưa nối vào `/search`.
      Cần thống nhất: search toàn cục hay search theo trang? (Trang `/search` riêng đã có —
      `features/search`.)
- [ ] **`/notification` chưa có infinite scroll.** Danh sách thông báo render toàn bộ. Hiện chỉ có
      4 mục nên chưa cần, nhưng khi nối backend phải phân trang.
- [ ] **`/social` chưa có infinite scroll.** Feed render toàn bộ 10 bài. Yêu cầu ban đầu chỉ nói
      infinity scroll cho `/discover` và `/social` — `/social` hiện chưa làm.
- [ ] **Nút "Đăng xuất" chưa có hành vi.** Chỉ là UI (menu avatar đã có đầy đủ link điều hướng).
- [ ] **`runPlaceDetection` là nút bấm tay, không tự chạy.** Đúng cho mục đích demo, nhưng khi có
      backend thì đây phải là job phía server.
- [ ] **Chưa có test tự động.** Toàn bộ kiểm chứng là script CDP trong `scratch/`, không nằm trong
      repo và không chạy được trong CI. Cần Vitest cho `rankPlaceSuggestions` + `filterPlaces`.
- [ ] **Chưa xem giao diện bằng mắt người.** Đã chụp 5 ảnh và phân tích pixel (bảng màu, số màu,
      dải trái/phải) nhưng model không đọc được file ảnh.
- [ ] **Chưa test Firefox/Safari.** Chỉ Chrome 156.
- [ ] **`SkinSwitch` đặt trong dropdown avatar ở mobile** — chưa kiểm tra trực quan dropdown này
      có bị tràn màn hình 390px không.

## Phát hiện khi làm Bình luận + Profile (2026-11-07)

- [ ] **`PATCH /me` chưa có route mock.** `/settings` chỉ cập nhật cache + toast minh hoạ; cần
      `PATCH /me` ở mock (và backend) để lưu thật tên/bio/địa điểm/riêng tư.
- [ ] **Lưu/bỏ lưu địa điểm chưa có endpoint.** Nút lưu ở `PlaceCard`/`/discover/:id` chưa nối;
      cần `PATCH /places/:id/save` (hoặc tương đương) + tab "Đã lưu" ở `/profile`.
- [ ] **Tab "Người" ở `/search` lọc trên `MOCK_USERS` phía client.** Vi phạm nguyên tắc "mọi lọc
      ở server" khi có backend — cần `GET /users?q=`.
- [ ] **`Menu.GroupLabel` của base-ui bắt buộc nằm trong `Menu.Group`.** Template shadcn
      `base-nova` map `DropdownMenuLabel` → `GroupLabel`; dùng label ngoài group làm crash app
      (đã sửa ở commit `44839cc`). Khi sinh component mới từ template, đọc source base-ui trước
      khi ghép API.
- [ ] **Bundle 964.54 kB (gzip 302.22 kB)** — tăng từ 715.82 kB sau khi thêm 6 feature mới.
      Cần code-split theo route (chưa làm).

## Phát hiện khi sửa 4 luồng bị chặn — Nhóm 1 (2026-11-07)

Đã làm xong trong đợt này (ghi lại để không tìm lại): route `/post/:id` + `usePost` + `getPost`;
topbar search ghi `?q=`; `/search` đọc/ghi `?q=` với debounce 300 ms; tab Thông báo có `TabsContent`;
hàng thông báo bấm được và gọi `useMarkNotificationRead`; 404 render trong `AppShell`.

- [ ] **`/profile` luôn rỗng.** `MOCK_POSTS` chỉ có bài của `AUTHORS[0..4]` (`u-1`…`u-5`), **không có
      bài nào của `u-me`** → tab Bài đăng của `/profile` luôn hiện "Chưa có bài đăng nào". Không phải
      lỗi UI; nếu muốn trang cá nhân có nội dung để xem thì phải thêm fixture bài của `u-me`.
      (Test CDP phải dùng `/u/bao.an.day` thay vì `/profile`.)
- [ ] **`/post/:id` chưa có nút chia sẻ / báo cáo / sửa-xoá.** Trang chi tiết mới có thích, lưu,
      bình luận. Cần chốt hành vi trước khi thêm (xoá bài có xác nhận? sửa caption?).
- [ ] **`markNotificationRead` chưa optimistic.** Bấm thông báo → chờ `PATCH` xong mới
      `invalidateQueries`; mạng chậm sẽ thấy badge trễ. Cân nhắc `onMutate` + rollback như like/save.
- [ ] **`syncPlaceSuggestions()` chạy lại mỗi lần `GET /notifications`** — nếu backend thật làm vậy
      sẽ sinh trùng. Đã có `notifiedPostIds` chặn trong một phiên, nhưng vẫn là mô phỏng job nền.
- [ ] **Chưa có trang danh sách thông báo phân trang.** `NOTIFICATIONS_PAGE_SIZE` có trong mock
      nhưng UI chưa có nút "Tải thêm" — hiện chỉ hiện trang đầu.

## Phát hiện khi audit component tự chế (2026-11-07)

Đợt này đã thay bằng component có sẵn: `Spinner` (9 chỗ), `Empty` (3 trang), `Button variant="link"`
(2 nút), `Avatar` (avatar người ở `/search`), `Badge` (badge số chưa đọc ở sidebar), `Item` (danh
sách gợi ý địa điểm ở `post-composer`), `InputGroup` (topbar + ô lọc `/discover`).

Còn lại, **chưa sửa** vì lý do ghi kèm:

- [ ] **`Spinner` có `aria-label="Loading"` tiếng Anh** (`src/components/ui/spinner.tsx`, template
      shadcn) trong khi toàn bộ UI tiếng Việt. Screen reader sẽ đọc "Loading" giữa câu tiếng Việt.
      Không sửa tay file `ui/` → cần override bằng `aria-label` ở nơi dùng, hoặc chấp nhận. Ảnh
      hưởng: 9 chỗ đang dùng `Spinner`.
- [x] **Badge số thứ tự trong `place-suggestion-card.tsx`** — **đính chính**: `Badge` **co được** xuống 16px. Đã kiểm bằng `twMerge('h-5 w-fit rounded-4xl px-2 py-0.5 text-xs', 'size-4 rounded-full p-0')` → `'text-xs size-4 rounded-full p-0'` (Tailwind merge bỏ `h-5`). Ghi chú cũ nói "không co được" là **sai**.
- [ ] **Chấm đỏ thông báo trên bottom nav mobile** (`app-shell.tsx`, `size-2 rounded-full`) không
      dùng `Badge` vì `Badge` luôn render số/chữ và có `h-5`; đây là dot thuần trang trí có
      `aria-hidden` ngầm định qua việc nav đã có nhãn. Giữ nguyên.
- [ ] **`Item` trong `post-composer` dùng `render={<button/>}`** — `Item` mặc định `flex-wrap` +
      `px-3 py-2.5`; đã override `px-1.5 py-1` để khớp khu vực gợi ý nhỏ. Nếu sau này cần
      `ItemSeparator` giữa các gợi ý thì phải bỏ `gap-1`.
- [x] **`/search` tab "Người" lọc trên `MOCK_USERS` phía client** — **đã giải quyết**: mock server có
      `GET /users?q=` trả `Page<...>`; trang `/search` gọi endpoint đó thay vì lọc client.

## Audit shadcn/convention — tính năng Bộ sưu tập (2026-11-08)

Kết luận chung: API/hooks/mock/card/detail/saved dùng đúng thành phần có sẵn, không có CSS tự
viết, `style={{}}`, DOM hack hay `any`. Bốn điểm dưới đây phát hiện khi audit, **đã sửa toàn bộ**:

- [x] **[Bug hiển thị] Switch trong dialog "Lưu vào bộ sưu tập" chỉ đúng cho bộ vừa bấm**
      — Đã giải quyết: `GET /collections?placeId=...` trả kèm `containsPlace?: boolean`.
      Cập nhật `toCollectionSummary` trong server mock, `CollectionSummary` type, `useCollections({ placeId })`.
- [x] **Confirm xoá bộ sưu tập dùng `Dialog` thay vì `AlertDialog`**
      — Đã giải quyết: chuyển sang dùng `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`,
      `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`,
      `AlertDialogAction` từ `@/components/ui/alert-dialog`.
- [x] **Hàng bộ sưu tập trong dialog tự dựng `<label role="listitem">`**
      — Đã giải quyết: chuyển sang cấu trúc `ItemGroup`, `Item`, `ItemContent`, `ItemTitle`,
      `ItemDescription`, `ItemActions` từ `@/components/ui/item`.
- [x] **`<label>` bọc `Switch` (base-ui) không kích hoạt bằng chữ**
      — Đã giải quyết: gắn `id` cho Switch và `htmlFor` cho `Label`, thêm handler toggle khi click
      vào Item. Đã verify 3/3 bằng CDP script `click-label-and-persistence-check.mjs`.

## Nhóm Core Engagement — việc còn lại (2026-11-08)

Đã làm xong: sửa thông tin bộ sưu tập (`PATCH /collections/:id`), xoá địa điểm khỏi bộ sưu tập, thả
tim bộ sưu tập (`POST`/`DELETE /collections/:id/like`), tab "Bộ sưu tập" trên `/u/:handle`, nút chia
sẻ dùng Web Share API + clipboard fallback, và dialog check-in từ trang quán.

- [ ] **Kéo thả sắp xếp địa điểm trong bộ sưu tập.** Hiện chỉ có nút xoá từng địa điểm. Muốn kéo thả
      thì phải chọn thư viện DnD (thêm dependency → cần một mục DECISIONS) hoặc tự viết pointer
      handling. Chưa làm vì nút xoá đã đủ cho nhu cầu "dọn bộ sưu tập".
- [ ] **`p-28`–`p-30` cố ý để `publishedAt: null`.** Đây là ứng viên cho job đề xuất địa điểm phía
      server (`syncPlaceSuggestions`). Đừng publish chúng khi chỉnh dữ liệu mẫu, nếu không luồng
      "Đề xuất thêm địa điểm" sẽ hết ứng viên và `app-check.mjs` fail.
- [ ] **Nút "Nhắn tin" trên `/u/:handle` vẫn không có handler** (tồn tại từ trước, không thuộc nhóm
      này). Cần chốt hành vi (mở chat thật? disable kèm tooltip?) trước khi làm.
- [ ] **`app-check.mjs` và các script CDP khác nằm ngoài repo** (thư mục artifact của phiên làm
      việc), không chạy được trong CI. Nếu muốn hồi quy tự động thì phải chuyển vào `e2e/` và thêm
      script npm.
- [ ] **`Spinner` vẫn có `aria-label="Loading"` tiếng Anh** — vấn đề cũ, xem mục audit 2026-11-07.

## Chuẩn hoá toàn dự án về component có sẵn (2026-11-08) — D-025

Đã làm xong trong đợt này (ghi lại để không tìm lại): thêm `@uidotdev/usehooks@2.4.1` (MIT, 6.7 kB
gzip) thay 3 hook tự viết; cài `alert`, `radio-group`, `collapsible`; 3 token bo góc ngữ nghĩa
`--radius-surface/control/thumb` + token `--star`; `src/lib/constants.ts` (giới hạn ký tự + toạ độ
Đà Nẵng dùng chung client/server); `src/lib/format.ts` mở rộng (`formatRating`, `formatDate`,
`formatDistance`, `formatCoordinate`); `places/lib/price-level.ts`; `Comment.isMine` do server kết
luận; `docs/CONVENTIONS.md`. Quét cơ học: 13 `rounded-[…]`, 5 `text-[10px]`, 7 bảng màu thô,
4 `toFixed`/`toLocaleDateString`, 4 `"₫".repeat` → hết.

Còn lại, cập nhật sau đợt chuẩn hoá thứ hai (2026-11-08):

- [x] **`Spinner` `aria-label="Loading"` tiếng Anh** — đã override `aria-label` tiếng Việt ở
      **21/21** chỗ dùng (settings đã có sẵn từ trước). Quy tắc ghi tại `CONVENTIONS.md` §9.
- [x] **Bọc `Spinner` trong `role="status"`** — 0 chỗ còn lại (grep sạch).
- [x] **2 `title=` còn lại** — không phải tooltip: 1 là prop `title` của `Section` (trang demo),
      1 là prop `title` của `ShareButton`. Cả hai là dữ liệu component, không phải `title` HTML.
- [x] **`cn-toast` trong `sonner.tsx:35`** — đã xác minh: `grep cn-toast dist/assets/*.css` → 0 kết
      quả, tức class không được định nghĩa trong CSS đã build. Là class chết của template, vô hại.
      Không sửa tay file `ui/`; nếu shadcn registry cập nhật sẽ tự hết.
- [x] **`Toggle` chỉ dùng gián tiếp** — 6 file dùng trực tiếp (post-card, comment-item,
      post-detail-page, discover-page, profile-header, collection-like-button).
- [x] **`skin-toggle.tsx` file chết** — đã xoá.
- [x] **`<main>` lồng trong `design-showcase-page`** — đã đổi thành `<div>`.
- [x] **`AppShell` lặp 13 lần trong `routes.tsx`** — đã chuyển thành layout route + `<Outlet />`.
- [x] **Không có `errorElement`** — đã thêm `RouteErrorPage` cho layout route.
- [x] **`ICON_MAP` trùng `NAV_ITEMS.icon`** — đã xoá `ICON_MAP`.
- [x] **Fixture tác giả nhân bản 3 nơi** — gộp về `fixtures/users.ts` làm nguồn duy nhất:
      `CURRENT_USER`/`AUTHORS`/`AUTHOR_LIST` suy từ `MOCK_USERS`; `posts.ts`, `comments.ts`,
      `server.ts` chỉ import (bỏ alias `COMMENT_USER`).
- [x] **`NotificationKind` export không dùng** — đã xoá.
- [x] **`DanangDistrict` type không dùng** — đã xoá.
- [x] **`InfiniteData` typing trong `use-infinite-scroll`** — 0 tham chiếu còn lại sau khi đổi sang
      `useIntersectionObserver`.
- [x] **Asset không dùng** — đã xoá `hero.png`, `react.svg`, `vite.svg`, `src/assets/fonts/`
      (0 tham chiếu trong src/index.html/vite.config; font thật dùng `@fontsource`).
- [x] **`zustand` chưa dùng** — **quyết định: GIỮ** dependency (người dùng chọn giữ cho state toàn
      cục sau này). Không đếm là nợ kỹ thuật; nếu 2 đợt nữa vẫn chưa dùng thì gỡ.
- [x] **`index.css` comment sai + rule `small` chết** — đã xoá trong đợt trước.
- [x] **`docs/STACK.md` ghi `lib/seed-color.ts`** — đã sửa.
- [x] **BACKLOG ghi sai `zod`/`react-hook-form`/`resolvers`/`sonner` "chưa dùng"** — đã sửa.
- [x] **`Badge` không co 16px** — đính chính: co được (twMerge kiểm chứng).
- [ ] **`scratch/size-parity.mjs` (D-017)** — script **không còn trong repo** (find → 0 kết quả).
      Nếu cần so sánh kích thước token cũ/mới, viết lại theo bộ token
      `--radius-surface/control/thumb` thay vì coi kết quả lệch là lỗi.

## Bug phát hiện khi nghiên cứu đề xuất (2026-11-08)

- [ ] **Placeholder trả lời bình luận hiển thị nguyên văn `@{replyTo.author.handle}`** — template
      literal thiếu `$` tại `src/features/social/components/comment-composer.tsx:62-64`. Sửa 1 ký tự.
- [ ] **Fixture thông báo hệ thống ghi "Khu vực Quận 1"** (`src/mocks/fixtures/notifications.ts:41`)
      — Đà Nẵng không có Quận 1 (đó là TP.HCM). Sửa thành tên quận Đà Nẵng thực tế.

## Phát hiện 2026-11-08 (bỏ Trip, chuyển Phòng lọc nhóm)

- [ ] **Backend thật cho đa thiết bị (Phòng lọc nhóm)** — mock là db in-memory per tab; đồng bộ
      giữa các thiết bị thật bắt buộc WebSocket/Supabase Realtime. Đợt này chỉ demo các tab cùng
      1 trình duyệt qua BroadcastChannel + localStorage.
- [ ] **`GET /places` nhận thêm `priceMax`/tag/keyword** — hiện chỉ lọc `category`/`district`/`q`
      (server.ts `listPublishedPlaces`); filter nhóm về mức giá/tag phải lọc client-side.
- [ ] **`calendar` + `dnd-kit` đã cài chưa có nơi dùng** sau khi bỏ Trip — gỡ hoặc chờ tính năng
      mới dùng lại; quyết định khi Phòng lọc nhóm hoàn thiện.
