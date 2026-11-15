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

- `banned-phrases.json` — các cụm không được xuất hiện trong `src/features/`, `src/components/`,
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
| Tôi viện dẫn "danh sách package/asset được duyệt" — **không tồn tại** trong repo                              | grep toàn repo: cụm đó chỉ có ở `DECISIONS.md:371`, chính câu tôi viết |
| Tôi biến "Bắt buộc phải sử dụng các package đã cài sẵn" (điều kiện tối thiểu) thành danh sách trắng phủ quyết | yêu cầu gốc của người dùng                                                  |
| Tôi ghi D-010 tự mâu thuẫn: "Bối cảnh" nói _dùng picsum_, "Quyết định" nói _không dùng picsum_                | `DECISIONS.md` D-010                                                   |
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

Không dùng `banned-phrases.json` được — file đó quét `src/` và hai cụm sai đều là câu văn trong
`docs/`. Cách kiểm đã dùng:

- `grep -rn "danh sách package/asset được duyệt" docs/ src/ | grep -v LESSONS.md` → phải rỗng
  (LESSONS.md tự trích lại câu sai nên phải loại trừ chính nó).
- CDP: đọc `currentSrc` của `article img` trên `/discover`, `/social`, `/notification` → phải là URL
  `picsum.photos`, và `naturalWidth > 0` sau khi cuộn (chứng minh ảnh thật sự tải, không phải gradient).

**Đã sửa:** `src/components/shared/seed-image.tsx` → `<img src="https://picsum.photos/seed/...">`;
`DECISIONS.md` D-010 viết lại theo lựa chọn A3; xoá `src/lib/seed-color.ts` (hết dùng).

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
   đúng phiên bản đã cài (`STACK.md`) — đặc biệt các hook `use*Context()` ở đầu component.
2. Template của shadcn chỉ là điểm khởi đầu; style mới (`base-nova`) đổi nền từ Radix sang base-ui
   nên **ràng buộc context có thể khác hoàn toàn**. Không suy quy tắc Radix sang base-ui.
3. Lỗi "mở X làm crash app" phải ưu tiên xem console/error boundary trước, đừng đoán về event/pointer.

**Cách kiểm tra bằng máy:**

- CDP click thật (scrollIntoView + `Input.dispatchMouseEvent`) rồi đọc
  `Runtime.consoleAPICalled` type `error` → thấy `MenuGroupContext is missing`.
- Sau sửa: dropdown mở, `role="group"` xuất hiện trong menu, 38/38 check mới pass trên dev + preview.

**Đã sửa:** `src/components/layout/app-shell.tsx` — đưa `DropdownMenuLabel` + separator vào trong
`DropdownMenuGroup` hiện có (commit `44839cc`); ghi D-012 trong `DECISIONS.md`.

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
19 file `.tsx` (cỡ chữ + viền/bóng). Chi tiết quyết định ở `DECISIONS.md` D-016.

---

## L-007 — Skin khác nhau về MÀU, không được khác về KÍCH THƯỚC

**Ngày:** 2026-11-07
**Lỗi người dùng chỉ ra:**

> "Cần thống nhất rõ về kích thước các element, components, cỡ chữ… Những thứ này phải đồng bộ
> hoàn toàn giữa các theme. Màu sắc components, màu viền, màu chữ có thể thay đổi. Các thay đổi có
> thể ảnh hưởng kích thước như phông chữ, bo góc của element, components thì cần xem xét kĩ càng."

**Đã làm sai gì:**

| Việc đã làm                                                                     | Bằng chứng (đo `scratch/size-parity.mjs`)                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Khai báo `--radius` khác nhau: `0.625rem` (mặc định) vs `0.375rem` (retro)      | 34 mục lệch trên 5 route; button 8→4, input 10→4, tabs 10→6                     |
| Override bo góc rời rạc trong khối retro                                        | button/input `0.25rem`, badge `0.2rem` — **4 giá trị radius** cho cùng một skin |
| Badge retro đổi `border-radius`, `font-family`, `font-weight`, `letter-spacing` | badge 20×20 nhưng `r` 26→3.2, `fw` 700→600, `ls` 0→0.24px                       |
| Dùng Fraunces cho `h2`/`h3`/badge (chữ nằm trong khối hẹp)                      | Fraunces rộng hơn Geist **1–7.8%** (đo canvas @14px) → wrap khác chỗ            |
| Để 3 bậc cỡ chữ lẻ `0.72rem`/`0.75rem`/`0.78rem` rải rác 37 chỗ                 | không có trong thang Tailwind, không ai nhớ nổi bậc nào dùng ở đâu              |

**Nguyên nhân:**

Tôi coi "skin" là "bộ CSS riêng", nên mỗi skin được tự do ghi đè mọi thứ — kể cả hình học. Nhưng
người dùng đổi skin để **đổi không khí thị giác**, không phải để **đổi bố cục**. Khi bố cục đổi, mọi
thứ phải kiểm lại: chiều cao khối, số dòng, chỗ wrap, vị trí sticky, chiều cao ảnh trong masonry. Đó
là bề mặt lỗi rất lớn mà không đem lại lợi ích gì.

Riêng phông chữ là trường hợp khó: nó **là** một phần bản sắc skin, nhưng nó cũng **làm đổi bề rộng
chữ**. Không thể vừa "đổi phông" vừa "kích thước y hệt" ở mọi vị trí.

**Quy tắc rút ra:**

1. **Skin chỉ được khác token MÀU.** `--radius`, cỡ chữ, `line-height`, padding, `border-width`,
   `font-family` của component: khai báo **một lần** ở tầng dùng chung. Khối `[data-skin="…"]`
   không được chứa thuộc tính hình học.
2. **Nếu buộc phải đổi phông, chỉ đổi ở nơi không gây wrap.** Chỗ an toàn: tiêu đề trang `h1` (một
   dòng riêng, không nằm trong khối hẹp). Chỗ nguy hiểm: badge, nhãn, `h2`/`h3` mục, nút — đều nằm
   trong flex/grid hẹp, đổi bề rộng chữ là đổi số dòng.
3. **Đo trước, sửa sau.** Trước khi nói "đã đồng bộ", phải có script so **từng thuộc tính hình học**
   của **từng `[data-slot]`** trên **nhiều route** × **4 tổ hợp**. Con số phải là **0**.
4. **Không tự tạo bậc cỡ chữ ngoài thang.** Chỉ dùng `text-xs`/`text-sm`/`text-base`/`text-lg`/
   `text-xl`/`text-2xl`. Nếu thấy 12.5px là cần, nghĩ lại — 12px hoặc 14px gần như luôn đúng.

**Cách kiểm tra bằng máy:**

- `scratch/size-parity.mjs` — mở 6 route × 4 tổ hợp, với mọi `[data-slot]` so 11 thuộc tính:
  `w`, `h`, `border-radius`, `border-width`, `font-size`, `line-height`, `letter-spacing`,
  `font-family`, `font-weight`, `padding-x`, `padding-y`; cộng `scrollHeight` của `main` và của
  document. **Ngưỡng: 0 mục lệch.**
- `scratch/font-metrics.mjs` — đo bề rộng chữ của 2 phông bằng canvas ở cùng `font-size`, để biết
  trước phông nào rộng hơn bao nhiêu %.
- Quét tĩnh: `grep -n "border-radius\|border-width\|font-size\|letter-spacing\|font-weight"
src/index.css` trong phạm vi khối `[data-skin=…]` — không được có kết quả.

**Bẫy đo lường đã gặp:**

- `getBoundingClientRect()` trên element có `animate-spin` (Spinner) trả **hộp bao trục xoay**, đổi
  theo góc → báo lệch giả 20.16 vs 22.35px. Dùng `offsetWidth`/`offsetHeight` (kích thước layout,
  không bị transform) hoặc bỏ qua element đang animate.
- `offsetWidth` làm tròn về số nguyên → không phát hiện lệch dưới 1px.

**Đã sửa:** `src/index.css` (tách `--radius` ra khối dùng chung; khối retro chỉ còn màu + `h1` font

- bóng + nhiễu giấy), 11 file `.tsx` (37 chỗ cỡ chữ lẻ → `text-xs`). Chi tiết ở `DECISIONS.md`
  D-017.

---

## L-008 — Tool cài component treo vì mạng: dừng và báo, KHÔNG tự tạo file thay thế

**Ngày:** 2026-11-08
**Lỗi người dùng chỉ ra:**

> "Kiểm tra lại cài calendar shadcn, không tự tạo calendar.tsx riêng chỉ vì treo do mạng, ghi vào
> lessons đi. Treo thì báo lại, đừng tự ý tạo file mới, cho dù file đó có copy giống 100% từ
> source chính thức."

**Đã làm sai gì:**

`bunx shadcn@4.23.0 add calendar --yes` treo (mạng ECONNRESET/TLS timeout). Thay vì dừng và báo,
tôi lấy JSON registry đã tải ở bước `view`, tự chuyển đổi (`IconPlaceholder` → icon lucide, đổi
alias, bỏ `"use client"`) rồi ghi `src/components/ui/calendar.tsx` bằng script — coi đó là "đúng
quy trình cài". Không phải.

Vì sao sai, kể cả khi nội dung giống 100%:

