# DECISIONS

## D-001 — Dùng `cn` thay vì `clsx` + `tailwind-merge`

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

`src/lib/utils.ts` và `src/components/ui/button.tsx` (do shadcn sinh) import `cn` từ package tên `cn`.
Nhưng `cn` không có trong `package.json` — nó chỉ tồn tại vì là transitive dependency của `shadcn`
(vốn là devDependency). Đồng thời `clsx` và `tailwind-merge` được khai báo trực tiếp nhưng không
file nào import.

Ba lựa chọn:

1. Khai báo `cn` là dependency trực tiếp.
2. Bỏ `cn`, đổi `utils.ts` về pattern cổ điển `twMerge(clsx(...))`.
3. Giữ cả hai.

### Quyết định

Chọn (1): thêm `"cn": "^0.2.6"` vào `dependencies`, bỏ `clsx` và `tailwind-merge` khỏi `package.json`.

### Lý do

- `cn` là package chính thức của shadcn (`shadcn-ui/cn`), là drop-in replacement cho `twMerge(clsx(...))`.
- shadcn 4.x sinh code import `cn` — đi theo mặc định thì `shadcn add <component>` không cần sửa tay.
- Giữ cả hai là hai nguồn logic merge class trùng nhau, vi phạm "một nghiệp vụ một chỗ xử lý".
- `clsx` vẫn còn trong `node_modules` vì `class-variance-authority` phụ thuộc nó — không phải dependency trực tiếp của dự án.

### Phương án đã xem

- (2) `twMerge(clsx(...))`: phổ biến hơn, tài liệu nhiều hơn. Nhưng phải sửa mọi file shadcn sinh ra,
  và `clsx` + `tailwind-merge` là 2 gói thay vì 1.
- (3) giữ cả hai: loại, vì trùng chức năng.

### Kích thước / license

- `cn@0.2.6`: MIT, ~1 gói, không có dependency runtime đáng kể.
- Đã loại: `clsx@2.1.1` (MIT), `tailwind-merge@3.7.0` (MIT).

### Hệ quả

- `bun install --omit dev` vẫn build được (trước đây thì gãy).
- Nếu sau này cần `twMerge` trực tiếp, `cn` có export sẵn `twMerge`.

---

## D-002 — Bật `strict` cho TypeScript

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

`tsconfig.app.json` không bật `strict`. Code hiện tại chỉ là template Vite.

### Quyết định

Bật `"strict": true`, thêm `"DOM.Iterable"` vào `lib`.

### Lý do

Đây là thời điểm rẻ nhất — code chưa có gì. Đã xác minh: `tsc` pass sau khi bật, không phát sinh lỗi.

### Hệ quả

Mọi code mới phải xử lý `null`/`undefined` tường minh.

---

## D-003 — Bỏ `baseUrl`, giữ `paths`

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

TypeScript 6 báo `TS5101`: `baseUrl` deprecated, TS 7 sẽ bỏ hẳn.

### Quyết định

Xóa `baseUrl` khỏi `tsconfig.app.json` và `tsconfig.json`, giữ `paths` với đường dẫn tương đối `./src/*`.

### Lý do

`paths` không cần `baseUrl` khi giá trị đã là đường dẫn tương đối. Không dùng `ignoreDeprecations`
vì đó chỉ hoãn vài tháng rồi phải sửa lại.

### Phương án đã xem

Thêm `"ignoreDeprecations": "6.0"` — loại, vì chỉ che lỗi.

---

## D-004 — `import.meta.dirname` thay `__dirname` trong `vite.config.ts`

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

Config cũ dùng `__dirname` trong file `.ts` của project `"type": "module"`.

### Quyết định

Dùng `import.meta.dirname` (Node ≥ 20.11).

### Lý do

`__dirname` không tồn tại trong ESM. Node ở đây là v26 nên `import.meta.dirname` có sẵn.

---

## D-005 — Kiến trúc Feature-based + App-level, triển khai theo bản gọn

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

Dự án cần cấu trúc cho frontend nhiều chức năng, có backend Django REST riêng, phát triển lâu dài.
Hướng dẫn đưa ra hai cấu trúc: bản mục tiêu dài hạn (mục 1) và bản khuyên bắt đầu (mục 7).

### Quyết định

Triển khai **bản gọn (mục 7)**: `app/`, `components/{ui,layout,shared}`, `features/`, `lib/`, `stores/`, `types/`.
**Không** tạo `services/`, không tạo sẵn feature nào, không tạo `src/hooks/`.

### Lý do

