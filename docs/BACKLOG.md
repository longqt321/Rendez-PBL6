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

## Phát hiện khi bỏ ảnh món (2026-11-10, D-049)

- [ ] **471/491 địa điểm chưa có ảnh thật** — chỉ 20 quán có ảnh venue. Cần nguồn ảnh hợp
      pháp (chụp thực địa, xin phép quán, hoặc Google Places API có key) trước khi phát hành.
- [ ] **Tính năng đăng ảnh của người dùng** (upload ảnh check-in) — hiện bỏ hẳn ảnh khỏi bài
      đăng vì chưa có backend lưu file. Khi có backend, thêm `imageUrl` vào `Post`.
- [ ] **Ảnh bìa hồ sơ** đang là placeholder — cần upload thật.
- [ ] **Trang tìm kiếm: tab "Mọi người"** chỉ còn tài khoản hiện tại (cold-start không có tài
      khoản ảo). Cần dữ liệu người dùng thật hoặc ẩn tab khi rỗng.

## Ưu tiên cao

(không còn — test runner, CI, pre-commit hook đã có ở D-037)

## Ưu tiên trung bình

- [ ] **A11y còn lại**: đã có skip-link, focus-on-navigate, tiêu đề tab (D-037); chưa audit
      contrast toàn trang và keyboard nav từng dialog.

## Ưu tiên thấp

- [ ] **Chưa cấu hình `base` cho Vite** nếu deploy dưới subpath.

## Phát hiện khi dùng design stack (2026-11-06)

- [ ] **Cảnh báo `<script>` trong `#root` ở chế độ dev.** `next-themes` render script chống nháy
      theme bên trong React tree → React 19 cảnh báo script không thực thi. Đã xác minh:
      chỉ ở dev, production sạch, không phải code dự án. Chi tiết ở `DECISIONS.md` D-008.
      Nếu muốn sạch console: tự viết theme provider và sửa `src/components/ui/sonner.tsx`.
- [x] **Bundle lớn** — đã code-split theo route (D-037): 1.244 kB → 456 kB (gzip 384 → 147 kB);
      mock tách khỏi bundle production.
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
- [x] **`/notification` chưa có infinite scroll.** Đã làm 2026-11-09: `useNotifications` dùng
      `useInfiniteQuery`, sentinel ở tab "Tất cả", mock phân trang 20 mục/trang.
- [x] **`/social` chưa có infinite scroll.** Đã làm 2026-11-09: `usePosts` dùng `useInfiniteQuery`
      (mock 5 bài/trang), sentinel + "Đang tải thêm" ở cuối feed; `/saved` và `/search` dùng chung
      hook nên cũng phân trang theo. `patchPostInCache` đã xử lý `InfiniteData`.
- [x] **Nút "Đăng xuất" chưa có hành vi.** Đã làm 2026-11-09: `DELETE /session` (mock tắt phiên →
      `GET /me` 401), `useLogout` xoá cache + về trang chủ; menu đổi thành "Đăng nhập" (chỉ ở dev,
      `POST /session` đăng nhập lại). Prod để backend/route đăng nhập đảm nhận.
- [ ] **Mock chỉ chặn `/me` khi chưa đăng nhập.** `GET /places/saved`, `/collections`, `/notifications`,
      `GET /posts?filter=saved` vẫn trả dữ liệu của `CURRENT_USER` sau khi đăng xuất — backend thật sẽ 401. Cần UI "yêu cầu đăng nhập" dùng chung (ErrorState/Empty riêng) rồi mới gate các endpoint này;
      làm nửa vời sẽ khiến trang hiện lỗi chung chung.
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

- [x] **`PATCH /me` chưa có route mock.** Đã làm 2026-11-09: route mock + `useUpdateMe` (ghi cache
      `["me"]`), form `/settings` lưu thật; thêm `privateProfile` vào `UserProfile` + schema zod.
      Backend thật chỉ cần implement đúng hợp đồng `PATCH /me` (4 trường) là chạy.
- [x] **Lưu/bỏ lưu địa điểm chưa có endpoint.** Đã làm 2026-11-09: `GET /places/saved` (gộp địa điểm
      trong bộ sưu tập của tôi) + tab "Địa điểm" ở `/saved`. Nút lưu vẫn đi qua bộ sưu tập
      (`SaveToCollectionDialog`) — không cần endpoint `PATCH /places/:id/save` riêng.
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

