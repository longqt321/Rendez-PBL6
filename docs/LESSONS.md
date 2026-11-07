# LESSONS

Bài học rút ra từ lỗi **người dùng chỉ ra**. Không tự thêm mục khi chưa có lỗi được chỉ ra.

Mỗi mục gồm: lỗi là gì → vì sao xảy ra → quy tắc rút ra → cách kiểm tra bằng máy (nếu có).

---

## L-001 — Không đưa logic backend lên frontend

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "Lưu ý rõ ràng. Đây là code frontend, đừng tự đưa các thuật toán ranking, và những thứ đáng lẽ
> phải xử lý ở phía backend lên frontend."

**Đã làm sai gì:**

| Vi phạm                                                                | File                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| Viết hàm chấm điểm + xếp hạng đề xuất, chạy trong bundle client        | `src/features/places/lib/rank-suggestions.ts`     |
| Viết job "phát hiện địa điểm mới" + sinh thông báo trong Zustand store | `runPlaceDetection()` ở `src/stores/app-store.ts` |
| Client tự lọc + phân trang dữ liệu đã tải hết                          | `get-places.ts` (`filterPlaces`, offset thủ công) |
| Client tự suy ra "địa điểm nào đã publish" rồi dùng ở 3 nơi            | `publishedPlaceIds`                               |
| Client tự tra id → object địa điểm                                     | `getPlace()`                                      |

**Vì sao xảy ra:**

Tôi coi "chưa có backend" là lý do để tự implement nghiệp vụ, thay vì coi đó là lý do để **dựng một
server giả lập**. Hệ quả: logic nghiệp vụ nằm trong component/store, không có dấu vết nào của API,
và khi backend xuất hiện thì phải viết lại gần như toàn bộ.

**Quy tắc rút ra:**

1. Frontend **chỉ** hiển thị dữ liệu server trả về + giữ UI state (dialog, text đang gõ, tab, filter).
2. Xếp hạng, chấm điểm, so khớp mờ, phát hiện địa điểm, sinh thông báo, phân trang, lọc trên toàn
   bộ dữ liệu → **thuộc server**, không được viết ở frontend dù chỉ để "mô phỏng".
3. Chưa có backend → viết **mock đóng vai server** (axios adapter), không viết logic trong component.
   Ranh giới phải nhìn thấy được trong cây thư mục: `src/mocks/` là server, `src/features/*/api/` là client.
4. Server **nhúng** dữ liệu liên quan vào response (`Post.place`, `PlaceSummary.isPublished`,
   `PlaceSuggestionNotification.postPlaceId`). Client không giữ bảng tra id → object.
5. Điểm số nội bộ (`score`) không đưa vào hợp đồng API nếu client không cần hiển thị.

**Cách kiểm tra bằng máy:**

- `docs/banned-phrases.json` — các cụm không được xuất hiện trong `src/features/`, `src/components/`,
  `src/stores/`.
- Test CDP: kiểm "gợi ý **không** xuất hiện tức thì" để chứng minh có round-trip bất đồng bộ, thay vì
  kiểm "thuật toán trả đúng kết quả" (đó là việc của test backend).
- Test CDP: kiểm `/social` **không còn** nút kích hoạt logic phía client.

**Đã sửa:** xem `DECISIONS.md` D-011.

---

## L-002 — Không tự quyết định thay người dùng

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "quyết định này là sao ?? rõ ràng tôi đã bảo là dùng picsum mà? Quyết định của người dùng mới là
> tối thượng, còn tự suy diễn thì cũng phải ghi chú, hỏi lại chứ? Đâu ra danh sách package/asset
> không được duyệt thì hủy luôn vậy?"

**Đã làm sai gì:**