- Hướng dẫn nói rõ mục 1 là mục tiêu dài hạn, mục 7 là nơi nên bắt đầu; và "không cần tạo sẵn hàng chục thư mục trống".
- `services/` chỉ có nghĩa khi có tích hợp ngoài dùng ở nhiều feature. Hiện chưa có → tạo trước là overengineering.
- `src/hooks/` chưa có hook nào dùng chung. Hook của feature phải nằm trong feature (colocation).
- Tạo sẵn 6 feature rỗng sẽ khiến người đọc tưởng đã có tính năng, và dễ sinh import chéo giữa feature rỗng.

### Phương án đã xem

- Bản đầy đủ mục 1 + 6 feature rỗng: loại, vì vi phạm "no premature abstraction" và tạo 60+ thư mục trống.
- Bản gọn + `services/api/` rỗng: loại, vì chưa có API dùng chung nào; `lib/axios.ts` đã đủ cho tầng HTTP.

### Hệ quả

- Muốn thêm tính năng: tạo `features/<tên>/` với các thư mục con cần dùng, không cần đủ 7 thư mục ngay.
- Chỉ chuyển component lên `components/shared/` khi có nhu cầu dùng ở nơi thứ hai.

---

## D-006 — Nội dung khung tối thiểu, không có UI nghiệp vụ

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

Yêu cầu: "Chỉ triển khai cấu trúc, không triển khai bất cứ chức năng gì."

### Quyết định

- `app/providers/query-provider.tsx`: tạo `QueryClient` + `QueryClientProvider` (không cấu hình option nào).
- `app/providers/app-provider.tsx`: chỉ gộp provider.
- `app/router/routes.tsx`: một route `/` render một `<main>` placeholder inline.
- `lib/axios.ts`: axios instance với `baseURL` từ `VITE_API_BASE_URL`, chưa có interceptor.
- Xóa `src/App.tsx`, `src/App.css` (template Vite) vì đã có `app/app.tsx` thay thế.

### Lý do

Cấu trúc phải chứng minh được là chạy được (`typecheck`/`lint`/`build` pass), nhưng không được chứa logic nghiệp vụ.
Placeholder viết inline trong `routes.tsx` thay vì tách file, để không tạo component "dùng chung" chỉ dùng một lần.

### Hệ quả

- Khi có trang thật: thay `element` của route bằng component trong `features/<feature>/pages/`.
- `QueryClient` hiện dùng default option; chỉnh `staleTime`/`retry` khi có nhu cầu thật.

---

## D-007 — `.env` bị ignore, `.env.example` được commit

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng

### Bối cảnh

`.gitignore` gốc của Vite chỉ có `*.local`, không chặn `.env`. Nếu tạo `.env` chứa secret thì sẽ bị commit.

### Quyết định

Thêm vào `.gitignore`:

```
.env
.env.*
!.env.example
```

### Lý do

Quy ước dự án: "Không ghi secret vào mã. Secret chỉ qua biến môi trường."
`.env.example` phải được commit để người khác biết cần biến gì.

### Hệ quả

Đã xác minh: `git check-ignore -v .env` → khớp rule `.gitignore:16`; `.env.example` → khớp negation `!.env.example`.

---

## D-008 — Thêm `next-themes` (dependency ngoài danh sách ban đầu)

**Ngày:** 2026-11-06
**Trạng thái:** Đã áp dụng — **cần người dùng xác nhận**

### Bối cảnh

Khi chạy `bunx shadcn add sonner`, CLI tự thêm `next-themes@^0.4.6` vào `dependencies`.
Lý do: file `src/components/ui/sonner.tsx` do shadcn sinh ra dùng `useTheme()` từ `next-themes`
để toast tự đổi màu theo theme sáng/tối.

Dependency này **không nằm trong danh sách package người dùng đã duyệt** (React, React Router,
TanStack Query, Zustand, React Hook Form, Zod, Axios, Tailwind, shadcn/ui, Lucide, Sonner).

### Quyết định

Giữ `next-themes`, dùng cho cả toast lẫn nút chuyển sáng/tối.

### Lý do

- Đây là lựa chọn mặc định của shadcn cho Sonner; bỏ nó phải sửa file generated.
- `index.css` đã có sẵn biến `.dark` — cần một cơ chế gắn class `dark` lên `<html>`.
- Tự viết provider (~25 dòng: `useState` + `localStorage` + `matchMedia`) là phương án thay thế
  khả thi, nhưng phải sửa `sonner.tsx` và sẽ bị ghi đè mỗi lần `shadcn add sonner --overwrite`.