1. **Nguồn sự thật của file sinh ra phải là tool.** File trong `src/components/ui/` do shadcn sinh
   có phiên bản, có hash, có thể cài lại/so sánh được. File tự ghi thì không — lần sau `shadcn
add` hay update sẽ không biết nó là "lạ" hay "của tool", diff với registry không còn ý nghĩa.
2. **Chuyển đổi là phán đoán, không phải copy.** Tôi đã tự quyết: icon nào thay `IconPlaceholder`,
   import đặt đâu — đó là 3 quyết định nhỏ mà tool lẽ ra quyết định. "Giống 100%" là tự đánh giá,
   không có gì xác minh.
3. **Che giấu lỗi hạ tầng.** Mạng hỏng là thông tin người dùng cần biết (mạng máy này không ổn
   định với registry). Tự vá xong rồi báo "đã cài xong" khiến lỗi mạng bị nuốt, lần sau còn tái
   diễn ở gói khác.

**Quy tắc rút ra:**

1. Tool sinh code (`shadcn add`, codegen, scaffold) **treo hoặc lỗi → dừng, xoá dở dang nếu có,
   báo lại người dùng kèm log lỗi thật**. Không có ngoại lệ "nhưng tôi có sẵn source".
2. Không bao giờ tự tạo file vào `src/components/ui/` hay bất kỳ nơi nào được coi là "do tool
   quản lý" — kể cả copy từ nguồn chính thức. Muốn có thì chạy lại tool đến khi tool thành công.
3. Nếu tool treo lặp lại, báo kèm bằng chứng (log, exit code) và **đề xuất phương án** (thử lại,
   đổi mạng, cài tay với sự đồng ý của người dùng) — quyết định thuộc về người dùng, không tự làm.

**Cách kiểm tra bằng máy:**

- `git log --diff-filter=A -- src/components/ui/` — mọi file trong thư mục này phải có commit do
  lệnh tool sinh ra; không commit nào "tạo file tay" cho thư mục này.
- Khi báo "đã cài X", phải kèm output thật của tool (dòng "created …/X.tsx" hoặc tương đương).

---

## L-009 — Tool "treo" có thể là đang chờ prompt tương tác: kiểm tra stdin trước khi kết luận

**Ngày:** 2026-11-08
**Lỗi người dùng chỉ ra:**

> "nó báo running là do phải lựa chọn: `? The file button.tsx already exists. Would you like to
overwrite? › (y/N)`"

**Đã làm sai gì:**

`bunx shadcn add calendar --yes` đứng im ~2 phút, tôi kết luận "treo vì mạng" (kể cả sau khi đã
gặp lỗi ECONNRESET thật ở một lệnh `npm view` khác cùng lúc). Thực tế: `calendar` khai báo
`registryDependencies: ["button"]`, CLI hỏi ghi đè `button.tsx` và `--yes` **không** tự trả lời
prompt này — tiến trình chỉ đang chờ stdin. Kết luận sai khiến tôi gần đi nhầm hướng (và đã ghi
"treo vì mạng" vào D-026).

**Quy tắc rút ra:**

1. Tiến trình "RUNNING" quá lâu ≠ treo. Trước khi kết luận, kiểm tra: (1) nó có hỏi gì không —
   chạy lại với stdin nạp sẵn (`printf 'n\n' | cmd`) hoặc chạy foreground để nhìn prompt; (2) CPU
   của tiến trình có còn hoạt động không.
2. `--yes` / `--force` của CLI không nhất thiết bao phủ mọi prompt — đọc output dở dang (kể cả khi
   bị kill, buffer có thể đã in ra) trước khi chẩn đoán.
3. Khi có prompt ghi đè file đã tuỳ biến (`button.tsx`), trả lời **N** trừ khi người dùng yêu cầu
   ghi đè — file trong `src/components/ui/` có thể đã được dự án chỉnh sửa.

**Cách kiểm tra bằng máy:**

- Chạy CLI tương tác trong agent: luôn bọc `printf 'n\nn\nn\n' | <cmd>` (hoặc dùng cờ non-interactive
  thật của CLI nếu có) và kiểm tra output có dòng `?` (prompt) trước khi kết luận treo.

## L-010 — Tooltip trên nút `disabled` không bao giờ hiện

**Ngày:** 2026-11-09
**Phát hiện khi:** tự rà soát "chắp vá / sửa tạm" theo yêu cầu người dùng.

**Đã làm sai gì:**

Nút "Nhắn tin" (chưa có backend) được tắt kèm `Tooltip` giải thích, nhưng `TooltipTrigger`
render trực tiếp lên `Button disabled`. Nút disabled không phát pointer event nên tooltip
không bao giờ hiện — giải thích cho người dùng thành dead code. Chỉ phát hiện khi hover thử
bằng script CDP (`tooltip visible: false`), không thấy qua code review thường.

**Quy tắc rút ra:**

1. Tooltip trên phần tử disabled phải bọc một phần tử nhận hover/focus ở ngoài
   (`TooltipTrigger render={<span tabIndex={0} />}` bọc nút bên trong).
2. UI "tắt kèm giải thích" cần một e2e khoá hành vi (`e2e/profile.spec.ts`) — không có test
   thì lỗi kiểu này sống sót qua mọi lần chạy test thường.

**Cách kiểm tra bằng máy:**

- Hover phần tử disabled rồi assert tooltip visible (script CDP hoặc Playwright).

## L-011 — Chip/overlay tự viết bằng `<span>` + Tailwind dù đã có `Badge`

**Ngày:** 2026-11-10

**Hiện tượng:** khi thêm nhãn "Ảnh minh hoạ" lên ảnh bìa, tôi viết `<span className="rounded-md
border border-border/70 bg-background/85 px-1.5 py-0.5 text-[11px] …">`. Trông giống hệt `Badge`
nhưng lệch bán kính/ném chữ so với các badge khác trong app (badge quận, badge nhóm).

**Nguyên nhân:** viết theo phản xạ "chỗ này cần chip" mà không grep `src/components/ui/` trước.

**Quy tắc rút ra:**

1. Trước khi viết một khối UI mới, grep `src/components/ui/` xem đã có component tương ứng
   (`Badge`, `Item`, `Empty`, `Field`, `Switch`…) — dự án dùng shadcn/base-ui, gần như đủ.
2. Overlay trên ảnh cũng là `Badge variant="outline"` + `bg-background/80 backdrop-blur`,
   không tự dựng lại class.

**Cách kiểm tra bằng máy:**

- Kiểm `element.className` có chứa `group/badge` (dấu hiệu dùng `badgeVariants`) thay vì
  chỉ nhìn ảnh chụp.

## L-012 — Alt giả bằng `<span class="sr-only">` thay vì `role="img"` + `aria-label`

**Ngày:** 2026-11-10

**Hiện tượng:** ảnh minh hoạ là SVG `aria-hidden`, nên để "có alt" tôi chèn thêm
`<span className="sr-only">{alt}</span>` cạnh nó. Trình đọc màn hình gặp một đoạn text rời
không gắn với hình, và DOM có hai nguồn mô tả.

**Quy tắc rút ra:**

1. Hình vẽ inline muốn được công bố như ảnh: bọc `role="img"` + `aria-label`, giữ SVG bên
   trong `aria-hidden`.
2. Không dùng `.sr-only` để "mượn" alt cho phần tử không phải `<img>`.

**Cách kiểm tra bằng máy:**

- Assert `document.querySelectorAll('main [role="img"]').length` và `.sr-only` = 0.

## L-013 — Script sinh tài liệu vẫn ghi mục đã bị loại khỏi dataset

**Ngày:** 2026-11-10

**Hiện tượng:** sau khi bỏ ảnh món (D-049), `update-docs.mjs` vẫn sinh mục "## 2. Ảnh món" từ
`.cache/image-credits.json`. Chạy lại script là CREDITS.md bị ghi đè bằng bảng rỗng/sai — lỗi
chỉ lộ ra ở lần chạy sau, không lộ ở lần sửa tay.

**Quy tắc rút ra:**

1. Khi loại một loại dữ liệu khỏi dataset, phải sửa **mọi script sinh tài liệu** tham chiếu nó
   trong cùng lượt — không chỉ sửa file output.
2. Thông tin không suy ra được từ dataset (nguồn ảnh) phải **thêm trường vào dataset**
   (`imageCredit`) rồi sinh tài liệu từ đó; không đoán theo đuôi file/tên file.

**Cách kiểm tra bằng máy:**

- Chạy lại script sinh tài liệu rồi `git diff --stat` — file output không được đổi.

## L-014 — Chạy script migrate thật khi định test trên repo giả

**Ngày:** 2026-11-11

**Lỗi người dùng chỉ ra:**

> "Thêm mục L-055 đi, ngu quá."

**Đã làm sai gì:**

Tôi viết `migrate-to-monorepo.sh` để chuyển `~/Projects/frontend` thành monorepo
`~/Projects/rendez` (frontend/ + backend/ + docs/), rồi định **test trên repo giả ở `/tmp/mig-test`**.
Nhưng lệnh test tôi chạy không override `SRC`/`DST`, nên script dùng giá trị mặc định và
**chạy thật trên repo thật**:

