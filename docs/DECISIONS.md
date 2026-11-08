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

**Về ảnh — dùng URL picsum.photos, đúng lựa chọn A3 của người dùng.**

`SeedImage` render `<img src="https://picsum.photos/seed/<seed>/600/<height>" loading="lazy">`.
Seed lấy từ `place.imageSeed` / `post.imageSeed` nên cùng một mục luôn ra cùng một ảnh.
Hệ quả đã biết và đã được người dùng chấp nhận: cần mạng, ảnh trắng khi offline, layout có thể
nhảy trong lúc ảnh tải (đã có `bg-muted` giữ chỗ + `height` cố định cho masonry).

> [!NOTE]
> Trước đây mục này ghi ngược lại (dùng gradient tự sinh) và viện dẫn một "danh sách package/asset
> được duyệt" **không tồn tại trong repo**. Đó là lỗi, đã sửa theo lựa chọn A3 của người dùng.
> Xem `LESSONS.md` L-002.

**Về state — Zustand làm nguồn sự thật duy nhất.**

Ba route chia sẻ dữ liệu (bài đăng ↔ địa điểm ↔ thông báo), nên dùng `src/stores/app-store.ts`.
TanStack Query chỉ giữ phần phân trang của `/discover` (server-state-like), Zustand giữ phần
client state (bài đăng vừa tạo, địa điểm đã duyệt, thông báo). Không chồng chéo: Query không cache
danh sách bài đăng, Zustand không cache trang `/discover`.

> [!WARNING]
> Quyết định về state và về thuật toán trong mục này **đã bị thay thế bởi D-011**. Giữ lại phần
> dưới chỉ để ghi lại lịch sử; đọc D-011 trước khi sửa code.

**Về 3 quy tắc nghiệp vụ (cách làm ban đầu — đã bị thay thế bởi D-011):**

| Quy tắc của người dùng                   | Cách triển khai ban đầu                                                                                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/social` độc lập với `/discover`        | `MOCK_PLACES` có `publishedAt: null` (p-31…p-38). Bài đăng trỏ tới các địa điểm này vẫn hiển thị bình thường ở `/social`                                          |
| Địa điểm có trước → gợi ý khi tạo post   | `PostComposer` chạy `rankPlaceSuggestions` trên các địa điểm **đã publish**, hiện tối đa 3 gợi ý ngay khi gõ                                                      |
| Địa điểm có sau → thông báo cho chủ post | `runPlaceDetection()` quét bài `placeId === null`, chấm điểm trên các địa điểm **chưa publish**, tạo thông báo `place-suggestion` kèm 3 địa điểm + lý do xếp hạng |

**Thuật toán xếp hạng** (`rankPlaceSuggestions`) chấm điểm theo trọng số giảm dần:
tên quán khớp nguyên cụm (60) → khớp từng từ của tên (12/từ) → khớp tag (10/tag) →
cùng loại hình (8/từ khoá) → cùng tên đường (6/từ) → cùng thành phố (5) → rating × 0.6 (chỉ phá hoà).
Bỏ dấu tiếng Việt trước khi so khớp, có danh sách stop-word.

> [!CAUTION]
> Hàm này **không còn tồn tại ở frontend**. Nó chỉ còn một bản duy nhất trong
> `src/mocks/ranking.ts` (phía server giả lập). Xem D-011.

### Phương án đã xem

| Phương án                         | Kết quả                                                                  |
| --------------------------------- | ------------------------------------------------------------------------ |
| Ảnh từ picsum.photos (đã chốt A3) | **Dùng** — xem mục Quyết định ở trên                                     |
| Ảnh gradient tự sinh              | Loại — người dùng đã chọn picsum, gradient chỉ là đề xuất của tôi bị bác |
| Ảnh trong `public/`               | Loại — cần ~40 file ảnh thật, không có sẵn trong repo                    |
| Đặt logic đề xuất trong component | Loại — 3 route đều cần, sẽ trùng lặp                                     |
| Dùng Context API thay Zustand     | Loại — Zustand đã có trong stack, Context sẽ re-render toàn cây          |
| Code-split theo route             | **Chưa làm** — bundle hiện 650 kB (gzip 206 kB). Ghi `BACKLOG.md`        |

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

---

## D-011 — Gỡ xếp hạng/phát hiện địa điểm khỏi frontend; mock đóng vai server qua axios adapter

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng chỉ ra lỗi kiến trúc: _"Đây là code frontend, đừng tự đưa các thuật toán ranking, và
những thứ đáng lẽ phải xử lý ở phía backend lên frontend."_

Code trước đó vi phạm ở 3 chỗ:

| Vi phạm                                                                            | Vị trí cũ                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Hàm chấm điểm + xếp hạng đề xuất chạy trong bundle client                          | `src/features/places/lib/rank-suggestions.ts`                 |
| Job "phát hiện địa điểm mới" + sinh thông báo chạy trong Zustand store             | `runPlaceDetection()` trong `src/stores/app-store.ts`         |
| Client tự lọc + phân trang dữ liệu đã tải hết; tự suy ra địa điểm nào "đã publish" | `get-places.ts`, `post-card.tsx`, `place-suggestion-card.tsx` |

### Quyết định

**1. Frontend chỉ gọi API.** Mọi thao tác dữ liệu đi qua `axios` + TanStack Query:

```
Component/Page → feature hook (useQuery/useMutation) → feature api (axios) → lib/axios → server
```

**2. Hợp đồng API được chốt trước, backend implement sau.**

| Method | Path                            | Response                             |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/places?cursor=&category=&q=`  | `Page<Place>`                        |
| GET    | `/places/:id`                   | `Place`                              |
| GET    | `/places/suggestions?q=&limit=` | `{ suggestions: PlaceSuggestion[] }` |
| GET    | `/posts?filter=`                | `Page<Post>`                         |
| POST   | `/posts`                        | `Post`                               |
| PATCH  | `/posts/:id/place`              | `Post`                               |
| PATCH  | `/posts/:id/like`               | `Post`                               |
| PATCH  | `/posts/:id/save`               | `Post`                               |
| GET    | `/notifications`                | `Page<AppNotification>`              |
| PATCH  | `/notifications/:id`            | `AppNotification`                    |
| PATCH  | `/notifications`                | `AppNotification[]`                  |

`Page<T> = { items: T[]; next: string | null }` — cursor do server quyết định, client chỉ chuyền lại.

**3. Server nhúng dữ liệu liên quan, client không tra cứu id.**

- `Post.place: PlaceSummary | null` — server nhúng kèm địa điểm đã gắn.
- `PlaceSummary.isPublished` — server kết luận địa điểm đã lên `/discover` hay chưa.
- `PlaceSuggestionNotification.postPlaceId` — server cho biết bài hiện gắn địa điểm nào.
- `PlaceSuggestion` = `{ place: PlaceSummary; reason: string }` — **không còn `score`**, vì điểm số
  là chi tiết nội bộ của server, không phải thứ client cần.

Nhờ vậy `getPlace(id)` và `publishedPlaceIds` bị xoá hoàn toàn — hết nguồn sự thật thứ hai.

**4. Chưa có backend → mock đóng vai server, không phải logic trong component.**

`src/mocks/server.ts` là một **axios custom adapter** (`AxiosAdapter`), gắn vào instance qua
`adapter` trong `src/lib/axios.ts`. Nó giữ "database" trong bộ nhớ và implement đúng hợp đồng trên,
gồm cả phần xếp hạng (`src/mocks/ranking.ts`) và job sinh thông báo.

| Trước                                                                                    | Sau                                                                          |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Logic nằm trong `features/*/lib`, `stores/` → nằm trong bundle, chạy trên máy người dùng | Logic nằm trong `src/mocks/` → chỉ chạy "phía server", frontend không import |
| Component gọi thẳng store                                                                | Component gọi hook → axios → adapter                                         |
| Không có dấu vết của API                                                                 | Mỗi file `features/*/api/*.ts` là một lời gọi HTTP thật                      |

Khi backend sẵn sàng: xoá `src/mocks/`, bỏ dòng `adapter` trong `lib/axios.ts`. Không phải sửa
feature api, hook hay component.

**5. Zustand bị xoá.** `src/stores/app-store.ts` không còn: toàn bộ dữ liệu nó giữ đều là server
state, và đã chuyển sang TanStack Query. Chưa có client state toàn cục nào cần Zustand, nên
dependency vẫn để trong `package.json` nhưng **chưa dùng** (ghi ở `STACK.md`).

### Phương án đã xem

| Phương án                                                 | Kết quả                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Giữ logic, chỉ thêm comment "sau này chuyển sang backend" | Loại — người dùng yêu cầu rõ, và comment không ngăn được việc dùng lại            |
| Dùng MSW (Mock Service Worker)                            | Loại — thêm dependency mới; adapter của axios đủ dùng và không cần service worker |
| Đặt mock trong `features/*/api/`                          | Loại — sẽ lẫn logic server vào thư mục frontend, đúng thứ đang phải sửa           |
| `json-server` / mock server riêng                         | Loại — thêm tiến trình phải chạy, không cần cho phạm vi hiện tại                  |
| Giữ Zustand cho optimistic update                         | Loại — TanStack Query làm được qua `setQueriesData`, không cần thêm nguồn state   |

### Kích thước / license

Không thêm dependency. `axios` và `@tanstack/react-query` đều đã có trong stack.

### Hệ quả

- Bundle tăng nhẹ (649.96 kB → 715.82 kB, gzip 206.49 → 229.59 kB) vì mock adapter + fixtures nằm
  trong bundle. Đây là chi phí tạm thời; xoá `src/mocks/` là hết. Ghi `BACKLOG.md`.
- Mọi thao tác dữ liệu giờ **bất đồng bộ** (adapter có delay 320 ms) → phải có trạng thái loading.
  Đã thêm skeleton cho `/discover`, loading state cho `/social` và `/notification`.
- State của server giả lập nằm trong bộ nhớ trang → **tải lại trang là reset**. Test CDP phải điều
  hướng trong SPA bằng `link.click()`.

### Đã xác minh

- `typecheck`, `lint`, `format:check`, `build` → exit 0.
- CDP: **44/44** check pass trên **cả dev (5173) và production preview (4174)**. Các check mới thay
  cho các check "thuật toán chạy đúng" cũ:
  - Gợi ý **không** xuất hiện tức thì (chứng tỏ có round-trip bất đồng bộ), rồi mới xuất hiện.
  - Số gợi ý ≤ 3, gợi ý đầu khớp quán trong bài, mỗi gợi ý có lý do — tất cả đọc từ response.
  - `/social` **không còn** nút "Chạy gợi ý địa điểm".
  - Thẻ đề xuất xuất hiện ở `/notification` **mà không cần thao tác nào trên client**.
  - Chọn đề xuất → chỉ 1 mục ở trạng thái "Đã gắn", các nút còn lại không bị khoá nhầm.
  - Server publish địa điểm vừa chọn → bài tương ứng ở `/social` hiện "Trên Khám phá".
  - 0 lỗi JS, 0 `console.error`.

### Chưa xác minh

- **Chưa có backend thật.** Toàn bộ "server" là adapter trong `src/mocks/`. Hợp đồng API ở trên mới
  được kiểm với mock, chưa kiểm với Django.
- **Chưa kiểm hành vi lỗi mạng thật.** Adapter chỉ trả 200 (và 404 khi sai route). Chưa test
  timeout, 500, mất mạng, retry.
- **Chưa kiểm `AbortSignal`.** Adapter có xử lý `config.signal` → reject `CanceledError`, nhưng chưa
  có test nào chứng minh request bị huỷ thật khi đổi bộ lọc nhanh.
- **Chưa kiểm optimistic update rollback.** `useSetPostLiked` / `useSetPostSaved` có nhánh `onError`
  hoàn tác, nhưng chưa có cách nào làm server trả lỗi để thử.

---

## D-012 — Bình luận + trang cá nhân + trang mới: dùng đúng component shadcn/base-ui đã có

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Kế hoạch v2 (đã duyệt) thêm: phần Bình luận ở `/social`, dropdown avatar, trang cá nhân
(`/profile`, `/u/:handle`), `/discover/:id`, `/search`, `/saved`, `/settings`, 404. Ràng buộc:
0 dependency npm mới, ưu tiên component shadcn đã cài, mọi logic nghiệp vụ nằm ở mock server.

### Quyết định

- **Component:** sinh thêm 11 component bằng `bunx shadcn add` (`item`, `spinner`, `empty`,
  `scroll-area`, `drawer`, `toggle`, `toggle-group`, `alert-dialog`, `input-group`, `field`,
  `switch`, `breadcrumb`) — không sửa tay file `src/components/ui/` có sẵn, `bun.lock` không đổi.
- **Kiến trúc:** `src/features/social/` (comment types/api/hooks/components) và
  `src/features/profile/` (profile types/api/hooks/components/pages) theo đúng pattern feature
  sẵn có; mock server (`src/mocks/server.ts`) giữ mọi logic (sắp xếp, phân trang, xoá mềm,
  follow, đếm).