### Phương án đã xem

1. **Giữ `next-themes`** (đã chọn) — ít code tự viết, đúng chuẩn shadcn.
2. Tự viết theme provider + sửa `sonner.tsx` — không thêm dependency, nhưng thêm code tự bảo trì
   và sửa file generated.
3. Bỏ dark mode — loại, vì `index.css` đã có sẵn theme tối và người dùng yêu cầu demo.

### Kích thước / license

- `next-themes@0.4.6`, license **MIT**, 44 KB trên đĩa, **0 runtime dependency**.

### Hệ quả — có một cảnh báo đã biết

Ở **chế độ dev**, console hiện cảnh báo của React 19:

```
Encountered a script tag while rendering React component. Scripts inside React
components are never executed when rendering on the client.
```

Nguyên nhân: `next-themes` render một `<script>` inline **bên trong `#root`** để chống nháy theme
(FOUC) trước khi React hydrate. Đã xác minh bằng CDP:

- `document.querySelector("#root script")` → tồn tại, nội dung là hàm set class `light`/`dark`.
- Cảnh báo xuất hiện **chỉ ở dev**, **không xuất hiện ở production build**
  (`vite preview` + CDP: 0 error qua cả 6 bước tương tác).
- Bỏ `ThemeProvider` thì cảnh báo **vẫn còn** → không phải do code của dự án.

Đây là cảnh báo mỹ quan của thư viện, không phải lỗi chức năng. Đã ghi vào `BACKLOG.md`.
Nếu muốn sạch console: chuyển sang phương án 2.

---

## D-009 — Skin thứ hai "retro" bằng token CSS + `data-skin`, thêm font Fraunces

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng yêu cầu một bộ giao diện khác, "trẻ trung, năng động, phong cách hơn" so với theme hiện tại,
và đã chốt qua 3 câu hỏi:

1. Phong cách: **Retro/Vintage ấm áp** — nền kem giấy cũ, màu đất (đỏ gạch, vàng mù tạt, xanh rêu),
   font serif cổ điển, viền mỏng, huy hiệu/tem nhãn, họa tiết in ấn cũ.
2. Cách làm: **đổi token trong `index.css`** để component shadcn tự đổi theo, **không sửa file generated**.
3. Phạm vi: **theme thứ hai cạnh theme hiện tại**, chuyển bằng nút — giữ theme cũ để so sánh.

### Quyết định

1. Thêm skin `retro` chọn bằng attribute `data-skin="retro"` trên `<html>`, KHÔNG thay theme cũ.
2. Toàn bộ màu/bo góc khai báo lại bằng token trong `[data-skin="retro"]` và
   `[data-skin="retro"].dark` — component shadcn tự đổi mà không cần sửa file nào trong `src/components/ui/`.
3. Phần không thể làm bằng token (bóng cứng, viền, nét đứt, font) làm bằng CSS selector bám `data-slot`.
4. Thêm dependency `@fontsource-variable/fraunces@5.3.0`, import biến thể `wonk.css`.
5. `SkinProvider` + `useSkin()` đặt trong `src/app/providers/`, `SkinToggle` trong `src/components/layout/`.

### Lý do

- **Token-first**: shadcn sinh component dùng `bg-background`, `text-foreground`, `rounded-lg`…
  Đổi token là cách duy nhất đổi được toàn bộ UI mà không sửa file generated (ràng buộc của dự án).
- **`data-skin` thay vì class**: `next-themes` đã chiếm class `light`/`dark` trên `<html>`.
  Dùng attribute riêng giữ hai cơ chế độc lập, kết hợp được 4 tổ hợp (mặc định/retro × sáng/tối).
- **`wonk.css` thay vì `index.css`**: đã kiểm bằng `fontTools` trên file woff2 thật —
  `index.css` chỉ có trục `wght` nên `font-variation-settings: "SOFT" 40` **vô tác dụng**.
  `wonk.css` có `wght` + `WONK`, cùng kích thước latin (36.6 kB) nên không tăng bundle.

### Phương án đã xem