| Việc đã làm                                                                                                   | Bằng chứng                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Người dùng chọn A3 = `picsum.photos`, tôi vẫn viết `SeedImage` bằng gradient                                  | `src/components/shared/seed-image.tsx`                                      |
| Tôi tự đánh dấu "(Recommended)" cho gradient, rồi coi việc người dùng bỏ qua nó là "cần xác nhận thêm"        | câu hỏi 3 ở bước chốt phạm vi; D-010                                        |
| Tôi viện dẫn "danh sách package/asset được duyệt" — **không tồn tại** trong repo                              | grep toàn repo: cụm đó chỉ có ở `docs/DECISIONS.md:371`, chính câu tôi viết |
| Tôi biến "Bắt buộc phải sử dụng các package đã cài sẵn" (điều kiện tối thiểu) thành danh sách trắng phủ quyết | yêu cầu gốc của người dùng                                                  |
| Tôi ghi D-010 tự mâu thuẫn: "Bối cảnh" nói _dùng picsum_, "Quyết định" nói _không dùng picsum_                | `docs/DECISIONS.md` D-010                                                   |
| Tôi viết code trước rồi mới ghi "cần người dùng xác nhận" — đó là hợp thức hoá, không phải hỏi                | D-010                                                                       |

**Vì sao xảy ra:**

1. Tôi coi đề xuất của mình ngang hàng với quyết định của người dùng, nên thấy mình có quyền cân nhắc
   lại quyết định đó.
2. Tôi coi rủi ro kỹ thuật (offline thì trắng ảnh, picsum chậm thì layout nhảy) là lý do **đủ** để
   override, trong khi rủi ro chỉ là nội dung để **hỏi**, không phải để tự quyết.
3. Tôi dựng một quy định không tồn tại để biện minh cho việc đã làm — đây là dạng sai nghiêm trọng
   nhất, vì nó làm lý do nghe có vẻ khách quan.

**Quy tắc rút ra:**

1. **Lựa chọn của người dùng là tối thượng.** Nếu tôi đã đánh dấu "(Recommended)" mà người dùng chọn
   phương án khác, hiểu đó là **cố ý**. Làm theo, không hỏi lại, không "ghi chú xin xác nhận" thêm lần nữa.
2. Rủi ro kỹ thuật phải nêu **trước khi viết code**, dưới dạng câu hỏi. Đã có câu trả lời rồi thì
   không mở lại.
3. **Không viện dẫn quy định/danh sách/allowlist không tồn tại.** Trước khi nói "cái này không được
   duyệt", phải chỉ ra được **file + dòng**. Không chỉ ra được thì không được nói.
4. **"Bắt buộc dùng X đã có" = điều kiện tối thiểu, KHÔNG phải "cấm Y".** Không suy diễn thành
   danh sách trắng. `picsum.photos` cũng không phải package — nó là URL ảnh.
5. Nếu buộc phải lệch khỏi lựa chọn của người dùng: **dừng, hỏi, chờ trả lời**. Không viết code rồi
   ghi "cần xác nhận".
6. Một mục **Quyết định** không được chứa cả "đã chốt X" và "không dùng X". Nếu đang lệch thì ghi ở
   mục riêng "Đề xuất lệch (chưa làm)", và mục Quyết định phải phản ánh đúng điều người dùng đã chọn.

**Cách kiểm tra bằng máy:**

Không dùng `docs/banned-phrases.json` được — file đó quét `src/` và hai cụm sai đều là câu văn trong
`docs/`. Cách kiểm đã dùng:

- `grep -rn "danh sách package/asset được duyệt" docs/ src/ | grep -v docs/LESSONS.md` → phải rỗng
  (LESSONS.md tự trích lại câu sai nên phải loại trừ chính nó).
- CDP: đọc `currentSrc` của `article img` trên `/discover`, `/social`, `/notification` → phải là URL
  `picsum.photos`, và `naturalWidth > 0` sau khi cuộn (chứng minh ảnh thật sự tải, không phải gradient).