- **Route helper:** `UserProfilePageRoute` tách sang `src/app/router/user-profile-route.tsx` vì
  react-refresh/only-export-components chỉ cho phép 1 export component mỗi file.
- **`useMediaQuery`:** dùng `@base-ui/react/unstable-use-media-query` (đã cài kèm base-ui) thay vì
  tự viết listener — chọn Dialog 2 cột (PC) / Drawer (mobile) cho thread bình luận.

### Lỗi phát hiện qua CDP (đã sửa, commit `44839cc`)

`DropdownMenuLabel` của shadcn style `base-nova` map sang `Menu.GroupLabel` của `@base-ui/react`,
thành phần này **bắt buộc** nằm trong `<Menu.Group>` hoặc `<Menu.RadioGroup>`
(`MenuGroupContext is missing` nếu không). Label trước đó nằm ngoài group → mở dropdown avatar
làm crash app (React Router ErrorBoundary chiếm cả trang). Sửa tối thiểu: đưa label + separator
vào trong `DropdownMenuGroup` hiện có. Bài học: đọc source thư viện đã cài trước khi ghép API,
không suy từ template Radix classic.

### Đã xác minh

- `typecheck`, `lint`, `format:check`, `build` → exit 0; `bun.lock` không đổi sau mỗi lần shadcn add.
- CDP `app-check.mjs`: **44/44** trên dev 5173 và preview 4174.
- CDP `feature-check.mjs` (38 check mới: bình luận inline/thread/sort/gửi, Drawer mobile,
  dropdown 7 check + điều hướng, `/profile`, `/u/:handle`, `/discover/:id`, `/search`, `/saved`,
  `/settings` + zod, 404): **38/38** trên dev 5173 và preview 4174.

### Chưa xác minh

- `PATCH /me` chưa có route mock — `/settings` chỉ lưu optimistic + toast minh hoạ.
- Lưu/bỏ lưu địa điểm chưa có endpoint — nút lưu ở `PlaceCard` chưa nối.
- Tab "Người" ở `/search` lọc trên `MOCK_USERS` phía client, chưa có endpoint `/users?q=`.

---

## D-013 — Trang chi tiết bài đăng, tìm kiếm ghi vào URL, thông báo bấm được

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Kế hoạch "giao diện còn thiếu" (đã duyệt) chỉ ra 4 luồng bị chặn: 2 nơi link tới `/post/:id` nhưng
route không tồn tại (404), ô tìm kiếm ở topbar chỉ là trang trí, tab Thông báo không có
`TabsContent`, và hàng thông báo không bấm được. Ràng buộc giữ nguyên: 0 dependency npm mới,
`bun.lock` không đổi, mọi logic nghiệp vụ ở mock server, không sửa tay `src/components/ui/`.

### Quyết định

- **`/post/:id` tách trang riêng** (`features/social/pages/post-detail-page.tsx`) thay vì mở
  Dialog từ feed. Lý do: URL chia sẻ được, F5 giữ nguyên, và 2 nơi đã link tới đường dẫn này
  (`post-card`, thông báo) nên phải có trang thật.
- **Tách `PostPreview` + `CommentThreadPanel` thành component export** khỏi `comment-thread.tsx`.
  Thread Dialog/Drawer và trang chi tiết dùng chung — một nghiệp vụ một chỗ xử lý.
- **`postQueryKey(id)` nằm dưới tiền tố `["posts"]`** → `invalidateQueries({ queryKey: ["posts"] })`
  làm mới cả feed lẫn trang chi tiết mà không phải liệt kê từng key.
- **`patchPostInCache` xử lý cả 2 shape** (`Page<Post>` và `Post` lẻ) vì `setQueriesData` khớp theo
  tiền tố nên sẽ chạm cả `["posts","detail",id]`. Nếu chỉ xử lý `Page`, like ở trang chi tiết sẽ
  không cập nhật lạc quan.
- **Topbar search: `Input` uncontrolled + `key={currentQuery}`, đọc qua `FormData`.** Không thêm
  state. `key` đổi khi URL đổi → ô tự reset về từ khoá hiện tại của `/search`.
- **`/search` giữ `draft` state + `lastWritten` ref**, ghi URL bằng `setParams(..., { replace: true })`
  sau debounce 300 ms. `replace` để không làm rỗng lịch sử khi gõ.
- **Thông báo: `ActorRow` là `<Link>` khi có `postId`, là `<button>` khi không** (loại `follow`).
  Cả hai gọi `useMarkNotificationRead` nếu chưa đọc.
- **404 render trong `AppShell`** — route `*` bọc `<AppShell>`, `NotFoundPage` đổi `min-h-dvh` →
  `min-h-[60dvh]` để không đẩy layout.

### Phương án đã xem

- _Mở Dialog từ mọi nơi thay vì thêm route_ — loại: link `/post/:id` đã tồn tại ở 2 chỗ, đổi chúng
  thành mở Dialog sẽ phải truyền state qua router; URL không chia sẻ được.
- _Dùng `useState` cho ô search topbar_ — loại: phải đồng bộ 2 chiều với URL, thêm bug vòng lặp.
- _Đặt `postQueryKey` ngoài tiền tố `["posts"]`_ — loại: invalidate feed sẽ bỏ sót trang chi tiết.

### Kích thước / license

Không thêm dependency. Không đổi `bun.lock`, không đổi `package.json`.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- CDP `group1-check.mjs` (31 check: `/post/:id` từ 3 nguồn + responsive 3 mốc + bài không tồn tại;
  topbar submit + `/search` đọc/ghi `?q=` + F5; 2 `TabsContent` riêng; thông báo bấm được + badge
  giảm 1; 404 trong shell; hồi quy dialog bình luận): **31/31** trên dev 5173 và preview 4174.
- Hồi quy `feature-check.mjs` **38/38**, `app-check.mjs` **44/44** trên cả dev và preview.

### Chưa xác minh

- Chưa xem giao diện bằng mắt người (model không đọc được ảnh PNG); mọi kết luận về layout đều
  từ `getBoundingClientRect` / `getComputedStyle`.
- Chưa test Firefox/Safari — chỉ Chrome 156 qua CDP.
- `markNotificationRead` chưa optimistic (xem `BACKLOG.md`).

## D-014 — Một ô tìm kiếm duy nhất ở topbar; `?q=` là nguồn sự thật; audit thay component tự chế bằng shadcn

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng chỉ ra hai lỗi cùng lúc: (1) có tận 2 thanh search bar, (2) khi `q` rỗng thì route kẹt ở
`/search` thay vì hiện lại `/discover`. Nguyên nhân chung: `?q=` có **hai** nơi cùng giữ state
(`TopBar` và `SearchPage`), và `SearchPage` không có nhánh điều hướng khi rỗng. Ngoài ra ô lọc ở
`/discover` cũng là `type="search"` không nhãn riêng nên người dùng thấy như "thanh search thứ hai".

Sau khi sửa, người dùng yêu cầu tự audit: chỗ nào đang tự viết Tailwind/CSS/TS để dựng UI trong khi
đã có component shadcn/base-ui làm sẵn.

### Quyết định

- **Một ô nhập duy nhất** ở topbar (`AppShell`). `SearchPage` **không có state**, chỉ đọc `?q=`.
- **`useSearchQuerySync()`** (`features/search/hooks/`) là nơi duy nhất ghi `?q=`:
  - Ở `/search`: gõ → ghi URL sau debounce 300 ms với `{ replace: true }`.
  - Xoá hết từ khoá khi đang ở `/search` → `navigate("/discover", { replace: true })`.
  - Ở trang khác: gõ không tự ghi URL (chờ submit).
  - `submit()`: có từ khoá → `/search?q=...`; rỗng → `/discover`.
- **`q` rỗng là trạng thái có đích**: `SearchPage` trả `<Navigate to="/discover" replace />` trước
  khi render bất cứ thứ gì. Tách `SearchResults` để không gọi hook có điều kiện.
- **Ô lọc `/discover` giữ `type="search"`** (hành vi đúng) nhưng có `<label htmlFor>` "Lọc địa điểm",
  icon `ListFilterIcon` và `aria-label` khác topbar → phân biệt được bằng máy và bằng mắt.
- **Audit component**: thay các chỗ tự chế bằng component có sẵn —
  | Trước                                                                         | Sau                                                                                       |
  | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
  | `Loader2Icon className="animate-spin"` (9 chỗ)                                | `Spinner`                                                                                 |
  | error/empty state tự vẽ bằng `<p>` + icon                                     | `Empty` + `EmptyHeader` + `EmptyMedia variant="icon"` + `EmptyTitle`/`EmptyDescription`   |
  | `<button>` chữ "Xem thêm"/"Huỷ"                                               | `Button variant="link"`                                                                   |
  | avatar `<span className="grid size-10 rounded-full">`                         | `Avatar size="lg"` + `AvatarFallback`                                                     |
  | badge số chưa đọc `<span className="grid min-w-5 rounded-full bg-secondary">` | `Badge variant="secondary"`                                                               |
  | danh sách gợi ý `<ul>/<li>/<button>`                                          | `Item` (`render={<button/>}`) + `ItemMedia` + `ItemContent`/`ItemTitle`/`ItemDescription` |
  | `Input` thô + icon `absolute` (topbar, `/discover`)                           | `InputGroup` + `InputGroupAddon` + `InputGroupInput`                                      |

### Phương án đã xem

- _Giữ ô search thứ hai trong `SearchPage` để "tiện gõ lại"_ — loại: đúng là nguồn gốc lỗi trùng
  thanh search; topbar đã đủ và luôn hiện.
- _Ẩn topbar search khi ở `/search`_ — loại: layout nhảy, và vẫn còn 2 nguồn state.
- _Đổi `/discover` sang `type="text"` để "không trùng"_ — loại: mất hành vi xoá nhanh của
  `type="search"`; vấn đề thật là thiếu nhãn, không phải type.
- _Tự viết `Spinner`/`Empty` mới_ — loại: `src/components/ui/spinner.tsx` và `empty.tsx` đã có sẵn.

### Kích thước / license

Không thêm dependency. Không đổi `bun.lock`, không đổi `package.json`. Không sửa file nào trong
`src/components/ui/`.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- CDP trên dev 5173: `search-check.mjs` **19/19**, `group1-check.mjs` **31/31**,
  `feature-check.mjs` **39/39**, `app-check.mjs` **44/44** (sau khi cập nhật selector của script
  theo `Item`/`InputGroup` mới).

### Chưa xác minh

- Chưa xem giao diện bằng mắt người (model không đọc được PNG); kết luận layout từ
  `getBoundingClientRect` / `getComputedStyle`.
- Chưa test Firefox/Safari — chỉ Chrome 156 qua CDP.
- Chưa chạy trên preview 4174 (chỉ dev 5173).

## D-015 — Bỏ heading trang; bộ lọc `/discover` gộp vào popover của nút "Lọc"

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng chỉ ra `/discover` vẫn còn hai ô input trông giống nhau (topbar `Tìm kiếm` + bộ lọc trong
trang), và yêu cầu: đổi bộ lọc thành nút "Lọc" mở popover kèm chip danh mục; xoá các heading kiểu
"Khám phá", "Địa điểm đã được kiểm duyệt và đưa lên bản đồ"… ở mọi route, vì tên route + tư duy
người dùng đã đủ nhận biết chức năng.

### Quyết định

- **Thêm `src/components/ui/popover.tsx` bằng `bunx shadcn@latest add popover`** (đường sinh chuẩn
  của template `base-nova`, nền `@base-ui/react/popover`). Không sửa tay file `ui/`. Không thêm
  dependency npm — `package.json` và `bun.lock` không đổi.
- **`/discover`: bỏ ô lọc ngoài trang + hàng chip ngoài trang.** Cả hai vào `PopoverContent` của
  nút `Lọc` (`ListFilterIcon`). Nút hiện `Badge` đếm số bộ lọc đang bật (0/1/2), có nút "Xoá bộ lọc"
  chỉ xuất hiện khi có bộ lọc. Nhờ vậy `/discover` còn **đúng 1 ô `input[type="search"]`** — chỉ ở topbar.
- **Bỏ `<h1>` + đoạn mô tả ở 6 route**: `/discover`, `/social`, `/notification`, `/saved`,
  `/settings`, `/search`. Giữ lại thông tin **không phải trình bày lại chức năng**:
  - `/notification`: dòng "N thông báo chưa đọc" (trạng thái, không phải tiêu đề).
  - `/search`: dòng "Kết quả cho “…”" (dữ liệu, không phải tiêu đề).
  - `/discover`: `Badge` "N địa điểm" + trạng thái tải thêm.
- **Giữ `<h1>` ở nơi nó là dữ liệu, không phải nhãn route**: `place-detail-page` (tên địa điểm),
  `profile-header` (tên người dùng), `design-showcase-page` (trang demo).

### Phương án đã xem