- [x] **`/profile` luôn rỗng.** Đã thêm `post-11`/`post-12` của `u-me` (2026-11-09) → tab Bài đăng
      của `/profile` có nội dung ngay từ lần chạy đầu.
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
- [ ] **Một địa điểm cố ý để `publishedAt: null`** — nay là `banh-cuon-11361296208` (danh sách
      `UNPUBLISHED_IDS` trong `src/mocks/fixtures/cold-start-places.ts`). Đây là ứng viên cho job đề
      xuất địa điểm phía server (`syncPlaceSuggestions`). Đừng publish nó khi chỉnh dữ liệu mẫu,
      nếu không luồng "Đề xuất thêm địa điểm" sẽ hết ứng viên.
- [x] **Nút "Nhắn tin" trên `/u/:handle` vẫn không có handler** — đã chốt 2026-11-09: tắt nút
      (`disabled`) + `Tooltip` giải thích "sẽ mở khi backend hoàn thiện". Cần backend (WebSocket +
      lưu hội thoại) mới bật lại.
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
luận; `CONVENTIONS.md`. Quét cơ học: 13 `rounded-[…]`, 5 `text-[10px]`, 7 bảng màu thô,
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
- [x] **`STACK.md` ghi `lib/seed-color.ts`** — đã sửa.
- [x] **BACKLOG ghi sai `zod`/`react-hook-form`/`resolvers`/`sonner` "chưa dùng"** — đã sửa.
- [x] **`Badge` không co 16px** — đính chính: co được (twMerge kiểm chứng).
- [ ] **`scratch/size-parity.mjs` (D-017)** — script **không còn trong repo** (find → 0 kết quả).
      Nếu cần so sánh kích thước token cũ/mới, viết lại theo bộ token
      `--radius-surface/control/thumb` thay vì coi kết quả lệch là lỗi.

## Bug phát hiện khi nghiên cứu đề xuất (2026-11-08)

- [x] **Placeholder trả lời bình luận hiển thị nguyên văn `@{replyTo.author.handle}`** — đã sửa
      2026-11-09 (thêm `${}` trong template literal).
- [x] **Fixture thông báo hệ thống ghi "Khu vực Quận 1"** — đã sửa 2026-11-09 thành "Quận Sơn Trà".

## Phát hiện 2026-11-08 (bỏ Trip, chuyển Phòng lọc nhóm)

- [ ] **Backend thật cho đa thiết bị (Phòng lọc nhóm)** — mock là db in-memory per tab; đồng bộ
      giữa các thiết bị thật bắt buộc WebSocket/Supabase Realtime. Đợt này chỉ demo các tab cùng
      1 trình duyệt qua BroadcastChannel + localStorage.

## Phát hiện 2026-11-09 (rà soát sâu đợt 3) — đã xử lý

Cả 6 mục đã xử lý trong D-036 (thiếu `<h1>`, rating không tính lại, ô tìm kiếm topbar khi trong
phòng, nhiều từ khoá include OR, trùng tên khi tham gia, race 2 tab join cùng lúc). Ghi lại để tra
lịch sử; không còn việc mở ở đây.

- [ ] **Điểm đánh giá hiển thị chưa thấy đổi trực quan khi test** — fixture `reviewCount` rất lớn
      (1120–5210) nên 1 review mới chỉ đổi điểm ở chữ số thứ 2; aggregate đã đúng nhưng cần dữ
      liệu nhỏ hơn để kiểm chứng bằng mắt. Không phải bug.

## Phát hiện 2026-11-10 (tái sinh cold-start D-046)

- [ ] **Quận còn quá ít địa điểm** — Hải Vân 1, Hòa Xuân 7, An Khê 7, Hòa Khánh 10,
      Liên Chiểu 10. Nguồn web công khai (tinyfish + Nominatim) chỉ trả về ít ứng viên
      đạt chuẩn (địa chỉ số nhà + đường + geocode thành công); 50 ứng viên bị loại do
      geocode miss, có thể retry với nguồn khác (Google Maps không key, Foursquare…).
- [ ] **Ảnh venue thật** — hiện 458/492 dùng ảnh món đại diện theo nhóm (Commons);
      chỉ 35 ảnh venue thật. Cần nguồn ảnh quán thật (Google Places API key hoặc
      thu thập thủ công) để thay `imageKind: "dish"` bằng ảnh quán.