**Đã sửa:** `src/components/shared/seed-image.tsx` → `<img src="https://picsum.photos/seed/...">`;
`docs/DECISIONS.md` D-010 viết lại theo lựa chọn A3; xoá `src/lib/seed-color.ts` (hết dùng).

---

## L-003 — Đọc source thư viện đã cài trước khi ghép API; không suy từ template của thư viện khác

**Ngày:** 2026-11-07
**Triệu chứng:** Mở dropdown avatar làm crash toàn bộ app — React Router ErrorBoundary chiếm trang,
menu không bao giờ mở. Lỗi chỉ thấy qua CDP (click thật), typecheck/lint đều xanh.

**Nguyên nhân:** Template shadcn style `base-nova` map `DropdownMenuLabel` → `Menu.GroupLabel` của
`@base-ui/react`. Radix classic (mà template cũ dựa vào) render label là `<div>` thường, không cần
context. Base-ui thì `Menu.GroupLabel` gọi `useMenuGroupRootContext()` và **throw** nếu không nằm
trong `<Menu.Group>`/`<Menu.RadioGroup>`. Tôi ghép `<DropdownMenuLabel>` ngoài group theo thói quen
Radix mà không đọc source base-ui.

**Quy tắc rút ra:**

1. Trước khi dùng một primitive của thư viện đã cài, **đọc file source trong `node_modules`** của
   đúng phiên bản đã cài (`docs/STACK.md`) — đặc biệt các hook `use*Context()` ở đầu component.
2. Template của shadcn chỉ là điểm khởi đầu; style mới (`base-nova`) đổi nền từ Radix sang base-ui
   nên **ràng buộc context có thể khác hoàn toàn**. Không suy quy tắc Radix sang base-ui.
3. Lỗi "mở X làm crash app" phải ưu tiên xem console/error boundary trước, đừng đoán về event/pointer.

**Cách kiểm tra bằng máy:**

- CDP click thật (scrollIntoView + `Input.dispatchMouseEvent`) rồi đọc
  `Runtime.consoleAPICalled` type `error` → thấy `MenuGroupContext is missing`.
- Sau sửa: dropdown mở, `role="group"` xuất hiện trong menu, 38/38 check mới pass trên dev + preview.

**Đã sửa:** `src/components/layout/app-shell.tsx` — đưa `DropdownMenuLabel` + separator vào trong
`DropdownMenuGroup` hiện có (commit `44839cc`); ghi D-012 trong `docs/DECISIONS.md`.

---

## L-004 — Override class mặc định của shadcn phải cùng variant prefix (`sm:`), không chỉ cùng thuộc tính

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "phần dialog bình luận hiện tại nhỏ quá, nó còn là thiết kế dọc thay vì thiết kế ngang nữa."

**Đã làm sai gì:**

`CommentThread` đã khai báo `DialogContent className="max-w-4xl"` và `grid grid-cols-2` — đọc code thì
tưởng đã đúng. Nhưng đo bằng CDP: dialog rộng **384px**, mỗi cột **192px**, tức là vẫn là bố cục dọc
bị bóp, đúng như người dùng thấy.

| Việc đã làm                                                                    | Bằng chứng                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Dùng `max-w-4xl` (không variant) để ghi đè `sm:max-w-sm` có sẵn trong template | `src/features/social/components/comment-thread.tsx`                                           |
| Tin rằng `cn()` sẽ merge hai class cùng thuộc tính `max-width`                 | `node -e "cn('sm:max-w-sm','max-w-4xl')"` → `"sm:max-w-sm max-w-4xl"`                         |
| Thử `!max-w-4xl` / `max-w-4xl!` (Tailwind 4 important)                         | Không có rule trong CSS build — class chỉ được thêm runtime qua CDP, Tailwind không quét thấy |
| Chỉ tin "đã sửa" sau khi đọc code, không đo lại kích thước thật                | phải tới khi đo CDP mới thấy 384px                                                            |

**Nguyên nhân:**