- _Tự viết popover bằng `useState` + `absolute`_ — loại: đã có primitive `@base-ui/react/popover`,
  tự viết sẽ mất focus trap, Escape, click-outside, positioning.
- _Giữ hàng chip ngoài trang, chỉ đưa ô từ khoá vào popover_ — loại: người dùng yêu cầu gộp cả chip.
- _Bỏ luôn dòng "N thông báo chưa đọc" và "Kết quả cho …"_ — loại: đó là dữ liệu/trạng thái, không
  phải lặp lại tên route.

### Kích thước / license

Không thêm dependency npm. `package.json`, `bun.lock` không đổi. `popover.tsx` sinh từ registry
shadcn, dùng `@base-ui/react` đã có trong dự án.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- CDP `check-filter.mjs` (28 check): 6 route không còn `<h1>`; `/discover` chỉ 1 ô search; nút "Lọc"
  mở popover chứa ô từ khoá + chip danh mục; chọn chip → `aria-pressed` đúng + danh sách đổi;
  badge = 1 rồi = 2; "Xoá bộ lọc" reset cả hai; mobile 390 không tràn ngang → **28/28**.
- Hồi quy dev 5173: `search-check.mjs` **19/19**, `group1-check.mjs` **31/31**,
  `feature-check.mjs` **39/39**, `app-check.mjs` **44/44**.

### Chưa xác minh

- Chưa xem giao diện bằng mắt người (model không đọc được PNG); kết luận từ DOM + `getBoundingClientRect`.
- Chưa test Firefox/Safari — chỉ Chrome 156.
- Chưa chạy lại trên preview 4174 sau thay đổi này (chỉ dev 5173).

## D-016 — Hai bảng màu dịu mắt (Slate mềm + Giấy ấm), mỗi bảng một màu nhấn

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng
**Liên quan:** L-006

### Bối cảnh

Người dùng phản hồi cả 2 skin (mặc định + retro) ở cả 2 mode đều **tương phản quá lớn, đau mắt**;
cỡ chữ và phông chữ khó đọc; màu khó nhìn. Yêu cầu: tìm bảng màu thiết kế phù hợp, **không dùng quá
nhiều màu**, chọn 1–2 bảng chính.

Đo lại bộ token cũ (`scratch/audit-current-palette.mjs`) xác nhận bằng số:

| Tổ hợp        | nền       | chữ       | contrast | ΔL    |
| ------------- | --------- | --------- | -------- | ----- |
| default/light | `#ffffff` | `#0a0a0a` | 19.79    | 0.855 |
| default/dark  | `#0a0a0a` | `#fafafa` | 18.96    | 0.840 |
| retro/light   | —         | —         | —        | 0.702 |
| retro/dark    | —         | —         | —        | 0.700 |

Đây là template shadcn nguyên bản — tối ưu cho nhận diện, không tối ưu cho đọc lâu.

### Quyết định

**Hai bảng, mỗi bảng đúng 1 màu nhấn.** Nền/chữ đều là trung tính (không phải `#fff`/`#000`), màu
nhấn chỉ dùng cho `--primary`, `--ring`, trạng thái active.

| Skin                 | Trung tính    | Màu nhấn duy nhất                  | Tham chiếu      |
| -------------------- | ------------- | ---------------------------------- | --------------- |
| Mặc định "Slate mềm" | lạnh, hue 250 | indigo `oklch(0.475 0.088 258)`    | Radix **Slate** |
| Retro "Giấy ấm"      | ấm, hue 85    | terracotta `oklch(0.520 0.120 35)` | Radix **Sand**  |

Đã **bỏ** hai màu nhấn cũ của retro (vàng mù tạt + xanh rêu) — chọi nhau và vi phạm yêu cầu.

**ΔL mục tiêu 0.64–0.70** (thay vì 0.84–0.86). Contrast vẫn 11.5–13.8, vượt AA (4.5) rất xa và gần
ngưỡng AAA (7).

**Token bóng mới** thay bóng cứng màu chữ:

```css
--shadow-soft: 0 1px 2px <fg>/8%, 0 2px 8px <fg>/6%;
--shadow-raised: 0 2px 4px <fg>/10%, 0 6px 16px <fg>/8%;
```

Dùng trực tiếp bằng cú pháp Tailwind 4 `shadow-(--shadow-soft)` — **không** cần đăng ký trong
`@theme inline`.

**Retro: bỏ serif cho body.** `html[data-skin="retro"] { font-family: var(--font-display) }` và
`--font-sans: var(--font-display)` đã xoá. Body dùng Geist sans ở cả 2 skin.
`font-variation-settings: "WONK" 0` (trước là `1` — gây méo nét).

**Retro: bỏ viền 2px màu chữ + bóng cứng.** Card/input/button/dialog/toast chuyển về `1px` +
`var(--border)` + `var(--shadow-soft|raised)`. Badge bỏ `text-transform: uppercase`.

**Cỡ chữ:** gom về đúng thang Tailwind (`text-xs` 12px / `text-sm` 14px / `text-base` 16px /
`text-lg` / `text-xl` / `text-2xl`). Trước đó có 3 bậc lẻ `0.72rem` / `0.75rem` / `0.78rem` rải rác
37 chỗ — đã gộp hết về `text-xs`. Body 16px / `line-height: 1.6`.

> [!IMPORTANT]
> **Hai skin chỉ được khác MÀU, không được khác KÍCH THƯỚC.** Xem D-017 — đây là quyết định
> riêng, sửa lại phần hình học của D-016.

### Phương án đã xem

- _Giữ template shadcn, chỉ đổi màu nhấn_ — loại: gốc rễ là contrast 19.79 và ΔL 0.855, đổi màu nhấn
  không chạm tới.
- _Dùng nguyên bảng Radix Sand/Slate không tune_ — loại: `--border` của Radix ở light mode vẫn chỉ đạt
  contrast 1.33 với nền, dưới ngưỡng 1.5 cần cho viền thấy được. Phải hạ L của `--border`.
- _Thêm dependency palette (ví dụ `@radix-ui/colors`)_ — loại: chỉ cần ~20 giá trị tĩnh, thêm dep là
  overengineering; `package.json`/`bun.lock` giữ nguyên.
- _Giữ serif cho body retro nhưng tăng cỡ chữ_ — loại: vấn đề là hình dáng nét (serif + WONK), không
  phải cỡ.
- _Bỏ hẳn skin retro_ — loại: người dùng muốn cả 2 skin đều đọc được, không phải bỏ một.

### Kích thước / license

Không thêm dependency npm. `package.json`, `bun.lock` không đổi. Bảng màu tham chiếu Radix Colors
(MIT) nhưng chỉ dùng giá trị màu, không copy mã.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- `scratch/eval-candidate-palette.mjs`: **40/40** cặp token đạt ngưỡng (chữ ≥4.5, viền ≥1.5).
- `scratch/palette-live.mjs` đo trên trình duyệt thật (canvas resolve `oklch()` → sRGB):

| Tổ hợp        | nền       | chữ       | contrast  | chữ phụ/nền | chữ phụ/thẻ | nút chính | viền/nền |
| ------------- | --------- | --------- | --------- | ----------- | ----------- | --------- | -------- |
| default/light | `#f4f7f9` | `#23282f` | **13.78** | 5.71        | 5.99        | 6.39      | 1.53     |
| default/dark  | `#191b1f` | `#dadee1` | **12.74** | 6.92        | 6.09        | 7.22      | 1.58     |
| retro/light   | `#f4f0e7` | `#382b22` | **12.01** | 5.53        | 5.83        | 5.42      | 1.52     |
| retro/dark    | `#29221d` | `#e2ddd3` | **11.57** | 7.12        | 6.19        | 6.10      | 1.70     |

- DOM thật: font body cả 4 tổ hợp `Geist Variable 16px / 25.6px`; chữ nhỏ nhất trong `main` là
  **12px** (trước 9.6px); viền card `1px` (trước `2px`).
- Quét tĩnh: không còn `border-2 border-foreground`, `shadow-[4px_4px_0_0_var(--foreground)]`,
  `text-[0.6*]`/`text-[0.7*]` ngoài `components/ui/`.
- Hồi quy trên **dev 5173** và **preview 4174** (bundle production mới build):
  `search-check.mjs` **19/19**, `group1-check.mjs` **31/31**, `feature-check.mjs` **39/39**,
  `app-check.mjs` **44/44**, `check-filter.mjs` **28/28** — cả 2 môi trường.

### Chưa xác minh

- **Chưa xem giao diện bằng mắt người** — model không đọc được PNG. Mọi kết luận từ computed style +
  canvas resolve. Cảm giác "hết đau mắt" chỉ người dùng xác nhận được.
- Chưa test Firefox/Safari — chỉ Chrome 156 qua CDP.
- Chưa kiểm tra dark mode trên màn hình OLED thật (halation chỉ thấy bằng mắt).
- Chưa đo tương phản của ảnh seed (`SeedImage`) với nền — ảnh do server trả, không thuộc palette.

## D-017 — Hai skin chỉ khác MÀU; mọi kích thước dùng chung một nguồn

**Ngày:** 2026-11-07
**Trạng thái:** Đã áp dụng
**Liên quan:** D-016, L-006, L-007

### Bối cảnh

Người dùng yêu cầu: _"Không nhất thiết phải thiết kế mới… Thiết kế mới chỉ được xem là 'mới' khi nó
đáp ứng được các tiêu chí về khả năng hiển thị, còn các thiết kế không đáp ứng thì chỉ sửa chứ không
tạo thêm. Ngoài ra, cần thống nhất rõ về kích thước các element, components, cỡ chữ… Những thứ này
phải đồng bộ hoàn toàn giữa các theme. Màu sắc components, màu viền, màu chữ có thể thay đổi. Các
thay đổi có thể ảnh hưởng kích thước như phông chữ, bo góc của element, components thì cần xem xét kĩ
càng."_

Đo trước khi sửa (`scratch/size-parity.mjs`, 5 route × 4 tổ hợp): **34 mục lệch**. Kích thước hộp và
cỡ chữ đã khớp; lệch nằm ở 3 nguồn:

| Nguồn                   | Mặc định                   | Retro                                  |
| ----------------------- | -------------------------- | -------------------------------------- |
| `--radius`              | `0.625rem`                 | `0.375rem`                             |
| Override bo góc rời rạc | —                          | button/input `0.25rem`, badge `0.2rem` |
| `badge`                 | pill `r=26`, Geist, fw 700 | `r=3.2`, Fraunces, fw 600, ls `0.24px` |
| `h2`/`h3`               | Geist, tracking 0.35/0     | Fraunces, tracking `−0.07`             |

Đo bề rộng chữ bằng canvas ở cùng `font-size` 14px: **Fraunces rộng hơn Geist 1–7.8%** (tuỳ chuỗi).
Nghĩa là dùng Fraunces cho nhãn/tiêu đề mục sẽ làm câu xuống dòng ở chỗ khác → chiều cao khối lệch.

### Quyết định

**1. Một `--radius` duy nhất cho cả 2 skin: `0.625rem`.** Khai báo trong khối `:root` riêng, đặt
trước cả hai bảng màu, có comment nêu rõ đây là hình học dùng chung. Khối `[data-skin="retro"]`
**không** còn khai báo `--radius`.

**2. Xoá toàn bộ override kích thước trong khối retro.** Đã bỏ: `border-radius` trên
`button`/`input`/`input-group`/`dialog-content`/`badge`, `border-width` trên `badge`/`card`/`input`/
`dialog-content`/`toast`, `font-weight` + `letter-spacing` trên `badge`, `font-family` trên
`h2`/`h3`/`badge`/`[data-sonner-toast]`, `letter-spacing` trên `h1`, `background` trên `input`.
Khối retro còn lại **chỉ**: màu token, `font-family` cho `h1`, `box-shadow`, `border-color`,
`background-image` (nhiễu giấy), `transform` khi `:active`.

**3. Fraunces chỉ dùng cho `h1`** (tiêu đề trang: tên địa điểm, tên người dùng). Đây là chỗ chữ nằm
một dòng riêng, không bị wrap trong khối hẹp, nên bề rộng chữ khác nhau không đổi layout. Mọi chữ
trong component (badge, `h2`/`h3` mục, nhãn, nút) dùng Geist.

**4. Cỡ chữ gom về đúng thang Tailwind.** Ba bậc lẻ `0.72rem` (11.5px) / `0.75rem` (12px) /
`0.78rem` (12.5px) — 37 chỗ — gộp hết về `text-xs` (12px). Không còn giá trị `text-[…rem]` nào
ngoài `src/components/ui/`.

**5. Màu vẫn được phép khác** (đúng yêu cầu người dùng): `--background`, `--card`, `--primary`,
`--border`, `--muted-foreground`, `--shadow-*` khác nhau giữa 2 skin.

### Phương án đã xem

