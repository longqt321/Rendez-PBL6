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

- [ ] **Phần lớn địa điểm chưa có ảnh thật** — chỉ 20 quán có ảnh venue (corpus hiện tại 344
      place; phát hiện ban đầu là 471/491 khi dataset còn 491). Cần nguồn ảnh hợp
      pháp (chụp thực địa, xin phép quán, hoặc Google Places API có key) trước khi phát hành.
- [x] **Tính năng đăng ảnh của người dùng** (G5b, 2026-11-11) — `Post.images[]` (tối đa 4,
      bảng `post_images`), composer tải ảnh qua presigned URL (`POST /media` → PUT R2).
      Chưa xác minh với bucket R2 thật (không có credentials); prefix `posts/<userId>/` đã được
      kiểm bằng test với env giả.
- [ ] **Presign ký `content-type` chưa xác minh với R2 thật** — đã đưa `content-type` vào
      signed headers (SigV4) và kiểm qua URL params trong test, nhưng chưa có credentials để
      PUT thật lên bucket xác nhận R2 chấp nhận chữ ký này.
- [ ] **Dọn object mồ côi trên R2** — ảnh đã PUT lên bucket nhưng bài đăng bị từ chối
      (validate fail) hoặc người dùng bỏ không đăng sẽ nằm mãi trong bucket. Cần job dọn định
      kỳ (so khớp object trong `posts/<userId>/` với bảng `post_images`) hoặc lifecycle rule.
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
- [x] **Bảng vận hành** — `idempotency_keys` (K2) và `rate_limits` (H4) đã có (2026-11-11);
      còn thiếu `audit_logs` (F3): thêm khi làm phase tương ứng.
- [x] **`GET /places/saved` phân trang** — đã xác minh 2026-11-11: `listSavedPlaces` dùng keyset
      `(created_at, id)` + `LIMIT pageSize+1`, trả `next` như các danh sách khác.
- [ ] **Benchmark `unaccent + pg_trgm`** — dataset 344 dòng không đại diện; đo lại khi
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
- [ ] **Benchmark `pg_trgm` ở quy mô lớn** — dataset 344 dòng; cần ≥ 50k dòng để đo
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
      đối chiếu lại số liệu trong báo cáo đồ án — ĐÃ XONG (2026-11-11): báo cáo ghi theo
      dataset 344 place (86 curated + 258 OSM).

## 2026-11-11 — G1 (vòng đời tài khoản) xong, việc phát sinh

- [x] **FE chưa có form đăng nhập email+password** — ĐÃ LÀM (G1): `/login`, `/register`,
      `/forgot-password`, `/reset-password`; bỏ `testIgnore` logout.spec trong playwright.config.
- [ ] **SMTP thật cho quên/đặt lại mật khẩu** — ĐÃ LÀM phần backend (2026-11-12):
      `lib/mailer.ts` gửi qua SMTP chuẩn (nodemailer, tương thích Resend/Brevo/SES),
      biến env `SMTP_*` + `MAIL_FROM` (env.ts, compose.prod.yml, deploy/.env.example),
      hướng dẫn Resend ở `docs/backend/SMTP-SETUP.md`. CÒN LẠI: người dùng tự đăng ký
      Resend + xác minh domain rồi điền env; UI "đã gửi email" hiện đã có.
- [x] **Xác thực email khi đăng ký** — đã bật (D-056, 2026-11-12): đăng ký trả
  `{requiresVerification:true}`, mail xác thực qua mailer, trang `/verify-email`, migration
  backfill user cũ. CÒN LẠI: đổi email (kèm xác thực lại) chưa làm.
- [ ] **Cho phép đăng ký lại email đã xoá tài khoản** (hiện unique index chặn — DECISIONS 24).
- [ ] **Xuất dữ liệu cá nhân** (plan H6) — rà soát khi làm.
- [ ] **Cache gợi ý là per-instance** (Map TTL trong tiến trình, DECISIONS 27) — khi chạy nhiều
      instance cần Redis hoặc chấp nhận mỗi instance tự nạp lại sau TTL.
- [ ] **`/users/:handle` chỉ cache 15s** — nếu hồ sơ đổi (follow/bio) client có thể thấy dữ liệu
      cũ tối đa 15s; cân nhắc ETag revalidate thay vì max-age khi có nhiều người dùng thật.
- [x] **Thông báo polling 60s** → **ĐÃ LÀM SSE per-user** (G6.3, commit `66c0423`):
      `GET /notifications/events` + `notification-events.ts`, badge cập nhật ngay. Poll 60s giữ
      lại làm lưới an toàn khi SSE lỗi/mock bật.
- [ ] **SSE thông báo cũng chỉ đúng một tiến trình** — cùng giới hạn với SSE phòng; khi scale
      nhiều instance phải chuyển sang LISTEN/NOTIFY hoặc Redis (một chỗ sửa cho cả hai kênh).
- [ ] **EventSource không gửi được header tuỳ biến** — nếu sau này API tách domain khác (CORS
      cross-site), cookie `SameSite=Lax` sẽ không được gửi; phải dùng fetch-stream hoặc token
      ngắn hạn trên query. Hiện tại same-origin qua proxy nên chưa ảnh hưởng.