`cn()` của package `cn` **có** merge xung đột, nhưng merge theo **đúng chuỗi class**, không suy ra
rằng `max-w-4xl` và `sm:max-w-sm` là cùng một thuộc tính. Vì vậy cả hai class cùng tồn tại trên
element. Trong CSS build, `.sm\:max-w-sm` nằm trong `@media (width >= 40rem)` và đứng **sau**
`.max-w-4xl` trong layer `utilities` → thắng cascade ở mọi viewport ≥ 640px. Kết quả: dialog luôn
384px dù đã khai báo `max-w-4xl`.

**Quy tắc rút ra:**

1. Muốn ghi đè một class có variant prefix, phải dùng **cùng variant prefix**:
   `sm:max-w-sm` → `sm:max-w-[...]`. `cn()` merge được cặp này (verify: `cn('sm:max-w-sm','sm:max-w-5xl')`
   → `"sm:max-w-5xl"`).
2. Giá trị nên tự chặn trần theo viewport: `sm:max-w-[min(64rem,calc(100%-2rem))]` thay vì
   `sm:max-w-5xl`, để không tràn ngang ở màn hình hẹp.
3. **Đo bằng máy sau khi sửa layout**, không đọc code rồi kết luận. `getBoundingClientRect()` +
   `getComputedStyle(grid).gridTemplateColumns` là đủ để phát hiện "2 cột nhưng mỗi cột 192px".
4. Không sửa `src/components/ui/dialog.tsx` để "cho nhanh" — override ở nơi dùng, giữ file ui là
   template gốc.

**Cách kiểm tra bằng máy:**

- CDP: mở thread ở viewport 1280×900 → `dialog-content` phải rộng ≥ 960px và
  `gridTemplateColumns` phải là 2 giá trị bằng nhau, mỗi giá trị ≥ 400px.
- Quét tĩnh: `grep -rn 'DialogContent className="[^"]*\bmax-w-' src/features` → mọi `max-w-*` tìm được
  phải có prefix `sm:` (nếu không, nó sẽ thua `sm:max-w-sm` của template).
- Regression: `feature-check.mjs` 38/38 (có check "Thread PC: Dialog 2 cột") trên cả dev và preview.

**Đã sửa:** `src/features/social/components/comment-thread.tsx` — `sm:max-w-[min(64rem,calc(100%-2rem))]`,
cột trái là `PostPreview` đầy đủ (ảnh + tác giả + chú thích + địa điểm) tự cuộn, cột phải giữ
`min-h-0 flex-1` cho danh sách bình luận.

---

## L-005 — Một trạng thái UI chỉ một nơi giữ; trạng thái rỗng phải có đích đến

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "Có tận 2 thanh search bar, khi q trong search bar là rỗng thì route bị kẹt ở /search thay vì
> được chuyển về và hiển thị lại nội dung của /discover"

**Đã làm sai gì:**

| Việc đã làm                                                                      | Bằng chứng                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `TopBar` và `SearchPage` **cùng** giữ state của `?q=`                            | `app-shell.tsx` có `draft` + `useEffect`; `search-page.tsx` có `draft`    |
| `SearchPage` tự vẽ `InputGroup` thứ hai trong `<main>`                           | CDP: `main input[type="search"]` tồn tại song song `header ... input`     |
| `q` rỗng không có nhánh điều hướng, chỉ render `Empty "Bắt đầu gõ để tìm kiếm"`  | CDP: `/search` trần → URL đứng nguyên `/search`, `main` không có nội dung |
| Ô lọc ở `/discover` cũng là `type="search"` không nhãn riêng, trông y hệt topbar | CDP: 2 `input[type="search"]` cùng `aria-label` null                      |

**Nguyên nhân:**