- _Giữ `--radius` retro nhỏ hơn có chủ đích, chỉ gom các giá trị lẻ về 1_ — loại: người dùng chọn
  "kích thước khớp tuyệt đối"; và bo góc là thứ nhìn thấy được ngay khi so 2 skin cạnh nhau.
- _Bỏ Fraunces hoàn toàn_ — loại: mất luôn khác biệt về phông, retro chỉ còn khác màu. Người dùng
  chọn giữ ở `h1`.
- _Giữ Fraunces ở mọi tiêu đề, chấp nhận wrap khác nhau_ — loại: vi phạm trực tiếp yêu cầu "đồng bộ
  hoàn toàn".
- _Đặt `font-stretch`/`font-size-adjust` để bù bề rộng Fraunces_ — loại: Fraunces không có trục
  `wdth`; `font-size-adjust` chỉ chuẩn hoá x-height, không làm bề rộng bằng nhau, và sẽ làm cỡ chữ
  hiển thị khác đi.

### Kích thước / license

Không đổi dependency. `package.json`, `bun.lock` không đổi. Không sửa file nào trong
`src/components/ui/`.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run build` → exit 0.
- `scratch/size-parity.mjs` trên **6 route** (`/discover`, `/social`, `/notification`, `/settings`,
  `/saved`, `/design`) × **4 tổ hợp**: **0 mục lệch**. Script so 11 thuộc tính cho mọi `[data-slot]`
  hiện diện: `w`, `h`, `border-radius`, `border-width`, `font-size`, `line-height`,
  `letter-spacing`, `font-family`, `font-weight`, `padding-x`, `padding-y`; cộng `scrollHeight` của
  `main` và `scrollHeight` của document.
- `scratch/palette-live.mjs`: vẫn **TẤT CẢ ĐẠT** sau khi đổi (contrast 11.57–13.78, viền 1.52–1.70,
  chữ nhỏ nhất trong `main` 12px, viền card `1px`).

### Chưa xác minh

- **Chưa xem giao diện bằng mắt người** — model không đọc được PNG.
- `h1` retro dùng Fraunces nên **bề rộng chữ khác** skin mặc định (1–7.8%). Kích thước hộp và chiều
  cao dòng đã khớp, nhưng nếu một `h1` rất dài xuống 2 dòng thì số dòng có thể khác. Đã kiểm với
  dữ liệu mock hiện tại (0 lệch), chưa kiểm với tên dài bất kỳ.
- Chưa test Firefox/Safari — chỉ Chrome 156. `offsetWidth` làm tròn về số nguyên nên lệch dưới 1px
  không phát hiện được.
- Chưa đo trên màn hình mật độ cao (DPR 2/3) — mới DPR 1.

## D-018 — Tăng kích thước vùng trung tâm /discover và /social

**Ngày:** 2026-11-07 · **Trạng thái:** đã triển khai

### Bối cảnh

User phản hồi: thiết kế đã ổn, nhưng components và chữ trong vùng trung tâm (nội dung trong
`<main>`) của `/discover` và `/social` còn hơi nhỏ; tăng chữ thì phải tăng components theo.

### Quyết định

Tăng một bậc theo thang Tailwind, chỉ trong file dùng chung 2 skin (không đụng `src/components/ui/`,
không đụng topbar/side nav/bottom nav):

| Vị trí                             | Trước                     | Sau                                                                        |
| ---------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| Thẻ địa điểm: body                 | `p-3 gap-1.5`             | `p-4 gap-2`                                                                |
| Tên địa điểm                       | 14px                      | 16px (`text-base`)                                                         |
| Địa chỉ + meta                     | 12px                      | 14px (`text-sm`)                                                           |
| Badge danh mục / đếm               | h-5, 12px                 | `h-6 px-2.5`, 14px                                                         |
| Rating span                        | `px-1.5 py-0.5 text-xs`   | `px-2 py-1 text-sm`                                                        |
| Thẻ bài đăng: header               | `px-3 py-2.5`             | `px-4 py-3`                                                                |
| Avatar bài đăng                    | 32px                      | 40px (`size="lg"`)                                                         |
| Tên / handle                       | 14 / 12px                 | 16 / 14px                                                                  |
| Caption                            | 14px                      | 16px (`text-base`)                                                         |
| Nút footer                         | h-7 (`size="sm"`)         | h-8 (mặc định)                                                             |
| Composer                           | `p-3`                     | `p-4`; textarea `min-h-28`, 16px cả desktop (override `md:text-sm` của ui) |
| Khối địa điểm trong post/composer  | `px-2 py-1.5 text-xs`     | `px-3 py-2 text-sm`                                                        |
| Nút Lọc / chip / popover           | `size="sm"` / `size="xs"` | mặc định / `size="sm"`, label 14px                                         |
| Bo góc lẻ `rounded-[0.15/0.25rem]` | 2.4 / 4px                 | `rounded-md` (8px, D-017)                                                  |

> **Đính chính (2026-11-08):** lần quét của D-018 (commit `36e5e85`) **bỏ sót 5 file** —
> `post-detail-page.tsx`, `place-suggestion-card.tsx`, `profile-post-grid.tsx`, `search-page.tsx`,
> `place-detail-page.tsx` vẫn còn `rounded-[0.15/0.25rem]`. Việc gộp về `rounded-md` cũng bị đảo
> ngược ở D-025: các giá trị lẻ được **giữ nguyên độ lớn** nhưng đổi thành token ngữ nghĩa
> `rounded-surface` / `rounded-control` / `rounded-thumb`, vì `rounded-md` (8px) làm dày rõ rệt các
> ô nhỏ trong hàng. Xem D-025 mục (c).

### Phương án đã xem

- _Đổi `--radius` chung hoặc font-size gốc `html`_ — loại: ảnh hưởng mọi route kể cả nav.
- _Chỉ tăng chữ, giữ components_ — loại: user yêu cầu tăng cả hai.
- _Thêm bậc chữ lẻ (13px, 15px)_ — loại: vi phạm cam kết chỉ dùng thang Tailwind (D-017).
- _Sửa `src/components/ui/textarea.tsx`_ — loại: cam kết không sửa ui; override `md:text-base` ở
  nơi dùng.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- `scratch/center-size.mjs` @1280: title 16px, addr 14px, badge 24px, body pad 16, avatar 40,
  caption 16px/26, btn h-8 (32), composer pad 16, textarea min-h 112px/16px. @390: 2 route
  `overflow: false`.
- `scratch/size-parity.mjs`: **0 mục lệch** trên 6 route × 4 tổ hợp (chạy trên working tree trước
  commit).

### Chưa xác minh

- **Chưa xem giao diện bằng mắt người** — model không đọc được PNG; "to hơn" được xác nhận bằng số
  đo DOM, cảm nhận thị giác chỉ user xác nhận được.
- Chưa test Firefox/Safari — chỉ Chrome 156.
- Chưa kiểm trên màn hình thật / DPR khác 1.

## D-019 — Gộp điều khiển giao diện vào một dropdown; /design thành trang xem trước

**Ngày:** 2026-11-07 · **Trạng thái:** đã triển khai

### Bối cảnh

Route `/design` là "trang mồ côi": không có đường dẫn nào trỏ tới, chỉ mở được bằng tay. Ô
"Giao diện" ở góc dưới trái sidebar chứa 2 icon skin + nút sáng/tối — rối, và chọn skin ở đây
trùng với submenu Giao diện trong menu avatar.

### Quyết định

1. `ThemeToggle` đổi thành dropdown 2 mục Sáng/Tối (icon mặt trời/mặt trăng + nhãn chế độ hiện
   tại), thay nút icon xoay vòng cũ.
2. Sidebar bỏ cặp icon chọn skin — một nghiệp vụ một chỗ xử lý: chọn skin ở submenu Giao diện
   (menu avatar) và ở trang `/design`.
3. Submenu Giao diện thêm mục **"Xem trước giao diện"** (`EyeIcon`, link tới `/design`).
4. `/design` đổi thành trang **"Xem trước giao diện"**: nằm trong `AppShell` (trước đó là trang
   trần), giữ phần trưng bày component làm nội dung xem trước, thêm section "Chọn kiểu hiển thị"
   với 2 nút Mặc định/Retro.

### Phương án đã xem

- _Giữ 2 icon skin ở sidebar và chỉ thêm link `/design`_ — loại: trùng lặp với submenu, 3 điều
  khiển dồn một ô nhỏ.
- _Xoá route `/design`_ — loại: mất chỗ xem các trạng thái component (loading, toast, dialog) mà
  không cần luồng nghiệp vụ.
- _Dropdown gộp cả skin lẫn sáng/tối_ — loại: chọn skin là lựa chọn hiếm (theo D-014 chỉ 2 skin,
  layout giống nhau), để submenu + trang xem trước là đủ.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- `scratch/design-theme-check.mjs` (CDP thật trên cả dev 5173 lẫn preview 4174): **12/12 pass** —
  sidebar còn đúng 1 nút có nhãn Sáng/Tối; dropdown 2 mục và đổi được `html.dark`; submenu Giao
  diện có "Xem trước giao diện" và điều hướng tới `/design`; trang có h1 đúng, nằm trong AppShell,
  2 nút chọn skin đổi được `data-skin`.
- 5 bộ regression 161/161 pass trên dev, feature-check 39/39 pass lại trên preview 4174.

### Chưa xác minh

- Cảm nhận thị giác của user (menu mới có dễ nhìn hơn không) — chỉ user tự đánh giá được.
- Trình duyệt khác Chrome 156.

## D-020 — Tab Đánh giá trên trang chi tiết địa điểm (text + số sao, không đính kèm)

**Ngày:** 2026-11-07 · **Trạng thái:** đã triển khai

### Bối cảnh

Ưu tiên 1 của danh sách chức năng thiếu (22:53): người dùng không thể đánh giá địa điểm — động
lực chính để quay lại ứng dụng. User chốt: form chỉ nhận **text + số sao**, không nhận ảnh/file.

### Quyết định

- **Model:** `Review { id, placeId, author, rating 1–5, content, createdAt, isMine }`. Ràng buộc
  nghiệp vụ: **mỗi người dùng một đánh giá mỗi địa điểm — đánh giá lại là ghi đè** (upsert), không
  có xoá ở phiên này.
- **API:** `GET /places/:id/reviews` (phẳng, mới nhất trước), `POST /places/:id/reviews` (upsert).
  Server từ chối rating ngoài 1–5 và content rỗng; body chỉ có 2 trường — không có hình thức đính
  kèm nào.
- **UI:** tab "Đánh giá" mặc định trên `/discover/:id`, phía trên "Bài đăng"/"Tổng quan". Form gồm
  `RatingStars` (5 nút sao, `radiogroup`) + `Textarea` 1000 ký tự; nút "Viết đánh giá" khi chưa có,
  banner + "Sửa đánh giá" khi đã có; `ReviewItem` hiện nút Sửa chỉ trên đánh giá của mình. Đếm số
  đánh giá hiện trên tiêu đề tab.
- **File mới:** `types/review.ts`, `api/get-place-reviews.ts`, `api/upsert-review.ts`,
  `hooks/use-place-reviews.ts`, `hooks/use-upsert-review.ts`,
  `components/{rating-stars,review-form,review-item}.tsx`, `mocks/fixtures/reviews.ts`.

### Phương án đã xem

- _Cho upload ảnh review_ — loại: user yêu cầu chốt không cho đăng hình/file.
- _CRUD đầy đủ có xoá_ — để lại: chưa có nhu cầu đã nêu; upsert là đủ cho vòng đầu, thêm sau là
  migration nhỏ.
- _Nửa sao (4.5)_ — loại: form nhập phức tạp, các app tham chiếu (Foody) cũng dùng số nguyên.
- _Đặt rating vào `Place` bằng aggregate_ — hoãn: đếm sao trung bình cần nghĩ về chống gian lận;
  hiện đếm số review trên tab là đủ.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- `scratch/review-flow-check.mjs` (CDP, dev 5173): **11/11 pass** — tab + đếm seed; gửi review mới
  (chọn sao → nút Gửi bật → bài hiện đầu danh sách, banner "Bạn đã đánh giá"); sửa → ghi đè còn
  đúng một bản ghi; p-05 không có seed → đúng empty state + nút Viết.

### Chưa xác minh

- Preview 4174 (dist) chưa chạy lại sau khi build bản này — chỉ verify trên dev.
- Trình duyệt khác Chrome 156; màn hình thật.
- Hiệu năng khi số review lớn (hiện render toàn bộ, chưa phân trang — khớp contract `Page` sẵn có
  để phân trang sau mà không đổi API).

## D-021: Bộ sưu tập địa điểm (Collections)

### Bối cảnh

- Người dùng có nhu cầu gom nhóm địa điểm yêu thích theo chủ đề (công việc, ăn vặt, hẹn hò...)
  để xem lại hoặc chia sẻ cho người khác.
- Trước đây mục `/saved` chỉ có "Bài đăng" và tab "Địa điểm" rỗng.
- Cần tính năng tạo, quản lý, lưu địa điểm vào bộ sưu tập, xem trang chi tiết và chia sẻ link URL.

### Quyết định

- **Model:** `Collection` gồm `{ id, name, description, isPrivate, owner, placeIds, createdAt, isMine }`.
  Bản rút gọn `CollectionSummary` gồm `{ id, name, description, isPrivate, placeCount, previewPlaceIds, createdAt, containsPlace? }`.
- **API:**
  - `GET /collections[?placeId=...]`: Danh sách bộ sưu tập của người dùng hiện tại (mới tạo trước).
    Nếu truyền `placeId`, trả kèm `containsPlace: boolean` để dialog biết chính xác trạng thái thành viên.
  - `POST /collections`: Tạo bộ sưu tập mới (tên 1-80 ký tự, mô tả, tuỳ chọn riêng tư).
  - `GET /collections/:id`: Chi tiết một bộ sưu tập và danh sách địa điểm theo thứ tự thêm.
  - `DELETE /collections/:id`: Xoá bộ sưu tập (chỉ owner).
  - `PATCH /collections/:id/places`: Thêm (`member: true`) hoặc bớt địa điểm (idempotent).
- **UI:**
  - Tab "Bộ sưu tập" trên `/saved` hiển thị danh sách dạng lưới `CollectionCard` (preview 3 ảnh đầu, badge riêng tư, ngày tạo).
  - Nút "Lưu vào bộ sưu tập" trên trang chi tiết địa điểm (`/discover/:id`), mở `SaveToCollectionDialog` (dùng `Item` và `Switch`, click nhãn/item toggle tức thì, form tạo nhanh bộ mới).
  - Trang chi tiết `/collections/:id`: Breadcrumb, tiêu đề, badge riêng tư, nút Sửa (sắp ra mắt), nút Xoá với `AlertDialog` xác nhận (destructive), danh sách địa điểm `PlaceCard`.
- **Thư viện UI:**
  - 100% dùng shadcn/ui có sẵn: `Tabs`, `Dialog`, `AlertDialog`, `Item`, `Switch`, `Badge`, `Breadcrumb`, `Empty`, `Spinner`, `Button`, `Input`, `Label`. Không viết CSS/inline styles riêng.

### Phương án đã xem

- _Lưu bài đăng vào collection:_ loại, chỉ gom địa điểm để tập trung vào giá trị cốt lõi khám phá quán.
- _Cơ chế share token phức tạp:_ loại, URL trực tiếp `/collections/:id` đã đáp ứng nhu cầu chia sẻ.
- _Dùng `Dialog` cho confirm xoá:_ đã thay bằng `AlertDialog` chuẩn shadcn convention.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` → exit 0.
- `scratch/collection-flow-check.mjs` (CDP dev 5173): **13/13 pass** — hiển thị seed, mở chi tiết, lưu địa điểm qua dialog, tăng số lượng, tạo bộ mới, xoá qua AlertDialog, quay về `/saved`.
- `scratch/click-label-and-persistence-check.mjs` (CDP dev 5173): **3/3 pass** — click chữ toggle được Switch, bật nhiều Switch đồng thời không bị tắt chéo, đóng mở lại dialog vẫn giữ nguyên trạng thái ON.