- [ ] **Feed following chưa gợi ý người để theo dõi** — khi feed rỗng chỉ hiện empty state;
      nên thêm khối "Gợi ý theo dõi" (dùng `GET /users?q=`).
- [ ] **Chưa có staging/monitoring** — deploy thật cần healthcheck ngoài (UptimeRobot),
      log aggregation, alert; hiện chỉ có /healthz, /readyz.
- [ ] **Backup chưa có restore drill tự động** — script restore nên viết kèm và test định kỳ.

## 2026-11-11 — G5 (e2e trên backend thật) xong, việc phát sinh

- [ ] **Ảnh địa điểm chỉ có 20/344 place** (corpus OSM không có ảnh): trang đầu `/discover`
      giờ có ảnh nhờ seed sắp ảnh lên trước, nhưng phần lớn place vẫn hiện placeholder. Cần bổ
      sung ảnh (R2) hoặc nguồn ảnh có giấy phép cho corpus mở rộng.
- [ ] **E2E backend cần dev DB đã seed + API container đang chạy**: chưa tự động hoá trong CI
      (job `e2e-mock` chỉ chạy mock). Muốn chạy backend trong CI cần service Postgres + migrate +
      seed + build API — cân nhắc khi CI có thời gian chạy dài hơn.
- [x] **`e2e/.auth/*.json` là file sinh ra khi chạy** — đã kiểm: `.gitignore:44` bỏ qua
      `frontend/e2e/.auth`, không commit session/tài khoản demo.

## 2026-11-11 — Bảo mật phòng lọc nhóm (D-056/D-057) xong, việc phát sinh

- [ ] **SSE chỉ đúng khi API chạy một tiến trình** — subscriber lưu RAM; scale nhiều instance
      phải chuyển sang LISTEN/NOTIFY của Postgres hoặc Redis.
- [ ] **`publishRoom` phát version trong RAM** — sau restart tiến trình, version về 0; client
      đang mở stream không bị ảnh hưởng (vẫn refetch khi có event) nhưng không thể dùng version
      để chống trùng giữa các instance.
- [ ] **Apply hai đề xuất KHÁC NHAU song song** vẫn có thể lost-update filter (mỗi transaction
      đọc `room.filter` rồi ghi đè). Cần `SELECT ... FOR UPDATE` trên hàng `rooms` hoặc cột
      version khi có nhu cầu thật.
- [ ] **Kiểm tra Caddyfile tắt buffering cho route SSE** (`deploy/Caddyfile`) — chưa xác minh
      trong môi trường deploy thật; nếu proxy đệm, event `room-updated` sẽ trễ.
- [ ] **Rate limit join theo IP** dùng chung NAT có thể chặn nhầm nhóm đông người (20/phút);
      theo dõi khi có người dùng thật, cân nhắc tăng ngưỡng hoặc key theo mã phòng.
- [ ] **E2E mock mô phỏng cookie bằng `db.roomTokens`** — không kiểm được thuộc tính
      HttpOnly/SameSite/Path thật; cần test tích hợp backend (hoặc e2e project backend) để xác
      nhận header Set-Cookie.

## 2026-11-11 — Lỗi có sẵn (không do thay đổi rooms): `Retry-After` mất khi rate limit

- [x] **ĐÃ SỬA** (`backend/src/lib/rate-limit.ts`): middleware trả `c.json(..., 429, { "Retry-After" })`
      trực tiếp thay vì `throw ApiError`, vì `onError` dựng lại `Response` từ `HTTPException`
      và làm rơi header đặt qua `c.header()`. `test/infra.test.ts` + `test/rate-limit-ip.test.ts`
      xanh trong lần chạy 174 test gần nhất.

## 2026-11-11 — Ảnh bài đăng (G5b) + audit vòng 3, việc phát sinh