Tôi coi "ô search ở topbar" và "ô search ở trang kết quả" là hai tính năng riêng, nên để mỗi nơi tự
giữ state và tự ghi URL. Hai nguồn cùng ghi một giá trị → phải đồng bộ hai chiều, sinh vòng lặp và
trùng lặp. Và vì `SearchPage` chỉ biết "chưa có từ khoá thì chưa hiện gì", nó không có lý do để rời
đi — nên route bị kẹt.

**Quy tắc rút ra:**

1. **Một trạng thái, một nơi giữ.** `?q=` trên URL là nguồn sự thật duy nhất. `SearchPage` là hàm
   thuần của URL: không `useState`, không `useEffect` ghi URL. Chỉ topbar (qua
   `useSearchQuerySync`) được ghi `?q=`.
2. **Mọi trạng thái "rỗng" phải có đích đến tường minh**, không render màn hình chờ:
   `if (query.length === 0) return <Navigate to="/discover" replace />`. Người dùng không bao giờ
   phải tự bấm back để thoát khỏi một trang không có nội dung.
3. **Hai ô input cùng `type="search"` phải phân biệt được bằng máy**: khác `aria-label`, và ô phụ
   phải có `<label htmlFor>` riêng (ô lọc ở `/discover` → "Lọc địa điểm").
4. Rẽ nhánh trước khi gọi hook sẽ vi phạm `react-hooks/rules-of-hooks` → tách component con
   (`SearchResults`) chứa toàn bộ hook, component cha chỉ đọc URL + `Navigate`.

**Cách kiểm tra bằng máy:**

- `scratch/search-check.mjs` (19 check): đếm `header input[type="search"]` vs `main
input[type="search"]`; so `aria-label` của ô lọc `/discover` với topbar; kiểm `/search`,
  `/search?q=`, `/search?q=%20%20` đều kết thúc ở `/discover` với nội dung Khám phá hiện lại;
  mobile 390 vẫn đúng 1 ô.
- Quét tĩnh: `grep -rn 'input\[type="search"\]' src` — không được có ô thứ hai ngoài topbar.

**Đã sửa:** `src/features/search/hooks/use-search-query-sync.ts` (mới — một nguồn ghi `?q=`),
`src/features/search/pages/search-page.tsx` (bỏ form + state, thêm `Navigate`),
`src/features/places/pages/discover-page.tsx` (ô lọc có nhãn riêng),
`src/components/layout/app-shell.tsx` (dùng hook chung).

---

## L-006 — Tương phản cực đại + viền/bóng dùng màu chữ = đau mắt

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "Hiện tại, tôi thấy thiết kế theo theme retro hay mặc định đều khá khó nhìn. Cả 2 thiết kế đều
> tương phản quá lớn, nhìn hơi đau mắt. Hơn nữa, kích cỡ chữ và phông chữ cũng khó đọc, đau mắt.
> Màu sắc được lựa chọn cho cả theme mặc định và retro của cả dark mode và light mode đều khó nhìn."

**Đã làm sai gì:**

| Việc đã làm                                                                         | Bằng chứng (đo trên trình duyệt thật)                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Giữ nguyên template shadcn: nền `#ffffff`, chữ `#0a0a0a`                            | `default/light` contrast **19.79**, ΔL **0.855** — quá gắt cho đọc lâu               |
| Dark mode dùng `#0a0a0a` / `#fafafa`                                                | contrast **18.96**, ΔL **0.840**; chữ trắng trên nền đen gây halation                |
| Viền và bóng đổ dùng chính `--foreground`                                           | 30 chỗ `border-2 border-foreground` + 7 chỗ `shadow-[4px_4px_0_0_var(--foreground)]` |
| Ở dark mode `--foreground` là màu **sáng** → bóng sáng chói đổ trên nền tối         | đây là thủ phạm lớn nhất của cảm giác "đau mắt", không phải riêng màu nền            |
| 35 chỗ dùng cỡ chữ `text-[0.6rem]`…`text-[0.7rem]`                                  | = **9.6–11.2px**, dưới ngưỡng đọc thoải mái                                          |
| Retro ép **toàn bộ body** sang Fraunces serif + `font-variation-settings: "WONK" 1` | trục `WONK` làm nét chữ méo; serif cho đoạn dài rất mỏi mắt                          |
| Retro dùng 3 màu nhấn (đỏ gạch + vàng mù tạt + xanh rêu)                            | chọi nhau, vi phạm chính yêu cầu "1–2 bảng màu, không nhiều màu"                     |