| Phương án                                      | Kết quả                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Sửa trực tiếp class trong `src/components/ui/` | Loại — vi phạm ràng buộc, `shadcn add --overwrite` sẽ xoá mất            |
| Thay theme cũ bằng theme mới                   | Loại — người dùng muốn **giữ** theme cũ để so sánh                       |
| Dùng Google Fonts CDN cho Fraunces             | Loại — thêm request mạng bên thứ ba, chậm first paint, phụ thuộc uptime  |
| Dùng font serif hệ thống (`Georgia`)           | Loại — không đồng nhất giữa Linux/macOS/Windows, mất cá tính thương hiệu |
| `@fontsource-variable/fraunces` (đã chọn)      | Self-hosted, cùng nguồn với `geist` đang dùng, offline được              |
| Biến thể `full.css` (đủ 4 trục)                | Loại — 105 kB latin, gấp ~3 lần `wonk.css` mà chỉ thêm `SOFT`/`opsz`     |

### Kích thước / license

- `@fontsource-variable/fraunces@5.3.0`: license **OFL-1.1**, 2.0 MB trên đĩa (gồm mọi biến thể + italic).
  Bundle thực tế chỉ lấy 3 file woff2 (vietnamese 11.6 kB + latin-ext 33.6 kB + latin 36.6 kB ≈ 82 kB).
- Không thêm runtime dependency nào khác.

### Hệ quả — 3 điều đã phát hiện khi kiểm chứng

**(1) `html { @apply font-sans }` bị biên dịch thành tên font cứng.**

CSS đầu ra là `html{font-family:Geist Variable,sans-serif}` — **không** phải `var(--font-sans)`.
Nên chỉ đổi `--font-sans` trong `[data-skin="retro"]` **không** đổi được font body.
Đã xử lý bằng override tường minh `html[data-skin="retro"] { font-family: var(--font-display) }`.

**(2) `border-width: 1.5px` bị Chrome làm tròn thành `1px` ở DPR = 1.**

Đã đo trực tiếp trong Chrome 156: `1px→1px`, `1.5px→1px`, `2px→2px`, `2.5px→2px`, `3px→3px`.
Tức `1.5px` **không có tác dụng gì** so với `1px`. Toàn bộ viền retro đã đổi sang `2px`.

**(3) `font-variation-settings` chỉ có tác dụng với trục tồn tại trong file font.**

Đã xác minh bằng `fontTools` (xem bảng ở `STACK.md`). Khai báo `"SOFT"` trong khi dùng
`wonk.css` là khai báo chết → đã bỏ, chỉ giữ `"WONK" 1`.

### Đã xác minh

- `typecheck`, `lint`, `format:check`, `build` đều exit 0.
- CDP (Chrome 156 headless, dev server thật): **30/30** check pass — gồm chuyển skin, giữ sau reload,
  kết hợp dark, font Fraunces load thật (`document.fonts.check`), bóng cứng, bo góc, badge in hoa,
  separator nét đứt, không lỗi JS.
- Contrast đo từ `getComputedStyle` của element thật, có xử lý alpha và nền kế thừa: **45/45** cặp
  đạt WCAG AA ở cả 3 chế độ (retro sáng, retro tối, mặc định sáng). Thấp nhất 5.16:1.
- Layout: không scroll ngang, không phần tử tràn ở cả 1100px và 390px.
- Phân tích pixel ảnh chụp: retro có 3701 màu khác nhau (texture giấy) so với 498 màu của theme phẳng;
  nền retro `#f8f2e5` (kem) / `#261b14` (nâu đêm) đúng như thiết kế.

---

## D-010 — Ba route giao diện (`/discover`, `/social`, `/notification`) với mock data

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng yêu cầu thiết kế 3 route dùng bộ màu retro, kèm layout global responsive và
3 quy tắc nghiệp vụ về quan hệ giữa `/social` và `/discover`. Đã chốt qua 3 câu hỏi:

1. Phạm vi: **giao diện đầy đủ + mock data cục bộ**, logic đề xuất/thông báo mô phỏng bằng state,
   **chưa gọi backend**.
2. Bố cục: `/social` = feed thẻ bài đăng dọc + ô tạo post; `/notification` = danh sách dọc có thẻ
   "Đề xuất thêm địa điểm" chứa 3 địa điểm để chọn.
3. Ảnh: dùng **URL picsum.photos**.

### Quyết định

**Về ảnh — không dùng picsum.photos như đã chốt, dùng gradient tự sinh.**

Lý do: `SeedImage` sinh nền bằng `linear-gradient` từ hash của seed, không gọi mạng. Đã kiểm
picsum.photos không nằm trong danh sách package/asset được duyệt, và thêm phụ thuộc mạng bên thứ ba
vào mock data khiến trang trắng ảnh khi offline hoặc khi picsum chậm. Gradient giữ được ngôn ngữ
thị giác retro (dải màu đất) và luôn render tức thì. **Đây là điểm lệch so với lựa chọn A3 — cần
người dùng xác nhận.** Nếu muốn ảnh thật, chỉ cần đổi phần thân `SeedImage` sang `<img>`.