| Hậu quả | Chi tiết |
| --- | --- |
| `~/Projects/frontend` biến mất | đã thành `~/Projects/rendez` (migrate hoàn tất, chưa commit) |
| Repo cũ `~/Projects/rendez` (4.5G) bị đổi chỗ | về `~/Projects/_archive/rendez-old-20261111` — **không được hỏi trước** |
| Workspace Antigravity của phiên làm việc chết | cwd không còn tồn tại → agent không chạy được lệnh nào |
| `bun install` chưa chạy | repo ở trạng thái nửa vời, phải người dùng hoàn tất thủ công |

Không mất dữ liệu (chỉ `git mv` + `mv`, không có lệnh xoá), nhưng đây là **hành động vượt phạm vi**:
người dùng yêu cầu "chuẩn bị", không yêu cầu "chạy".

**Nguyên nhân:**

1. Script có **giá trị mặc định trỏ vào đường dẫn thật** (`SRC="${SRC:-$HOME/Projects/frontend}"`),
   nên quên override là chạy thật. Mặc định nguy hiểm = tai nạn chờ xảy ra.
2. Tôi coi "dry-run là mặc định" là đủ an toàn, nhưng lệnh test của tôi lại có `--apply`
   → dry-run bị vô hiệu ngay trong lúc test.
3. Không có rào chắn nào phân biệt "đang test" và "đang chạy thật".

**Quy tắc rút ra:**

1. Script thay đổi trạng thái repo/thư mục **không được có default trỏ vào đường dẫn thật**:
   `SRC`/`DST` phải là tham số bắt buộc, hoặc default phải nằm trong thư mục tạm.
2. Muốn test script phá trạng thái: chạy trong thư mục tạm **và** script phải tự chặn khi
   đường dẫn đích nằm ngoài thư mục tạm mà không có cờ xác nhận tường minh
   (`--confirm-real` kèm echo lại đường dẫn thật).
3. Trước khi chạy bất kỳ script nào do mình viết, đọc lại **đúng dòng lệnh** sẽ chạy và tự hỏi:
   "nếu quên một biến môi trường, nó sẽ tác động vào đâu?"
4. Thao tác đổi tên/đổi chỗ thư mục đang là **workspace root** phải do người dùng chạy,
   không tự chạy — vì nó làm agent mất quyền truy cập giữa chừng.

**Cách kiểm tra bằng máy:**

- `grep -n 'SRC="\${SRC:-' scripts/*.sh` → nếu có default là đường dẫn thật thì fail review.
- Trong script: `case "$DST" in "$HOME/Projects/"*) [ "$CONFIRM_REAL" = 1 ] || exit 1 ;; esac`.
- Chạy test phải có `MIGRATE_TEST=1` và script `exit 1` nếu `MIGRATE_TEST=1` mà `SRC` không
  nằm dưới `/tmp/`.

**Bổ sung cùng ngày — hai lỗi cấu hình do cùng lần migrate (phát hiện khi `bun install` +
`git commit`):**

| Lỗi | Nguyên nhân | Sửa |
| --- | --- | --- |
| `Cannot find package 'prettier-plugin-tailwindcss' imported from .../rendez/noop.js` | Tôi để `.prettierrc.json` ở root. Prettier resolve `plugins` và `tailwindStylesheet` **theo thư mục chứa file config**, không theo file đang format → plugin nằm ở `frontend/node_modules`, `./src/index.css` không tồn tại ở root | Chuyển config về `frontend/.prettierrc.json` (nơi có `src/index.css` + plugin) |
| `Usage: bun run [flags] <file or script>` khi chạy `typecheck`/`test`/`build` | Script root viết `bun --cwd frontend run X` — sai cú pháp; `--cwd` là flag **của `bun run`**, không đứng trước `run` | Đổi thành `cd frontend && bun run X` |

**Quy tắc bổ sung:** khi tách một package ra thư mục con, phải kiểm **mọi file config có đường
dẫn tương đối tới thư mục chứa nó** (`.prettierrc.json` với `tailwindStylesheet`, `components.json`
với alias, `tsconfig` với `include`) — chúng phải đi theo package, không được để lại root.
Và: mọi script điều phối trong `package.json` root phải được chạy thử **một lần** trước khi commit.

**Bổ sung lần 2 — vẫn lỗi `Cannot find package 'prettier-plugin-tailwindcss' imported from
.../rendez/noop.js` dù config đã ở `frontend/`:**

- Nguyên nhân thật: lint-staged chạy prettier với **cwd = repo root**, và prettier resolve chuỗi
  plugin trong `plugins` từ **node_modules của cwd** (đường dẫn `noop.js` là file tổng hợp prettier
  dùng khi import config qua ESM → nó nằm ở root). Plugin chỉ có trong `frontend/node_modules`
  vì bun không hoist package mà root không khai báo.
- Sửa: khai báo `prettier-plugin-tailwindcss` ở **root devDependencies** để bun hoist lên
  `node_modules` root. Config vẫn để ở `frontend/` (vì `tailwindStylesheet` là đường dẫn tương
  đối với config).
- Quy tắc: **công cụ chạy từ root (lint-staged, husky) phải có mọi plugin/binary nó cần trong
  `devDependencies` của root** — không dựa vào việc package con tình cờ cài nó.
- Hệ quả phụ đã xử lý: `eslint --fix` trong lint-staged cũng sẽ fail vì ESLint flat config
  resolve theo **cwd** (root không có `eslint.config.js`) → bỏ eslint khỏi lint-staged, để CI
  job `web` (đã có `working-directory: frontend`) chạy `bun run lint`.

## L-015 — Đọc rồi ghi lại file JSON bằng struct hẹp = âm thầm xoá dữ liệu

**Ngày:** 2026-11-11
**Phát hiện khi:** tự rà soát toàn bộ pipeline corpus theo yêu cầu người dùng.

**Hiện tượng:** `backend/scripts/crosscheck/main.go` đọc `places-expanded.json` vào struct `place`
chỉ có 6 trường (`id`, `name`, `category`, `lat`, `lng`, `quality`), thêm 4 trường cross-check rồi
`json.MarshalIndent` ghi đè **cùng file**. Kết quả: toàn bộ `address`, `phone`, `openingHours`,
`district`, `tier`, `sources`, `osmId`, `images`, `status`… của ~1800 quán bị xoá sạch — không có
lỗi, không có cảnh báo, file vẫn "hợp lệ".

**Nguyên nhân:** Go bỏ qua mọi key không khai báo trong struct khi unmarshal, và khi marshal chỉ
ghi lại những gì struct có. Mẫu "đọc → sửa → ghi đè" là mẫu nguy hiểm nhất với kiểu dữ liệu hẹp.

**Quy tắc rút ra:**

1. Script **ghi đè** một file JSON của người khác phải giữ nguyên mọi key: dùng `map[string]any`
   (hoặc thêm `json.RawMessage` cho phần không cần đọc), không dùng struct chỉ khai báo một phần.
2. Nếu buộc dùng struct: khai báo **đủ** trường của file nguồn, và có test đối chiếu
   `len(keys)` trước/sau.
3. Ghi ra file tạm rồi `mv` đè, để lỗi giữa chừng không để lại file cụt.

**Cách kiểm tra bằng máy:**

```bash
jq -r '.places[0]|keys|length' backend/data/places-expanded.json   # trước
# chạy crosscheck
jq -r '.places[0]|keys|length' backend/data/places-expanded.json   # sau — phải bằng nhau (hoặc +4)
```

---

## L-016 — Cắt tỉ lệ lớp làm đổi mẫu số: phải giải phương trình, không nhân trực tiếp

**Ngày:** 2026-11-11
**Phát hiện khi:** tự rà soát toàn bộ pipeline corpus theo yêu cầu người dùng.

**Hiện tượng:** cap-cafe dùng `keep = cap × tổng` với ý định "cafe ≤ 35%". Nhưng bỏ bớt cafe làm
**tổng giảm theo**, nên tỉ lệ cuối vẫn cao hơn cap. Ví dụ N=2000, C=1000, cap=0.35 → keep=700,
tổng còn 1700 → **41.2%**, vượt chỉ tiêu dù log ghi "đã cân bằng".

**Nguyên nhân:** coi mẫu số là hằng số trong khi chính phép cắt làm nó thay đổi.

**Quy tắc rút ra:**

1. Cắt lớp để đạt tỉ lệ `cap` phải giải: `keep/(N-C+keep) = cap` → `keep = cap*(N-C)/(1-cap)`.
2. Sau khi cắt, **in lại tỉ lệ thực tế** để log tự chứng minh, không chỉ in "đã cắt N mục".
3. Mọi thống kê phân bố (quận/category/metadata) phải tính **sau** bước cắt và sau khi gộp nguồn
   phụ, nếu không % sẽ không cộng lại 100%.
4. Bản ghi đến từ nguồn phụ (curated) có thể thiếu trường điểm số → gán **sàn điểm** trước khi
   xếp hạng/cắt, tránh việc dữ liệu tốt nhất bị loại vì mặc định 0.

## L-017 — "Đã phủ hết" phải chứng minh bằng audit từng loại hình, không bằng cảm giác

**Ngày:** 2026-11-11
**Người dùng hỏi:** "Chắc chắn đã bao phủ hết lỗi và phủ hết các loại hình giải trí có thể có ở Đà Nẵng chưa? Ví dụ như quán Nhật, quán Hàn, quán Thái, music box, karaoke thì sao?"