- [ ] **Ảnh lặp tối đa 9 lần** — pool 194 ảnh / 492 place; thêm ảnh sẽ giảm lặp.

## Phát hiện 2026-11-10 (audit thị giác ảnh D-047)

- [x] **247 ảnh rác trong ảnh Commons** (biển hiệu, logo, bưu thiếp, tranh vẽ, panorama,
      ảnh người/lịch sử, nguyên liệu sống, ảnh sai nhóm) — đã xoá qua 5 vòng audit thị giác,
      blocklist 148 URL, lọc tiêu đề theo nhóm, tên file hash.
- [ ] **~11% ảnh dish còn lại có thể lệch nhẹ** — audit lặp lại khi có ảnh mới; cân nhắc
      dùng model vision chấm điểm tự động trong CI.
- [ ] **8 place mất hết ảnh venue** sau audit (biển hiệu/món chen vào) — UI fallback ảnh
      seed; cần ảnh venue thật từ nguồn khác.

## Phát hiện 2026-11-10 (bản đồ theo khung nhìn — D-052)

- [ ] **Hợp đồng backend mới `GET /places/map?bbox=minLng,minLat,maxLng,maxLat`** — trả
      `{ items, total }`, không phân trang, chặn trên 300 pin, nhận cùng bộ lọc với `/places`
      (category, district, q, priceMax, keywords, room). Backend thật phải implement cùng semantics
      bbox (lọc theo tâm địa điểm nằm trong khung).
- [ ] **Hiệu năng render khi khung nhìn rất rộng** — chặn 300 pin hiện chưa đo bằng mắt; cân nhắc
      cluster marker nếu số pin thực tế lớn hơn.
- [ ] **`/map` vẫn tải 2 nguồn** — `useDiscoverView` gọi `/places` trang 1 chỉ để quyết
      định skeleton/Empty, trong khi pin lấy từ `/places/map`. Bỏ được cần tách
      `useDiscoverView` thành hook bộ lọc (URL) + hook dữ liệu riêng — refactor ảnh hưởng
      cả `/discover`, chưa làm trong D-053.
- [ ] **Tile OSM cho production** — OSM tile chuẩn không cho phép dùng nặng (đã thấy
      `x-blocked: Access denied` khi UA lạ). Trước khi có traffic thật cần đổi sang provider
      có key/SLA (MapTiler, Carto, Stadia) hoặc self-host (tileserver-gl). D-054 mới giảm
      request, chưa giải quyết policy.
- [ ] **Cache tile bền bằng service worker** (`vite-plugin-pwa` + workbox `runtimeCaching`
      CacheFirst cho domain tile) — cần duyệt thêm dev dependency trước khi làm.

## Phát hiện 2026-11-11 (Phase 0 backend — T0.1→T0.5)

- [ ] **Schema v1 thiếu bảng theo kế hoạch** — mục 4.1 của `de-xuat-techstack-backend.md`
      liệt kê 18 bảng nhưng không có `follows` (cần cho T5.4 follow/unfollow) và
      `place_suggestion_notifications` (cần cho T4.4 idempotence job — unique `(post_id)`).
      Thêm bằng migration riêng ở phase tương ứng, không sửa migration đã chạy.
- [ ] **Bảng vận hành chưa có** — `idempotency_keys` (K2), `rate_limits` (H4),
      `audit_logs` (F3): thêm khi làm phase tương ứng (K2/H4/F3), không làm từ đầu.
- [x] **`GET /places/saved` phân trang** — đã xác minh 2026-11-11: `listSavedPlaces` dùng keyset
      `(created_at, id)` + `LIMIT pageSize+1`, trả `next` như các danh sách khác.
- [ ] **Benchmark `unaccent + pg_trgm`** — dataset 491 dòng không đại diện; đo lại khi
      ≥ 50k place (đã ghi ở Phần E kế hoạch).
- [ ] **Nút "Nhắn tin"** — `disabled` + tooltip "sẽ mở khi backend hoàn thiện" (D-043);
      bật khi có room/messaging thật (Phase 6+).
- [ ] **Prisma dev log spam** — `log: ["query"]` ở dev in mỗi query ra stdout (đã thấy khi
      seed). Cân nhắc gate bằng env riêng (ví dụ `LOG_SQL=1`) thay vì mặc định bật.

## Phát hiện 2026-11-11 (e2e với backend thật)

