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

- bóng + nhiễu giấy), 11 file `.tsx` (37 chỗ cỡ chữ lẻ → `text-xs`). Chi tiết ở `docs/DECISIONS.md`
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