### Chưa xác minh

- Chưa kiểm tra trên thiết bị mobile thực tế.
- Chưa test trên Safari / Firefox.

## D-022: Tích hợp Bản đồ tương tác (Interactive Map View) với Leaflet

### Bối cảnh

- Ứng dụng khám phá ẩm thực và địa điểm cần trải nghiệm bản đồ tương tác để người dùng trực quan hoá vị trí các quán ăn theo không gian địa lý, thay vì chỉ xem dạng danh sách tĩnh.
- Trang `/discover` cần nút chuyển đổi giữa dạng xem "Lưới" (Grid) và "Bản đồ" (Map).
- Trang chi tiết địa điểm `/discover/:id` cần mini map hiển thị vị trí chính xác của quán kèm liên kết dẫn đường ngoài.

### Quyết định

- **Dependency mới:** `leaflet` (~140 kB gzip nhẹ, license BSD-2-Clause), `react-leaflet` (license Hippocratic 2.1 / MIT, wrapper React chính thức), `@types/leaflet` (devDependencies).
- **Lý do chọn:**
  - Không tốn chi phí API key (dùng OpenStreetMap tiles công khai).
  - Tương thích tốt với React 19, dung lượng nhỏ gọn hơn Mapbox/MapLibre GL nhiều lần.
  - Hỗ trợ `L.divIcon` giúp tạo custom marker hoàn toàn bằng JSX/HTML/Tailwind CSS chuẩn với giao diện dự án.
- **Model:** Mở rộng `Place` và `PlaceSummary` thêm tọa độ tuỳ chọn:
  ```ts
  lat?: number
  lng?: number
  ```
- **UI:**
  - Trên `/discover`: Thêm `ToggleGroup` (hoặc button pair) chuyển đổi Chế độ xem: `Lưới` (icon `LayoutGrid`) và `Bản đồ` (icon `Map`).
  - Bản đồ toàn phần hỗ trợ thu phóng, rê chuột, click marker hiển thị thẻ popup preview địa điểm (ảnh, tên, địa chỉ, sao, nút mở chi tiết).
  - Trên `/discover/:id`: Thêm mini-map vị trí quán trong tab "Tổng quan".

### Phương án đã xem

- _Google Maps JS API:_ loại vì cần API key, thẻ tín dụng và có phí theo lượt request.
- _MapLibre GL:_ loại vì bundle size lớn (~600 kB) và yêu cầu vector tile server phức tạp.
- _SVG nội bộ:_ loại vì không có khả năng kéo thả, thu phóng bản đồ thế giới thật như OpenStreetMap.

### Đã xác minh

- Sẽ xác minh qua `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build`, và script CDP E2E.

### Chưa xác minh

- Trải nghiệm cảm ứng đa điểm trên màn hình điện thoại thật.

## D-023: Tái định hướng ứng dụng chuyên sâu cho Thành phố Đà Nẵng, bổ sung bộ lọc Quận và tính năng "Gần đây"

### Bối cảnh

- Ứng dụng định hướng tập trung phục vụ chuyên biệt cho thị trường Thành phố Đà Nẵng.
- Người dùng cần trải nghiệm tìm kiếm quán ăn theo khu vực địa lý quen thuộc: theo từng Quận (Hải Châu, Sơn Trà, Thanh Khê, Ngũ Hành Sơn, Cẩm Lệ, Liên Chiểu) và tìm quán "Gần đây" (dựa theo định vị thực tế).

### Quyết định

- **Toạ độ trung tâm mặc định:** Chuyển về Đà Nẵng `[16.0544, 108.2022]` (khu vực cầu Rồng / Sông Hàn).
- **Dữ liệu mẫu (`MOCK_PLACES`):** Chuyển 100% dữ liệu mẫu sang các quán ăn, quán cà phê, đặc sản nổi tiếng tại Đà Nẵng, phân bổ đầy đủ trên các quận.
- **Model:** Bổ sung trường `district: string` vào `Place` và `PlaceSummary`.
- **UI `/discover`:**
  - Thanh chip cuộn ngang trên đầu trang chọn nhanh theo Quận: "Tất cả", "Hải Châu", "Sơn Trà", "Thanh Khê", "Ngũ Hành Sơn", "Cẩm Lệ", "Liên Chiểu".
  - Nút kích hoạt chế độ "Gần đây" sử dụng Geolocation API của trình duyệt.
  - Tính toán khoảng cách (km / m) theo công thức Haversine hiển thị trên `PlaceCard` và popup bản đồ `PlacesMap`.
  - Tự động sắp xếp địa điểm từ gần nhất đến xa nhất khi bật chế độ "Gần đây".

### Phương án đã xem

- _Đặt chọn quận trong dropdown Popover Lọc:_ loại, đưa ra thanh chip 1 chạm trên đầu trang giúp người dùng tiếp cận nhanh hơn nhiều.
- _Giữ dữ liệu toàn quốc hỗn hợp:_ loại, tập trung 100% vào Đà Nẵng mang lại trải nghiệm bản địa chất lượng cao và các quán kết nối liền mạch trên bản đồ.

### Đã xác minh

- Sẽ xác minh qua typecheck, lint, build, và test E2E CDP.

### Chưa xác minh

- Độ chính xác GPS trên thiết bị di động thực tế trong môi trường sóng yếu.

## D-024: Hoàn thiện nhóm "Core Engagement" — sửa bộ sưu tập, thả tim, chia sẻ, check-in

**Ngày:** 2026-11-08
**Trạng thái:** Đã áp dụng

### Bối cảnh

Nhóm tính năng 1 (Core Engagement) trong đề xuất phát triển còn ba việc chưa có: nút "Sửa" bộ sưu tập
đang bị `disabled`, bộ sưu tập chưa chia sẻ/thả tim được và chưa hiện trên trang cá nhân, và trang
chi tiết quán chưa có đường tắt để đăng bài check-in. Bản đồ tương tác (việc thứ nhất của nhóm) đã
xong ở D-022.

### Quyết định

- **Sửa bộ sưu tập:** bật `EditCollectionDialog` thay cho nút `disabled`. Thêm `PATCH /collections/:id`
  (chỉ chủ sở hữu, `name` 1–80 ký tự, `description` ≤ 400, `isPrivate` boolean). Xoá địa điểm khỏi bộ
  sưu tập dùng lại `useSetCollectionPlace` đã có (nút X trên từng thẻ, chỉ hiện với chủ sở hữu).
- **Thả tim bộ sưu tập:** thêm `likeCount` + `likedByMe` vào cả `Collection` và `CollectionSummary`
  để danh sách và trang chi tiết cùng một nguồn dữ liệu. API `POST`/`DELETE /collections/:id/like`
  idempotent; trả 404 khi bộ sưu tập riêng tư của người khác, 400 khi tự thả tim bộ của mình.
  Mutation optimistic trên cả detail và list, rollback khi lỗi.
- **Bộ sưu tập công khai trên trang cá nhân:** `GET /users/:handle/collections` (ẩn bộ riêng tư trừ
  khi là chính chủ, mới nhất trước). Tab "Bộ sưu tập" trong `profile-tabs.tsx` render
  `ProfileCollectionGrid`, empty state khác nhau cho chủ và người xem.
- **Chia sẻ:** `src/lib/share.ts` bọc `navigator.share` và fallback `navigator.clipboard.writeText`,
  trả `"shared" | "copied" | "cancelled" | "failed"` để UI chọn toast. **Không thêm dependency** —
  Web Share API và Clipboard API đều có sẵn trong trình duyệt.
- **Check-in từ trang quán:** `CheckInDialog` mở từ nút "Đăng bài check-in tại đây" ở
  `/discover/:id`, địa điểm gắn cố định (không cho gỡ), dùng lại `useCreatePost` và invalidate
  `placePostsQueryKey(place.id)` để tab "Bài đăng" của quán cập nhật ngay.
- **Dữ liệu mẫu:** thêm `p-28`–`p-30` với `publishedAt: null` — job đề xuất địa điểm phía server
  cần ứng viên CHƯA publish, trước đó toàn bộ 27 địa điểm đều đã publish nên không còn gì để đề xuất.
  Đồng thời chỉnh caption các bài seed khớp với `placeId` (trước đó caption nói quán Sài Gòn nhưng
  gắn địa điểm Đà Nẵng) và đổi `handle` `yen.saigon` → `yen.danang`, bio/location của người dùng mẫu
  sang Đà Nẵng.

### Phương án đã xem

- _Kéo thả sắp xếp địa điểm trong bộ sưu tập:_ hoãn — cần thêm thư viện DnD hoặc tự viết pointer
  handling, trong khi nút xoá đã giải quyết nhu cầu chính. Ghi vào `docs/BACKLOG.md`.
- _Đếm lượt thích riêng ở endpoint `/collections/:id/likes`:_ loại, nhúng thẳng vào DTO để tránh
  thêm round-trip khi render danh sách.
- _Dùng `sonner` trực tiếp trong từng trang:_ loại, gom vào `ShareButton` để hành vi chia sẻ chỉ có
  một chỗ xử lý.

### Đã xác minh

- `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` đều pass.
- Script CDP: `core-engagement-check.mjs` 19/19, `g1-responsive-check.mjs` 11/11,
  `app-check.mjs` 44/44, `collection-flow-check.mjs` 13/13, `review-flow-check.mjs` 11/11,
  `interactive-map-check.mjs` 11/11, `danang-districts-and-nearby-check.mjs` 9/9.

### Chưa xác minh

- Bảng chia sẻ hệ điều hành thật (`navigator.share`) trên điện thoại thật.
- Hộp thoại xin quyền clipboard của Safari/Firefox.
- Kéo thả sắp xếp địa điểm trong bộ sưu tập (chưa làm).

## D-025: Chuẩn hoá toàn dự án về component có sẵn, token ngữ nghĩa và helper dùng chung