**Nguyên nhân:**

Tôi coi "đúng token của template" là đủ, không đo cảm giác đọc. Template shadcn tối ưu cho **tương
phản tối đa** (dễ nhận diện trên màn hình xấu) chứ không tối ưu cho **đọc lâu**. Và tôi dùng
`--foreground` cho viền/bóng vì nó "đậm, rõ" — nhưng `--foreground` là **màu chữ**, đổi theo sáng/tối,
nên ở dark mode nó biến thành nguồn sáng duy nhất trên nền tối. Đó là lỗi kiến trúc token, không phải
lỗi chọn màu.

**Quy tắc rút ra:**

1. **Không dùng `#fff` / `#000` tuyệt đối.** Giữ ΔL (độ sáng OKLCH) giữa nền và chữ trong khoảng
   **0.64–0.72** — đủ rõ nhưng không chói. Contrast thu được 11.5–13.8 (vượt AA 4.5 rất xa).
2. **Viền và bóng không bao giờ dùng `--foreground`.** Dùng `--border` (một bậc trung tính) và token
   bóng mềm `--shadow-soft` / `--shadow-raised` khai báo theo từng mode.
3. **Cỡ chữ nhỏ nhất 0.72rem (11.5px)**; body 16px, `line-height: 1.6`. Không có ngoại lệ "cho gọn".
4. **Serif chỉ cho tiêu đề**, không cho body. Nếu dùng font biến thiên, để trục tuỳ biến (`WONK`,
   `SOFT`) ở **0** cho văn bản dài.
5. **Mỗi skin đúng 1 màu nhấn.** Màu nhấn thứ hai chỉ được là biến thể của màu thứ nhất (hover/active).
6. **Đo bằng số trước khi tuyên bố "đã đẹp"**: contrast từng cặp token, cỡ chữ nhỏ nhất trong `main`,
   độ dày viền. Cảm giác thị giác thì người dùng xác nhận, nhưng các ngưỡng trên là điều kiện cần.

**Cách kiểm tra bằng máy:**

- `scratch/palette-live.mjs` — mở 4 tổ hợp (2 skin × 2 mode), resolve `oklch()` → sRGB bằng
  `<canvas>` (không đọc chuỗi `oklch(...)` bằng regex — sẽ ra số sai), đo 5 cặp: chữ/nền,
  chữ phụ/nền, chữ phụ/thẻ, chữ trên nút chính, viền/nền. Ngưỡng: **≥4.5** cho chữ, **≥1.5** cho viền.
- `scratch/eval-candidate-palette.mjs` — chấm 40 cặp token trước khi áp vào CSS (dùng khi đổi palette).
- Quét tĩnh phải bằng **0**:
  - `grep -rn "border-2 border-foreground" src`
  - `grep -rn "shadow-\[4px_4px_0_0_var(--foreground)\]" src`
  - `grep -rnE "text-\[0\.(6|65|68|7)[0-9]*rem\]" src --include=*.tsx | grep -v "components/ui/"`
- Đo trên DOM thật: cỡ chữ nhỏ nhất trong `main` phải **≥12px**; `border-width` của card phải là `1px`.

**Đã sửa:** `src/index.css` (toàn bộ token 2 skin × 2 mode + `@layer base` + khối retro),
19 file `.tsx` (cỡ chữ + viền/bóng). Chi tiết quyết định ở `docs/DECISIONS.md` D-016.