- [ ] **FE chưa có form đăng nhập email+password** — `POST /session` của FE gửi không body
      (chỉ hợp lệ với mock dev-bypass). Với backend thật, menu "Đăng nhập" trả 400. e2e
      project `backend` bỏ qua `logout.spec.ts` vì bước "đăng nhập lại" không thể chạy;
      cần UI đăng nhập thật (T1.3) rồi bỏ `testIgnore` trong `playwright.config.ts`.
- [ ] **e2e tạo user mới mỗi lần chạy** — `e2e/global-setup.ts` dùng hậu tố thời điểm để
      tránh dữ liệu cũ (báo cáo trùng) làm spec fail. Về lâu dài nên có reset DB cho e2e
      (script seed sạch) thay vì user mỗi-lần-chạy.

## Phát hiện 2026-11-11 (Docker + audit enum)

- [ ] **Image runtime kèm devDependencies** — Bun workspace không tạo được node_modules
      production sạch ở stage riêng (symlink workspace chỉ đúng trong cây install đầy đủ);
      runtime COPY nguyên node_modules của builder. Cân nhắc `bun install --production`
      trong backend hoặc registry riêng khi cần thu gọn image.

## Phát hiện 2026-11-11 (audit vòng 2)

- [ ] **Rate limit tin `X-Forwarded-For` mù quáng** — `lib/rate-limit.ts` lấy phần tử
      đầu của `XFF` làm IP; client gọi thẳng API có thể tự đặt header để xoay IP ảo,
      né giới hạn đăng ký/đăng nhập. Khi có reverse proxy thật cần cấu hình
      "trusted proxy" (chỉ tin XFF từ IP proxy đã biết), ví dụ env `TRUSTED_PROXIES`.
- [ ] **`POST /posts` caption chứa ký tự NUL** — đã map SQLSTATE 22021 → 400 ở
      `onError` (624ce5d); về lâu dài có thể thêm middleware strip control chars
      nếu xuất hiện thêm lỗi đầu vào tương tự.
- [ ] **OpenAPI spec `/doc` + Swagger UI `/ui` (K7)** — routes đăng ký bằng `router.get`
      thường thay vì `createRoute` của `@hono/zod-openapi` nên chưa sinh spec tự động.
      Tài liệu hợp đồng hiện là `docs/backend/API.md` (markdown, đủ 52 mục). Muốn có spec
      3.1 cần chuyển dần route sang `createRoute` (công sức lớn, giá trị chủ yếu cho
      client codegen).

## Phát hiện 2026-11-11 (audit vòng 5)

- [ ] **Index biểu thức không khai báo được trong Prisma schema** — GIN `pg_trgm`
      (`places_search_trgm_idx`) và các hàm `immutable_*` chỉ có trong migration SQL.
      `prisma migrate dev` về sau sẽ thấy "drift" và có thể đề nghị xoá; cần ghi chú khi
      tạo migration mới hoặc chuyển sang `prisma migrate diff` + chỉnh tay. `migrate deploy`
      (CI/compose) không bị ảnh hưởng.
- [ ] **Benchmark `pg_trgm` ở quy mô lớn** — dataset 491 dòng; cần ≥ 50k dòng để đo
      lợi ích index tìm kiếm.
- [ ] **Thay SigV4 tự viết bằng `aws4fetch`** (vòng audit 2026-11-11) — `lib/r2.ts` tự cài
      AWS SigV4 bằng `node:crypto` vì `@aws-sdk/*` không nằm trong danh sách dependency đã
      chốt. Đã test theo spec AWS (không có credentials thật để xác minh end-to-end). Nếu sau
      này cần thêm operation (GET presigned, multipart), đề xuất cài `aws4fetch` (~2 KB,
      không dependency, chính thống cho edge/Bun) thay vì mở rộng bản tự viết.
- [ ] **Corpus mở rộng từ OSM (1.872 place) đang là WIP của người dùng** — `backend/data/`,
      `backend/scripts/fetch-osm/`, `backend/scripts/build-corpus/` chưa commit; seed ưu tiên
      `places-expanded.json` nếu có. Backend đã tương thích (seed + test không phụ thuộc
      dataset cụ thể), nhưng cần quyết định: commit corpus vào repo hay tải lúc build, và
      đối chiếu lại số liệu trong báo cáo đồ án (hiện ghi theo dataset 491 place).