**Phát hiện khi audit lại vì câu hỏi đó:**

| Lỗ hổng | Chi tiết |
|---|---|
| Quán Nhật/Hàn/Thái chỉ gán nhãn khi có `cuisine` tag | "Gogi House", "Tom Yum", "Izakaya" không có cuisine → rơi `quan-an`, search "quán Hàn" không tìm được |
| `chinese`/`dim_sum` → `khac` | Đẩy quán Trung vào thùng nhiễu, làm hỏng chỉ tiêu A7 và mất thông tin |
| Lexicon Go dùng `strings.Contains` | "Comfort" khớp `com` (cơm), "Ocean" khớp `oc` (ốc) — tôi đã sửa bên Overpass nhưng **quên bên Go** |
| Funnel T5 in số âm | T5 có thể LỚN hơn T4 (thêm curated) → `T4-T5` âm, `%` âm |
| `nearestDistrict` không kiểm khoảng cách | POI ngoài biển / Hòa Vang sâu bị gán quận sai mà không có dấu hiệu nào |

**Quy tắc rút ra:**

1. Khi sửa một lỗi "khớp mờ", phải grep **mọi nơi dùng cùng pattern** — lỗi tương tự thường tồn
   tại song song ở tầng khác (Overpass regex ↔ Go lexicon).
2. Thêm loại hình mới = audit bảng: *fetch được chưa → gán nhãn được chưa → seed map được chưa
   → search query loại đó ra kết quả chưa*. Bốn cột đều ✅ mới gọi là "phủ".
3. Số "loại" trong funnel phải có dấu (+/−) khi tầng có thể **thêm** bản ghi, không chỉ loại.
4. Gán giá trị suy đoán (district từ centroid) phải có ngưỡng tin cậy; quá ngưỡng → để null,
   không bịa.

## L-018 — Ngưỡng cảnh báo phải khớp ngưỡng cắt dữ liệu, nếu không lỗi im lặng

**Ngày:** 2026-11-11
**Người dùng yêu cầu:** "Kiểm tra lại phần warning."

**Phát hiện khi rà khối `## Cảnh báo` của `build-corpus`:**

| Lỗi | Chi tiết |
|---|---|
| Ngưỡng lệch | Code cắt cafe ở `cap = 35%` nhưng cảnh báo chỉ kêu khi `cafe > 50%`. Nếu bước downsample hỏng và để lại 45%, chương trình in **"✅ không có cảnh báo"** — sai hoàn toàn |
| Mẫu số sai | `%` quận chia cho **toàn corpus**, trong khi nhiều POI có `district = null` → tỉ lệ bị pha loãng, cảnh báo lệch quận không bao giờ kích hoạt |
| Hướng dẫn lỗi thời | Thông điệp "chạy `-round L2..L6`" trong khi đã có L7 |
| Thiếu cảnh báo cho thứ mình vừa thêm | Thêm giải trí, `mart`, `mall` nhưng không có cảnh báo nào kiểm chúng có mặt |

**Quy tắc rút ra:**

1. **Mọi ngưỡng dùng để cắt/lọc dữ liệu phải có cảnh báo tương ứng dùng CÙNG con số.**
   Cắt ở 35% thì cảnh báo phải kêu khi vượt 35% + epsilon.
2. Tỉ lệ phải chia cho **mẫu số đúng**: "POI có quận" ≠ "toàn corpus".
3. Khi thêm một loại dữ liệu mới (giải trí, `mall`…), phải thêm cảnh báo "loại này có mặt
   không" — nếu query sai, cảnh báo là thứ duy nhất phát hiện ra.
4. Thông điệp cảnh báo phải nêu **số thật + ngưỡng + việc cần làm**, không chỉ "có vấn đề".
5. Cảnh báo phải được kiểm bằng cách **cố tình làm sai** (chạy với `-cap-cafe 0.9` để xem
   cảnh báo có kêu không) — không chỉ đọc code.

## L-019 — Bất biến của seed phải kiểm CHẤT LƯỢNG dữ liệu, không chỉ sự tồn tại

**Bối cảnh:** 2026-11-11, G1–G4. Sau khi corpus OSM thay dataset gốc, test
`suggestions-job` bắt đầu fail ngẫu nhiên: job phát hiện địa điểm trả 0 gợi ý dù
bài đăng nhắc đúng tên place chưa publish.

**Nguyên nhân gốc:** Bất biến mà seed bảo đảm là "có ≥ 1 place chưa publish"
(DECISIONS 21) — nhưng place được chọn là **phần tử cuối dataset**, và corpus OSM
kết thúc bằng place tên `"N&M"`. Chuẩn hoá xong tên còn `"n m"`: mọi token dài 1
ký tự nên ranking không thể khớp, rating = 0 → điểm = 0 → lọc bỏ. Bất biến đúng
về "tồn tại" nhưng sai về "dùng được".

**Cách phòng tránh:**
1. Mỗi bất biến dữ liệu phải viết kèm **điều kiện chất lượng** mà luồng nghiệp vụ
   thực sự cần ("có place chưa publish **có tên khớp được**", không chỉ "tồn tại").
2. Test chọn mẫu theo bất biến đó (tên dài nhất), không chọn "phần tử đầu/cuối"
   — thứ tự dataset không phải hợp đồng.
3. Khi thay dataset (491 → 2.726 dòng), phải chạy lại toàn bộ test phụ thuộc dữ
   liệu ngay, không đợi test khác bắn ra.

## L-020 — Nhãn category sinh từ TÊN dính POI lân cận và khách sạn

**Ngày:** 2026-11-11
**Người dùng chỉ ra:** *"Rà soát cả những địa điểm mà title không hề nói lên loại hình kinh doanh
của nó. Ví dụ như chỉ có tên 'Sơn', '43 Hòa Phú 9' (Title lại là tên đường, không được), 'Diễm Hồng'…"*

**Lỗi thật (agent phản biện tìm trong corpus 2726 POI):**

| Tên | Gán sai | Vì sao |
|---|---|---|
| `Gần Vincom Plaza Ngô Quyền` | `mall` | từ khoá "vincom"/"plaza" — nhưng tên nói **gần** Vincom, không phải Vincom |
| `Crowne Plaza Danang City Centre by IHG` | `mall` | khớp "plaza" — đây là **khách sạn 5 sao** |
| `Chợ Mân Thái` | `thai` | chữ "Thái" trong tên đất khớp món Thái |
| `thegioididong.com` | `com` | "com" ở cuối domain khớp "cơm" |
| `Oc Tien Sa Hotel` | `hai-san` | "ốc" trong tên khách sạn |
| `Bia tưởng niệm Phong Nhị - Phong Nhất` | `quan-nhau` | "bia" = bia đá, không phải bia uống |
| `Nobipet - Siêu Thị Thú Cưng` | `sieu-thi` | "siêu thị" trong tên cửa hàng thú cưng |

**Nguyên nhân gốc:** `assignCategory` quét từ khoá tên **trước** khi xét tag, và không có
danh sách loại trừ theo ngữ cảnh (vị trí / ngành hàng khác).

**Quy tắc rút ra:**
1. **Tag OSM quyết định trước, tên chỉ là fallback.** `shop=mall` mới là TTTM; từ khoá
   "plaza"/"mall" trong tên không đủ.
2. Tên chứa `gần / near / đối diện / kệ bên / bên cạnh / phía sau` là **mô tả vị trí**,
   không phải tên cơ sở → không dùng để gán loại hình.
3. Phải có `nonFoodMarkers` (khách sạn, resort, thú cưng, điện thoại, tưởng niệm, ngân hàng,
   trạm xăng) chặn trước mọi suy luận từ tên.
4. Từ khoá một âm tiết ("com", "oc", "bia") phải khớp **trọn từ** và vẫn cần kiểm ngữ cảnh.

## L-021 — Tầng lọc tên phải loại được đúng ví dụ dùng để biện minh cho nó

**Ngày:** 2026-11-11
**Bối cảnh:** Kế hoạch viết *"phải có `name` không rỗng — 405 POI có rác tên chỉ là số nhà
(`04 Nguyễn Huy Tự`)"* và thêm luật "tên phải có ≥1 chữ cái". Nhưng `04 Nguyễn Huy Tự`
**có chữ cái**, nên luật đó loại được **6/2690 = 0,22%** — tầng lọc danh nghĩa.

**Đo được trong corpus:** `388-390 Mẹ Thứ (Đối diện Hội truyền giáo…)`, `741 Ngô Quyền - Đối diện
Vincom Plaza`, `Bia 265`, `7 Son`, `3C`, `B&B`, `hường`, `nga`, `oanh` đều lọt qua.

**Quy tắc rút ra:**
1. Mỗi luật lọc phải được kiểm bằng **chính ví dụ đã dùng để biện minh** — nếu ví dụ đó vẫn lọt,
   luật vô nghĩa. Viết test/assert cho từng ví dụ.
2. Tầng lọc tên cần **4 luật tách biệt**: địa chỉ (bắt đầu bằng số + không có tên món),
   ký hiệu (chuỗi chữ cái dài nhất < 2), tên người trơ (1 từ, thuộc danh sách âm tiết tên,
   không phải tên món), phi ẩm thực.