**Ngày:** 2026-11-08
**Trạng thái:** Đã áp dụng

### Bối cảnh

Audit trước đó (`audit-shadcn-2026-11-08.md`) chỉ ra bốn loại lệch chuẩn lặp lại khắp `src/`:

1. **Tự chế lại component đã cài.** 9 khối "card" là `div` + `rounded-* border bg-card shadow-*`; hàng
   thông báo/gợi ý là `div` + `flex`; banner cảnh báo là `div` + bảng màu `amber`; 9 nút bật/tắt là
   `Button` + `aria-pressed`; form dùng `<label>` thô.
2. **Giá trị thị giác viết trực tiếp.** 13 chỗ `rounded-[0.25/0.2/0.15rem]`, 5 chỗ `text-[10px]`,
   7 chỗ bảng màu thô (`amber-*`, `emerald-*`, `blue-*`, `border-white`).
3. **Số liệu tự format.** `toFixed(1)` cho điểm đánh giá, `toLocaleDateString` cho ngày,
   `"₫".repeat(priceLevel)` lặp 4 nơi.
4. **Hook tự viết.** `use-user-location` (geolocation + watch), `use-infinite-scroll`
   (`addEventListener("scroll")`), `use-debounced-value` (`setTimeout`).

Hệ quả: cùng một khái niệm có nhiều cách render khác nhau, sửa một chỗ không lan sang chỗ khác.
`[data-skin="retro"] [data-slot="card"]` trong `index.css` là **code chết** vì không có feature card
nào mang `data-slot="card"`.

### Quyết định

**(a) Thêm `@uidotdev/usehooks@2.4.1`** để xoá 3 hook tự viết.

| Tiêu chí   | Giá trị                                                    |
| ---------- | ---------------------------------------------------------- |
| License    | MIT                                                        |
| Peer deps  | `react >=18`, `react-dom >=18` (React 19 thoả)             |
| Kích thước | 32.242 B raw / **6.752 B gzip**                            |
| Hook dùng  | `useGeolocation`, `useIntersectionObserver`, `useDebounce` |

Phương án đã xem và loại:

- `react-use@17.6.1` — **Unlicense**, 453.840 B raw (67× lớn hơn), không có `useGeolocation` đúng
  semantics cần (không tách `watchPosition`), repo ít cập nhật.
- `use-debounce` + `react-intersection-observer` — 2 package thay vì 1, vẫn phải tự viết geolocation.
- `@reactuses/core` — kéo peer `qrcode ^1.5` không dùng đến.
- Giữ hook tự viết — loại: `useGeolocation` của bộ này xử lý sẵn `getCurrentPosition` +
  `watchPosition` + `clearWatch` + phân loại `error.code`, tức là đúng phần dễ sai nhất.

`useGeolocation` đăng ký watcher **ngay khi mount**, nên không gọi trực tiếp trong `useUserLocation`
(sẽ hỏi quyền vị trí lúc mở `/discover`). Tách `GeolocationWatcher` ở
`src/hooks/geolocation-watcher.tsx`, chỉ mount sau khi người dùng bấm "Gần đây"; hook trả
`locationGate` và trang phải render nó.

**(b) `Card` là container chuẩn cho mọi khối "thẻ".** Chấp nhận thay đổi thị giác nhỏ (bán kính
`rounded-xl` = 14px thay vì 4px, có `ring-1 ring-foreground/10` thay vì `border`) để đổi lấy việc
`[data-skin="retro"] [data-slot="card"]` hoạt động trở lại và mọi thẻ có cùng cấu trúc
`CardHeader`/`CardContent`/`CardFooter`.

**(c) Ba bậc bo góc ngữ nghĩa, không dùng giá trị lẻ.** Thang Tailwind giữ nguyên; ngoài thang chỉ
có 3 token khai trong `@theme inline`:

| Token              | Giá trị           | Dùng cho                                  |
| ------------------ | ----------------- | ----------------------------------------- |
| `--radius-surface` | `0.25rem` (4px)   | khối nội dung / panel phụ / khung ảnh lớn |
| `--radius-control` | `0.2rem` (3.2px)  | chip, ô nhỏ trong hàng, logo chữ          |
| `--radius-thumb`   | `0.15rem` (2.4px) | ảnh thu nhỏ trong danh sách               |

Phương án đã xem: _gộp hết về `rounded-md`_ — loại, `rounded-md` = `calc(0.625rem * 0.8)` = 8px,
làm dày đáng kể các ô nhỏ trong hàng; _giữ giá trị lẻ_ — loại, không grep được, không đổi được
một chỗ.

**(d) Token `--star` cho điểm đánh giá.** Trước đây `amber-400`/`amber-500` viết trực tiếp ở 2 nơi
(`rating-stars.tsx`, `places-map.tsx`). Thêm `--star` vào **cả 4 khối skin** (`:root`, `.dark`,
`[data-skin="retro"]`, `[data-skin="retro"].dark`) và map `--color-star` để `text-star`/`fill-star`
hoạt động.

**(e) `Comment.isMine` do server kết luận.** Trước đây `comment-thread-panel.tsx` truyền
`isMe` = hằng `true`, khiến menu "Xoá bình luận" hiện trên bình luận của người khác. Quyền xoá là
kết luận của server (giống `PlaceSummary.isPublished`), client chỉ hiển thị. Server cũng chặn
`DELETE /comments/:id` khi không phải chủ.

**(f) `docs/CONVENTIONS.md` là nguồn quy ước duy nhất.** Bảng thay thế "đang tự viết → dùng gì",
danh sách token, helper format, hằng số, quy tắc trợ năng và cổng grep kiểm tra.

### Đã xác minh

- `bunx tsc -p tsconfig.app.json --noEmit --incremental false` → exit 0 (chạy sau mỗi lần quét).
- `bunx eslint src` → exit 0.
- `bunx prettier --check` trên các file đã sửa → pass.
- Grep sau khi quét: `rounded-[` trong `src/features` + `src/components/layout` → **0**;
  `text-[10px]`/`text-[11px]` → **0**; `toFixed`/`toLocaleString`/`toLocaleDateString` → **0**;
  `amber-`/`emerald-`/`blue-[0-9]`/`bg-white`/`text-white`/`border-white`/`bg-black` → **0**.
- `bun pm view @uidotdev/usehooks` → `2.4.1`, `license: MIT`, `peerDependencies: react >=18,
react-dom >=18`; tarball 32.242 B.
- `grep -rn "aria-pressed" node_modules/@base-ui/react/toggle/Toggle.js` → dòng 75
  `'aria-pressed': pressed`, xác nhận `Toggle` thay được `Button + aria-pressed`.

### Chưa xác minh

- Ảnh hưởng thị giác thực tế của việc chuyển 9 khối sang `Card` (bán kính 4px → 14px, viền → ring):
  chưa chụp ảnh so sánh trước/sau.
- `scratch/size-parity.mjs` (D-017) chưa chạy lại sau khi đổi bo góc — dự kiến **sẽ lệch** vì bán
  kính thay đổi có chủ đích, cần cập nhật script thay vì coi là lỗi.
- `useGeolocation` có gọi cả `getCurrentPosition` và `watchPosition`; chưa đo xem Chrome có hỏi
  quyền 2 lần hay không.
- `cn-toast` trong `src/components/ui/sonner.tsx:35` chưa xác định được định nghĩa nằm ở đâu
  (không có trong `node_modules/shadcn/dist/tailwind.css`).

---

## D-026 — Dùng `Calendar` của shadcn (react-day-picker + date-fns) cho chọn ngày

**Ngày:** 2026-11-08
**Trạng thái:** Đã áp dụng

**Diễn biến cài đặt:** 2 lần đầu `bunx shadcn add calendar --yes` treo im lặng (~90–110 giây,
không output). Nguyên nhân thật: **không phải mạng** — CLI đang chờ prompt tương tác
`? The file button.tsx already exists. Would you like to overwrite? › (y/N)` (calendar khai báo
`registryDependencies: ["button"]`, còn `--yes` không tự trả lời prompt ghi đè). Lần 3 chạy với
stdin nạp sẵn `n` → thành công: tạo `calendar.tsx`, **giữ nguyên `button.tsx`** (skipped).
Bài học ghi ở `docs/LESSONS.md` L-008 (đừng tự tạo file khi tool treo) và L-009 (tool "treo" có
thể là đang chờ prompt — kiểm tra stdin trước khi kết luận).

### Bối cảnh

Gói "Lên kế hoạch chuyến đi" cần chọn **khoảng ngày** (ngày đến → ngày đi) và chọn **một ngày**
cho từng chặng. Trước đây dự án không có component chọn ngày; phương án cũ trong
`docs/design/ke-hoach-thiet-ke.md` là `<Input type="date">` native.

Người dùng đã chốt (2026-11-08): **đồng ý cài thêm dependency để đồng bộ với shadcn**, thay vì
dùng input native.

### Quyết định

Cài `calendar` từ registry base-nova:

```bash
bunx shadcn@4.23.0 add calendar --yes
```

Registry kéo theo 2 dependency: `react-day-picker@latest` (hiện `10.0.2`) và `date-fns`
(hiện `4.4.0`). Không tự viết date picker.

### Lý do

- `Calendar` là component chính thức của shadcn cho base-nova — đúng quy ước "thiếu component thì
  cài, không tự viết" ([CONVENTIONS.md §1](CONVENTIONS.md)).
- Chọn khoảng ngày bằng lịch trực quan tốt hơn 2 ô `type="date"` trên mobile, đặc biệt khi cần
  chặn ngày đi trước ngày đến và giới hạn 30 ngày.
- `react-day-picker` là thư viện nền của chính shadcn Calendar, không phải lựa chọn thay thế.
- `date-fns` là dependency bắt buộc của `react-day-picker@10` (khai báo `^4.1.0`), không phải
  gói dư.

### Phương án đã xem

1. **`<Input type="date">` native** — không thêm gói, nhưng giao diện khác nhau giữa
   Chrome/Safari/iOS, không chặn khoảng ngày ở mức UI, khó hiển thị "30 ngày tới".
2. **Tự viết lịch bằng `div` + `Intl`** — vi phạm trực tiếp CONVENTIONS §1, và phải tự xử lý
   bàn phím/a11y/lịch âm dương — không đáng.
3. **`react-datepicker` hoặc `@mui/x-date-pickers`** — thêm gói ngoài hệ shadcn, không khớp
   token/theme base-nova, phải viết lại style.
4. **Chọn (1) rồi nâng cấp sau** — người dùng đã chốt muốn đồng bộ shadcn ngay.

### Kích thước / license

| Gói                | Version           | License | Unpacked                                                       |
| ------------------ | ----------------- | ------- | -------------------------------------------------------------- |
| `react-day-picker` | 10.0.2            | MIT     | 992 KB                                                         |
| `date-fns`         | 4.4.0             | MIT     | 10,9 MB (tree-shakeable; bundle runtime chỉ gồm hàm được dùng) |
| `@date-fns/tz`     | ^1.4.1 (kéo theo) | MIT     | nhỏ                                                            |

`date-fns` lớn khi nhìn unpacked nhưng Vite chỉ đóng gói phần được import; `react-day-picker`
chỉ dùng vài hàm format. Không ảnh hưởng bundle đáng kể.

### Hệ quả

- Khi cài thành công: `src/components/ui/calendar.tsx` mới; **xoá dòng `"use client"`** sau khi
  sinh (quy ước dự án). File phải do tool sinh — không tự tạo (L-008).
- Ngày trong `Trip` vẫn lưu dạng chuỗi `YYYY-MM-DD` (local), không lưu `Date` — `Calendar` chỉ
  là lớp chọn, chuyển đổi ở `features/trips/lib/trip.ts`.
- Không dùng `date-fns` trực tiếp trong code nghiệp vụ; mọi format ngày vẫn qua `src/lib/format.ts`
  (`formatDate`) để giữ "một nghiệp vụ một chỗ".

### Chưa xác minh

- Chưa render thử `Calendar` trong `Popover`/`Drawer` trên mobile 360px.
- Chưa đo bundle tăng thực tế sau `vite build` (chỉ có số unpacked của npm).
- `calendar.tsx` sinh ra không có `"use client"` (shadcn 4.23 base-nova không chèn) — quy ước
  "xoá use client" không cần áp dụng cho file này.

---

## D-027 — Dùng `dnd-kit` cho kéo thả sắp thứ tự chặng

**Ngày:** 2026-11-08
**Trạng thái:** Đã áp dụng

### Bối cảnh

Lịch trình ngày (`DayPlan`) và chặng trong chuyến đi (`TripDay.placeIds`) cần **sắp thứ tự đi**.
Thiết kế cũ dùng `DropdownMenu` "Lên/Xuống" để tránh thêm thư viện kéo thả.

Người dùng đã chốt (2026-11-08): **đồng ý cài thêm dependency** để có kéo thả thật.

### Quyết định