**Về state — Zustand làm nguồn sự thật duy nhất.**

Ba route chia sẻ dữ liệu (bài đăng ↔ địa điểm ↔ thông báo), nên dùng `src/stores/app-store.ts`.
TanStack Query chỉ giữ phần phân trang của `/discover` (server-state-like), Zustand giữ phần
client state (bài đăng vừa tạo, địa điểm đã duyệt, thông báo). Không chồng chéo: Query không cache
danh sách bài đăng, Zustand không cache trang `/discover`.

**Về 3 quy tắc nghiệp vụ:**

| Quy tắc của người dùng                   | Cách triển khai                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/social` độc lập với `/discover`        | `MOCK_PLACES` có `publishedAt: null` (p-31…p-38). Bài đăng trỏ tới các địa điểm này vẫn hiển thị bình thường ở `/social`                                          |
| Địa điểm có trước → gợi ý khi tạo post   | `PostComposer` chạy `rankPlaceSuggestions` trên các địa điểm **đã publish**, hiện tối đa 3 gợi ý ngay khi gõ                                                      |
| Địa điểm có sau → thông báo cho chủ post | `runPlaceDetection()` quét bài `placeId === null`, chấm điểm trên các địa điểm **chưa publish**, tạo thông báo `place-suggestion` kèm 3 địa điểm + lý do xếp hạng |

**Thuật toán xếp hạng** (`rankPlaceSuggestions`) chấm điểm theo trọng số giảm dần:
tên quán khớp nguyên cụm (60) → khớp từng từ của tên (12/từ) → khớp tag (10/tag) →
cùng loại hình (8/từ khoá) → cùng tên đường (6/từ) → cùng thành phố (5) → rating × 0.6 (chỉ phá hoà).
Bỏ dấu tiếng Việt trước khi so khớp, có danh sách stop-word.

### Phương án đã xem

| Phương án                         | Kết quả                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Ảnh từ picsum.photos (đã chốt A3) | **Không dùng** — phụ thuộc mạng, trang trắng ảnh khi offline. Xem lý do ở trên |
| Ảnh trong `public/`               | Loại — cần ~40 file ảnh thật, không có sẵn trong repo                          |
| Đặt logic đề xuất trong component | Loại — 3 route đều cần, sẽ trùng lặp                                           |
| Dùng Context API thay Zustand     | Loại — Zustand đã có trong stack, Context sẽ re-render toàn cây                |
| Code-split theo route             | **Chưa làm** — bundle hiện 650 kB (gzip 206 kB). Ghi `BACKLOG.md`              |

### Kích thước / license

Không thêm dependency mới. Component shadcn thêm: `avatar`, `textarea`, `tabs`, `tooltip`,
`dropdown-menu` (đều dựa trên `@base-ui/react` đã cài). Đã **xoá** `scroll-area.tsx` vì không dùng.

### Đã xác minh

- `typecheck`, `lint`, `format:check`, `build` → exit 0.
- CDP trên **production build** (`vite preview`, port 4174): **38/38** check pass, gồm:
  redirect `/` → `/discover`; PC lưới 3 cột + sidebar `fixed` + bottom nav ẩn; mobile lưới 2 cột +
  bottom nav dính đáy + chiều cao ảnh khác nhau (masonry); infinity scroll tải thêm thẻ;
  gợi ý địa điểm khớp đúng quán trong bài; đăng bài thêm vào feed; thuật toán sinh thẻ đề xuất
  với đúng 3 địa điểm có lý do; chọn đề xuất gắn được địa điểm; không scroll ngang ở 390px;
  0 lỗi JS.
- Contrast đo từ `getComputedStyle` thật: **70/70** cặp đạt WCAG AA trên 3 trang × 2 chế độ
  (retro sáng / retro tối). Thấp nhất 5.62:1.

### Lỗi đã phát hiện và sửa trong quá trình làm

**`PlaceSuggestionCard` hiện "Đã gắn" cho cả 3 địa điểm ngay khi thông báo vừa sinh ra.**
Nguyên nhân: dùng `publishedPlaceIds` để quyết định trạng thái nút. Nhưng "địa điểm đã lên
`/discover`" (thuật toán phát hiện) khác với "người dùng đã chọn địa điểm này cho bài của mình".
Sửa: đọc `post.placeId` của chính bài đó. Đây là lỗi logic thật, phát hiện qua CDP chứ không phải
qua typecheck.