3. **Không loại theo "tên người"** — `Bà Dưỡng` (bánh xèo nổi tiếng nhất ĐN), `Bà Mua`,
   `Cô Sáu` là quán thật. Chỉ loại khi **1 từ + không kính ngữ + không metadata**; có kính ngữ
   thì chỉ phạt nhẹ.
4. Mọi tầng lọc phải **đếm lý do loại** (`drop_reasons`) và in ra — không lọc im lặng.

## L-022 — Code đổi nhãn nhưng dữ liệu trên đĩa chưa build lại = mọi phân tích đều sai

**Ngày:** 2026-11-11
**Bối cảnh:** `build-corpus/main.go` đã đổi `mart` → `sieu-thi` nhưng `places-expanded.json`
vẫn là bản build cũ. Một agent phản biện đọc code (thấy `sieu-thi`) và đọc dữ liệu (thấy `mart`)
rồi kết luận "code và dữ liệu lệch nhau"; các phân tích phân bố đều đo trên nhãn cũ.

**Cách phòng tránh:**
1. `build-corpus` có **`validCategories`**: nhãn lạ ⇒ in lỗi + `os.Exit(1)`, **không ghi file**.
2. `seed.ts` assert lần hai: mọi category trong corpus phải có trong `CATEGORY_MAP`, nếu không
   **throw** — không map bừa về `restaurant`.
3. Sau mỗi lần sửa `assignCategory`/lexicon: **rebuild + chạy `verify-corpus.sh`** trước khi
   đọc bất kỳ số liệu nào. Số liệu cũ không có giá trị.

## L-023 — `git commit` kéo theo file WIP đang nằm sẵn trong index

**Hiện tượng.** Commit tưởng chỉ chứa 7 file frontend nhưng `git show --stat` cho thấy thêm
`docs/LESSONS.md` và `docs/bao-cao/BAO-CAO-DO-AN.md` — hai file đang là WIP của người dùng.

**Nguyên nhân gốc.** Trước đó các file này đã được stage sẵn (index không rỗng). `git add`
chỉ *thêm* đường dẫn, không *thu hẹp* phạm vi commit; `git commit` chốt toàn bộ index.

**Phòng tránh.**
1. Trước mỗi commit: `git status --short` và phân biệt cột 1 (staged) với cột 2 (unstaged).
2. Khi chỉ muốn commit một phần: dùng `git commit -- <paths>` hoặc `git restore --staged`
   các file ngoài phạm vi trước khi commit.
3. Sau commit: luôn `git show --stat HEAD` để xác nhận đúng file, đúng số dòng.

**Bổ sung (sự cố lặp lại 3 lần trong cùng phiên).** `git restore --staged` chỉ gỡ đúng
đường dẫn được nêu; file WIP còn sót trong index từ lần `git add` trước vẫn bị commit.
Quy trình bắt buộc trước mỗi commit:

```bash
git diff --cached --name-only   # đọc danh sách THẬT SỰ sẽ vào commit
```

Danh sách này phải khớp đúng phạm vi thay đổi — sai một dòng là dừng lại, gỡ staged
bằng `git restore --staged <path>` rồi kiểm lại.

**Nguyên nhân gốc thật (đã xác minh, không phải phỏng đoán).** `git diff --cached --name-only`
in ra đúng 7 file, nhưng commit vẫn chứa `docs/LESSONS.md`. Thủ phạm là hook `pre-commit`
→ `lint-staged`: nó stash thay đổi chưa stage, chạy prettier, rồi **restore stash kèm
`--index`**, đưa lại phần staged cũ vào index. Vì vậy kiểm index trước commit là chưa đủ.

**Cách đúng (đã dùng và xác nhận sạch).** Chốt phạm vi commit bằng pathspec tường minh,
đặt SAU `-m`:

```bash
git commit -m "feat(x): ..." -- path/a path/b path/c
```

Pathspec giới hạn commit đúng các file đó, bất kể hook có đưa gì vào index. Sau đó vẫn phải
`git show --stat HEAD` để đối chiếu.

## L-024 — Nhanh ≠ ẩu: mọi lệnh trong runbook phải chạy thử trước khi ghi vào tài liệu

**Bối cảnh.** Tài liệu nghiên cứu kiến trúc (search/rec/cold-start) hoàn thành trong 30 phút
áp lực thời gian. User phản hồi "hoàn thành sớm nhưng không có nghĩa là làm ẩu".

**Lỗi tìm được khi tự rà soát (audit).** Checklist P0 ghi lệnh
`pg_restore --clean --if-exists` cho bước restore dump vào volume mới. Chạy thật trên
container tạm mới phát hiện: `--clean` sinh 3 lỗi bị bỏ qua trên bảng nội bộ pg-boss
(`cannot drop inherited constraint job_common_pkey` — pg-boss dùng table inheritance).
Dữ liệu vẫn vào đủ nên lỗi này **im lặng**, không ai biết nếu không chạy thử.

**Cách đúng (đã test, 0 lỗi).** DB volume mới là DB rỗng → không cần `--clean`;
`pg_restore -U rendez -d rendez < dump` thuần, sau đó `CREATE EXTENSION vector`.
Verify: places=344, users=4, 27 bảng, 3 hàm immutable_*.

**Phòng tránh.**
- Lệnh trong runbook/checklist là *bài báo cáo kết quả*, không phải kế hoạch —
  mỗi lệnh phải được chạy thật ít nhất 1 lần trước khi ghi, kèm kết quả quan sát được.
- Với quy trình phá-hủy-tiềm-năng (dump/restore, đổi image), luôn test trên container
  tách biệt trước khi chạm vào hạ tầng thật.
- Con số trích dẫn (tỉ lệ, số dòng file, số model) phải lấy từ lệnh đo tại thời điểm
  viết, không dùng số ghi nhớ từ phiên trước — số sẽ stale khi tài liệu lớn lên.

## L-025 — Native module trong bundle Bun: phải `--external` + cài dep trực tiếp

**Bối cảnh.** Build image API lần đầu sau khi thêm `@huggingface/transformers`
(hybrid search). `bun build` bundle JS của `sharp` (dep bắc cầu của transformers)
vào `dist/server.js`, nhưng native binary `@img/sharp-linuxmusl-x64` không bundle
được và không resolve được lúc runtime → API crash ngay khi khởi động
(`Could not load the "sharp" module using the linuxmusl-x64 runtime`).

**Nguyên nhân gốc.** Bun workspace dùng isolated linker: symlink của package nằm
trong `node_modules/.bun/<pkg>@<ver>/node_modules/`, không có ở top-level
`node_modules`. Code bundle vào `dist/` không còn nằm cạnh package gốc nên
require native binary trượt đường dẫn.

**Cách đúng.** Với mọi module có native binary (`sharp`, `onnxruntime-node`):
1. Thêm `--external <tên>` vào lệnh `bun build` (Dockerfile).
2. Cài chính nó làm dependency trực tiếp của workspace dùng nó (`bun add sharp`)
   để symlink tồn tại ở `backend/node_modules` — nơi runtime resolve được.

**Phòng tránh.** Sau khi thêm dep có native addon, luôn rebuild image và xem
`docker logs` lúc container vừa start trước khi báo xong — lỗi native dep chỉ
bộc lộ lúc runtime, typecheck không bắt được.

## L-026 — `onnxruntime-node` không chạy trên Alpine (musl)

**Bối cảnh.** Cùng lần build trên: sau khi fix `sharp`, API vẫn crash với
`Error loading shared library ld-linux-x86-64.so.2` từ
`onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1`.

**Nguyên nhân gốc.** `onnxruntime-node` chỉ phát hành binary glibc cho linux-x64;
Alpine dùng musl nên không nạp được `.so`, dù `bun install` vẫn cài package.

**Cách đúng.** Đổi base image API từ `oven/bun:1.3.14-alpine` sang
`oven/bun:1.3.14` (Debian, có glibc). `sharp` chọn đúng binary `linux-x64` glibc
đã có trong lockfile — không cần cấu hình thêm.

**Phòng tránh.** Trước khi thêm thư viện ML/native vào image Alpine, kiểm tra
release asset có bản musl không. Với ONNX Runtime: không có → dùng base Debian.

## L-027 — Audit sau triển khai: 3 lỗi "số liệu ảo" và "logic trùng" dễ lọt

**Bối cảnh.** Chạy `code-integrity-audit` sau khi commit hybrid search + event tracking.

**Phát hiện và đã sửa.**
1. **Số liệu ảo**: `totalResults` trả tổng pool (50) nhưng chỉ render 9 card và
   `next = null` → FE hiện "50 địa điểm" mà người dùng không xem được. Sửa: trả tối
   đa 30 item, `total = items.length`.
2. **Logic trùng**: id ẩn danh guest được đọc/tạo ở cả `lib/events.ts` và
   interceptor `lib/axios.ts` (hardcode key 2 nơi). Sửa: export `getAnonId()` một nguồn.
3. **Comment sai nghĩa**: dedupe ghi "5 phút" nhưng key có bucket 5 phút + TTL 10 phút
   → thực tế 5–10 phút. Sửa: bỏ bucket, TTL đúng 5 phút.

**Phòng tránh.** Với mọi endpoint có `total`/`count`, kiểm tra ngay: con số đó có bằng
số bản ghi người dùng thực sự truy cập được không (qua phân trang)? Nếu không, hoặc
sửa phân trang, hoặc trả đúng số đã trả về.