```bash
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Dùng `DndContext` + `SortableContext` + `useSortable` cho danh sách chặng; **giữ nút Lên/Xuống
trong `DropdownMenu`** làm phương án bàn phím và phương án dự phòng (a11y + thiết bị không kéo
được).

### Lý do

- `dnd-kit` là thư viện kéo thả phổ biến nhất cho React hiện đại, không phụ thuộc HTML5 drag &
  drop (hoạt động cảm ứng tốt trên mobile), hỗ trợ bàn phím sẵn.
- Kéo thả là tương tác tự nhiên cho "sắp thứ tự đi" — nút Lên/Xuống bắt người dùng bấm nhiều lần
  với danh sách 6–10 chặng.
- Giữ nút Lên/Xuống đảm bảo a11y và không phá vỡ luồng khi JS kéo thả lỗi.

### Phương án đã xem

1. **Chỉ nút Lên/Xuống** — không thêm gói, nhưng thao tác nặng khi danh sách dài (phương án cũ).
2. **HTML5 Drag and Drop API** — không thêm gói, nhưng không hoạt động tốt trên cảm ứng, phải tự
   xử lý touch, không có a11y.
3. **`react-beautiful-dnd`** — đã ngừng bảo trì, không tương thích React 19.
4. **`@hello-pangea/dnd`** — bản fork còn bảo trì, nhưng API nặng và không hỗ trợ tốt danh sách
   dọc trong `ScrollArea` mobile.
5. **Chọn `dnd-kit`** — nhẹ, module hoá, hỗ trợ React 19, cảm ứng + bàn phím.

### Kích thước / license

| Gói                  | Version | License | Unpacked |
| -------------------- | ------- | ------- | -------- |
| `@dnd-kit/core`      | 6.3.1   | MIT     | 1,07 MB  |
| `@dnd-kit/sortable`  | 10.0.0  | MIT     | 234 KB   |
| `@dnd-kit/utilities` | 3.2.2   | MIT     | 88 KB    |

### Hệ quả

- Chỉ dùng trong `features/trips` và `features/collections` (timeline); không lan sang nơi khác.
- `useSortable` phải gắn `transform`/`transition` qua `CSS.Transform.toString` từ
  `@dnd-kit/utilities`.
- Danh sách vẫn render bằng `Item`/`ItemGroup`; `useSortable` chỉ bọc ngoài `Item`, không thay
  component UI.
- Không kéo thả giữa các ngày (chỉ trong một ngày) — tránh phức tạp `Droppable` chéo; chuyển quán
  sang ngày khác làm bằng `DropdownMenu` "Chuyển sang ngày…".

### Chưa xác minh

- Chưa thử kéo thả trên thiết bị cảm ứng thật; chưa đo xung đột giữa kéo dọc và cuộn trang.
- Chưa kiểm `@dnd-kit/sortable@10` tương thích `@dnd-kit/core@6` (registry khai báo vậy, nhưng
  chưa chạy thử).

## D-030 — Bỏ feature "Chuyến đi" (Trip), chuyển hướng sang "Phòng lọc nhóm"

### Bối cảnh

- Bước 2 gói "Lên kế hoạch chuyến đi" (commit `f8fe665`) đã hoàn tất nhưng user quyết định
  **bỏ hẳn hướng Trip**: ưu tiên chuyển sang tính năng nhóm cùng lọc (xem D-031).
- Lý do: "Chuyến đi" nên là chức năng ngang hàng discover/social, nhưng trọng tâm thật sự của
  user là **nhóm người cùng lên kế hoạch trong 1 ngày**, không phải quản lý chuyến nhiều ngày.

### Quyết định

- Revert commit `f8fe665` bằng `git revert --no-commit` (KHÔNG `git reset --hard`): xoá
  `src/features/trips/**`, route `/trips/:id`, tab "Chuyến đi" trong `/saved`.
- Xoá thêm phần Trip-only từ commit `229573f`: `MAX_TRIP_NAME_LENGTH`, `MAX_TRIP_DAYS`,
  `MAX_DAY_PLAN_STOPS`, `MUST_TRY_DISHES`/`MustTryDish`, `places/lib/travel.ts`
  (`estimateTravelMinutes`) — grep xác nhận không còn nơi nào dùng.
- **Xoá luôn** `formatClock`, `formatVnd` (format.ts) và `shareText` (share.ts) — chỉ Trip dùng,
  grep xác nhận 0 usage sau khi revert (đợt audit shadcn 2026-11-08). `shareLink` giữ lại
  (ShareButton dùng).
- Git history giữ nguyên; cần lấy lại thì xem commit `f8fe665`.

### Hệ quả

- `calendar` (react-day-picker + date-fns) và `dnd-kit` đã cài nhưng hiện **chưa có nơi dùng** —
  không gỡ (D-026/D-027 vẫn hợp lệ cho tính năng tương lai), ghi chú ở đây để không quên.
  _(Cập nhật 2026-11-09: đã gỡ hẳn — xem D-033.)_
- Docs thiết kế `docs/design/ke-hoach-thiet-ke.md` giữ làm tài liệu tham khảo, đánh dấu đã bỏ.

## D-031 — "Phòng lọc nhóm": nhóm cùng lọc /discover với đề xuất include/exclude

### Bối cảnh

- User bỏ hướng Trip (D-030) và chốt hướng mới: **một nhóm bạn vào chung phòng để lọc màn hình
  khám phá giống hệt nhau**, mỗi người tự đề xuất include/exclude thay vì giải quyết trong kênh chat.
- Backend là mock in-memory per tab (D-011) — **đa thiết bị thật bắt buộc backend** (WebSocket/
  Supabase Realtime), ghi BACKLOG. Đợt này demo bằng **các tab cùng 1 trình duyệt**.

### Quyết định

- Feature mới `src/features/rooms/`: `Room` (code 6 ký tự, members, proposals, filter chung),
  `RoomProposal` (include/exclude × category/district/priceMax/keyword), `RoomFilter`.
- **Đồng bộ chéo tab**: dữ liệu phòng ở `localStorage` (`danang-rooms-v1`), `useLocalStorage`
  của `@uidotdev/usehooks` đã đăng ký `storage` event (verify trong source) nên tab khác tự cập
  nhật. KHÔNG thêm BroadcastChannel — storage event đủ, tránh phức tạp thừa.
- **Trạng thái "tôi" là của từng tab**: phòng đang mở + danh tính thành viên lưu `sessionStorage`
  (`danang-room-active`, `danang-room-member-id`) — mỗi tab là một người, tab mới mở link phải
  tham gia bằng tên.
- **Mô hình tương tác**: đề xuất rơi vào danh sách chung; **ai cũng áp dụng được** (không phân
  quyền — cùng lý do DX-9.4: nhóm bạn không cần admin). Áp dụng ghi vào `RoomFilter`, đề xuất
  chuyển `applied`; "Không muốn" tôn trọng tuyệt đối (loại hẳn), "Muốn có" là ràng buộc dương.
- **Lọc 100% server-side**: `GET /places` nhận thêm `priceMax`, `excludeCategory`,
  `excludeDistrict`, `includeKeyword`, `excludeKeyword` (danh sách phân tách dấu phẩy) và
  `category`/`district` cũng chấp nhận danh sách phân tách dấu phẩy — phòng gửi **toàn bộ**
  ràng buộc lên server, server lọc trước khi phân trang. Client không tự lọc lại (một nghiệp vụ
  một chỗ; lọc client-side sau phân trang sẽ sai số lượng trang). `discoverQueryKey` phải chứa
  `filters.room` để đổi ràng buộc phòng luôn fetch lại thay vì trả cache.
- Khi đang trong phòng: `/discover` ẩn bộ lọc cá nhân (quận chips + popover Lọc), hiện banner
  phòng. Rời phòng → trở lại lọc bình thường.
- Component dùng: `Card`, `Badge`, `Avatar`, `Dialog`, `ToggleGroup`, `InputGroup`/`Input`,
  `Item`, `Empty`, `Separator`, `Breadcrumb`, `Button`, `Field`.

### Hệ quả

- UI mock phải ghi rõ "dữ liệu minh hoạ, đồng bộ trong cùng trình duyệt" — không gây hiểu nhầm
  là đã có realtime đa thiết bị.
- `priceMax` chỉ có chiều include (exclude mức giá vô nghĩa) — nút "Không muốn" bị disable.
- Mã phòng sinh từ bảng ký tự bỏ O/0/I/1 (`generateRoomCode`).

## D-032 — "Bản đồ" thành mục nav riêng; bộ lọc khám phá nằm trên URL dùng chung

### Bối cảnh

- User yêu cầu: đưa "map" thành mục riêng ở nav trái, và khi chuyển giữa discover ↔ map phải
  **giữ nguyên search + filter**. Trước đây map chỉ là `viewMode` cục bộ của `/discover`
  (`useState("grid" | "map")`) — đổi trang là mất hết bộ lọc.

### Quyết định

- Thêm mục nav `{ to: "/map", label: "Bản đồ" }` vào `NAV_ITEMS`, route `/map` → `MapPage`.
- **Bộ lọc nằm trên URL** (`?category=&district=&q=&nearby=1`) qua hook mới
  `useDiscoverFilters` — `/discover` và `/map` là **hai cách nhìn của cùng một bộ lọc**:
  reload, back/forward, gửi link đều giữ nguyên. Giá trị rỗng/"all" bị xoá khỏi URL cho gọn.
- **Một nghiệp vụ một chỗ**: toàn bộ logic lọc (server filters + lọc phòng nhóm client-side +
  khoảng cách + sort "Gần đây") gom vào `useDiscoverView`; `DiscoverToolbar` là toolbar dùng
  chung của cả 2 trang (nút Lưới/Bản đồ chỉ đổi pathname, giữ nguyên `search`).
- Nav (`useNavTarget`): đứng ở trang chia sẻ filter thì bấm mục còn lại **mang theo
  `location.search`**; ở trang khác thì không.
- Ô tìm kiếm topbar (`useSearchQuerySync`) hiện `?q=` cả trên `/discover` và `/map` — trước đây
  chỉ hiện trên `/search`, gây cảm giác "ô trống nhưng kết quả đang lọc theo từ khoá".
- Từ khoá gõ trong popover Lọc ghi URL sau 300 ms debounce (`replace: true`) — không làm rối
  lịch sử trình duyệt, cùng cách với `useSearchQuerySync`.

### Hệ quả

- `/discover/:id` (chi tiết quán) KHÔNG mang filter theo khi điều hướng — chỉ các trang lọc
  (`FILTER_SHARED_PATHS`) mới mang.
- Lỗi cũ "Gần đây" phải `clearLocation()` khi tắt được giữ nguyên hành vi qua `DiscoverToolbar`.
- `viewMode` cục bộ của `/discover` bị xoá — không còn toggle Lưới/Bản đồ trong trang, chỉ còn
  chuyển trang qua nav hoặc nút trong toolbar.

## D-033 — Gỡ `calendar` + `dnd-kit` không còn nơi dùng; dọn arbitrary value theo thang Tailwind 4

### Bối cảnh

- Audit "tự dựng thay shadcn/package có sẵn" (2026-11-09) kết thúc với các mục còn lại:
  `calendar` (react-day-picker) + `dnd-kit` cài từ thời Trip (D-026/D-027) giờ không có nơi nào
  import; một số arbitrary value px lẻ (`max-w-[120px]`, `h-[90px]`, `z-[1000]`...) có thể map
  sang thang số động của Tailwind 4.

### Quyết định

- `bun remove @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-day-picker`; xoá
  `src/components/ui/calendar.tsx` (sinh bởi shadcn, không còn import nào). Cần lịch/ngày lại
  thì `bunx shadcn add calendar` + cài lại dependency — git history giữ tham chiếu.
- Arbitrary value px lẻ đổi sang thang số động của Tailwind 4 (spacing = 0.25rem): `max-w-[120px]`
  → `max-w-30`, `max-w-[260px]` → `max-w-65`, `min-w-[220px]` → `min-w-55`, `h-[90px]` → `h-22.5`,
  `h-[200px]` → `h-50`, `min-h-[420px]` → `min-h-105`, `z-[1000]` → `z-1000`. Mỗi class đã xác
  minh bằng cách build rồi grep đúng rule trong `dist/assets/*.css`.
- Inline `style={{ height }}` ở `SeedImage`/`place-card-skeleton` **giữ**: chiều cao là dữ liệu
  runtime (`post.imageHeight`), Tailwind không sinh class cho giá trị runtime.
- `profile-post-grid` đổi inline style skeleton sang mảng class `POST_SKELETON_HEIGHTS`
  (`h-65`/`h-80`/`h-95`).
- `room-join-dialog` đổi `grid-cols-[1fr_auto]` sang `flex` + `flex-1 min-w-0`.
- **Giữ lại** (không có token tương đương): `tracking-[0.18em]` (logo), `pb-[env(safe-area-inset-bottom)]`
  (safe-area iOS), `sm:max-w-[min(64rem,calc(100%-2rem))]` (dialog giữ lề 2rem trên màn hẹp),
  `max-h-[75vh]`/`max-h-[85dvh]`/`min-h-[60dvh]`/`h-[70dvh]` (viewport-based),
  `lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]` + `lg:max-h-[calc(100dvh-7rem)]` (layout sticky),
  `[&>*]:w-full`, `supports-[backdrop-filter]:…` (variant).
- `skin-provider` giữ tự đọc/ghi `localStorage` (không đổi sang `useLocalStorage`): cần đọc đồng bộ
  trước paint (`useLayoutEffect`) và lưu chuỗi thô để tương thích giá trị cũ — `useLocalStorage`
  JSON-stringify sẽ đổi format storage.

### Hệ quả

- `package.json` bớt 4 dependency; danh sách component trong `docs/CONVENTIONS.md` còn 30.
- Arbitrary value còn lại trong `src/` chỉ là viewport/calc/variant — grep được để kiểm.

## D-034 — Rà soát đợt 2: hằng số, tâm bản đồ, `cn`, tiêu đề nhóm, logic giá

### Bối cảnh

- Rà lại toàn bộ checklist `docs/CONVENTIONS.md` sau D-033, tìm các chỗ còn vi phạm ở mã cũ.

### Quyết định

- **Một nguồn cho toạ độ/zoom bản đồ**: `places-map.tsx` tự khai `DEFAULT_CENTER`/`DEFAULT_ZOOM`
  trong khi `DANANG_CENTER_TUPLE`/`DANANG_DEFAULT_ZOOM` (constants.ts) không ai dùng → map dùng
  hằng số chung, xoá bản cục bộ. Tâm mặc định dịch từ (16.0544, 108.2022) sang `DANANG_CENTER`
  (16.0612, 108.2272 — Cầu Rồng), cùng nguồn với fallback GPS.
- **Xoá hằng số chết**: `MAX_BILL_AMOUNT`, `MAX_BILL_PEOPLE` (chia hoá đơn thuộc Trip đã bỏ, 0 chỗ
  dùng).
- **Thêm hằng số còn thiếu**: `MAX_MEMBER_NAME_LENGTH` (30, dùng ở `room-join-dialog` +
  `room-page` thay số cứng), `MAX_PROFILE_NAME_LENGTH`/`MAX_PROFILE_BIO_LENGTH`/
  `MAX_PROFILE_LOCATION_LENGTH` (40/160/60, dùng trong zod schema `settings-page`).
- **`cn()` thay nối chuỗi**: 3 chỗ `className={`… ${x}`}` (places-map ×2, place-mini-map ×1) đổi
  sang `cn(...)` — tailwind-merge xử lý xung đột class đúng.
- **Tiêu đề nhóm**: `place-detail-page` ("Vị trí & Chỉ đường", "Giới thiệu") và `post-detail-page`
  ("Bình luận") đổi sang `SectionHeading` (bản post-detail truyền `icon` + `className` cho khung
  viền dưới).
- **Một nguồn cho chuỗi mức giá**: `"₫".repeat(n)` bị copy ở `room.ts`, `proposal-form`,
  `room-banner` → dùng `priceLevelLabel()` (`places/lib/price-level.ts`).

### Hệ quả

- Giữ nguyên có lý do: `place-card` dùng `<h3>` (giữ ngữ nghĩa heading cho tiêu đề thẻ; `CardTitle`
  của base-nova render `div`), `places-map` popup dùng `<h4>` (popup Leaflet không bọc `Card` —
  ngoại lệ đã ghi), `notification-page` dùng `<button>` trong `render={}` (pattern base-ui).
- `skin-provider` vẫn tự đọc/ghi localStorage (lý do ở D-033).

## D-035 — Rà soát đợt 3: sửa bug rời phòng, nút "Xoá bộ lọc" vô hiệu khi ở trong phòng, gỡ dep chết

### Bối cảnh

- Rà sâu theo hành vi (không chỉ grep class): đọc lại luồng phòng lọc nhóm, trạng thái rỗng của
  hai trang lọc, và đối chiếu `package.json` với `import` thật.

### Bug đã sửa

- **Rời phòng xoá nhầm người**: `leaveRoom(room)` lọc `members.filter(m => !m.isMe)` và
  `proposals.filter(p => p.memberId !== ME_MEMBER.id)` — tức luôn xoá **chủ phòng**. Tab B (thành
  viên tham gia, `isMe: false`) bấm "Rời phòng" sẽ đá tab A ra khỏi phòng và xoá đề xuất của A.
  Sửa: `leaveRoom(room, memberId)` xoá theo id; hook truyền `myMemberId` của tab.
  Kiểm chứng CDP (`room-leave-check.mjs`): trước khi B rời `2 members, 1 proposal`; sau khi B rời
  `1 member (creator still in: true), 0 proposal`, B `activeCode = ""`, 0 exception.
- **Nút "Xoá bộ lọc" vô hiệu khi đang trong phòng**: kết quả do `RoomFilter` quyết định nên
  `filters.resetAll` không đổi gì. Đổi thành nút "Mở phòng lọc nhóm" (link `/rooms/:code`) ở cả
  `/discover` và `/map`; `/map` thêm mô tả trạng thái rỗng nhận biết phòng (trước đó chỉ
  `/discover` có).
- **`priceMax` không kiểm tra kiểu**: `Number("abc")` → `NaN` khiến `priceLevel > NaN` luôn false
  (âm thầm bỏ lọc). Giờ chỉ nhận 1–3, giá trị lạ coi như không lọc.

### Dọn dẹp

- Gỡ `zustand` và `date-fns` — 0 `import` sau khi bỏ Trip/calendar.
- Xác nhận không còn file/component chết: mọi `src/components/ui/*.tsx` đều được import; mọi
  `key={index}` chỉ nằm ở skeleton/placeholder tĩnh; mọi `target="_blank"` có `rel`; mọi
  `<Button>` trong `<form>` có `type`; mọi `Link`/`Button` chỉ có icon đều có `aria-label`.

### Hệ quả

- Ghi BACKLOG các mục cần quyết định sản phẩm: thiếu `<h1>` ở hầu hết trang, điểm đánh giá địa
  điểm không tính lại sau khi gửi review, ô tìm kiếm topbar khi đang trong phòng, ngữ nghĩa
  nhiều từ khoá include (OR hiện tại).

## D-036 — Xử lý 6 mục BACKLOG đợt rà soát 3 theo chuẩn dự án

### Quyết định

- **Thiếu `<h1>`**: thêm `<h1 className="sr-only">` cho 10 trang (`/discover`, `/map`, `/social`,
  `/search`, `/saved`, `/notification`, `/settings`, `/rooms/:code`, `/not-found`,
  `/post/:id`). Chọn ẩn thị giác để không đổi thiết kế — tiêu đề hiện hữu đã có ở header trang.
- **Rating sau review**: server tính aggregate khi `upsertReview` — tạo mới
  `(rating*count + new)/(count+1)`, ghi đè `(rating*count - old + new)/count`, `reviewCount`
  tương ứng, làm tròn 1 chữ số. `use-upsert-review` invalidate `["places"]` (prefix) để cả thẻ
  discover cập nhật.
- **Ô tìm kiếm topbar khi trong phòng**: ẩn ô tìm kiếm trên các path chia sẻ bộ lọc phòng
  (`FILTER_SHARED_PATHS` = NAV_ITEMS có `sharesFilters`), thay bằng ghi chú "Đang lọc theo phòng —
  tìm kiếm cá nhân tạm tắt". Lý do: kết quả do phòng quyết định, gõ vào ô chỉ gây hiểu nhầm.
- **Nhiều từ khoá include = AND**: `some` → `every` trong `listPublishedPlaces`. Nhóm đề xuất
  nhiều từ khoá là ràng buộc đồng thời, không phải "một trong hai".
- **Trùng tên khi tham gia**: `joinRoom` báo lỗi thay vì coi là cùng người — toast "Tên này đã có
  người dùng trong phòng — chọn tên khác" (cả dialog `/discover` và trang `/rooms/:code`).
- **Race 2 tab join cùng lúc**: `memberIdFor(code, displayName)` sinh id cố định từ (phòng, tên)
  — tính trước khi ghi, không đọc lại state, nên 2 tab join gần như đồng thời vẫn tạo đúng 2
  thành viên.
- **Refactor `useRooms`**: `activeCode` + `myMemberId` chuyển từ `useState` + sessionStorage thủ
  công sang `useSessionStorage` của `@uidotdev/usehooks` (`useSyncExternalStore`) — mọi component
  gọi `useRooms()` trong cùng tab thấy cùng giá trị tức thì (trước đó TopBar có state riêng nên
  không ẩn được ô tìm kiếm).
- **JoinRoomStatus**: hook trả `"joined" | "not-found" | "duplicate"` — UI hiện toast đúng nguyên
  nhân; fix luôn bug cũ in `[object Object]` (toast nhận Room thay vì mã phòng).

### Bằng chứng

- `bun run typecheck` / `lint` / `build` / `prettier --check` — exit 0.
- CDP: `room-flow` (2 tab join + đề xuất), `room-leave-check` (memberId deterministic), `room-ux`
  (ẩn tìm kiếm + trùng tên bị chặn, thành viên vẫn 1), `review-rating-check` (2→3 review),
  `map-flow` (giữ filter khi đổi tab), `mobile-360-check` (không tràn 360px) — 0 exception.

## D-037 — Hoàn thiện frontend, chuẩn bị backend

### Lớp API & cấu hình

- **`src/lib/env.ts`** — đọc `import.meta.env` một chỗ, validate bằng zod. Component/hook không
  gọi env trực tiếp. `VITE_API_BASE_URL` mặc định `/api` (đi qua proxy dev, không vướng CORS).
- **Mock chỉ tồn tại ở dev**: `axios.ts` dùng `import.meta.env.DEV && env.enableMocks` + dynamic
  import nên Vite loại hẳn `src/mocks/` khỏi bundle production (đã kiểm: `dist/assets` không còn
  chunk `server-*`). `VITE_ENABLE_MOCKS=false` tắt mock cả ở dev khi backend chạy local.
- **`ApiError`** — interceptor chuẩn hoá lỗi (`status`, `code`, `message` tiếng Việt); lỗi mạng
  `status = 0`. UI không phải biết axios. Timeout 10s.
- **`vite.config.ts`** — `server.proxy` `/api` → `VITE_PROXY_TARGET`; `build.sourcemap: "hidden"`
  (map sinh để upload dịch vụ lỗi, không tham chiếu trong bundle).

### Bundle & route

- **Code-split theo route** (`React.lazy` + `Suspense` fallback `PageLoading` trong `AppShell`).
  Bundle chính giảm từ 1.244 kB (384 kB gzip) → 456 kB (147 kB gzip); Leaflet tách chunk riêng.
- **Bỏ trang tạm `/design`** + `design-showcase-page.tsx` + mục menu "Xem trước giao diện".
- **Favicon thật** (chữ Đ, màu primary) thay favicon template; xoá `public/icons.svg` không dùng.

### A11y

- **Skip-link** "Bỏ qua tới nội dung" (hiện khi focus) + `<main id="main" tabIndex={-1}>`.
- **Focus về `<main>` khi đổi route** — điều hướng bàn phím/screen reader không mất vị trí.
- **Tiêu đề tab theo trang** — bảng `PAGE_TITLES` một nguồn trong `app-shell.tsx`.

### Chất lượng

- **ESLint type-aware** (`recommendedTypeChecked` + `projectService`). Sửa 18 lỗi thật: floating
  promise (`navigate`, `requestLocation`), `no-misused-promises` ở `onSubmit`, `any` từ base-ui
  (`RatingStars`, `Tabs`), `String(object)` ở mock query, `parseBody` generic tường minh.
- **Vitest + Testing Library** (jsdom): 34 test — `lib/format`, `rooms/lib/room` (join/duplicate/
  apply/dismiss/leave), bất biến `NAV_ITEMS`/`FILTER_SHARED_PATHS`, component `RatingStars`.
- **CI** `.github/workflows/ci.yml`: typecheck → lint → format:check → test → build.
- **Pre-commit** husky + lint-staged (prettier + eslint trên file staged).
- **README thật**, `.editorconfig`, `.nvmrc`.

### Dependency thêm (đã cân nhắc)

`vitest`, `jsdom`, `@testing-library/{react,user-event,jest-dom}`, `husky`, `lint-staged` — đều
dev-only, license MIT, không vào bundle. Lý do: BACKLOG "ưu tiên cao" (chưa có test runner/CI/hook);
không có lưới an toàn thì bước nối backend rất rủi ro.

### Bằng chứng

- `typecheck` / `lint` / `format:check` / `test` (29 pass) / `build` — exit 0.
- CDP smoke: `room-flow` (2 tab, join, đề xuất, áp dụng, tab A thấy kết quả), `map-flow` (giữ
  filter discover ↔ map), `review-rating-check` (2 → 3 review) — 0 exception.