- [ ] **E2E ảnh trên backend thật cần R2** — hiện `POST /media` trả 503 (chưa cấu hình R2),
      nên `e2e/social.spec.ts` nhánh backend kiểm hành vi suy giảm (báo "Tính năng ảnh chưa
      được cấu hình", giữ nội dung + ảnh để thử lại). Khi có bucket thật, thêm biến môi trường
      và chạy lại nhánh upload thật (presigned PUT + `publicUrl` render).
- [ ] **Presigned PUT với `content-type` đã ký** — chưa xác minh trên bucket R2 thật; cần
      kiểm cả trường hợp client gửi `UNSIGNED-PAYLOAD` bị từ chối.
- [ ] **Object R2 mồ côi** — nếu `POST /posts` fail sau khi PUT ảnh xong, object nằm lại
      bucket. Cần job dọn theo prefix `posts/<userId>/` hoặc lifecycle rule.
- [ ] **`mediaUnavailable` chỉ được phát hiện khi submit** — nên dò một lần lúc mount
      (HEAD/GET nhẹ) để ẩn nút "Thêm ảnh" sớm, tránh người dùng chọn ảnh rồi mới biết.
- [ ] **Mock rooms dùng một token/phòng** — đúng với thực tế một browser (mỗi browser một
      cookie/phòng), nhưng không mô phỏng được nhiều guest song song trong cùng một tab.
      Nếu cần test đa khách, phải chạy ở project `backend` với nhiều browser context.


## 2026-11-12 — Quét UX qua đêm (vòng 1: auth) — báo cáo QUET-vong1-auth.md

- [x] **V1-02 (lớn)**: đăng ký email đã tồn tại vẫn hiện màn "kiểm tra email" như thành công
      (API 201 generic-duplicate, không tạo user, không gửi link verify) — người dùng chờ mail
      mãi. Trùng handle lại báo lỗi rõ → không nhất quán. Chọn một: gửi lại link verify cho
      email cũ (resend flow) hoặc trả thông báo "email đã đăng ký".
- [x] **V1-01 (lớn)**: guest vào `/profile`, `/settings` thấy lỗi "không tải được hồ sơ — kiểm
      tra kết nối" (401 bị đóng gói thành lỗi mạng), thiếu CTA đăng nhập. Cần redirect
      `/login?next=` hoặc trạng thái "cần đăng nhập".
- [x] **V1-03 (lớn)**: `/verify-email` không có token vẫn hiện "xác thực thành công" — trạng
      thái giả. Thiếu/sai token phải hiện lỗi + nút gửi lại.
- [x] **V1-04 (lớn)**: đặt lại mật khẩu token sai → alert "Invalid token" tiếng Anh raw từ API;
      cần map sang tiếng Việt.
- [x] **V1-05**: nút submit không disable khi pending — double-click đăng nhập tạo 2 POST session.
- [ ] **V1-06 (nhỏ)**: SSE `/notifications/events` lỗi `ERR_INCOMPLETE_CHUNKED_ENCODING` lặp
      ~12s/lần trong console — rà reconnect/backoff + timeout proxy nginx.
- [ ] **V1-07 (nhỏ)**: vùng chạm input 32px / nút 32–40px < 44px chuẩn mobile.
- [ ] **V1-08 (nhỏ)**: input lỗi thiếu `aria-invalid` + `aria-describedby`.
- [x] **V1-09 (nhỏ)**: đã đăng nhập vẫn mở được `/login`, `/register`; title trang auth thiếu.
- [x] **V1-10, V1-11 (gợi ý)**: toast sau đăng xuất; menu guest thiếu "Đăng ký"; "Email không
      hợp lệ" khi để trống nên là "Cần nhập email".

## 2026-11-12 — Quét UX qua đêm (vòng 2: discover + trang quán) — QUET-vong2-discover.md

- [ ] **V2-01 (lớn)**: `/discover` không có tiêu đề nhìn thấy (h1 `sr-only`) — người dùng đáp
      xuống chỉ thấy chip "Quận:". Cần heading thật + mô tả ngắn.
- [ ] **V2-02 (lớn)**: thiếu bộ lọc giá và thiếu hẳn sắp xếp (rating/giá/khoảng cách); popover
      Lọc chỉ có Từ khoá + Loại hình.
- [ ] **V2-03 (lớn, dữ liệu)**: 100% quán `tags=[]`, `priceLevel=1`, `status=unknown`; không có
      giờ mở cửa/SĐT/website; "Giới thiệu" boilerplate giống nhau; card nào cũng "Chưa có đánh
      giá" + "₫". Cần làm giàu corpus (tags/giá/giờ mở cửa) và ẩn field rỗng thay vì hiện rỗng.
- [ ] **V2-04 (lớn, mobile)**: `imageHeight=320` cố định mọi breakpoint → card mobile 164×320,
      crop dọc mất ~62% ảnh, mỗi màn chỉ ~1,3 card. Cần chiều cao ảnh theo breakpoint / aspect-ratio.
- [ ] **V2-05 (perf)**: hero trang quán (LCP) dùng `loading="lazy"`, không `srcset/fetchpriority`;
      ảnh lưới full-size không responsive.
- [ ] Các mục V2-06…V2-15 xem báo cáo (chi tiết nhỏ/gợi ý).

## 2026-11-12 — Quét UX qua đêm (vòng 3: social) — QUET-vong3-social.md

- [x] **V3-01 (chặn luồng follow)**: API JSON trả `Cache-Control: private, max-age=15` —
      bấm "Theo dõi" xong refetch ăn disk cache 15s → nút + số đếm không đổi, người dùng
      bấm lại thành unfollow. API nên `no-store` (chỉ cache GET công khai như /places/:id).
- [x] **V3-02 (lớn)**: không có cách tìm người để theo dõi — không user directory/search user;
      tên tác giả trên card là link tới bài chứ không phải hồ sơ; empty state tab "Đang theo
      dõi" không có CTA.
- [ ] **V3-03 (lớn)**: không sửa/xoá được bài của mình (không menu, không API), không ghim
      được bài dù có tab "Đã ghim".
- [ ] **V3-04 (lớn)**: gợi ý địa điểm lộ chuỗi nội bộ ("khớp tên: dung · cùng khu vực: dung")
      và khớp rác theo chuỗi con ("noi"/"dung") — cần làm sạch lý do hiển thị + khớp theo từ.
- [ ] **V3-05 (lớn)**: không giới hạn ảnh — upload được 22,8MB; file .png 17 byte không phải
      ảnh vẫn nhận → bài có ảnh hỏng vĩnh viễn. Cần validate size + magic bytes ở server
      (presigned PUT ràng buộc content-length) và client.
- [ ] Các mục V3-06…V3-19 xem báo cáo.

## 2026-11-12 — Quét UX qua đêm (vòng 4: map/rooms/collections) — QUET-vong4-map-rooms.md

- [ ] **V4-01 (một phần — vòng 6 đính chính)**: nút "Tham gia" disabled chỉ vì ô tên trống
      (gõ tên khác là vào được) — KHÔNG phải lỗi chặn. Phần đúng còn lại: join bằng tên
      thành viên cũ báo "trùng tên", và room state theo sessionStorage per-tab khiến mở link
      mời ở tab mới phải nhập lại tên. Cân nhắc server-side membership (nhận diện theo userId).
- [x] ~~**V4-02 (chặn mobile)**~~ — **RÚT LẠI 2026-11-12 (vòng 6 kiểm chứng): BÁO CÁO SAI.**
      Đo lại 390px: scrollWidth 375 (không tràn), nút "Gửi đề xuất" left=32 on-screen, cả khi
      chưa join và đã join. Không có commit nào sửa rooms giữa 2 vòng. Chỉ còn đúng phần
      "nút cao 28px < 44px" (tap target, xem V1-07).
- [x] ~~**V4-03 (lớn)**~~ — **RÚT LẠI 2026-11-12 (vòng 6 kiểm chứng): BÁO CÁO SAI.**
      Lọc "Hải Châu" trên /map CÓ request `/places/map?bbox=…&district=…` và lọc đúng
      300 → 96 pin. Đã nối API đúng — KHÔNG sửa lại.
- [ ] **V4-04 (lớn)**: 2 nguồn dữ liệu mâu thuẫn trên /map: badge "9 địa điểm" (curated) cạnh
      "300/341" (OSM) — 9 quán curated chìm giữa 338 pin rỗng dữ liệu. Cần tách lớp dữ liệu
      hoặc badge rõ nguồn.
- [ ] **V4-05 (lớn, dữ liệu)**: phân loại OSM sai hàng loạt (Chợ Hàn/Co.opmart → "Quán ăn",
      kebab → "Cà phê") — chú giải + pin icon sai nghĩa ~40% pin. Cần rà CATEGORY_MAP
      build-corpus + rule phân loại.
- [ ] **V4-06**: room state sống sót qua đăng xuất — người kế tiếp trên máy chung kế thừa
      phòng + tên của người trước.
- [ ] **V4-08**: clustering quá thô — cụm 298 ở zoom thành phố; cụm 117/75 chỉ chứa 5 pin
      (radius 60px quá lớn, cân nhắc giảm hoặc dùng spiderfy).
- [ ] **V4-12, V4-13, V4-15**: guest 401 → "lỗi mạng" (lặp V1-01) ở /saved; không có nút tạo
      bộ sưu tập ngoài dialog lưu quán; Xoá tài khoản chỉ 1 click xác nhận (cần gõ handle).
- [ ] Các mục V4-07…V4-19 còn lại xem báo cáo.

## 2026-11-12 — Quét UX qua đêm (vòng 5: tổng hợp) — QUET-vong5-tong-hop.md

Nguyên nhân gốc lớn nhất (chi tiết trong báo cáo):
- RC-1: cache HTTP 15s áp cho cả dữ liệu riêng tư → follow/like trông như hỏng (V3-01).
- RC-5+RC-2: room state theo tab + nhận diện theo displayName; 401 bị đóng gói thành
  "lỗi mạng" lặp ở V1-01/V4-12.
- RC-8: corpus nghèo (0 quán có tags/giá/status) + OSM phân loại sai ~40% + 2 nguồn
  curated/OSM không hợp nhất.

Tính năng mới đề xuất (top 5, chi tiết 8–12 mục trong báo cáo):
- [ ] "Gợi ý hôm nay" — 3 quán/ngày ở đầu /discover (S; cron pg-boss sẵn có).
- [ ] Tìm người + gợi ý theo dõi (S; tiền đề tính năng xã hội, V3-02).
- [ ] Share + Open Graph preview cho post/quán (S; lan truyền Zalo/FB).
- [ ] Lọc giá + sắp xếp + lọc quận tác động map (S–M; trùng V2-02/V4-03).
- [ ] "Đóng góp thông tin quán" crowdsource giờ/giá/tag cho 258 quán OSM (M; tái dùng
      PlaceReport + pg-boss).

Thị giác (3 thay đổi nhỏ tạo khác biệt lớn): bật Fraunces cho h1 mọi skin + tagline;
đổi --primary sang màu ấm ẩm thực; monogram chén+đũa + favicon/OG image.

## 2026-11-12 — Quét UX qua đêm (vòng 6: kiểm chứng + đo lường) — QUET-vong6-kiem-chung.md

Kết quả kiểm chứng: 6/10 phát hiện nặng ĐÚNG, 2/10 SAI (đã rút lại ở trên), 2/10 một phần.
Số đo chính: TTFB 2–3ms, LCP 400–470ms, CLS≈0; cold transfer /discover 3,80 MB (ảnh PNG
1200×900 338–456KB, không srcset, lãng phí 60–95% pixel); feed có N+1 comments (/me ×2 +
3 request comments); 0/20 ca tràn ngang 5 breakpoint; 20/20 nút mobile /discover < 44px;
2 nav trùng aria-label; h1 /discover + /social là sr-only.

- [x] **V6-01 (lớn)**: like khi offline → UI đổi trạng thái vĩnh viễn, không rollback, không
      toast, DB không đổi — người dùng tưởng đã like. Cần xử lý lỗi mutation + rollback
      optimistic + thông báo.
- [x] **V6-02 (lớn)**: session hết hạn → like im lặng hoàn toàn (không lỗi, không redirect).
      Cần interceptor 401 toàn cục: thông báo + đưa về đăng nhập.
- [x] **V6-03 (lớn)**: guest bấm "Theo dõi" không có phản hồi gì.
- [ ] **V6-04 (perf)**: ảnh card/hero PNG full-size không srcset — chuyển WebP/AVIF + responsive
      srcset + `fetchpriority="high"` cho hero; giảm ~3MB cold load /discover.
- [ ] **V6-05**: không có service worker / offline state; popup map không vào history (Back
      thoát cả trang).
- [ ] **V6-06 (a11y)**: 2 nav trùng aria-label; /social có button vô danh + input file sr-only.

## 2026-11-12 — Quét UX qua đêm (vòng 7: coverage gaps) — QUET-vong7-coverage.md

Tốt (không sửa): tìm kiếm không dấu + phân nhóm tab; trang 404 route tử tế; notifications
realtime badge tự tăng qua SSE; bàn phím (Tab/Enter/Escape) ổn; zoom 200% không tràn;
0 chuỗi tiếng Anh lọt UI trên 9 trang.

- [x] **V7-01 (lớn)**: tab "Người" ở /search dùng MOCK_USERS (`search-page.tsx:67`) — tìm
      "quet" (API /users?q= trả user thật) vẫn báo không có; "minhanh" hiện hồ sơ ảo link về
      /profile của chính mình; còn gọi `/api/v1/search?q=` → 404 mỗi lần tìm.
- [ ] **V7-02 (lớn)**: SEO = 0 — index.html chỉ có title; không meta description/og:*/twitter:*;
      title động chung chung ("Địa điểm · Rendez"), không có tên quán/người.
- [ ] **V7-03 (lớn)**: soft-404 asset — /manifest.json, /favicon.ico, /apple-touch-icon.png,
      /robots.txt, /sitemap.xml, /og-image.png đều trả 200 text/html 160B (SPA fallback nuốt
      mọi path). Sửa fallback chỉ cho path không có phần mở rộng; thêm manifest + og-image thật.
- [x] **V7-04 (lớn)**: menu "Trợ giúp" là nút chết (`app-shell.tsx:373`); /help → 404; không có
      /about, /terms, /privacy.
- [ ] **V7-05 (lớn)**: focus trap rò rỉ ở dialog Bình luận — Tab 12 lần thì 3 lần thoát ra ngoài.
- [ ] **V7-06..08**: notification follow nhân đôi (5 dòng DB → 5 mục trùng trong tab "Tất cả (8)"),
      mục follow là button không link hồ sơ; empty-state chen vào đầu tab "Tất cả"; SSE
      ERR_INCOMPLETE_CHUNKED_ENCODING ≥14 lần/5 phút (trùng V1-06).
- [x] **V7-09/10**: 404 trang quán thiếu CTA về Khám phá; collections public cho guest nhưng
      breadcrumb "Đã lưu" dẫn tới 401 giả (trùng V4-12).

## 2026-11-12 — Quét UX qua đêm (vòng 8: góc mười) — QUET-vong8-goc-muoi.md

- [x] **V8-07 (lớn)**: đa tab — logout ở tab A, tab B vẫn hiện đăng nhập; like ở tab B → 401
      im lặng. Cần interceptor 401 toàn cục (clear cache + redirect /login?next) +
      BroadcastChannel đồng bộ đăng xuất.
- [x] **V8-01 (lớn)**: bio 160 ký tự không khoảng trắng (dán URL) → vỡ layout toàn trang
      (scrollWidth 1913 desktop / 1521 mobile) — thiếu `break-words` ở /profile và /u/:handle.
- [x] **V8-02**: placeholder handle `minhanh.eats` chứa dấu chấm nhưng validate chỉ cho
      `[a-z0-9_]` — gõ theo gợi ý là lỗi. Đổi placeholder hoặc cho phép dấu chấm.
- [x] **V8-03**: ảnh hỏng không có fallback (cover/ảnh bài/popup map) — icon vỡ + alt thô;
      avatar đã có fallback chữ cái đầu, nhân rộng pattern đó.
- [x] **V8-04**: like/follow/comment không rate limit (10 click = 10 request 200) — thêm limit
      như posts-create/media/auth-session; kèm spam notification (V7-06).
- [ ] **V8-05/06**: Back từ /discover/:id mất vị trí cuộn (trong khi /social giữ đúng);
      tab /social không lưu vào URL nên F5 mất — nhân rộng pattern URL của /discover.

Đã xác nhận tốt: XSS sạch (payload render thành text), handle có dấu bị chặn với message rõ,
tên 40 emoji hiển thị OK, /u/<script> escaped an toàn.

## V7-01: Index sắp xếp cho `places` khi corpus lớn

Nguồn: thiết kế `docs/thiet-ke/loc-gia-sap-xep-anh.md` mục 3.4 — với 345 dòng cả 3 sort đều
seq scan + top-N heapsort (EXPLAIN: newest 1,5 ms / rating 0,9 ms / distance 0,4 ms), không cần
index. Khi corpus vượt ~5.000 dòng: thêm `@@index([createdAt(sort: Desc), id(sort: Desc)])` cho
`newest`; cân nhắc denormalize `rating_avg`/`review_count` lên `places` + index cho `rating`.

## V7-02: Resize ảnh người dùng lúc upload lên R2

Nguồn: thiết kế `docs/thiet-ke/loc-gia-sap-xep-anh.md` mục 5.2 phương án D — ảnh user trên R2
hiện không có biến thể (dùng `src` gốc). Cần presigned PUT cho nhiều URL hoặc job resize hậu kỳ
+ endpoint; ngoài phạm vi vòng lọc-giá-sắp-xếp.
## 2026-11-12 — Kết quả audit cuối (deploy + backend + frontend) đã xử lý

Nguồn: 3 báo cáo audit độc lập (deployment config / backend / frontend) + báo cáo audit tổng
`da90c4fe`. Đã sửa và verify:

- [x] **B-01 (BLOCKER)**: `deploy/compose.prod.yml` — `api` khai `networks: rendez_net` tường minh
      nên không còn ở mạng `default`; `postgres`/`migrate` chỉ ở `default` ⇒ API không resolve
      `postgres`, prod không boot. Đã thêm `networks: [rendez_net]` cho cả hai.
- [x] **M-01**: `deploy/.env.example` thiếu `APP_ORIGIN` (compose dùng `${APP_ORIGIN:?}` fail-fast).
- [x] **M-02**: 5 biến `R2_*` không được truyền vào `api.environment` ở prod ⇒ `POST /media` 503.
- [x] **M-03**: Caddy không mount `frontend/dist` vào `/srv/web` ⇒ prod trắng trang; service `web`
      vẫn dựng và mở port 5173 (đã tắt bằng `entrypoint: ["true"]`, `restart: "no"`).
- [x] **M-04**: domain giả `https://rendez.example` hardcode trong `index.html`, `robots.txt`,
      `sitemap.xml`. Nay dùng `%VITE_APP_ORIGIN%` + plugin Vite sinh `robots.txt`/`sitemap.xml`
      lúc build; `APP_ORIGIN` truyền qua build arg của Dockerfile/compose.
- [x] **M-05**: thiếu index `reviews(author_id)` (subquery tương quan trong gợi ý theo dõi) +
      `fetchCandidates` quét toàn bảng `users`. Đã thêm migration
      `20261112030000_audit_indexes` và chặn pool ứng viên về 500 người mới nhất.
- [x] **M-06**: `AvatarImage` không render ở khối "Gợi ý theo dõi" và tab Người của `/search`.
- [x] **M-07**: `useSetFollow` rollback im lặng — nay `toast.error` như like/comment.
- [x] **m-01..m-04**: soft-404 Caddy + regex UA `(?i)` + `proxy_buffering off` cho SSE ở nginx.
- [x] **m-05..m-07**: bỏ `console.log` tracking giả ở 3 chỗ (analytics thật vẫn ở BACKLOG bên
      dưới), bỏ `<div onClick>` không role, `Intl.DateTimeFormat` ra module scope.
- [x] **m-08/m-09**: `loginRedirectUrl` dùng lại `safeRedirectPath()`; `verify-email-page` dùng
      `mapAuthErrorMessage` thay vì tự viết switch.
- [x] **m-10**: `CoverImage` thiếu `sizes` ở popup bản đồ (260px) và card gợi ý địa điểm (56px).
- [x] **m-12**: 4 test silent-pass (`if (!x) return`) → `findFirstOrThrow` (thiếu fixture là FAIL).
- [x] **m-14..m-16**: `docs/backend/API.md` — `DELETE /comments/:id → 200`, `private, no-cache`,
      thêm bảng rate limit cho posts/like/comment/follow.
- [x] **m-17**: comment trích sai "DECISIONS 27" (mục 27 là Cache G2) → sửa thành D-055.
- [x] **m-18**: `/og/place/:id` gộp 2 query thành 1 (`findPublicPlaceWithVersion`).
- [x] **m-19**: bỏ index thừa `daily_picks_pick_date_idx`; `requireUuid` dùng lại ở
      `collections`/`rooms`/`notifications` (thêm tham số `status` cho case 403).

## Còn mở (chưa làm — cần quyết định hoặc hạ tầng)

- [ ] **Analytics thật** cho `daily_picks_click`, `suggestion_shown`, `follow_*`: hiện đã bỏ
      `console.log`; cần endpoint ghi nhận (hoặc dịch vụ ngoài) trước khi đo hiệu quả gợi ý.
- [ ] **`search-page` phân trang**: `useInfiniteQuery` nhưng không có sentinel/"Tải thêm" ⇒ kẹt
      trang 1 (20 kết quả).
- [ ] **`bun test` không cờ**: script đã có `--parallel=1`; chưa xác minh việc gõ `bun test`
      trực tiếp có race thật hay không (audit nêu nghi vấn, chưa đo lại).
- [ ] **Caddy**: chưa chạy được `caddy validate`/`caddy adapt` trong môi trường này (không có
      binary) — config prod mới chỉ được review bằng mắt.
- [ ] **Resize ảnh người dùng lúc upload R2** (V7-02 ở trên) — vẫn mở.
- [ ] **Test backend chạy trên CHÍNH DB dev** — mỗi lần `bun test` sinh hàng trăm user
      `*@rendez.test`, room/post/review rác vào DB dev (đã dọn 167 user + 6 room test + 32 post
      rác ngày 12/11). Cần `DATABASE_URL` riêng cho test (DB `rendez_test`) hoặc dọn tự động
      trong `test/setup` — nếu không, dữ liệu demo lại bị nhiễm sau mỗi lần chạy test.

## Cold-start data (2026-11-13) — đã làm & còn mở

Đã làm (D-059): tags từ OSM cuisine/tiện ích → **160/344 place có tags**; `openingHours`
mở qua API + badge "Đang mở cửa/Đã đóng cửa" (parse 24/7, range ngày, qua nửa đêm).

- [ ] **Sort "Nổi bật" cho cold-start**: sort mặc định `newest` hiện đẩy curated (không
      tags, ít ảnh) lên trang 1 nên cải thiện tags chưa thấy ngay. Xếp hạng theo độ đầy
      đủ dữ liệu (ảnh + tags + giờ mở cửa + có mô tả) rồi mới tới mới nhất.
- [ ] **Tags cho 86 curated**: nguồn curated không có `cuisine`; cần nguồn thật khác
      (trang quán/website đã có ở `venuePageUrl` 136 place) — không suy từ category để
      tránh trùng badge loại hình.
- [ ] **Ảnh cho quán không có ảnh**: 29/344 có ảnh; cân nhắc Wikimedia Commons/Wikidata
      (raw chỉ 1 wikidata, 0 commons) hoặc chấp nhận ảnh minh hoạ D-050.
- [ ] **`price_level`**: OSM không có dữ liệu (0/3.223) → lọc giá tiếp tục disabled;
      chỉ bật khi có nguồn thật.

## Từ vòng A→D (2026-11-13)

- [ ] **Mở `Place.description` qua API**: corpus đã có `description` (34/344) và seed đã
      lưu vào DB, nhưng schema/API chưa expose → card chưa hiện "1 dòng mô tả ngắn".
      Cần thêm field vào `placeSchema` + `toPlaceDto` + mock, rồi FE render line-clamp-1.
- [ ] **Dữ liệu tĩnh còn nhãn quận cũ**: `frontend/data/cold-start/places.json.bak`,
      `places.csv`, README — không ảnh hưởng runtime nhưng nên dọn cho nhất quán.
- [ ] **Ảnh minh họa AI còn thiếu 29/32**: quota image API cạn (reset ~07:21 ngày 13/11),
      đã có cafe-1/2, quan-an-1. Sinh tiếp rồi chạy lại `copy-cold-start-images.mjs`.
- [ ] **Cột `vibes` riêng trong DB**: hiện vibes gộp vào `tags` (D-060); tách cột khi
      cần lọc theo vibe chính xác.

## Từ vòng FE (2026-11-13, card/discover)

- [ ] **Dòng mô tả trên card**: schema/API chưa có `description` (xem mục "Mở
      `Place.description`" ở trên) → card tạm KHÔNG hiện mô tả; bật khi field lên API.
- [ ] **Export `DailyPickWhy` từ `@rendez/schema`**: type đã có trong
      `packages/schema/src/types/place.ts` nhưng chưa re-export ở `index.ts`; FE đang
      lấy qua `NonNullable<DailyPick["why"]>` — nên export chính thức.
- [ ] **`publishedAt` trải ngày thật**: seed hiện đồng loạt nên nhiều quán hiện badge
      "Mới" cùng lúc; cần trải `publishedAt` theo lịch duyệt thật khi có dữ liệu.

## Từ audit hybrid search (2026-11-13)

- [ ] **Lệch kiểu Prisma ↔ migration `interaction_events`**: `schema.prisma` khai
      `weight Int` (SQL `smallint`), `id BigInt @default(autoincrement())` (SQL
      `GENERATED ALWAYS AS IDENTITY`). Mọi ghi hiện đi raw nên không vỡ; chỉnh khi
      có nhu cầu insert qua Prisma model.
- [ ] **Dedupe `POST /events` là in-memory**: mất tác dụng khi chạy nhiều instance
      API. Hiện 1 instance nên chấp nhận; chuyển sang Redis/Postgres nếu scale.
- [ ] **Hybrid search chỉ áp cho `sort=newest` trang đầu**: `sort=rating|distance`
      và trang 2+ vẫn lexical thuần (thứ tự RRF không keyset được). Trang hybrid
      trả tối đa 30 kết quả, `total = items.length` (không có trang sau) — nếu cần
      xem sâu hơn thì thêm cursor offset cho hybrid.
- [ ] **Chưa có HNSW index cho `place_embeddings`**: 343 vector nên seq scan ~5ms
      là đủ; tạo `USING hnsw (embedding vector_cosine_ops)` khi vượt ~10k venue.
- [ ] **Golden query set còn nhỏ (16 query)**: mở rộng lên 50+ và bổ sung cột
      `category=dessert` (hiện 0 venue nên 2 query không đo được).
- [ ] **Nhóm ý định còn yếu** (v2 redesign): `streetfood-district` 0.2,
      `friends-district` 0.4, `korean` 0.65, `english` 0.689, `vietnamese` 0.733.
      Nguyên nhân: dữ liệu tag nghèo (`Món Hàn` 4, `Nhậu nhẹt` 9, `Giải trí` 7 venue)
      và query đa ràng buộc cần cả đúng thuộc tính lẫn đúng thứ tự. Cần enrich dữ
      liệu trước khi tinh chỉnh ranking.
- [ ] **Kiểu diễn đạt `typo` chỉ đạt P@5 0.28** (5 query: piza, buger, susi, bánk,
      hải sãn): trigram trên tên quán không bắt được lỗi gõ trong từ khoá ý định.
      Cân nhắc sửa lỗi gõ nhẹ (edit distance trên token lexicon) — đo lại trên v2,
      không sửa bộ test.
- [ ] **Cần bộ held-out v3** khi đã tinh chỉnh lexicon/ranking nhiều vòng trên v2, để
      phát hiện overfit (quy tắc ghi ở `docs/EVAL-PROTOCOL.md` mục 6).
- [ ] **Trọng số RRF 1:1 giữa lexical và dense là sai trên v2**: hybrid2 (0.511) tệ
      hơn dense-only (0.534) vì nhánh lexical yếu (0.423) kéo dense xuống. Thử
      weight dense 1.5–2 trong `fuseRrf` và đo lại trên cùng checksum v2.
- [ ] **Cả 4 chế độ đều ≤0.28 ở nhóm `typo`** (v2): không mô hình nào sửa lỗi gõ
      trong từ khoá ý định. Cần edit-distance trên token lexicon trước khi vào
      trigram/embedding.

## Phát hiện khi chạy track A — Yelp Open Dataset (2026-11-13, commit 0f768da)

- [ ] **`searchCondition` yêu cầu AND mọi token → stopword tiếng Anh làm rỗng nhánh
      lexical** (`places.ts` L196-218). Query `"good donuts with outdoor seating"`
      đòi venue chứa đồng thời `good`, `with`, `outdoor`, `seating`. Hệ quả đo được:
      hybrid3 P@5 chỉ 0.514 so với hybrid2 0.728 trên bộ Yelp (Δ −0.214, p<0.001).
      Hướng sửa: danh sách stopword EN/VI + bỏ token không mang nghĩa trước khi AND.
      **Đây là thay đổi production — phải đo lại cả v2 và Yelp sau khi sửa.**
- [ ] **`detectIntentAttributes` chỉ có lexicon tiếng Việt** → query tiếng Anh không
      kích hoạt được nhánh structured (mất trọng số RRF ×2). Cần lexicon EN hoặc
      chuyển sang trích thuộc tính đa ngữ trước khi mở rộng thị trường ngoài VN.
- [ ] **Chưa có annotation người thật (Cohen's κ)** cho cả v2 và bộ Yelp. Nhãn hiện
      tự suy từ DB. Hội nghị khắt khe thường yêu cầu ≥2 người gán nhãn độc lập + κ.
- [ ] **Bộ query tiếng Anh (58 câu) chưa qua người bản ngữ duyệt** — do tôi sinh theo
      quy tắc độ khó định trước; cần review để loại câu phi tự nhiên.
- [ ] **Chưa chạy Foursquare NYC/TKY** (chuẩn de-facto cho next-POI) và **BEIR**
      (component retrieval) — hai track bổ sung đã nêu trong `RESEARCH-PROTOCOL.md`.
- [ ] **Chưa so sánh với baseline học máy** (BPR, LightGCN, SASRec) — hiện chỉ có
      item-item CF, popularity, random. Kết quả item-item R@10 0.062 là mức tham chiếu
      thấp, cần baseline mạnh hơn để định vị đóng góp.
- [ ] **`prepare-yelp.ts` hardcode đường dẫn `/home/longtran/datasets/yelp/...`** làm
      mặc định — nên chuyển sang biến môi trường bắt buộc hoặc đường dẫn tương đối
      trước khi chia sẻ repo cho người khác.
- [ ] **Dữ liệu Yelp chiếm ~10.5 GB** (`Yelp-JSON.zip` 4.04 GB + `yelp_dataset.tar`
      4.34 GB + JSONL 1.1 GB) trong `/home/longtran/datasets/yelp` và
      `backend/data/yelp`. Đã gitignore JSONL; cần quyết định giữ hay xoá bản zip/tar.

- [x] **`searchCondition` AND-token với stopword** — ĐÃ SỬA (commit 73940c0): thêm
      `QUERY_STOPWORDS` EN/VI, query toàn hư từ giữ token gốc. Đo lại: Yelp hybrid3
      0.514 → 0.886; v2 không regress (0.875).
- [x] **Lexicon chỉ tiếng Việt** — ĐÃ SỬA (commit 73940c0): thêm 40 entry tiếng Anh
      trỏ tag Yelp (OR-match nên không ảnh hưởng dữ liệu Đà Nẵng).
- [ ] **Testcontainer thiếu extension pgvector** — 19/85 test fail với
      `type "vector" does not exist` khi `prisma migrate deploy` trong container test
      (`test/helpers/pg.ts` phải chạy `CREATE EXTENSION vector` trước khi migrate).
      Lỗi hạ tầng test có sẵn, không liên quan thay đổi search.