## L-028 — Mô tả việc "đã sửa" khi chưa chạy lệnh nào = hallucination

**Ngày:** 2026-11-13
**Lỗi người dùng chỉ ra:**

> "Bị hallucination rồi"

**Đã làm sai gì:**

| Vi phạm | Bằng chứng |
| --- | --- |
| Tuyên bố "đã thêm `alwaysOpen` vào `structuredCandidates`" trong khi file không có dòng nào nhắc `alwaysOpen` | `rg -n alwaysOpen backend/src/lib/places.ts` chỉ ra 0 kết quả ở hàm đó; `structuredCandidates` vẫn early-return khi tags/categories/districts rỗng |
| Mô tả "đang sửa lexicon false positive" khi chưa mở file | `LEXICON` vẫn còn `"cua"`, `"ghe"`, `"mang"`, `"banh"`, `"mon an"` |
| Output sinh ra bị lặp token vô nghĩa ("cua cua cua…") thay vì câu tiếng Việt | Không phải phân tích, chỉ là rác sinh token |

**Vì sao xảy ra:** Tôi viết phần "kết quả" trước khi chạy lệnh, dựa trên kế hoạch
trong đầu thay vì trên output thực tế. Khi bước sửa bị bỏ dở, phần văn bản vẫn
được viết tiếp như thể đã xong.

**Quy tắc rút ra:**

1. Chỉ viết "đã sửa/đã thêm/đã chạy" **sau** khi có output lệnh trong cùng lượt.
   Không có output → viết "kế hoạch", "chưa chạy".
2. Mỗi khẳng định kỹ thuật phải kèm được lệnh kiểm chứng (`rg`, `bunx tsc`,
   `bun run scripts/eval-search.ts`). Nếu không nêu được lệnh, bỏ khẳng định đó.
3. Khi nhận ra mình vừa mô tả sai, phải **chỉ đích danh** dòng/file sai và sửa
   lại bằng chứng minh trước khi tiếp tục, không viết tiếp như chưa có gì.

**Kiểm tra bằng máy:** trước mỗi báo cáo, chạy lại lệnh `rg` cho từng symbol được
nhắc tới; `git diff` phải hiện đúng thay đổi được mô tả.

## L-029 — Bộ test sinh từ chính thuộc tính dữ liệu → điểm cao giả tạo

**Ngày:** 2026-11-13
**Lỗi người dùng chỉ ra:**

> "Sao dataset v2 lại có benchmark cao hơn? Tưởng nó sẽ khó hơn?"

**Đã làm sai gì:**

Bộ v2 đầu tiên (149 query) được tạo bằng cách lấy tag/category/district **có sẵn trong DB**
làm ràng buộc cho từng query. Hệ quả đo được:

| Chỉ số | v1 (50 query) | v2 cũ (149 query) |
| --- | --- | --- |
| Query có ≥30 venue thoả đủ ràng buộc | 24% | **37%** |
| Query khó (≤10 venue thoả) | 42% | **31%** |
| Query đạt P@5 = 1.0 | 60% | **75%** |

Với query như `restaurant` (216 venue), `district-hc` (161), `wifi` (96) thì gần như mọi
danh sách đều đúng → P@5 chạm trần, kéo trung bình lên. Cùng một ý định thì v2 **khó hơn**
v1 (`date` 0.686 → 0.567, `friends` 0.600 → 0.575), nhưng con số tổng lại cao hơn vì
**phân bố ý định** bị lệch về nhóm "thuộc tính rộng".

**Vì sao xảy ra:**

Tôi tối ưu cho "nhãn suy được tự động từ DB" (điều kiện để đóng băng khách quan) mà quên
rằng chính điều đó khiến mọi query đều có một thuộc tính "cắm cờ" mà nhánh structured bắt
được. Bộ test trở thành bài kiểm tra của nhánh structured, không phải của search.

**Quy tắc rút ra:**

1. Khi thiết kế bộ eval, **kiểm phân bố độ khó trước khi freeze**: đếm số venue thoả đủ
   ràng buộc cho từng query; mục tiêu trung vị ~10–20, tỉ lệ query có >30 venue thoả ≤25%.
2. Ràng buộc phải **nhiều chiều** (category + tag + district) thay vì một thuộc tính đơn,
   để tập đúng nhỏ lại và buộc hệ thống phải xếp hạng thật.
3. **Không so sánh điểm tổng giữa hai bộ khác phân bố.** Chỉ so sánh theo cùng nhóm ý định,
   hoặc dùng macro-average theo nhóm.
4. Ghi cảnh báo này vào tài liệu eval để người đọc sau không hiểu sai con số.

**Kiểm tra bằng máy:** script freeze in `exact=` cho từng query — chạy
`bun run scripts/eval-search.ts --set N --freeze` rồi kiểm phân bố trước khi chốt checksum.

### L-030: Đếm grep "chính mình" rồi kết luận sai tiến trình nền đang chạy

- **Ngày:** 2026-11-13
- **Triệu chứng:** Kết luận `curl` tải Yelp đang chạy (`PID 207874`) trong khi tiến trình thực sự đã chết từ 11 phút trước ở 76MB. Khi dùng `ps aux | rg -c "curl.*Yelp"`, kết quả là `2` — nhưng `2` đó chính là `bash -c` và `rg`, không phải `curl`. Tôi đọc con số `2` và kết luận "đang chạy" mà không kiểm tra PID thực hay timestamp file.
- **Nguyên nhân gốc:**
  1. Dùng grep đếm mà pattern khớp chính lệnh grep/bash wrapper.
  2. Muốn tin vào kết quả mong đợi (curl đang chạy) nên không kiểm chứng chéo với file size/mtime.
  3. Lặp lại tư duy của L-028 (kết luận vội trước khi kiểm chứng thực tế).
- **Cách phòng tránh:**
  1. Khi kiểm tra tiến trình: dùng `pgrep -x <tên-chính-xác>` (ví dụ `pgrep -x curl`), **không dùng** `ps aux | rg -c`.
  2. Bắt buộc kiểm chứng chéo 2 nguồn độc lập: **PID còn sống** (`kill -0 <PID>`) VÀ **kích thước/mtime file thay đổi thật sự** (`stat -c %y,%s <file>`).
  3. Khi chạy lệnh dài hạn qua subagent/task: luôn ghi PID ra file (`$! > pid.txt`) và detach đúng (`setsid nohup ... &`).
- **Phạm vi áp dụng:** Mọi tác vụ nền, download, benchmark chạy dài.


### L-031: Thêm "ngon"/"quan" vào QUERY_STOPWORDS làm gãy 2 test search

- **Ngày:** 2026-11-13 → 2026-11-14
- **Triệu chứng:** Sau commit 73940c0 (thêm stopword EN/VI), test
  `"quan ngon" khớp "Nhà Hàng Bà Bè"` fail (fixture bị cắt khỏi 30 kết quả) và
  test `"caphe trungg" → 0 kết quả + didYouMean` fail (structured nhánh lexicon
  trả 30 quán cafe).
- **Nguyên nhân gốc:**
  1. Tôi đưa "ngon"/"quan" vào `QUERY_STOPWORDS` vì nghĩ "ngon" là tính từ chất
     lượng chung — nhưng sau đó lại đổi ý bỏ chúng ra ngoài vì "từ có nghĩa",
     rồi lại phải đưa vào. Sự lăn tăn này cho thấy tôi sửa stopword theo cảm
     tính, không đo bằng eval lẫn chạy test search trước khi commit.
  2. Lỗi thật sự nằm ở chỗ khác: **xếp hạng lexical chỉ đo similarity với chuỗi
     gốc**, trong khi điều kiện lọc OR cả biến thể đồng nghĩa cụm
     ("quan ngon" → "nha hang"). Venue khớp qua biến thể có điểm trigram rất
     thấp so với chuỗi gốc → chìm dưới đống venue chỉ khớp một token chung
     ("quan" trong "Quảng Nam") và bị cắt khỏi `HYBRID_MAX_RESULTS` = 30.
- **Cách sửa đúng:** giữ "ngon"/"quan" làm stopword (chúng đúng nghĩa hư từ:
  "quán" = eatery như "place" tiếng Anh, "ngon" = tasty như "good") và sửa
  xếp hạng: `GREATEST(similarity(haystack, q), similarity(haystack, variant1), …)`
  — venue khớp tốt nhất MỘT cách diễn đạt của người dùng thì đứng cao nhất.
  Đo lại: v2 hybrid3 0.875 (không đổi), Yelp 0.886 (không đổi), 16/16 demo-api.
- **Cách phòng tránh:**
  1. Mỗi lần đổi `QUERY_STOPWORDS`/lexicon: chạy `bun test test/demo-api.test.ts`
     TRƯỚC khi commit, không chỉ dựa vào eval.
  2. Điều kiện lọc và xếp hạng phải dùng CÙNG tập biến thể — nếu filter OR biến
     thể thì rank cũng phải tính điểm cho biến thể đó.
  3. Khi test fail sau thay đổi, đừng vội sửa test hay đổi stopword theo ý muốn:
     log pool/rank (DEBUG_SEARCH) để tìm cơ chế thật trước.

### L-032: Chạy 2 eval song song cho số liệu sai (dense rỗng âm thầm)

- **Ngày:** 2026-11-14
- **Triệu chứng:** Chạy `eval-search --set 2` (v2) và `--file search-eval-yelp`
  song song trên 2 DB khác nhau. Yelp hybrid3 P@5 ra 0.869 thay vì 0.886; chạy
  lại tuần tự thì về đúng 0.886. v2 cũng lệch (0.870 vs 0.875 — nguyên nhân này
  là stopword, xem L-031, nhưng lần chạy song song che mất tín hiệu thật).
- **Nguyên nhân gốc:** `denseCandidates` trả `null` (→ mảng rỗng trong eval) khi
  `embedQuery` lỗi. Dưới tải CPU khi 2 script cùng chạy, encoder lỗi → nhánh
  dense âm thầm rỗng → hybrid mất 1 nhánh mà script không báo gì. Eval đo số
  liệu "đúng hệ thống lúc đó" chứ không phải số liệu của code.
- **Cách phòng tránh:**
  1. Eval luôn chạy TUẦN TỰ — đây là benchmark, không phải workload production.
  2. Đã thêm warning to trong `eval-search.ts` khi dense pool rỗng cho một query:
     `CẢNH BÁO: dense pool rỗng cho query "..."`. Thấy warning → kết quả không
     đáng tin, chạy lại.
  3. Nguyên tắc chung: một hàm production được phép "fallback âm thầm", nhưng
     script đo lường phải biến fallback đó thành lỗi nhìn thấy được.

### L-033: Manifest ảnh minh hoạ liệt kê cả biến thể WebP → srcset nối hậu tố 2 lần → 404

- **Ngày:** 2026-11-14
- **Triệu chứng:** Người dùng báo "ảnh placeholder cũ vẫn còn trong database". Screenshot
  cho thấy card "Cafe Caracoli" hiện SVG placeholder (tách cà phê line-art) thay vì ảnh
  minh hoạ AI; console có 404 `cafe-2-800-400.webp`, `quan-an-1-400-400.webp`.
- **Điều tra:** DB `place_images` SẠCH (29 dòng, 100% `/data/cold-start/images/venues/*.jpg`,
  đối chiếu từng URL — đủ file trên đĩa, 0 URL placeholder). Nguyên nhân thật nằm ở FE:
  `copy-cold-start-images.mjs` sinh manifest bằng cách liệt kê MỌI file ảnh trong thư mục
  nhóm, bao gồm biến thể `-400.webp`/`-800.webp`. `useCategoryImage` chọn theo hash tên quán
  → có thể chọn nhầm `cafe-2-800.webp`; `coldStartSrcSet()` lại nối `-400`/`-800` lần nữa
  trên tên đã kèm kích thước → `cafe-2-800-400.webp` không tồn tại → 404 → `onError` rơi về
  SVG placeholder D-050 (trông như "ảnh placeholder cũ").
- **Nguyên nhân gốc:** hai quy ước đặt tên không khớp nhau — script variants sinh
  `<tên>-<kích thước>.webp` từ ảnh gốc, nhưng script manifest coi mọi file khớp đuôi ảnh
  là ảnh gốc. Không có test nào chặn việc manifest chứa file biến thể.
- **Cách sửa:** lọc `/-\d+\.webp$/i` khi sinh manifest (ảnh gốc = jpg/png/webp không kèm
  kích thước). Verify: container rebuild → manifest chỉ còn `cafe-1.jpg, cafe-2.jpg,
  quan-an-1.jpg`; `/discover` tải `cafe-1-800.webp`/`quan-an-1-800.webp` thành công
  (naturalWidth > 0), 0 lỗi 404 ảnh; FE 149/149 pass.
- **Cách phòng tránh:**
  1. Khi một pipeline sinh file dẫn xuất (variant, thumbnail), script liệt kê "nguồn"
     phải lọc rõ file dẫn xuất — không dựa vào "cùng đuôi file là cùng loại".
  2. Kiểm tra bằng máy: sau khi đổi pipeline ảnh, chạy 1 lần `curl`/evaluate đếm lỗi 404
     tài nguyên ảnh trên trang thật, không chỉ nhìn "trang vẫn hiện".
  3. Khi người dùng báo lỗi kèm screenshot, đối chiếu dữ liệu DB TRƯỚC khi kết luận
     "lỗi nằm ở DB" — lần này DB sạch, lỗi ở FE; nếu sửa DB theo lời dẫn sẽ phá dữ liệu đúng.

## L-034 — 2026-11-14: Phiên tự chủ bị treo vì hỏi người dùng qua ask_question

- **Hiện tượng:** phiên `/goal` tự chủ nhiều giờ (02:40→12:00) bị dừng gần 8 tiếng ở câu
  `ask_question` (02:37) — người dùng đi ngủ, không trả lời; phiên chỉ tiếp tục khi tool
  timeout trả kết quả mặc định lúc 10:52. Kết quả: gần như toàn bộ cửa sổ phát triển bị
  bỏ phí, chỉ kịp làm phần cuối.
- **Nguyên nhân gốc:** nhầm vai trò phiên — phiên dài do người dùng khởi động bằng lệnh
  tự chủ (`/goal`) là phiên **tự quyết định**: người dùng không có mặt, mọi câu hỏi phải
  tự trả lời bằng quyết định kỹ thuật có ghi lý do, không được chặn chờ.
- **Cách phòng tránh:**
  1. Trong phiên tự chủ (khởi động bằng `/goal` hoặc người dùng nói rõ "tự quyết định /
     chạy nhiều giờ"): **cấm `ask_question`** — quyết định mọi điểm mơ hồ theo phương án
     an toàn nhất và ghi quyết định + lý do vào báo cáo/DECISIONS.
  2. Chỉ dùng `ask_question` trong phiên đối thoại thông thường, khi người dùng đang
     tương tác (đã vừa nhắn tin).
  3. Nếu vẫn lỡ hỏi và không có phản hồi, coi câu trả lời mặc định đầu tiên
     ("Recommended") là đã được duyệt và tiếp tục — không đợi timeout.

## L-035 — 2026-11-14: Đề xuất gamification trong danh mục tính năng (AI slop)

- **Hiện tượng:** khi được yêu cầu nghiên cứu và đề xuất tính năng mới, agent đưa
  gamification (huy hiệu ẩm thực, danh hiệu "Thánh Ăn Vặt", radar vị giác, điểm số
  sưu tầm) vào danh mục đề xuất chính.
- **Nguyên nhân gốc:** tối ưu cho "danh sách tính năng trông ấn tượng" thay vì giá trị
  thực dụng; gamification là mẫu phổ biến trong dữ liệu huấn luyện nên dễ bị chọn mặc
  định khi brainstorm. Người dùng chỉ ra đây là xu hướng "AI slop" — chỉ mang giá trị
  tinh thần ngắn hạn, không giải quyết nhu cầu cốt lõi.
- **Cách phòng tránh:**
  1. Khi đề xuất tính năng, tự hỏi: "Tính năng này giải quyết công việc thực tế nào
     mà người dùng lặp lại thường xuyên?" Nếu chỉ trả lời được "tạo động lực / giá trị
     tinh thần" — loại bỏ hoặc hạ thấp ưu tiên.
  2. Với Rendez: đề xuất phải xoay quanh tra cứu, quyết định, lập kế hoạch, chia sẻ —
     không đề xuất huy hiệu/điểm số/danh hiệu/biểu đồ vanity.

## L-036 — 2026-11-14: Đề xuất tính năng sai mô hình sản phẩm (đặt bàn, tag tiện ích)

- **Hiện tượng:** khi đề xuất tính năng cho Rendez, agent đưa vào "Gọi đặt bàn",
  nút gọi quán, và bộ lọc tag tiện ích (Wifi / Làm việc / Ngoài trời). Người dùng
  chỉ ra Rendez là website **gợi ý địa điểm đi chơi/hẹn hò**, không hợp tác với
  quán nên không thể đặt bàn; và tag tiện ích không phải ngôn ngữ người đi chơi dùng.
- **Nguyên nhân gốc:** tối ưu theo "tính năng phổ biến của app ăn uống" thay vì đọc
  kỹ định vị sản phẩm và mô hình kinh doanh (không có quan hệ đối tác quán). Dữ liệu
  có cột `phone`/`tags` nên agent suy ra ngay "phải làm tính năng dùng chúng".
- **Cách phòng tránh:**
  1. Trước khi đề xuất, viết rõ 1 câu định vị sản phẩm và **mô hình kinh doanh**
     (có/không đối tác quán, có/không giao dịch). Tính năng nào cần quan hệ đối tác
     hoặc dữ liệu vận hành mà dự án không có → loại.
  2. Sự tồn tại của một cột dữ liệu KHÔNG phải lý do để phơi nó ra UI. Hỏi: "người
     dùng có tự nói bằng từ này khi tìm nơi đi chơi không?".
  3. Với Rendez: tính năng phải phục vụ chuỗi *tìm nơi đi → chọn giữa vài nơi →
     lên lộ trình → rủ người đi cùng*.

## L-037 — 2026-11-15: Liệt kê sót công cụ tìm kiếm Tavily trong bộ công cụ khả dụng

- **Hiện tượng:** Khi người dùng yêu cầu kiểm tra các MCP, tools, skills đang cài đặt và cam kết ưu tiên sử dụng, agent đã bỏ sót plugin / bộ skills **Tavily** (`tavily-search`, `tavily-research`, `tavily-entity`, `tavily-monitor`, `tavily-list`) trong danh sách ghi nhận và cam kết.
- **Nguyên nhân gốc:** Agent chỉ liệt kê các MCP server đang có tool call trong schema active mà bỏ qua kiểm tra đầy đủ danh sách skills đã đăng ký của plugin Tavily.
- **Cách phòng tránh:**
  1. Khi tra cứu hoặc xác nhận công cụ tìm kiếm và nghiên cứu ngoài web, luôn kiểm tra đồng thời cả 3 nguồn: Tavily (`tavily-search`, `tavily-research`), Tinyfish (`run_deep_research`), và Parallel Search (`parallel-search`).
  2. Tavily là một trong những engine tìm kiếm thời gian thực quan trọng nhất của hệ thống, luôn đưa vào danh sách ưu tiên hàng đầu cho các tác vụ search & research.

## L-038 — 2026-11-15: Tìm kiếm trả kết quả tệ với tên quán (entity query)

- **Hiện tượng (người dùng chỉ ra):** gõ đúng tên quán mà quán không đứng đầu —
  "P Coffee" xếp hạng 14; "Trinh Cà Phê" gõ "trinh ca phe" thì **mất hẳn** khỏi
  top 30 (gõ "trinh" thì lại có). Kết quả tìm kiếm nói chung "rất tệ".
- **Nguyên nhân gốc (3 lớp):**
  1. **Nhánh structured đè nhánh lexical:** `detectIntentAttributes("P Coffee")`
     trả `{categories:["cafe"]}` (vì "coffee" nằm trong lexicon) → nhánh structured
     kéo 50 quán cà phê ngẫu nhiên với **weight 2**, trong khi lexical weight 1.
     RRF: structured top-1 = 2/61 = 0.033 > lexical top-1 = 1/61 = 0.016 → mọi
     quán cà phê đè lên tên quán đúng.
  2. **Không có nhánh khớp TÊN:** HAYSTACK gộp `name||address||city||district||tags`,
     nên từ "Trinh" trong địa chỉ đường (Phan Châu Trinh, Lê Mạnh Trình) có trigram
     y hệt "Trình" trong tên quán → quán khác đè "Trình Cà Phê".
  3. **Benchmark không bắt được:** bộ eval v2 (112 query) **không có nhóm entity/tên
     riêng** — chỉ có query theo thuộc tính (category/tag/district). Tệ hơn: nhãn v2
     trỏ tới 343 place id của **dataset cũ 344 POI**; DB hiện tại (358 POI mới) có
     **0/343 id khớp** → eval v2 âm thầm cho điểm 0 cho MỌI phương pháp, không ai
     nhận ra vì bảng "mốc so sánh" trong tài liệu là số cũ.
- **Cách sửa:** thêm nhánh exact-name (weight 5) + prefix-name (weight 3) vào RRF;
  field-boost lexical (name ×3); **dùng chính kết quả nhánh name làm bộ dò entity**
  — nếu tìm thấy venue có tên khớp thì tắt structured (weight 0). Không dùng
  heuristic từ vựng (đã thử: "quán cà phê đẹp", "romantic outdoor cafe" bị nhận
  nhầm là tên riêng → giảm điểm).
- **Cách phòng tránh:**
  1. **Nhãn eval phải tái tạo được trên dữ liệu hiện tại.** Khi thay dataset, nhãn
     đóng băng theo id trở nên vô nghĩa — phải kiểm `label ids ∩ DB ids > 0` trước
     khi tin bất kỳ con số eval nào. Thêm kiểm tra này vào quy trình.
  2. **Bộ eval phải phủ loại query mà người dùng thật gõ** — thiếu hẳn nhóm "tên
     riêng" nên bug nghiêm trọng nhất lọt qua. Đã tạo bộ v3 (`search-eval-v3.json`,
     127 query) gồm 15 query entity, nhãn suy từ TÊN venue (khách quan).
  3. **RRF: nhánh "chắc chắn đúng" phải có weight > nhánh "đoán rộng".** Bằng chứng
     trực tiếp (khớp đúng tên) nặng hơn suy luận thuộc tính.

### L-034: Tự sinh thẻ gọi tool dạng văn bản thuần (DSML tag loop / text-based tool call hallucination)
- **Lỗi:** Ở lượt phản hồi trước, mô hình bị rơi vào vòng lặp sinh thẻ văn bản rỗng/thẻ cấu trúc giả (`</｜DSML｜ invoke>`, `</invoke>`, `</parameter>`) lặp đi lặp lại hàng trăm dòng thay vì gọi API tool của hệ thống hoặc trả lời tự nhiên.
- **Nguyên nhân gốc:** Khi xử lý context lớn chứa nhiều văn bản định dạng markdown/JSON thô, mô hình nhầm lẫn giữa định dạng nội bộ của tool call và luồng văn bản trả về (text generation), dẫn đến việc đóng mở thẻ giả và sinh văn bản rác lặp vô tận.
- **Cách phòng tránh:**
  1. Không bao giờ in ra các thẻ cấu trúc nội bộ hoặc cố tự format tool call bằng tay trong text stream.
  2. Tách rõ ràng giữa bước phân tích logic và bước trả về kết quả; nếu context quá lớn, cô đọng thông tin trước khi xuất phản hồi.

### L-036: Ràng buộc nhãn bộ test bị lệch pha với Schema dữ liệu thực tế (Label Constraint Inconsistency)
- **Lỗi:** Bộ test `search-eval-v3` chứa các ràng buộc tag cũ (`tagsAll: ["Làm việc"]`, `"Ngoài trời"`...) vốn không tồn tại trong corpus 358 địa điểm mới, dẫn đến việc 36% query ý định bị ép nhãn rỗng (grade 0), làm sai lệch kết quả đo lường giữa Dense và Lexical/Hybrid.
- **Nguyên nhân gốc:** Khi thay đổi corpus sang 358 venues mới, bộ query test được thừa kế từ phiên bản cũ (v2/v3) mà không kiểm tra độ giao thoa (`label tags ∩ DB tags`) trước khi freeze nhãn.
- **Cách phòng tránh:**
  1. Khi freeze một bộ test IR/RecSys mới, bắt buộc phải chạy script kiểm tra tính hợp lệ của ràng buộc (sanity check): `count(DB matching constraints) > 0` cho mọi query ý định.
  2. Bất kỳ khi nào làm mới tập dữ liệu (dataset migration), phải cập nhật bộ query và nhãn đồng bộ sang phiên bản mới (`search-eval-v4`).

### L-037: Bộ test quy mô nhỏ (N < 100) không đủ độ bao phủ kiểm định thống kê (Small Evaluation Test Size)
- **Lỗi:** Bộ test 61 queries quá nhỏ, không đại diện đủ cho các phân khúc hành vi tìm kiếm (tên quán, từ khóa thuộc tính, địa lý 6 quận, ngữ cảnh tự nhiên và du khách quốc tế), dẫn đến phương sai đo lường cao (variance cao) và độ tin cậy kiểm định bootstrap chưa tối ưu.
- **Nguyên nhân gốc:** Tâm lý chỉ tạo vừa đủ các case lỗi điển hình thay vì xây dựng một test suite toàn diện phủ kín không gian danh mục và biến thể ngôn ngữ.
- **Cách phòng tránh:**
  1. Với một hệ thống POI Search / RecSys đô thị, bộ test benchmark nội bộ chuẩn phải có quy mô tối thiểu N >= 200 queries (tương ứng với số lượng bài báo và chuẩn công nghiệp).
  2. Phân bổ cân đối tỷ trọng: Entity (tên riêng) ~40%, Category/Tag thực tế ~25%, Địa lý quận huyện ~20%, Câu tự nhiên ngữ nghĩa và du khách ~15%.

### L-038: Thiếu vắng tập kiểm thử đa ngôn ngữ và tiếng bồi hỗn hợp (Cross-Lingual & Code-Switching Gap)
- **Lỗi:** Các bộ test trước đây chỉ tập trung vào tiếng Việt đơn thuần, bỏ sót hoàn toàn hành vi của du khách quốc tế (English-native) và thói quen gõ tiếng bồi hỗn hợp Anh - Việt ("cafe view chill", "tiệm bakery banh mi croissant", "craft beer bar").
- **Nguyên nhân gốc:** Chỉ mô phỏng hành vi người dùng đơn ngữ thay vì phản ánh bức tranh thực tế của một đô thị du lịch quốc tế như Đà Nẵng.
- **Cách phòng tránh:**
  1. Mọi test suite tìm kiếm đô thị phải tích hợp sẵn tối thiểu 20-25% các trường hợp đồng nghĩa xuyên ngôn ngữ (Cross-lingual synonyms: cafe vs coffee, bar vs pub, bakery vs tiệm bánh) và câu lệnh kết hợp (Code-switching).
  2. Đo lường độc lập hiệu năng trên từng phân khúc ngôn ngữ để đảm bảo nhánh Dense và Lexical hỗ trợ lẫn nhau, không bị mất cân bằng khi đổi ngôn ngữ.
