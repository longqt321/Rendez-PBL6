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
  handling, trong khi nút xoá đã giải quyết nhu cầu chính. Ghi vào `BACKLOG.md`.
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

**(f) `CONVENTIONS.md` là nguồn quy ước duy nhất.** Bảng thay thế "đang tự viết → dùng gì",
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
Bài học ghi ở `LESSONS.md` L-008 (đừng tự tạo file khi tool treo) và L-009 (tool "treo" có
thể là đang chờ prompt — kiểm tra stdin trước khi kết luận).

### Bối cảnh

Gói "Lên kế hoạch chuyến đi" cần chọn **khoảng ngày** (ngày đến → ngày đi) và chọn **một ngày**
cho từng chặng. Trước đây dự án không có component chọn ngày; phương án cũ trong
`design/ke-hoach-thiet-ke.md` là `<Input type="date">` native.

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
- Docs thiết kế `design/ke-hoach-thiet-ke.md` giữ làm tài liệu tham khảo, đánh dấu đã bỏ.

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

- `package.json` bớt 4 dependency; danh sách component trong `CONVENTIONS.md` còn 30.
- Arbitrary value còn lại trong `src/` chỉ là viewport/calc/variant — grep được để kiểm.

## D-034 — Rà soát đợt 2: hằng số, tâm bản đồ, `cn`, tiêu đề nhóm, logic giá

### Bối cảnh

- Rà lại toàn bộ checklist `CONVENTIONS.md` sau D-033, tìm các chỗ còn vi phạm ở mã cũ.

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

## D-038 — Sửa lỗi trạng thái lỗi/đang tải phát hiện khi kiểm bản production

Kiểm bản build thật (`vite preview`, mock tắt, API trả 502) cho thấy lớp lỗi **"trạng thái lỗi bị
xử lý như trạng thái rỗng"** — chỉ lộ ra khi API không trả dữ liệu, tức đúng lúc nối backend.

### Lỗi và cách sửa

- **`/settings` kẹt spinner vĩnh viễn**: điều kiện `if (isPending || !me)` gộp cả trường hợp lỗi
  (`isPending = false`, `me = undefined`) → không bao giờ thoát spinner, không có thông báo. Tách
  nhánh `isPending` và `isError || !me` (Empty + nút "Thử lại" gọi `refetch`).
- **Lỗi mạng bị báo thành 404** (`place-detail`, `collection-detail`, `post-detail`): `isError ||
!place` dùng chung một thông điệp "không tìm thấy / đã bị xoá" → người dùng tưởng dữ liệu mất.
  Thêm [`isNotFoundError`](file:///home/longtran/Projects/frontend/src/lib/axios.ts) (ApiError 404)
  để phân biệt: 404 → "không tìm thấy" (không có nút thử lại); lỗi khác → "không tải được" +
  "Thử lại".
- **Lỗi bị hiển thị thành rỗng** (`/saved`, `/search`, lưới bài đăng ở trang cá nhân): API lỗi thì
  hiện "Chưa lưu bài nào" / "Không có kết quả" — sai và không có đường thoát. Thêm nhánh `isError`
  - nút thử lại (`ProfilePostGrid` nhận thêm `isError`/`onRetry`).
- **Thiếu `<h1>` ở nhánh lỗi/đang tải**: `settings`, `profile`, `place-detail`, `collection-detail`,
  `post-detail`, `room-page` (không tìm thấy phòng). Mọi trạng thái giờ đều có `<h1>` (ẩn thị giác).

### Bằng chứng

- `bun run test` 35 test pass (thêm test `isNotFoundError`); typecheck/lint/format/build exit 0.
- CDP trên `vite preview` (mock tắt, 502): 13/13 route có `<h1>`, không route nào kẹt spinner;
  `/discover/p-01` và `/collections/c-01` hiện "Không tải được … Kiểm tra kết nối rồi thử lại" +
  nút "Thử lại"; 0 exception. Trước khi sửa: 6 route trắng trang/thiếu h1, `/settings` kẹt spinner.

## D-039 — Rà "chắp vá": tách khối trạng thái lỗi thành `ErrorState` dùng chung

Định nghĩa "chắp vá" của người dùng: tự code HTML/CSS thay vì dùng component/package đã cài; tự
viết logic TS thuần thay vì gọi package. Rà toàn bộ code mới viết ở D-037/D-038.

### Phát hiện và sửa

- **Khối `Empty + "Kiểm tra kết nối rồi thử lại." + nút "Thử lại"` bị copy ở 13 vị trí** — vi phạm
  "một nghiệp vụ một chỗ". Tách thành
  [`ErrorState`](file:///home/longtran/Projects/frontend/src/components/shared/error-state.tsx)
  (`src/components/shared/`, dựng trên `Empty` + `Button` của shadcn — không tự viết HTML/CSS).
  Thay ở: discover, map, social, notification, profile, saved (×2), search (×2),
  `ProfilePostGrid`, settings, place-detail, collection-detail, post-detail. Thông điệp 404 riêng
  của từng trang giữ nguyên qua props `title`/`description`/`icon`; `post-detail` dùng `children`
  cho nút "Về trang Cộng đồng". Thêm 4 test cho component.
- **Không phát hiện chắp vá khác**: `useDebouncedValue`, `useInfiniteScroll`,
  `GeolocationWatcher`, `useSessionStorage` đều uỷ thác `@uidotdev/usehooks`; `env.ts` dùng zod;
  `axios.ts` dùng axios interceptor; `ErrorState`/`PageLoading`/skip-link đều dựng trên component
  shadcn có sẵn. Không cần cài package mới (react-helmet-async không cần — `useDocumentTitle` 10
  dòng, không có component tương ứng trong shadcn).

### Bằng chứng

- `bun run typecheck`/`lint`/`format:check`/`build` exit 0; `bun run test` 39 test pass (6 file).
- `grep "Thử lại"` chỉ còn trong `error-state.tsx`, `route-error-page.tsx` (ErrorBoundary riêng)
  và thông điệp bình luận khác ngữ cảnh.

## D-040 — Tách DEV/PROD và thay mock bịa bằng cold-start thật

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng

### Bối cảnh

Trước đây `/discover` chạy trên 30 địa điểm bịa tay trong `src/mocks/fixtures/places.ts`; mock server
luôn bật ở dev và không có cơ chế "chưa đăng nhập". Đã có bộ cold-start THẬT
(`data/cold-start/places.json`, 1.701 địa điểm) nhưng chưa nối vào frontend.

### Quyết định

1. **DEV = mock + tự đăng nhập; PROD = backend thật.** `env.enableMocks` chỉ bật khi
   `import.meta.env.DEV` và `VITE_ENABLE_MOCKS !== "false"`; `env.devBypassAuth` bật mặc định ở dev,
   tắt bằng `VITE_DEV_BYPASS_AUTH=false` để mock trả 401 cho `GET /me`. Banner "Dữ liệu minh hoạ"
   chỉ hiện khi `env.enableMocks`.
2. **Cold-start thay mock bịa.** `src/mocks/fixtures/cold-start-places.ts` map 1.701 bản ghi dataset
   sang `MockPlace`; `MOCK_PLACES` re-export từ đó. Trường dataset không có để trung tính
   (`rating=0`, `reviewCount=0`, `tags=[]`, `priceLevel=1`) — không bịa số liệu.
3. **Ảnh thật.** Thêm `imageUrl` vào `Place`/`PlaceSummary`; `SeedImage` nhận `src` và chỉ fallback
   picsum khi thiếu. Script `scripts/copy-cold-start-images.mjs` chép ảnh sang
   `public/data/cold-start/images` ở `predev`/`prebuild`; bản sao nằm trong `.gitignore`.
4. **Map 36 loại hình dataset → 6 nhóm frontend** trong adapter; loại lạ rơi về `restaurant`.

### Lý do

- Mock chỉ nạp qua dynamic import ở dev nên bundle production không chứa dataset (đã kiểm: tên quán
  không xuất hiện trong `dist/assets`).
- Ảnh nằm ở `public/` để prod hiển thị được khi chưa có backend; không commit bản sao 44MB.
- Adapter nằm trong `src/mocks/` vì là nghiệp vụ phía server — xoá cùng mock khi backend xong.

### Bằng chứng

- `bun run typecheck`/`lint`/`format:check`/`test` (42 test)/`build` đều pass.
- UI check CDP: `/discover` hiện 9 quán thật với ảnh `/data/cold-start/images/venues/...`;
  chi tiết `banh-xeo-ba-duong` dùng ảnh quán thật; `VITE_ENABLE_MOCKS=false` → 0 quán, không banner.

## D-041 — Kịch bản lỗi của mock qua biến môi trường `VITE_MOCK_SCENARIO`

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng

### Bối cảnh

D-011 ghi rõ "Chưa kiểm hành vi lỗi mạng thật": adapter mock chỉ trả 200 (và 404 khi sai route).
UI có ErrorState, retry, trạng thái 401 nhưng không có cách nào làm server trả lỗi để xem thực tế.
Cần chèn lỗi mà không sửa code, không thêm dependency.

### Quyết định

1. **Chọn kịch bản bằng biến môi trường, không phải query param hay UI toggle.** `VITE_MOCK_SCENARIO`
   nhận `ok | slow | empty | server-error | unauthorized | offline`, validate bằng zod trong
   `src/lib/env.ts` (`env.mockScenario`, mặc định `ok`). Sai giá trị → app fail fast lúc khởi động
   như các biến env khác.
2. **Phạm vi áp dụng:** `slow`, `empty`, `server-error`, `unauthorized` chỉ áp dụng cho **GET** —
   mutation (POST/PATCH/DELETE) vẫn hoạt động để luồng đăng bài/đánh giá/bộ sưu tập test được.
   `offline` áp dụng cho **mọi method** (AxiosError network, status 0, không response).
3. **Đọc một lần lúc khởi tạo module** (`src/mocks/scenarios.ts` → `resolveScenario(env.mockScenario)`
   trong `server.ts`). Đổi kịch bản cần restart dev server. Đơn giản và đủ dùng: kịch bản lỗi là
   việc đặt trước khi thử UI, không cần đổi nóng; tránh đọc env mỗi request.
4. `empty` trả `{ items: [], next: null }` ngay cho các route danh sách (`/places`, `/posts`,
   `/notifications`, `/users`, `/users/:handle/posts`, `/users/:handle/collections`, `/collections`,
   `/places/:id/reviews`, `/places/:id/posts`) — bỏ qua handler, không đụng "database" trong bộ nhớ.
5. Giá trị lạ rơi về `ok` thay vì crash — sai cấu hình mock không được làm gãy dev server.

### Phương án đã xem

| Phương án                                 | Kết quả                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Query param `?__scenario=` trên URL       | Loại — phải đụng tay vào mọi lời gọi api; dễ lộ vào production                       |
| Nút bật/tắt lỗi trong UI (dev-only panel) | Loại — tạo UI mới chỉ để test, vi phạm "không overengineering"                       |
| Chèn lỗi qua hàm debug gọi từ console     | Loại — không tái lập được khi reload trang; khó chia sẻ cho người khác               |
| Biến môi trường (đã chọn)                 | Đặt trước khi chạy, không đổi code, không vào bundle production (mock chỉ nạp ở dev) |

### Hệ quả

- Đổi kịch bản cần **restart dev server** (ghi chú trong `.env.example` và comment trong code).
- `slow` cộng thêm 3000 ms vào delay hiện có (320 ms) — vẫn giữ cơ chế cancel signal của `wait()`,
  nên huỷ request khi đổi bộ lọc nhanh vẫn hoạt động.
- `unauthorized` trả 401 cho `GET /me` — kết hợp `VITE_DEV_BYPASS_AUTH=false` không cần thiết nữa,
  nhưng vẫn giữ hai cơ chế độc lập (bypass auth là cấu hình, scenario là kịch bản lỗi).

### Bằng chứng

- `bun run typecheck` / `lint` / `test` / `format` đều pass (xem báo cáo tác vụ).
- `src/mocks/scenarios.test.ts`: 7 test cho `resolveScenario` (6 giá trị + giá trị lạ → `ok`).

## D-042 — Thêm E2E Playwright chạy được trên mock lẫn backend

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng

### Bối cảnh

Đã có kiểm thử thủ công bằng script CDP ngoài repo (D-040) nhưng không chạy lại được tự động
khi sửa code. Cần hồi quy tự động chạy được trên mock (dev) lẫn backend thật khi backend xong.

### Quyết định

1. Cài `@playwright/test` làm devDependency; test đặt trong `e2e/`, cấu hình ở `playwright.config.ts`
   (`testDir: "./e2e"`, baseURL từ `E2E_BASE_URL`, mặc định `http://localhost:5199`).
2. Project `mock` mặc định (mock bật ở dev). Project backend **chưa tạo** vì backend chưa có,
   nhưng cấu hình đọc env nên thêm project sau chỉ cần env mới — không sửa cấu hình.
3. `webServer` tự chạy `bun run dev --port 5199 --strictPort`, `reuseExistingServer: true`.
4. `vitest` chỉ pick `src/**/*.test.*` nên `e2e/` không bị nhầm; ESLint thêm block cho `e2e/`.

### Phương án đã xem

- Script CDP ngoài repo: không chạy được trong CI, không có assertion/retry.
- Cypress: nặng hơn, thêm runner riêng trong khi Playwright đủ dùng.

### Kích thước / License

~1 devDependency (`@playwright/test`, MIT) + browser binary Chromium (~170 MB, tải 1 lần).

### Bằng chứng

- `bun run e2e`: 4 spec pass trên mock (xem báo cáo kèm lệnh).

## D-043 — Hoàn thiện 3 luồng bị treo: PATCH /me, địa điểm đã lưu, nút Nhắn tin

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng

### Bối cảnh

Ba mục trong BACKLOG tồn tại từ 2026-11-07: `/settings` chỉ hiện toast minh hoạ (không có
`PATCH /me`), tab "Địa điểm" ở `/saved` luôn rỗng (không có endpoint lưu địa điểm), nút "Nhắn tin"
bấm không có tác dụng.

### Quyết định

1. **`PATCH /me`**: thêm `privateProfile: boolean` vào `UserProfile` (trước đây form đặt cứng
   `false`); body chỉ nhận 4 trường (`name`, `bio`, `location`, `privateProfile`) — validate dùng
   chung `lib/constants` với form. Mock giữ hồ sơ hiện tại trong `db.me` (bản sao riêng, không đụng
   fixture). `useUpdateMe` ghi thẳng cache `["me"]` từ response.
2. **"Đã lưu địa điểm" = nằm trong bộ sưu tập của tôi**: thêm `GET /places/saved` (gộp các
   `placeIds` từ bộ sưu tập của người dùng, loại trùng, chỉ trả địa điểm công khai) thay vì tạo
   trạng thái "lưu" riêng cho địa điểm. Tab "Địa điểm" ở `/saved` dùng nó; mutation
   `useSetCollectionPlace` invalidate `["places", "saved"]`.
3. **Nút "Nhắn tin"**: `disabled` + `Tooltip` "sẽ mở khi backend hoàn thiện" — nút bấm không tác
   dụng là lừa người dùng; bật lại khi có hợp đồng chat.

### Lý do

- "Lưu địa điểm" tái dùng bộ sưu tập (nghiệp vụ đã có) thay vì thêm nguồn sự thật thứ hai cho
  trạng thái lưu — đúng "một nghiệp vụ một chỗ".
- `privateProfile` thuộc hợp đồng hồ sơ (server quyết định ai xem được), không phải state client.

### Bằng chứng

- `bun run typecheck`/`lint`/`test` (65 test)/`format:check` exit 0.
- `bun run e2e`: 8/8 pass, gồm 2 test mới (`settings.spec.ts` — lưu + validate) và
  `saved-places.spec.ts` (tab Địa điểm có ≥1 card).

## D-044 — Đăng xuất: phiên mock + trạng thái chưa đăng nhập

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng

### Bối cảnh

Mục "Đăng xuất" trong menu avatar chỉ là UI, bấm không có tác dụng. Mock server luôn trả
`db.me` cho `GET /me` nên không có cách nào thấy giao diện ở trạng thái chưa đăng nhập ngoài
việc restart dev server với `VITE_DEV_BYPASS_AUTH=false`.

### Quyết định

1. Mock giữ cờ phiên `db.authenticated` (khởi tạo bằng `env.devBypassAuth`). `GET /me` và
   `PATCH /me` trả 401 khi phiên tắt.
2. Thêm `DELETE /session` (đăng xuất) và `POST /session` (đăng nhập lại, **chỉ ở dev** — mock
   không có form đăng nhập thật). Cả hai là hợp đồng giả lập; khi backend thật sẵn sàng, backend
   quyết định endpoint và luồng đăng nhập.
3. `useLogout` gọi API rồi `queryClient.clear()` — mọi query active refetch, `GET /me` 401 nên
   UI về trạng thái khách; điều hướng về `/`. `useLogin` ghi cache `["me"]` từ response.
4. Menu avatar: khi có `me` hiện tên/handle/lối tắt như cũ; khi không có hiện mục "Đăng nhập"
   (chỉ render ở dev, `env.enableMocks`). Avatar dùng `me.initials` thay cho "MA" cứng.
5. `query-provider`: 401 không retry (giống 404) — phiên không tự khôi phục.

### Lý do

- Trạng thái chưa đăng nhập phải quan sát được khi test độc lập với backend; đăng xuất là cách
  tự nhiên nhất, không cần restart server.
- Không thêm màn hình đăng nhập giả: ngoài phạm vi, và `POST /session` chỉ để test vòng
  đăng xuất → đăng nhập mà không mất dữ liệu mock trong bộ nhớ.

### Bằng chứng

- `bun run typecheck`/`lint` exit 0; `bun run test` 67/67 pass (thêm `use-logout.test.ts` 2 test).
- `bun run e2e` 9/9 pass (thêm `logout.spec.ts`: đăng xuất → menu hiện "Đăng nhập" → đăng nhập lại).

## D-045 — Rà soát "chắp vá/hack" đợt đăng xuất + tab Địa điểm: 6 lỗi đã sửa

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng yêu cầu tự rà soát 2 commit gần nhất (`d06a45b`, `5514de4`) để tìm "chắp vá", "sửa tạm",
"hack". Rà bằng diff + script CDP hover thật, phát hiện 6 vấn đề.

### Các lỗi và cách sửa

1. **Tooltip trên nút `disabled` không bao giờ hiện** (CDP xác nhận `tooltip visible: false`) —
   nút disabled không phát pointer event. Sửa: `TooltipTrigger` bọc `span tabIndex={0}` quanh nút;
   thêm `e2e/profile.spec.ts` khoá hành vi.
2. **`e2e/logout.spec.ts` dùng `waitForTimeout(300)`** — sleep cứng để qua mặt animation. Sửa:
   chờ tín hiệu trạng thái thật (avatar đổi sang icon khách / chữ initials) thay cho sleep.
3. **`UserMenu` coi mọi trạng thái "không có `me`" là chưa đăng nhập** — đang loading hiện
   "Đăng nhập" nhấp nháy; lỗi 500/mạng cũng hiện "Đăng nhập" dù phiên còn. Sửa: phân biệt
   `isPending` (mục "Đang tải hồ sơ…"), 401 (`isUnauthorizedError` → "Đăng nhập"), lỗi khác
   (mục "Không tải được hồ sơ — thử lại").
4. **`GET /places/saved` bỏ qua `next`** — mock trả tất cả nên chạy được, backend thật phân trang
   sẽ cắt mất dữ liệu âm thầm. Sửa: mock phân trang bằng `paginate` (PLACES_PAGE_SIZE), client
   chuyển sang `useInfiniteQuery` + sentinel `useInfiniteScroll` (cùng cơ chế feed bài đăng).
5. **Key invalidate trùng literal** `["places","saved"]` — dùng lại `savedPlacesQueryKey` đã export.
6. **Comment test gợi ý lệ thuộc thứ tự test** — sửa thành mô tả đúng (test tự đăng nhập lại,
   độc lập thứ tự).

### Không sửa ngay (ghi BACKLOG)

- Mock chỉ chặn `/me` khi chưa đăng nhập; các endpoint cá nhân khác vẫn trả dữ liệu — cần UI
  "yêu cầu đăng nhập" dùng chung trước khi gate (làm nửa vời sẽ hiện lỗi chung chung).

### Bằng chứng

- `bun run typecheck`/`lint`/`test` (67/67) exit 0.
- `bun run e2e` 10/10 pass; chạy lặp `--repeat-each=2` (20 test) pass — xác nhận không còn flaky.
- CDP hover: `tooltip visible: true` sau khi sửa.

## D-046 — Tái sinh cold-start: chỉ giữ địa điểm đủ địa chỉ, bổ sung quán nổi tiếng

**Ngày:** 2026-11-09
**Trạng thái:** Đã áp dụng (2026-11-10)

**Bằng chứng:** `validate.mjs` exit 0 (492 địa điểm, 492/492 có ảnh, 194 ảnh distinct,
lặp tối đa 9); `bun run typecheck` + `bun run test` (67/67) + `bun run lint` + `bun run e2e`
(10/10) đều pass trên dataset mới.

**Kết quả cuối (2026-11-10):**

- Dataset: 1.701 → **492** địa điểm, 100% có địa chỉ số nhà + tên đường + toạ độ.
- Ảnh: 68 → **194** ảnh distinct (265 ảnh món Wikimedia Commons trong `images/dishes/`,
  35 ảnh venue); ảnh dùng chung cũ (`cafe.jpg`, `com-ga.jpg`…) đã xoá khỏi dataset.
- Phân bố: Hải Châu 127, Ngũ Hành Sơn 95, An Hải 95, Thanh Khê 49, Hòa Cường 40,
  Sơn Trà 33, Cẩm Lệ 18, Liên Chiểu 10, Hòa Khánh 10, Hòa Xuân 7, An Khê 7, Hải Vân 1.
- Quán nổi tiếng bổ sung: Trạm 247, iCoffee, Zone Six, 43 Factory, MIRKO, Wind Garden…
  (tier `curated-v2`, 52 mục).
- Định nghĩa trùng lặp đổi: cùng tên chỉ là trùng khi cách nhau < 120m (chi nhánh
  khác nhau giữ lại — ví dụ Highlands Coffee 3 CN).
- Giới hạn nguồn: Bà Nà (venue trong khu du lịch, không có số nhà) = 0; Hải Vân 1,
  Hòa Xuân 7 — nguồn web công khai chỉ trả về ít ứng viên đạt chuẩn (đã ghi BACKLOG).

**Chưa giải quyết:** 50 ứng viên nghiên cứu bị loại do geocode miss (có thể retry sau);
ảnh Commons là ảnh món đại diện theo nhóm, không phải ảnh quán thật.

## D-047 — Audit thị giác ảnh cold-start: blocklist URL + tên file hash

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Bối cảnh

Model chính không đọc trực tiếp được ảnh, nhưng subagent model `pro` đọc được — dùng nó
audit 378 ảnh (13 contact sheet, `montage` ImageMagick). Kết quả: **247 ảnh rác** trong
265 ảnh Commons ban đầu (biển hiệu neon, logo, bưu thiếp, tranh vẽ, panorama méo, ảnh
người/lịch sử, nguyên liệu sống, ảnh món sai nhóm).

### Vấn đề gốc phát hiện thêm

1. Tên file `dish-001.jpg…` đánh số tuần tự theo lượt chạy → số bị **dùng lại** giữa
   các lần chạy, danh sách audit/blocklist không ổn định.
2. Ảnh rác bị xoá nhưng URL vẫn nằm trong cache Commons → lần chạy sau **tải lại**.
3. Pool ảnh dùng chung giữa các nhóm (`allPool`) → gán pizza cho quán phở.

### Quyết định

1. **Tên file theo hash SHA-1 URL** (`dish-<12 ký tự hash>.jpg`) — định danh ổn định.
2. **Blocklist URL** (`.cache/image-blocklist.json`) — `clean-images.mjs` ghi URL nguồn
   của ảnh rác vào đây; `diversify-images.mjs` bỏ qua URL bị block khi chọn ảnh.
3. **Lọc tiêu đề Commons theo từ khoá nhóm** (`CATEGORY_KEYWORDS`) — query trả về ảnh
   lệch nhóm bị loại ngay từ metadata.
4. **Kiểm chất lượng bằng ImageMagick** — loại ảnh < 300px, tỉ lệ > 1.8, tương phản thấp.
5. **Pool chung chỉ dùng nhóm `khac`** (món Á/đĩa ăn) thay vì toàn bộ pool.
6. Quy trình audit: `montage` → contact sheet JPEG nhẹ (~150KB) → subagent `pro` đọc
   và phân loại JUNK/MISMATCH → `clean-images.mjs` → rebalance.

### Bằng chứng

6 vòng audit: **276 ảnh rác** bị loại (265 ảnh Commons ban đầu → còn ~144 ảnh dùng được),
blocklist **177 URL**. Lần cuối: 29 JUNK + 7 MISMATCH trên 170 ảnh.
Dataset cuối: 492 place, **0 thiếu ảnh**, 144 ảnh dish distinct + 22 venue, **lặp tối đa 6**
(đã sửa lỗi `useCount` reset mỗi lần chạy khiến ảnh lặp tới 11 lần).
`validate.mjs` exit 0, typecheck ✓, test 67/67 ✓, lint ✓, e2e 10/10 ✓.

**Chưa giải quyết:** ~10% ảnh còn lại có thể vẫn lệch nhẹ; ảnh venue một số quán đã bị
loại hết — UI dùng ảnh seed minh hoạ.

## D-048 — Công cụ duyệt thủ công cold-start data (review tool)

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Bối cảnh

Crawl tự động đã chạm trần: 405/492 địa điểm là POI OpenStreetMap (quán nhà dân, không mô
tả, không đánh giá), 470/492 dùng ảnh món đại diện, quán giới trẻ (Trạm 247, iCoffee,
Zone Six…) chỉ vào được nhờ nghiên cứu tay. Audit thị giác tự động loại được ảnh rác rõ
ràng nhưng ~10% còn lệch mà máy không phân biệt được.

### Phương án đã xem xét

| Phương án                          | Vì sao loại / chọn                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Report HTML tĩnh + tải JSON về tay | Lưu quyết định thủ công, dễ mất, chậm                                                                  |
| Route `/dev/review` trong app      | MSW chạy trong browser **không ghi được file** → phải thêm Vite middleware; trộn pipeline data vào app |
| **Tool độc lập (chọn)**            | Server Node nhỏ + 1 file HTML, không dependency, không đụng code app                                   |

### Quyết định

1. `scripts/cold-start/review-server.mjs` — HTTP server (port 5198), API `/api/places`,
   `/api/decisions` (POST/DELETE), serve ảnh từ `data/cold-start/images/` (chặn traversal).
2. `scripts/cold-start/review-ui.html` — 1 file HTML + JS thuần; duyệt bằng phím tắt
   `1`–`5`, `S`, `U`, `N`, `[`/`]`; autosave ngay mỗi quyết định.
3. `scripts/cold-start/apply-review.mjs` — overlay → blocklist ảnh rác, đóng quán
   `not-exists`, xuất danh sách `duplicate`/`wrong-address` để xử lý tay. Mặc định báo
   cáo, `--apply` mới ghi.
4. **Overlay tách khỏi dataset**: quyết định nằm ở `review-state.json`; `places.json`
   chỉ bị sửa khi chạy `apply-review --apply` (đóng quán), nên pipeline tái sinh vẫn chạy được.
5. Tiêu chí duyệt (người dùng chốt): **ảnh đúng quán · địa chỉ đúng · quán còn hoạt động**.
   Không chấm sao, không bắt buộc ảnh venue.

### Bằng chứng

- Server: `/api/places` trả 492 địa điểm; ảnh `200`; path traversal `404`.
- UI (Playwright): tải 492/492, ảnh load OK, phím `1` lưu + chuyển quán, `U` hoàn tác đúng
  quán, `S` bỏ qua, `N` focus ghi chú, lọc `curated-v2` → hàng đợi 52, không lỗi console.
- `apply-review --apply` trên dữ liệu giả: blocklist 177 → 178 URL, 1 quán `status: closed`,
  xuất 2 file danh sách; dữ liệu test đã khôi phục.
- Đánh giá UI bằng vision subagent: đạt cả 3 điểm (badge phân loại nổi bật, lưới nút đều,
  link tương phản tốt) sau khi sửa.

**Chưa làm (V2):** form thêm quán mới (dán link Google Maps), chọn ảnh thay thế từ gallery,
map nhúng, chấm chất lượng.

### Bối cảnh

Bộ 1.701 địa điểm có 3 vấn đề người dùng chỉ ra: (1) 929/939 quán cafe dùng chung một ảnh
`images/cafe.jpg` nên nhìn như "không có ảnh"; (2) **1.185/1.701 không có địa chỉ** (POI OSM
không có tag `addr:*`), nhiều quán chỉ hiện tới quận; (3) 319 quán tên generic "Cafe..." là quán
nhà dân, không nổi tiếng, trong khi quán giới trẻ (Trạm 247, iCoffee, Zone Six, 43 Factory) không
có trong data; (4) phân bố lệch: Hải Châu 447 vs Cẩm Lệ 31, Hòa Xuân 10.

### Quyết định (người dùng chốt)

1. **Bỏ hẳn** địa điểm không có địa chỉ số nhà + tên đường — "giữ lại chỉ gây loãng".
2. Chấp nhận dataset nhỏ hơn nhưng **phân bố đều giữa các quận**; quận ít thì tìm thêm.
3. Nguồn bổ sung: **tinyfish search** (ưu tiên TikTok/Facebook/Threads), query đơn giản 2–4 từ,
   không nhồi nhiều từ khoá; mỗi quán phải có địa chỉ nguyên văn trong snippet + `sourceUrl`.
4. Không có Google Places API key — geocode bằng Nominatim (miễn phí, 1 req/s).
5. Ảnh: đa dạng hoá bằng Openverse (CC0), giữ `imageKind: "dish"` — không bịa ảnh quán.

### Quy trình (script trong `scripts/cold-start/`)

- `enrich-osm.mjs` — lấy tag `addr:*`/`phone`/`opening_hours` từ OSM API (Overpass bị chặn).
  Kết quả: chỉ lấp thêm 13 địa chỉ → xác nhận OSM thật sự thiếu dữ liệu, việc lọc là đúng.
- `geocode-nominatim.mjs` — geocode ứng viên nghiên cứu, cache trong `.cache/nominatim.json`.
- `fix-districts.mjs` — sửa nhãn quận theo `display_name` Nominatim (agent gán theo cảm nhận).
- `rebuild.mjs` — lọc mục đạt chuẩn, gộp ứng viên, loại trùng tên/toạ độ, sinh `places.csv`.
- `diversify-images.mjs` — tải ảnh CC0 theo phân loại, gán vòng tròn (tối đa 8 lần/ảnh).
- `validate.mjs` — kiểm schema/địa chỉ/toạ độ/ảnh/trùng lặp, exit 1 nếu sai (dùng được trong CI).

## D-049 — Bỏ ảnh món + dữ liệu giả khỏi cold-start: chỉ giữ ảnh venue thật

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Bối cảnh

Người dùng duyệt tay toàn bộ 492 địa điểm qua review tool (D-048): **470 `wrong-image`,
21 `ok`, 1 `wrong-address`**. Ảnh món đại diện (Commons) sai quán, lặp giữa các quán,
không giúp định vị. Yêu cầu: ảnh phải là ảnh THẬT của quán (biển hiệu, tên quán);
cold-start tuyệt đối không có dữ liệu giả (bài đăng, tài khoản ảo).

### Quyết định

1. **Bỏ toàn bộ ảnh món** khỏi dataset: 470 quán → `image: null`, `imageKind: null`,
   `imageNote` ghi rõ "chưa có ảnh thật". 21 quán có ảnh venue được duyệt `ok` giữ nguyên;
   1 ảnh venue bị duyệt `wrong-image` (p-coffee) cũng bị bỏ — duyệt tay là chuẩn.
2. **Loại `che-sau-lien`** (duyệt `wrong-address`): 492 → 491 địa điểm.
3. **Xoá 191 file ảnh** không còn tham chiếu (ảnh món + ảnh venue mồ côi), đồng bộ
   `CREDITS.json`/`CREDITS.md`. `copy-cold-start-images.mjs` thêm bước xoá file stale
   ở `public/` (trước đó tích tụ 156MB ảnh cũ không dùng).
4. **UI không dùng ảnh minh hoạ thay thế**: xoá `SeedImage` (picsum theo seed) và
   `imageSeed` khỏi hợp đồng API; thay bằng `CoverImage` — có `src` thì hiện ảnh thật,
   không thì placeholder trung tính "Chưa có ảnh". Lý do: ảnh ngẫu nhiên không đúng quán
   khiến người dùng hiểu sai địa điểm.
5. **Bài đăng không có ảnh**: xoá `imageSeed` khỏi `Post`/`CreatePostInput`, bỏ khối ảnh
   khỏi `PostCard`/`PostPreview`/lưới profile, bỏ nút "Đổi ảnh" ở composer và check-in
   dialog (chưa có upload ảnh — không mô phỏng).
6. **Mock server khởi đầu sạch**: `MOCK_POSTS/COMMENTS/REVIEWS/COLLECTIONS/NOTIFICATIONS`
   = rỗng; `MOCK_USERS` chỉ còn tài khoản đăng nhập demo. Không seed bài đăng, đánh giá,
   bộ sưu tập, thông báo, tài khoản ảo nào.
7. Test/e2e tự tạo dữ liệu lúc chạy (đăng bài qua composer/UI, tạo bộ sưu tập qua dialog)
   thay vì dựa vào seed giả. Test profile "Nhắn tin" chuyển sang hồ sơ của chính mình vì
   không còn tài khoản mẫu nào khác để xem.

### Bằng chứng

- `strip-dish-images.mjs --apply --purge-files`: 491 địa điểm, 20 ảnh venue, 0 ảnh dish.
- `validate.mjs` exit 0; `typecheck` ✓; `lint` ✓; unit test 67/67 ✓; e2e 10/10 ✓.
- Ảnh chụp UI: placeholder "Chưa có ảnh" gọn gàng, trang rỗng có empty state.

### Chưa xác minh

- Giấy phép 20 ảnh venue (Foody/Google Maps) — vẫn cần xin phép trước khi phát hành.
- Ảnh venue chưa được người dùng xác nhận "có biển hiệu rõ tên quán" (chỉ được duyệt là
  "đúng quán").

## D-050 — Ảnh minh hoạ hệ thống cho địa điểm chưa có ảnh thật

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Bối cảnh

Sau D-049, 471/491 địa điểm không có ảnh. Người dùng yêu cầu: placeholder tự vẽ, có nét
riêng theo loại quán, không quá nổi bật so với ảnh thật, người dùng nhận ra ngay là ảnh
hệ thống, và **được lặp lại giữa các quán cùng loại — tuyệt đối không mỗi quán một ảnh**.

### Phương án đã xem xét

| Phương án                       | Vì sao chọn / loại                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| AI sinh ảnh raster              | Nặng, khó đổi màu theo theme, khó giữ phong cách khi thêm nhóm                                              |
| **SVG inline theo nhóm (chọn)** | Nhẹ, sắc nét mọi kích thước, tự theo theme sáng/tối qua `currentColor`/CSS var, bản quyền 100% tự kiểm soát |
| Icon thư viện phóng to          | Không có nét riêng                                                                                          |
| Ảnh stock CC0                   | Đã thử ở D-046/D-047 — không có ảnh quán Việt phù hợp                                                       |

### Quyết định

1. `src/components/shared/place-placeholder.tsx` — 6 hình SVG inline, mỗi nhóm một hình:
   cafe (tách cà phê + ghế + cây), restaurant (bát cơm + đũa), street-food (xe hàng rong
   - dù), bakery (kệ bánh + mái hiên), dessert (ly chè + thìa), bar (quầy + đèn treo).
2. Nét mảnh, `stroke = currentColor` (muted-foreground) opacity 0.5, nền `fill-muted` →
   tự đổi theo theme, trầm hơn ảnh thật.
3. `CoverImage` nhận thêm prop `placeholder?: PlaceCategory`; khi `src` thiếu → SVG +
   chip "Ảnh minh hoạ" góc dưới trái (nền `background/85`, text muted-foreground).
   Ảnh thật không bao giờ có chip này.
4. `placeImageAlt()` tách sang `place-image-alt.ts`: alt ghi rõ "Ảnh minh hoạ {nhóm} —
   chưa có ảnh thật của {tên quán}".
5. Không nhúng tên quán vào hình; mọi quán cùng nhóm dùng chung một hình. Áp dụng cho
   card discover, popup bản đồ, trang chi tiết, thẻ đề xuất thông báo. Ảnh bìa hồ sơ
   giữ khung trung tính (không minh hoạ). Bài đăng không minh hoạ thay.

### Bằng chứng

- `/discover`: 9 card = 5 ảnh thật + 4 SVG minh hoạ, 4 chip "Ảnh minh hoạ", 0 lỗi.
- Theme sáng: nền `oklch(0.944…)` / nét `oklch(0.495…)`; theme tối: nền `oklch(0.312…)` /
  nét `oklch(0.718…)` — placeholder tự thích ứng, độ mờ 0.5 như thiết kế.
- Quán có ảnh thật (nơi cà phê) không có chip; quán minh hoạ có chip + alt đúng.
- `typecheck` ✓, `lint` ✓, unit 67/67 ✓, e2e 10/10 ✓.

### Chưa xác minh

- Hình minh hoạ chưa được người dùng xem và góp ý thẩm mỹ — cần duyệt bằng mắt.

### Sửa đổi (2026-11-14)

Người dùng phản hồi: bộ ảnh minh hoạ AI sinh theo nhóm trông giống ảnh thật và badge
"Ảnh minh hoạ" gây nhiễu (326/346 place không có ảnh thật nên gần như mọi card đều là
minh hoạ). Quyết định mới (thay mục 1–5 ở trên):

1. `PlacePlaceholder` chuyển sang **placeholder tối giản**: nền gradient token theme
   (`from-muted to-secondary/70`), chữ cái đầu tên quán cỡ lớn + tên quán, không tải
   file ảnh nào.
2. **Bỏ hẳn nhánh ảnh minh hoạ AI** trong `CoverImage` (kể cả badge "Ảnh minh hoạ") và
   xoá `lib/category-image.ts` — dataset `categories/` không còn được FE dùng.
3. `placeImageAlt()` đổi thành "Chưa có ảnh của {tên quán}" (placeholder đã hiện tên
   ngay trên khung).

Chi tiết triển khai: commit `40f62ea`.

## D-051 — Rà soát "chắp vá/hack" D-049 + D-050: 9 vấn đề đã sửa

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Phát hiện & sửa

1. Chip "Ảnh minh hoạ" tự viết `<span>` + Tailwind → dùng `Badge variant="outline"` có sẵn.
2. Alt giả bằng `<span className="sr-only">` → `PlacePlaceholder` nhận `label`, đặt
   `role="img"` + `aria-label`.
3. `collection-card.tsx` hai khối placeholder trùng copy-paste → gộp một khối.
4. SVG minh hoạ `preserveAspectRatio="slice"` cắt hình ở khung rộng → đổi `meet`, bỏ `rect`
   nền (khung cha đã `bg-muted`).
5. Tab "Bài đăng" của trang quán giữ thumbnail 120px rỗng cho bài không có ảnh → bỏ hẳn
   `ItemMedia` thumbnail.
6. `update-docs.mjs` vẫn sinh mục "Ảnh món" đã bị loại → bỏ, sinh lại CREDITS.md từ dataset.
7. Nguồn từng ảnh venue đo theo đuôi file (bịa) → thêm trường `imageCredit` vào dataset,
   điền chính xác từ bảng CREDITS.md cũ (20/20 ánh xạ đủ), sinh CREDITS.md từ trường đó.
8. `Post.imageHeight` không còn chỗ dùng → xoá khỏi type/schema/server.
9. `AUTHORS`/`AUTHOR_LIST` rỗng không ai dùng + fallback `?? Restaurant` chết → xoá.
10. `CREDITS.json` rỗng `[]` vô nghĩa → xoá file, CREDITS.md là nguồn duy nhất.

### Bằng chứng

- DOM: chip dùng `badgeVariants` (`group/badge`, radius 26px), `[role="img"]` + aria-label
  đúng, `.sr-only` = 0, SVG `meet` + 0 `rect`, tab Bài đăng không còn ô "Chưa có ảnh".
- `typecheck` ✓, `lint` ✓, unit 67/67 ✓, e2e 10/10 ✓, `validate.mjs` exit 0.
- Chạy lại `update-docs.mjs`: CREDITS.md 20 ảnh venue, nguồn chính xác (Foody.vn/Google Maps).

## D-052 — Bản đồ nạp pin theo khung nhìn (bbox) + cache theo vùng

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Bối cảnh

Bản đồ chỉ hiển thị 9 pin, luôn ép về vùng Hải Châu. Nguyên nhân (đã xác nhận bằng code):

- `map-page.tsx` dùng `useDiscoverView()` → `useDiscoverPlaces()` (infinite query lưới),
  bản đồ không có trigger infinite scroll ⇒ chỉ có trang đầu `PLACES_PAGE_SIZE = 9`
  (`src/mocks/server.ts`).
- Dataset sắp theo thứ tự dồn Hải Châu ⇒ `fitBounds` của `MapBoundsUpdater` (chạy lại mỗi
  lần mảng `places` đổi) luôn fit vào đúng 9 pin đó ⇒ zoom/kéo sang Liên Chiểu không nạp pin.
- `GET /places` không hỗ trợ lọc theo bbox/viewport.

### Phương án đã xem xét

| Phương án                                                                                         | Kết luận                                                         |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Tăng page size / fetch hết dataset                                                                | Loại — không theo viewport, tốn payload, vẫn "hardcode" số lượng |
| Tự viết cache Map trong component                                                                 | Loại — trùng lặp TanStack Query đã cài                           |
| **Endpoint `GET /places/map?bbox=` + `useMapPlaces` (TanStack Query, khoá = bbox làm tròn lưới)** | **Chọn**                                                         |

### Quyết định chi tiết

1. Mock server thêm `GET /places/map` (đặt trước `/places/:id`), nhận `bbox=minLng,minLat,maxLng,maxLat`,
   trả `{ items, total }`, không phân trang, chặn trên 300 pin (`MAP_MAX_PLACES`), cùng bộ lọc với `/places`.
2. `get-map-places.ts` — API client mới, pattern copy từ `get-places.ts`.
3. `use-map-places.ts` — `useQuery` với khoá cache = bbox **làm tròn lưới 0,01° (~1,1 km) + nới 20% mỗi phía**
   (`snapBounds`), `staleTime` 5 phút, `gcTime` 10 phút, `keepPreviousData`. Kéo nhẹ hoặc quay lại
   vùng cũ không gọi lại API (có test chứng minh). Guard khung suy biến (min==max sau làm tròn) nở tối thiểu 1 ô lưới.
4. `places-map.tsx` — thêm `ViewportReporter` (`moveend`/`zoomend` debounce 300ms bằng `setTimeout`
   thuần — điều phối sự kiện Leaflet, không phải logic nghiệp vụ) báo `map.getBounds()`;
   `MapBoundsUpdater` chỉ fit lại khi `fitKey` đổi (category/district/query/room/toạ độ user),
   không phụ thuộc mảng `places` ⇒ hết vòng lặp fit → fetch → fit.
5. `map-page.tsx` dùng `useMapPlaces(view.serverFilters, bounds)`; `useDiscoverView` trả thêm
   `serverFilters` để 2 màn hình dùng chung một nguồn bộ lọc.
6. Nhãn đếm đổi thành "Đang hiển thị {n} địa điểm trong vùng xem".

### Bằng chứng

- `typecheck` ✓ (0 lỗi), `lint` ✓ (eslint . sạch), unit **72/72** ✓ (gồm 3 test `snapBounds`
  và 2 test cache đếm số lần gọi `getMapPlaces`: kéo nhẹ + quay lại ⇒ 1 lần; sang vùng khác ⇒ 2; quay lại ⇒ vẫn 2),
  e2e **12/12** ✓ (gồm 2 test mới `e2e/map.spec.ts`: >9 pin khi mở `/map`, pan sang vùng khác vẫn có pin).

### Chưa xác minh

- Chưa test trên dữ liệu backend thật (mock adapter chặn trước network).
- Chưa đo hành vi khi zoom rất nhỏ (nhiều pin, chặn 300) và hiệu năng render 300 marker.

## D-053 — Rà soát "chắp vá/hack" D-052: 8 điểm đã sửa

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Chắp vá (tự viết thay vì dùng package đã cài)

1. Debounce 300ms tự viết bằng `setTimeout` + `useRef` trong `ViewportReporter` →
   `@uidotdev/usehooks@2.4.1` đã cài có `useDebounce<T>(value, delay)`; chuyển debounce
   sang giá trị `bounds` ở `map-page.tsx`, `ViewportReporter` chỉ báo sự kiện Leaflet.
2. `getMapPlaces` copy nguyên khối dựng query params từ `getPlaces` → tách
   `placesQueryParams(filters)` trong `get-places.ts`, hai hàm cùng dùng (một nghiệp vụ
   một chỗ xử lý).

### Hack/trick (né xử lý, giấu lỗi)

3. `queryFn: getMapPlaces(filters, snapped!, signal)` — non-null assertion để né kiểm tra →
   dùng `skipToken` (API chính thức TanStack Query v5, xác minh được re-export từ
   `@tanstack/react-query`), bỏ `enabled`.
4. Server trả `total` nhưng client bỏ qua → chặn 300 pin bị giấu. Nhãn đếm nay hiện
   "Đang hiển thị 300/492 địa điểm — zoom sát hơn để xem hết" khi `total > items.length`.
5. Prop `isPlacesLoading` khai báo trong `MapBoundsUpdater` nhưng không dùng → xoá.
6. `eslint-disable react-hooks/exhaustive-deps` ở `MapBoundsUpdater` để né phụ thuộc
   `places`, kéo theo **fit-theo-kết-quả-lọc không bao giờ chạy** trên `/map` (lúc mount
   `places` rỗng nên return sớm, sau đó `fitKey` không đổi). Sửa: guard `fittedKeyRef`
   — mỗi `fitKey` căn đúng một lần khi đã có ≥2 điểm; phụ thuộc `places` hợp lệ, không
   vòng lặp, bỏ hẳn eslint-disable.
7. e2e "pan sang vùng khác nạp thêm pin" chỉ assert "vẫn còn pin" → pass kể cả khi không
   nạp gì. Sửa: assert nhãn đếm **đổi giá trị** sau khi pan (`not.toHaveText`).
8. Test cache dùng `getMapPlaces(...(args as []))` để né type → mock giữ signature gốc
   (`vi.fn(actual.getMapPlaces)` + `vi.mocked`), không còn cast.

### Bằng chứng

- `typecheck` ✓, `lint` ✓ (0 lỗi, không còn `eslint-disable` trong `places-map.tsx`),
  unit **72/72** ✓, e2e map **2/2** ✓ (test pan giờ chứng minh vùng mới được nạp).

### Chưa xác minh

- Chưa kiểm bằng mắt nhãn "x/y" trên khung nhìn rộng ở trình duyệt thật (chỉ có e2e).

## D-054 — Giảm request tile OpenStreetMap từ frontend

**Ngày:** 2026-11-10
**Trạng thái:** Đã áp dụng

### Bối cảnh

Frontend tải tile OSM ở 2 nơi: `PlacesMap` (`/map`) và `PlaceMiniMap` (trang chi tiết).
Trước đợt này **không có cơ chế riêng nào** — chỉ dựa vào HTTP cache của trình duyệt
(curl tile thật: `cache-control: max-age=311744, stale-while-revalidate=604800`, ~3,6 ngày).
Ba lỗ hổng: Leaflet mặc định tải tile **trong lúc kéo** (`updateWhenIdle: false` trên
desktop — `leaflet-src.js:11195`), mini-map mount ngay cả khi chưa cuộn tới, cấu hình
tile bị copy-paste ở 2 component.

### Quyết định

1. **Module dùng chung** `src/features/places/lib/map-tiles.ts` — `OSM_TILE_URL` +
   `OSM_TILE_LAYER_PROPS`, cả 2 component spread vào `<TileLayer {...OSM_TILE_LAYER_PROPS} />`
   (một nguồn duy nhất, hết duplicate attribution/URL).
2. `updateWhenIdle: true` — chỉ tải tile khi ngừng pan/zoom.
3. `keepBuffer: 3` (mặc định 2) — giữ thêm tile ngoài khung trong bộ nhớ; pan nhẹ qua lại
   dùng lại tile có sẵn. (Đã đọc `GridLayer._update`: `keepBuffer` chỉ dùng cho `_pruneTiles`
   — giữ tile, **không** tải thêm, nên tăng là an toàn về số request.)
4. `maxNativeZoom: 18` — trên z18 tile phóng từ z18, không tải tile z19. **Không** dùng
   `maxZoom` (đặt thấp hơn zoom bản đồ sẽ khiến Leaflet ẩn cả lớp tile → bản đồ trắng).
5. `detectRetina: false` ghi rõ (mặc định của Leaflet) để không ai bật vô ý — bật là x4 request.
6. `PlaceMiniMap` mount lười bằng `useIntersectionObserver` của `@uidotdev/usehooks`
   (`threshold: 0.1`, `rootMargin: "200px"`): chưa cuộn tới thì không dựng `MapContainer`,
   không tải tile. Cuộn ra ngoài thì unmount; cuộn lại lấy từ HTTP cache.

### Bằng chứng

- Đo request thật (Playwright, `page.on("request")` lọc `tile.openstreetmap.org`), kéo bản đồ
  12 bước liên tục: **0 request trong lúc kéo**, 7 tile sau khi thả chuột (trước đây tải liên tục).
- `e2e/mini-map.spec.ts` mới: viewport 420px, mở tab "Tổng quan", cuộn về đầu trang →
  `.leaflet-container` **chưa mount**; cuộn tới → mount.
- `typecheck` ✓, `lint` ✓, unit **72/72** ✓, e2e **13/13** ✓.

### Chưa xác minh

- Chưa đo tổng số tile/phiên trên thiết bị di động thật (Leaflet mặc định `updateWhenIdle`
  đã `true` trên mobile nên mức giảm ở đó nhỏ hơn desktop).
- Chưa xử lý policy production: OSM tile chuẩn cấm dùng nặng (curl không kèm UA trình duyệt
  bị trả `x-blocked: Access denied`). Vẫn cần đổi provider/self-host trước khi có traffic thật
  — đã ghi BACKLOG.

## D-055 — Tự quyết trong phiên tự hành 2026-11-11 (backend)

Người dùng đi ngủ 03:00–11:00, không trả lời được. Mọi điểm mơ hồ chọn phương án bảo thủ
nhất, đúng kế hoạch nhất; ghi ở đây kèm lý do.

1. **Session token lưu thô, không hash.** better-auth 1.7.19 tự sinh và quản token phiên;
   nó tra DB bằng chính token client gửi lên. Hash token sẽ phải viết lại toàn bộ luồng
   session của thư viện (không phải chỗ để tự chế). Bù lại: cookie `HttpOnly`, `SameSite=Lax`,
   `Secure` khi production, token 32 ký tự random, có hạn 7 ngày và bị xoá khi đăng xuất.
   Rủi ro còn lại: lộ DB → chiếm được phiên đang hiệu lực (không đăng nhập lại được).
2. **Handle: `^[a-z0-9_]{3,30}$`.** Kế hoạch không nêu quy tắc; chọn tập ký tự an toàn cho
   URL `/users/:handle`, không phân biệt hoa/thường, tránh ký tự phải encode.
3. **`POST /session` bắt buộc body `{email, password}`.** Mock dev cho phép gọi rỗng để
   "đăng nhập lại phiên mock" — đó là tiện ích mock, không phải hợp đồng API thật. Backend
   thật không có bypass. Hệ quả: `e2e/logout.spec.ts` bước "Đăng nhập" lại sẽ cần phiên
   hợp lệ — xử lý ở QA2 bằng storageState/flag dev tường minh, KHÔNG nới bảo mật API.
4. **`POST /register` trả 201 + Set-Cookie** (autoSignIn) — FE chưa có UI nên không ảnh
   hưởng hợp đồng hiện tại; trả kèm phiên để client đăng ký xong dùng được ngay.
5. **`followerCount`/`followingCount`/`followedByMe` = 0/false ở Phase 1** vì bảng `follows`
   thuộc T5.4. Đây là số thật của dữ liệu hiện có (chưa có quan hệ nào), không phải số bịa;
   T5.4 thay bằng COUNT.
6. **CORS mặc định rỗng** (dev dùng proxy Vite). Khi chạy e2e backend trực tiếp sẽ đặt
   `CORS_ORIGINS` + `BETTER_AUTH_URL` tương ứng.
7. **R2/email/deploy:** không có credentials và người dùng không trả lời → code theo biến
   môi trường, test bằng mock tối thiểu, ghi rõ "chưa xác minh" trong REPORT.
8. **Compose dev mặc định `NODE_ENV=development`.** Bản đầu đặt `production` kèm secret dev →
   `env.ts` từ chối khởi động (đúng thiết kế). Chọn: compose local dùng development, production
   PHẢI tự đặt `NODE_ENV=production` + secret riêng; không nới lỏng kiểm tra secret để "cho dễ".
9. **Seed gán `created_at` theo thứ tự dataset** (mỗi mục cách 1 giây, mục đầu mới nhất) để
   `GET /places` (keyset `created_at DESC`) trả đúng thứ tự mock — trang đầu có ảnh, e2e
   `discover.spec.ts` pass với backend thật. Không đổi thứ tự API để chiều dữ liệu seed.
10. **e2e backend dùng user mới mỗi lần chạy** (hậu tố thời điểm). Dữ liệu e2e tồn tại thật
    trong DB (khác mock trong bộ nhớ); user cố định sẽ khiến báo cáo trùng địa điểm + lý do
    làm spec fail oan. Giải pháp dài hạn (reset DB e2e) ghi BACKLOG.
11. **`logout.spec.ts` bị loại khỏi project backend** bằng `testIgnore`. Lý do: FE chưa có form
    đăng nhập email+password nên bước "đăng nhập lại" không thể chạy; API không được nới lỏng
    để phục vụ test. Ghi BACKLOG kèm điều kiện bỏ `testIgnore` (khi có UI đăng nhập).
12. **Runtime image dùng lại `node_modules` của builder.** Bun workspace đặt store ở
    `node_modules/.bun` và symlink của workspace con ở `backend/node_modules` (trỏ tương đối);
    stage production riêng không tái tạo được cấu trúc này. Đổi lại image lớn hơn — ghi BACKLOG.
13. **Ký tự NUL (`\u0000`) trong query/body trả 400** "Dữ liệu chứa ký tự không hợp lệ".
    Postgres không nhận NUL trong text (SQLSTATE 22021) — để nguyên sẽ 500. Mock không có
    dữ liệu control character nên không có hành vi đối chiếu; chọn 400 (lỗi đầu vào, an toàn,
    một chỗ xử lý ở `onError` cho mọi route) thay vì 500 hay strip âm thầm.
14. **`GET /places?category=<giá trị lạ>`: giá trị lạ bị bỏ qua; danh sách toàn giá trị lạ
    trả trang RỖNG** (không phải bỏ lọc). Khớp hành vi mock (lọc theo chuỗi, không khớp → rỗng);
    tránh 500 từ cast `::place_category`.
15. **Chuẩn hoá tìm kiếm 2 phía bằng `immutable_search_normalize()`** (migration 10): mock so
    khớp trên `normalizeText()` (bỏ dấu, lowercase, dấu câu → khoảng trắng) ở CẢ haystack và
    từ khoá; backend cũ chỉ chuẩn hoá haystack → `?q=bánh xèo` không khớp dù mock khớp. Chọn
    chuẩn hoá cả 2 phía bằng 1 hàm SQL IMMUTABLE để planner khớp GIN index `pg_trgm`; áp dụng
    cho `/places`, `/posts` (caption), `/users` (name/handle). Không đổi hợp đồng API.
16. **Đề xuất phòng lọc: `value` phải hợp lệ theo `field`** (`category` là loại hình đã biết,
    `priceMax` ∈ 1–3) → 400 nếu không. Trước đây giá trị rác lưu vào filter JSONB làm lần
    `GET /rooms/:code` kế tiếp 500 vĩnh viễn (phòng hỏng). `parseRoomFilter` cũng bỏ qua loại
    hình lạ thay vì ném để dữ liệu cũ không làm phòng chết.
17. **Xoá nhánh `instanceof ZodError` trong `onError`**: zod 4 `ZodError` không phải
    `instanceof Error` (xác minh bằng script) và Hono chỉ chuyển lỗi `Error` cho `onError`
    (hono/dist/compose.js:37) — nhánh đó là code chết, không bao giờ chạy. Mọi validate dùng
    `safeParse`/`defaultHook` nên không có đường ném ZodError; nếu có code mới ném thì phải
    bọc thành `ApiError` thay vì dựa vào nhánh này.
18. **Ràng buộc `price_level` ở DB thay vì clamp khi đọc** (migration 11): trước đây
    `toPlaceDto` làm `Math.min(3, Math.max(1, ...))` — dữ liệu sai vẫn ghi được và bị sửa
    lặng lẽ khi đọc (band-aid). CHECK ở DB là chốt cuối; API đọc giá trị thật.
19. **Like/save/follow dùng `createMany({ skipDuplicates: true })`**: findUnique-rồi-create
    để lại cửa sổ race — hai request song song làm request thứ hai ném P2002 → 500.
    Lệnh nguyên tử của Prisma giải quyết; thông báo chỉ gửi khi `count > 0` (lần đầu).
20. **`isUniqueViolation()` / `isAPIError()` thay duck-typing**: kiểm `"code" in error` /
    `"statusCode" in error` tự chế là chắp vá — dùng class/predicate chính thức của Prisma
    và better-auth (đã xác minh `isAPIError` chấp nhận cả hai bản APIError nội bộ).
21. **Seed đảm bảo bất biến "có ≥ 1 place chưa publish"**: dataset gốc chứa id mock
    (`ram-cuon-cai-di-hoa-6152681085`); corpus mở rộng từ OSM không chứa id đó. Chọn phần tử
    cuối dataset khi thiếu — xác định theo dữ liệu, không hardcode id mới.
22. **Xoá bộ sưu tập = xoá mềm**: mọi truy vấn đọc đều lọc `deleted_at`; `delete` cứng làm
    cột đó vô nghĩa và mất dữ liệu không khôi phục được.
23. **Quên mật khẩu: chưa có SMTP — token reset ghi vào log dev** (2026-11-11, G1). better-auth
    chỉ gọi `sendResetPassword` khi cấu hình; chọn log `url`+`token` ở dev/test (pino `warn`,
    nhãn "DEV ONLY") và ở production chỉ log sự kiện không kèm token. SMTP thật là việc phát
    sinh → BACKLOG; khi có SMTP chỉ thay hàm này, không đổi route/FE.
24. **Xoá tài khoản = xoá mềm + thu hồi phiên**: `DELETE /me` đặt `users.deleted_at` và xoá
    mọi session trong một transaction. Email/handle vẫn chiếm unique index nên KHÔNG đăng ký
    lại được cùng email — chấp nhận ở giai đoạn này (mở lại cần thêm logic "giải phóng
    email" phức tạp). Hồ sơ đã xoá không hiện nữa (`SELECT_PROFILE` lọc `deleted_at IS NULL`).
25. **Trùng handle khi đăng ký phải kiểm trước khi gọi better-auth**: better-auth chỉ kiểm
    email trùng; P2002 của `handle` bị nuốt thành 422 "Failed to create user" (đã đọc source
    `dist/api/routes/sign-up.mjs`). Kiểm `handle` trước khi signUpEmail + kiểm lại sau lỗi 422
    (bắt trường hợp đua) → 409 đúng thông điệp thay vì 400 chung chung.
26. **FE có trang `/login`, `/register`, `/forgot-password`, `/reset-password`** (G1): các trang
    này nằm ngoài `AppShell`; menu "Đăng nhập" của header giờ điều hướng tới `/login` thay vì
    hack "đăng nhập lại phiên mock" cũ. Mock thêm tài khoản dev `me@rendez.test` /
    `password123` để e2e chạy được cả hai project.
27. **Cache G2: ETag/`Cache-Control` cho dữ liệu công khai + TTL cache trong tiến trình cho gợi ý**
    (2026-11-11). `/places/:id` (public, 60s), `/places/map` (public, 30s), `/users/:handle`
    (private, 15s vì `followedByMe` phụ thuộc người xem); `/me` và `/notifications` là
    `no-store`. ETag tính từ body JSON (sha256) nên tự đổi khi dữ liệu đổi — không cần
    invalidate thủ công. `GET /places/suggestions` cache ứng viên đã publish 60s + single-flight
    (Map TTL tự viết, KHÔNG thêm `lru-cache`); `PATCH /posts/:id/place` publish place gọi
    `invalidateSuggestionCache()` ngay. Cache nằm trong tiến trình — nhiều instance vẫn đúng
    nhưng mỗi instance tự nạp; chuyển sang Redis khi scale ngang (BACKLOG).
28. **Feed "Đang theo dõi" + polling thông báo (G3)**: `GET /posts?filter=following` dùng
    `EXISTS (SELECT 1 FROM follows ...)` trên khoá chính `(follower_id, following_id)` — không
    cần index thêm, không N+1. Filter này (như `mine`/`saved`) cần đăng nhập → 401; tab chỉ
    hiện khi `useMe()` có dữ liệu. Thông báo dùng polling 60 giây (`refetchInterval`) ở cả
    danh sách lẫn badge thay vì SSE — SSE đã có cho phòng lọc nhóm nhưng thông báo cần chạy
    được sau proxy/restart mà không cần hạ tầng thêm; nâng lên SSE/WebSocket khi cần realtime
    thật (BACKLOG).
29. **TRUSTED_PROXIES + remoteAddress (G4)**: `Bun.serve` truyền `server.requestIP(req)` vào
    app qua Bindings (`remoteAddress`); `clientIp()` chỉ tin `X-Forwarded-For` khi địa chỉ
    socket nằm trong `TRUSTED_PROXIES` (IP hoặc CIDR IPv4). Không có `remoteAddress` (test gọi
    `app.request()` trực tiếp) thì dùng XFF — production luôn có socket nên client không thể
    giả mạo header để né rate limit.
30. **Deploy chỉ chuẩn bị, không chạy** (yêu cầu người dùng): `deploy/compose.prod.yml`
    (NODE_ENV=production, Postgres/API không lộ cổng, Caddy 80/443 + TLS, IP tĩnh
    172.30.0.2/3 cho TRUSTED_PROXIES), `deploy/Caddyfile`, `deploy/backup-db.sh`
    (pg_dump -Fc + gzip + retention 14 ngày, đã test trên dev DB), `deploy/.env.example`,
    `deploy/README.md`. Compose dùng `!override []` để xoá port mapping của dev — compose
    merge mặc định nối danh sách, không ghi đè.
31. **Seed chọn place chưa publish có TÊN DÙNG ĐƯỢC** (2026-11-11): bất biến cũ chỉ bảo đảm
    "tồn tại ≥ 1 place chưa publish" và lấy phần tử cuối dataset; corpus OSM kết thúc bằng
    `"N&M"` → chuẩn hoá còn `"n m"`, ranking không khớp được, job gợi ý trả 0 và 2 test fail.
    `pickUnpublishedIds()` giờ lọc theo `isSuggestableName()` (≥ 2 từ có chữ, ≥ 8 ký tự, không
    `& / |`) rồi lấy phần tử cuối — vẫn xác định theo dữ liệu, không hardcode id. Test chọn
    place chưa publish có tên DÀI NHẤT thay vì `orderBy id`. Bài học: `docs/LESSONS.md` L-019.
32. **Thứ tự seed + e2e chạy trên backend thật** (2026-11-11):

- **Seed sắp theo `seedRank`**: place CÓ ẢNH → curated còn lại → `osm`. Corpus OSM mở rộng
  đứng đầu dataset làm trang đầu `GET /places` toàn card không ảnh — lệch đặc tả mock
  (curated + ảnh đầu tiên) và làm spec `discover` fail. `created_at` vẫn gán theo thứ tự
  đã sắp nên keyset trả đúng thứ tự này; sort ổn định giữ nguyên thứ tự trong từng nhóm.
- **E2E dùng tài khoản theo project** (`frontend/e2e/credentials.ts`): mock dùng
  `me@rendez.test`/`password123`; backend đọc `e2e/.auth/backend-account.json` do
  `global-setup.ts` ghi ra (user mới mỗi lần chạy) — không hardcode mật khẩu backend.
- **`logout.spec` tự đăng nhập trước khi đăng xuất**: logout trên backend thật xoá session
  ở server; dùng chung storageState thì mọi spec chạy song song nhận 401. Đăng nhập trong
  chính context của spec tạo session riêng nên không ảnh hưởng spec khác.
- **`CORS_ORIGINS` mặc định của dev compose gồm cả `http://localhost:5199`** (cổng dev
  server E2E): FE gửi `redirectTo = window.location.origin + /reset-password`, thiếu origin
  này thì better-auth trả 403 và trang quên mật khẩu không hiện thông báo trung tính.
33. **Ảnh bài đăng: tối đa 4 ảnh, bảng `post_images`, validate prefix (G5b)** (2026-11-11):
    `Post.images: string[]` luôn là mảng (rỗng khi không có ảnh) — không dùng `null` để client
    khỏi phân biệt hai trạng thái. `POST /posts` nhận `images?: string[]` tối đa
    `MAX_POST_IMAGES` (4, hằng chung `@rendez/schema`), không trùng URL; ảnh được ghi cùng bài
    trong một transaction (`nested create` với `position` theo thứ tự gửi). Bảo mật: mỗi URL
    phải là `http(s)` tuyệt đối và khi R2 đã cấu hình phải nằm dưới
    `${R2_PUBLIC_BASE_URL}/posts/<userId>/` — so khớp origin + pathname đã chuẩn hoá (URL tự
    resolve `..`) thay vì `startsWith` chuỗi thô, tránh `posts/<uid>/../../places/…` lọt qua.
    R2 chưa cấu hình (hoặc thiếu `R2_PUBLIC_BASE_URL` — không xác thực được ảnh thuộc về ai)
    mà client gửi ảnh → `400 "Tính năng ảnh chưa được cấu hình"`; request không ảnh không bị
    ảnh hưởng. Đọc ảnh không N+1: subquery `json_agg(pi.url ORDER BY pi.position)` trong
    `selectPosts`. FE composer tải ảnh qua presigned (`POST /media` → PUT) lúc bấm "Đăng",
    503 → ẩn nút upload và giữ composer; mock trả `uploadUrl` host `mock-r2.test` để client
    bỏ qua PUT (mock không có storage thật). Chưa xác minh với bucket R2 thật.
34. **Sửa theo audit ảnh bài đăng (2026-11-11)**:

- **Mock leak**: bỏ nhánh `mock-r2.test` khỏi `upload-post-image.ts` (code thật không biết
  tên host mock); mock tự monkey-patch `fetch` trong `src/mocks/server.ts` (chỉ nạp khi
  `DEV && enableMocks`) chặn PUT tới storage giả → 200.
- **Presign ký `content-type`**: `presignPut` đưa `content-type` vào signed headers
  (`X-Amz-SignedHeaders: content-type;host`) khi có contentType — client không thể đổi kiểu
  file sau khi xin URL. Chưa xác minh với R2 thật (BACKLOG).
- **Rate limit theo user**: `rateLimit()` thêm tuỳ chọn `byUser` (khoá `scope:user:<userId>`,
  fallback IP khi thiếu) — `/media` 10/giờ/user, `POST /posts` 30/giờ/user (chống spam bài,
  người chung IP không chặn lẫn nhau).
- **Chặn double-submit**: composer dùng `submittingRef` vì upload ảnh chạy TRƯỚC `mutate`
  nên `isPending` chưa bật.
- **Validate URL chặt hơn**: mỗi URL ≤ 2048 ký tự; từ chối URL có userinfo (`user:pass@`),
  query (`?`) hay fragment (`#`) — URL công khai R2 không chứa các thành phần này; traversal
  `../` đã bị chặn từ trước nhờ so khớp pathname đã chuẩn hoá.
- **Hằng chung**: `IMAGE_CONTENT_TYPES` trong `@rendez/schema` dùng cho `extensionForContentType`,
  input `accept` của composer và validate của mock — một nguồn duy nhất.
- **Mock**: `POST /media` trả 201 (route có cờ `status`); thêm kịch bản
  `VITE_MOCK_SCENARIO=media-unavailable` (503) để thử UI khi R2 chưa cấu hình; thêm contract
  `/media` vào `api-contracts.ts`.
- **Object mồ côi** (đã PUT nhưng bài không lưu) cần job dọn — ghi BACKLOG, chưa làm.
35. **Bảo mật phòng lọc nhóm: guest token trong cookie HttpOnly, SSE trung tính** (2026-11-11):

Auditor phát hiện 3 lỗ hổng ở hợp đồng Phase 6 đầu tiên:

1. **IDOR mạo danh qua `memberId`.** `POST /rooms/:code/join` trả `memberId` của thành viên
   trùng tên; `memberId` là credential duy nhất (query `?memberId=`) nên ai biết mã phòng +
   tên (tên lộ công khai ở `GET /rooms/:code`) là mạo danh được.
2. **IDOR xoá thành viên.** `DELETE /rooms/:code/members/:memberId?actorId=` tin `actorId`
   client khai → gửi `actorId` của chủ phòng là xoá được bất kỳ ai.
3. **SSE sai per-viewer.** `publishRoom` broadcast DTO đã tính `isMe` theo người gây mutation
   → subscriber khác thấy "Bạn" sai chỗ.

Quyết định:

- **Guest token**: 32 byte ngẫu nhiên (base64url) sinh khi join/create; DB lưu
  HMAC-SHA256(token, `BETTER_AUTH_SECRET`) ở cột `room_members.token_hash`. Token gốc trả
  đúng một lần qua **cookie HttpOnly** `rendez_room_<code>` (`Path=/api/v1/rooms/<code>`,
  `SameSite=Lax`, `Max-Age=86400`, `Secure` khi production). Lý do cookie thay vì header +
  sessionStorage: XSS không đọc được token, và trình duyệt tự gửi nên FE không phải quản lý.
  Transport tách một chỗ ở `backend/src/lib/room-token.ts` để đổi sang header sau này.
- **Join trùng tên**: token cũ khớp thành viên → trả lại member đó (`joined:false`, idempotent
  thật); không khớp → `409`. Tên công khai không còn là credential. FE phân biệt: `200 +
  joined:false` = "already" (đã ở trong phòng, toast thành công), chỉ `409` mới là "duplicate".
- **Resolve actor**: `backend/src/lib/room-actor.ts` — session user trước (member có `userId`),
  sau đó cookie token; KHÔNG đọc `memberId`/`actorId` từ query/body. `isOwner` theo
  `room.ownerId`.
- **SSE**: chỉ phát `event: room-updated` + `{"version":n}`; client refetch `GET /rooms/:code`
  để server tính `isMe` theo đúng danh tính từng kết nối. Subscribe trước khi đọc version để
  không mất update.
- **TTL 24h**: cột `last_seen_at` cập nhật khi resolve actor; `findRoomByCode` dọn
  `token_hash` của thành viên quá hạn (token chết không mạo danh vĩnh viễn được).
- **Mã phòng**: base32 Crockford (`0-9A-HJKMNP-TV-Z`), sinh từ `crypto.randomInt` (CSPRNG),
  giữ retry 5 lần. Rate limit theo IP bằng bảng `rate_limits` sẵn có: GET 240/phút, join
  20/phút (429 + `Retry-After`).
- **Unique tên**: migration SQL thủ công
  `CREATE UNIQUE INDEX room_members_room_display_lower_key ON room_members (room_id, LOWER(display_name))`
  (Prisma không khai được expression index; không dùng citext). Join bắt P2002 → lookup lại
  trả member cũ.
- **Hệ quả FE**: bỏ hẳn `myMemberId` khỏi hook/UI; `isMe` do server tính. Demo nhiều người
  trên một máy phải dùng cửa sổ ẩn danh (mỗi profile một cookie), không hứa "nhiều tab = nhiều
  người". Axios bật `withCredentials: true` để cookie đi kèm cả khi `VITE_API_BASE_URL` khác
  origin.

36. **Apply đề xuất: CAS + quyền tác giả/chủ phòng** (2026-11-11):

- **CAS**: `updateMany({ where: { id, roomId, status: "open" }, data: { status: "applied",
  appliedBy, appliedAt } })` trong transaction; `count === 0` → `409` "Đề xuất đã được áp dụng
  hoặc đã bị bỏ". Hai request song song chỉ một thắng — không còn đọc status rồi update ở
  transaction khác (lost update).
- **Quyền**: tác giả đề xuất HOẶC chủ phòng được apply/dismiss (UI hiện cho mọi người bấm
  "Áp dụng", nhưng giới hạn này chặn người ngoài phá bộ lọc chung; thành viên vẫn đề xuất
  được bình thường). Dismiss dùng cùng quy tắc + cùng CAS.
- **`priceMax` giá trị lạ**: `describeProposal` hiện "—" thay vì tự quy về 3, thống nhất với
  `applyProposalToFilter` (giá trị lạ bị bỏ qua).
37. **Sửa theo audit 2b ảnh bài đăng (2026-11-11)**:

- **Updater thuần**: `setImages` trong composer chỉ nối mảng; `URL.createObjectURL`, id và
  `toast.error` được tạo NGOÀI updater — React StrictMode gọi updater hai lần, tạo blob URL
  trong đó sẽ rò rỉ và sinh id trùng.
- **Reset khoá submit**: `submittingRef` được nhả trong `finally` sau `await mutateAsync`
  (trước đó nhả ngay sau khi gọi `mutate`, nên request lỗi vẫn khoá nút vĩnh viễn).
- **Một nguồn validate**: tách `validatePostImageUrls` sang `@rendez/schema`; backend
  (`routes/posts.ts`) và mock (`mocks/server.ts`) cùng gọi — mock không còn lệch quy tắc với
  backend (trước đó mock chỉ kiểm prefix). Backend giữ thêm kiểm tra `env.r2Configured`.
- **Rate limit theo user**: `byUser` chỉ dùng khoá user khi `userId` khác rỗng, ngược lại
  fallback IP (tránh khoá `scope:user:` chung cho mọi request thiếu định danh).
- **`Retry-After` bị rơi**: `onError` của Hono dựng lại `Response` từ `HTTPException` nên
  header đặt qua `c.header()` trước khi `throw` bị mất (lỗi có sẵn, `infra.test.ts` cũng fail
  vì thế). Middleware rate limit giờ trả `c.json(..., 429, { "Retry-After": ... })` trực tiếp.
- **Test**: bổ sung assert thông điệp lỗi cụ thể + URL > 2048 (backend), test rate limit theo
  user (429 + `Retry-After`, hai user chung IP không chặn nhau), e2e assert `naturalWidth > 0`
  với PNG fulfill qua `page.route` (chưa phải storage thật).

---

## D-056 — Bắt buộc xác thực email trước khi đăng nhập

**Ngày:** 2026-11-12
**Trạng thái:** Đã áp dụng

### Bối cảnh

Cột `users.email_verified` có từ migration init nhưng luôn `false` — ai đăng ký cũng đăng nhập
được. Yêu cầu: "Nếu đã có SMTP rồi thì cho phép xác thực email khi đăng ký đi".

### Quyết định

- Bật `emailAndPassword.requireEmailVerification` + `emailVerification.sendOnSignUp` /
  `autoSignInAfterVerification` trong `backend/src/lib/auth.ts`; token hết hạn sau 1 giờ.
- Mail xác thực gửi bằng `lib/mailer.ts` (cùng pattern mail reset mật khẩu: đủ SMTP thì gửi
  thật, thiếu thì dev/test log link `DEV ONLY — link xác thực email`, production không log token).
- Link trong mail trỏ tới API (`BETTER_AUTH_URL/verify-email?token=…&callbackURL=…`) rồi redirect
  về FE `APP_ORIGIN/verify-email` — origin mới `APP_ORIGIN` (mặc định `http://localhost:5173`)
  được thêm vào `trustedOrigins` của better-auth vì callbackURL phải thuộc origin tin cậy.
- Hợp đồng `POST /register` đổi: trả `201 {requiresVerification: true}`, KHÔNG có Set-Cookie.
  Trùng email cũng trả response như đăng ký mới ("generic duplicate" của better-auth) — không lộ
  email tồn tại; test cũ "trùng email → 409" được thay bằng assert này.
- Đăng nhập chưa xác thực: better-auth trả 403 "Email not verified" → route `/session` map thành
  `403 {"message":"Email chưa được xác thực. Hãy mở link trong email xác thực …"}` (tách khỏi
  401 "Email hoặc mật khẩu không đúng").
- Migration MỚI `20261112010000_email_verified_backfill`: `UPDATE users SET email_verified = true`
  — user cũ không hề nhận được mail, để false là khoá toàn bộ ngoài.
- FE: trang đăng ký hiện "Kiểm tra email của bạn" + nút gửi lại (`POST
  /auth/send-verification-email`, callbackURL trỏ về `/verify-email`); trang `/verify-email` nhận
  redirect (thành công không tham số, lỗi kèm `?error=CODE`); trang đăng nhập hiện nút gửi lại
  khi lỗi chưa xác thực.
- Mock: tài khoản có cờ `verified`; `POST /auth/send-verification-email` được mock coi như
  "người dùng đã bấm link" (đánh dấu verified) để e2e mock đi được trọn luồng — mock không có
  hộp thư thật. Ghi chú ngay trong code.

### Phương án đã xem

- Gửi token tự chế + bảng verification riêng: bỏ — better-auth có sẵn JWT token + endpoint
  `/verify-email`, không cần thêm bảng.
- Cho FE tự truyền callbackURL tuỳ ý: bỏ — origin phải tin cậy; backend quyết định đích redirect.

### Hệ quả

- e2e project `backend`: `global-setup` đánh dấu `email_verified = true` cho tài khoản demo qua
  `docker exec` (không bấm được link trong mail từ e2e); spec luồng xác thực đầy đủ chỉ chạy
  project mock, luồng token thật được phủ ở backend test `test/auth.test.ts`.
- Người dùng đổi email chưa làm (chưa có tính năng đổi email) — mở lại khi làm.

## D-057: Ảnh responsive cold-start — sinh biến thể WebP lúc build, commit vào repo

**Bối cảnh:** cold transfer `/discover` 3,80 MB; ảnh 1200×900 JPEG trung vị ~271 KB, không
`srcset` (V6-04 / V2-05). Cần cắt dung lượng không đổi hạ tầng.

**Quyết định:** sinh **2 biến thể WebP (400w/800w)** cho mỗi ảnh cold-start bằng ImageMagick
(`frontend/scripts/generate-image-variants.sh`, chạy tay khi dataset đổi — không chạy trong
Docker build), output commit vào `data/cold-start/images/venues/`. `CoverImage` dựng `srcset`
qua `coldStartSrcSet()` (400w + 800w + ảnh gốc 1200w); `sizes` truyền theo ngữ cảnh (card
`(min-width: 768px) 33vw, 50vw`, hero `100vw`). Ảnh R2 (người dùng) không srcset — giữ `src` gốc.

**Chặn quên sinh lại:** `scripts/check-image-variants.mjs` chạy trong `pretest` — thiếu biến
thể fail kèm hướng dẫn.

**Phương án đã xem:** Cloudflare Image Resizing / Worker (trả phí, đổi hạ tầng — bỏ); resize lúc
upload R2 (cần job hậu kỳ, ghi BACKLOG cho ảnh user); chỉ convert PNG→WebP một kích thước
(không đạt mục tiêu < 1,5 MB — bỏ).

**Hệ quả:** repo tăng ~3,4 MB (58 file WebP: 400w 864 KB + 800w 2,58 MB); đo được transfer ảnh
`/discover` giảm 2,61 MB → 0,72 MB (DPR2). Ảnh mới thêm vào dataset phải chạy lại script sinh
biến thể, nếu không test chặn sẽ fail.

## D-058: `sort` là nguồn sự thật duy nhất cho sắp xếp; `nearby=1` thành alias chỉ-đọc

**Bối cảnh:** "Gần đây" cũ sắp xếp phía client chỉ trong 9 quán đã tải; xoá sort client làm
link `?nearby=1` mất sắp xếp.

**Quyết định:** `GET /places` nhận `sort=distance` (+ `lat/lng`) — server sắp trên toàn bộ kết
 quả. `isNearbyActive` là giá trị suy ra (`sort === "distance"`); link `?nearby=1` đọc vào map
 sang `sort=distance` rồi bị xoá khỏi URL (chuẩn hoá `replace`). Tắt "Gần đây" luôn về
 `newest` (không nhớ sort cũ). Cursor có tag `kind`; cursor hợp lệ nhưng `kind` ≠ `sort` →
 trang đầu (ngoại lệ có chủ đích với nguyên tắc "decode sai → 400" — decode ĐÚNG nhưng ngữ
 cảnh đổi, xem comment `lib/cursor.ts`).

**Hệ quả:** query key của `useDiscoverPlaces` phải chứa `sort`, `priceMax` cá nhân và toạ độ
làm tròn 4 chữ số (chống GPS jitter); thiếu một trong các trường này là card nhân đôi khi đổi
sort. Toạ độ được ghi lên URL khi `sort=distance` để link chia sẻ tái tạo đúng thứ tự.

---

## D-059 — Lấp khoảng trống cold-start bằng dữ liệu OSM thật (tags + giờ mở cửa) — 2026-11-13

**Bối cảnh:** cold-start — 0 rating, `tags = []`, card quán trơn trụi. Rà soát raw OSM
(`backend/data/raw/osm-L6/L7`, 3.223 element) thấy dữ liệu thật bị pipeline bỏ sót:
`cuisine` 676, `diet:vegetarian` 59, `outdoor_seating` 142, `takeaway` 70,
`internet_access` 318, `opening_hours` 438. `price_level` OSM **không có** (0/3.223) —
lọc giá không thể lấp mà không bịa (vi phạm D-049), giữ disabled.

**Quyết định:**
1. `build-corpus` sinh `tags` từ OSM theo bảng map cuisine→nhãn tiếng Việt (19 nhãn,
   cuisine lạ bỏ, tối đa 6 tag, dedup + sort) + 4 tag tiện ích (Chay/Ngồi ngoài trời/
   Mang đi/Wifi). Kết quả: **160/344 place có tags (46,5%)** — toàn bộ thuộc nhóm OSM;
   86 curated vẫn rỗng vì không có dữ liệu gốc (không bịa).
2. `opening_hours` (57% coverage) mở qua API: `Place.openingHours` optional (bỏ-null
   thay vì gửi null, khớp pattern schema), `selectPlaces()` + DTO + query riêng của
   daily-picks thêm cột.
3. FE: chip tag tối đa 3 + "+N" trên card; badge "Đang mở cửa/Đã đóng cửa" tính từ
   `isOpenNow()` (parse `24/7`, range ngày, qua nửa đêm, giờ Asia/Ho_Chi_Minh; lệch
   format → không hiện badge). 11 unit test mới.

**Hệ quả còn mở (BACKLOG):** trang 1 `/discover` (sort mặc định `newest`) chủ yếu là
curated — không có tags, nên cải thiện hiển thị chưa thấy ngay ở trang đầu. Cần sort
"Nổi bật" ưu tiên place giàu dữ liệu (có tags/ảnh/giờ mở cửa) hoặc gán tags curated
từ nguồn khác có thật.

**Bài học:** dữ liệu "thiếu" ở tầng app không có nghĩa là nguồn gốc thiếu — rà lại raw
trước khi kết luận phải bịa.

## D-060 — Chuẩn hoá địa giới 6 quận + vibes sinh từ OSM + `publishedAt` trải tất định — 2026-11-13

**Bối cảnh:** bộ lọc "Quận" trộn phường/xã với quận (13 nhãn: Hải Châu, Thanh Khê, An Hải,
Hòa Cường, Hòa Khánh, Hòa Xuân, An Khê, Hải Vân…), trong khi yêu cầu sản phẩm chốt CHỈ lọc
theo 6 quận trực thuộc: Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ
(2 huyện Hòa Vang + Hoàng Sa bị loại khỏi bộ lọc — gần như không có POI, chọn chỉ ra
kết quả rỗng; POI thuộc 2 huyện được gán về quận gần nhất). Thanh Khê tách nhãn riêng
(trước đó gộp Hải Châu) để khớp đúng 6 quận. Card cũng thiếu tín hiệu "vibe" và badge "Mới" vô nghĩa vì mọi
place seed cùng một `published_at`.

**Quyết định:**
1. `build-corpus` chỉ còn 7 centroid; `normalizeDistrict` map nhãn cũ về phân nhóm:
   An Hải→Sơn Trà, Hòa Cường→Hải Châu, Hòa Khánh→Liên Chiểu, Hải Vân→Liên Chiểu,
   Hòa Xuân→Cẩm Lệ; An Khê/Thanh Khê giữ nhãn "Thanh Khê".
   LƯU Ý TRUNG THỰC (audit N4): từ 01/7/2025 Đà Nẵng bãi bỏ cấp quận/huyện (còn
   phường/xã trực thuộc TP) — "7 quận" là PHÂN NHÓM XẤP XỈ theo quận cũ do yêu cầu
   sản phẩm chốt, KHÔNG phải đơn vị hành chính hiện hành; Thanh Khê cũ KHÔNG "sáp
   nhập vào Hải Châu" về hành chính, chỉ là gộp nhóm vì danh sách 7 không có nhãn
   riêng (khu vực Thanh Khê cũ thành 2 phường Thanh Khê + An Khê trực thuộc TP).
   District rỗng → centroid gần nhất trong 7 (bỏ ngưỡng 12km cũ), vẫn đánh dấu `districtApprox`.
   Centroid Hoàng Sa đặt ngoài biển (16.5/112.0) để không POI đất liền nào bị gán nhầm.
   Kết quả DB: 6 quận có dữ liệu (Hoàng Sa là quận đảo, không có POI OSM), 0 bản ghi rỗng.
2. `vibes` (≤3) sinh từ tín hiệu OSM thật (`internet_access`+cafe→"Làm việc",
   `outdoor_seating`→"Ngoài trời", `takeaway`→"Mang đi", bar/pub→"Nhậu nhẹt", karaoke/cinema/
   arcade→"Giải trí", `diet:vegetarian`→"Chay"). DB chưa có cột riêng → seed GỘP vào `tags`
   (dedup, tags trước vibes sau); khi có cột riêng thì tách (ghi ở runbook-corpus).
3. `published_at` trải tất định 0–89 ngày trước mốc seed theo `hash(id)` thay vì một mốc cố
   định. Lý do: dataset demo gom một lần, nếu cùng ngày thì badge "Mới" (≤14 ngày) hiện trên
   toàn bộ card — vô nghĩa. Trải theo hash giữ tất định khi seed lại và cho ~15% quán "Mới".
   KHÔNG dùng `created_at` vì cột đó gánh thứ tự keyset của API.
4. API mở thêm `Place.publishedAt: string | null` (ISO) để FE tự quyết badge; không gửi
   `createdAt` (thứ tự nội bộ).

**Hệ quả:** `frontend/src/features/places/lib/danang-districts.ts` phải khớp 7 quận (FE agent
xử lý cùng phiên). `places.json.bak`/`places.csv`/README tĩnh còn nhãn cũ — không ảnh hưởng
runtime, dọn khi có dịp.

## D-061 — Nền tảng search + rec: pgvector, e5-small self-host, RRF k=60, không dùng rating sao — 2026-11-13

**Bối cảnh:** cần hạ tầng đo lường tương tác (P0) và search ngữ nghĩa (P1) cho giai đoạn
demo/bảo vệ. Corpus 344 POI, dữ liệu text ngắn (tên + địa chỉ + tags) nên lexical
(`pg_trgm`) đã tốt với truy vấn đúng từ khoá nhưng hụt khi người dùng gõ câu mô tả
("quán yên tĩnh để làm việc"). Cần thêm một nhánh dense và cách trộn hai nhánh mà không
phải huấn luyện ranker.

**Quyết định:**
1. **Đổi image Postgres sang `pgvector/pgvector:0.8.7-pg17`** thay `postgres:17-alpine`:
   extension `vector` phải tồn tại TRƯỚC migration tạo `place_embeddings`; dùng image
   chính thức của pgvector giữ nguyên major 17 nên không phải migrate dữ liệu, không phải
   build extension trong Dockerfile.
2. **Embedding self-host `Xenova/multilingual-e5-small`** (384 chiều, lượng tử hoá q8,
   chạy trong process Bun qua transformers.js): đa ngữ (Việt + Anh lẫn trong tên quán),
   nhẹ (~120MB) chạy được trên máy dev/CI không cần GPU, không phụ thuộc API ngoài
   (không tốn phí, không lộ dữ liệu, không bị rate limit khi backfill 344 POI).
3. **Trộn hai nhánh bằng RRF với k = 60** thay vì cộng điểm có trọng số: RRF chỉ cần
   thứ hạng nên không phải chuẩn hoá thang điểm giữa `trgm` similarity và cosine — hai
   đại lượng không cùng đơn vị. k = 60 là hằng số chuẩn của Reciprocal Rank Fusion, làm
   dịu chênh lệch hạng giữa hai nhánh.
4. **Fallback lexical**: dense lỗi/không có vector/không có extension → quay về lexical
   hiện tại, không trả 500. Hybrid chỉ áp cho trang đầu có `?q=` (cursor keyset không
   mang được thứ tự RRF); trang sau vẫn lexical để không trùng/sót bản ghi.
5. **KHÔNG dùng rating sao làm tín hiệu recommendation.** Rating hiện có là dữ liệu seed
   (không phải người dùng thật đánh giá) và số review rất lệch; dùng nó làm trọng số rec
   sẽ "học" từ dữ liệu bịa và đẩy điểm quán có sao cao lên bất kể hành vi thật. Tín hiệu
   rec lấy từ `interaction_events` (click/view/save…) do FE phát, cộng thuộc tính địa điểm.

**Hệ quả:**
- `interaction_events` partition theo tháng, job `event-retention` tạo partition T+1 và
  xoá partition cũ hơn 180 ngày (event là tín hiệu rec, không phải dữ liệu pháp lý).
- `POST /api/v1/events` nhận batch ≤ 20, dedupe 5 phút ở tầng ứng dụng (bảng partition
  không thể có UNIQUE constraint chứa bucket thời gian), luôn trả 202 — telemetry không
  được làm hỏng trải nghiệm.
- FE: `frontend/src/lib/events.ts` (`emitPlaceClick`) gửi `place_click` fire-and-forget
  bằng `sendBeacon`/`fetch keepalive`; `anonId` (localStorage `rendez_anon_id`) +
  `sessionId` (sessionStorage `rendez_session_id`). Chỉ click, không impression.
- Chưa có số liệu đánh giá chất lượng hybrid so với lexical thuần — ghi ở BACKLOG.

**Ghi chú số hiệu:** yêu cầu ban đầu gọi quyết định này là "D-049", nhưng `D-049` đã tồn
tại trong file (Bỏ ảnh món + dữ liệu giả khỏi cold-start) nên ghi tiếp thành D-061.

## D-062 — Bộ test search đóng băng v1 + nhánh structured intent — 2026-11-13

1. **Đóng băng bộ eval**: 50 query, 7 nhóm ý định, nhãn suy từ thuộc tính DB
   (grade 2 = thoả toàn bộ ràng buộc, grade 1 = chỉ thoả category). Checksum
   sha256(queries+labels) bảo vệ — script từ chối chấm khi file bị sửa. Nhãn
   chốt tại thời điểm freeze nên venue mới thêm không đổi thang đo. Quy tắc:
   sửa bộ test = tạo v2, không sửa v1 (docs/EVAL-PROTOCOL.md).
2. **Thêm nhánh structured retrieval** vào RRF (nhánh thứ 3): `intent-lexicon.ts`
   trích tag/category/district từ câu query bằng từ vựng lấy từ chính dữ liệu
   (23 tag + 5 category), đưa vào RRF như một nhánh xếp theo số tag khớp.
   Không hard filter — nhận sai chỉ làm nhánh rỗng. Kết quả trên bộ đóng băng:
   P@5 0.604 → 0.736, nDCG@10 0.598 → 0.743, p95 143 → 94 ms.
3. **Không tune theo query**: lexicon chỉ chứa từ vựng dữ liệu + cách gọi phổ
   biến, không chứa câu query cụ thể của bộ eval. Rủi ro overfit ghi nhận ở
   protocol — cần v2 held-out khi tinh chỉnh nhiều vòng.

## D-063 — Trọng số RRF cho nhánh structured + thuộc tính `alwaysOpen` + lexicon bỏ từ đơn mơ hồ — 2026-11-13

1. **Weighted RRF**: nhánh structured nhân trọng số 2 trong `fuseRrf` — khớp đúng
   thuộc tính người dùng nêu nên đáng tin hơn lexical; cần thiết vì nhóm thuộc tính
   hiếm (hải sản 7 venue, bar 7 venue) bị danh sách lexical 50 dòng lấn át.
2. **`alwaysOpen`**: thêm vào `IntentAttributes` + lexicon ("24/7", "24h", "mở cả
   đêm", "ăn khuya"…). Trong `structuredCandidates`, `opening_hours = '24/7'` là
   điều kiện khớp nhánh — trước khi sửa, query "quán mở 24/7" không có nhánh nào
   ưu tiên venue thật sự mở cả ngày (P@5 nhóm always-open 0.067 → 1.0 sau fix).
3. **Lexicon khớp theo ranh giới từ** (`hasPhrase`) thay vì `includes` thô —
   "bar" không khớp trong "barbecue".
4. **Bỏ từ đơn mơ hồ**: `cua` (trùng "cửa"), `ghe` (trùng "ghế"), `mang` (trùng
   "mang đi"), `banh` (trùng "bánh canh"), `mon an` (quá chung). Thay bằng cụm
   ≥ 2 từ rõ nghĩa (`hai san`, `tom hum`, `cua ghe`, `mang internet`, `banh mi`).
   Bài toán homograph: khớp từ đơn mơ hồ từng gán nhầm tag Hải sản cho query
   "quán nào mở cửa cả đêm để ăn khuya".

**Số liệu v2 (149 query, đóng băng):** hybrid P@5 0.828 → 0.855, nDCG@10 0.833 →
0.858, MRR 0.914, p95 90 ms. v1 (50 query): 0.768, không regression.

## D-064 — Thiết kế lại bộ v2 (giữ tên v2): ràng buộc nhiều chiều, phân bố khó cân bằng — 2026-11-13

1. **Vấn đề**: bản v2 đầu (149 query) sinh ràng buộc từ chính thuộc tính DB → 37%
   query có ≥30 venue thoả đủ, 75% query đạt P@5 = 1.0. Điểm 0.855 không phản ánh
   chất lượng search mà phản ánh nhánh structured khớp thuộc tính (L-029).
2. **Redesign tại chỗ, không tạo v3** (theo yêu cầu): 112 query, 38 ý định, ràng buộc
   **nhiều chiều** (category + tag + district) → trung vị venue thoả đủ 15, 22% query
   ≥30 venue, 38% query ≤10 venue. Nguồn: `backend/scripts/design-eval-v2.ts`
   (literal biên soạn tay, không sinh tự động từ dữ liệu).
3. **Giữ nguyên cơ chế nhãn** (grade 2 = thoả toàn bộ ràng buộc, grade 1 = chỉ thoả
   category) để vẫn khách quan, tái lập được, và checksum vẫn bảo vệ được.
4. **Kết quả**: hybrid P@5 0.873, nDCG@10 0.861, R@10 0.851, MRR 0.906, p95 113 ms
   trên bộ khó hơn. Điểm yếu lộ ra rõ: `typo` 0.28, `friends-district` 0.4,
   `streetfood-district` 0.2, `english` 0.689.
5. **Quy tắc đọc số**: không so điểm tổng giữa hai bộ khác phân bố; so theo ý định
   hoặc theo cùng checksum.

## D-065 — Nguồn sự thật duy nhất cho dữ liệu vị trí (places) — 2026-11-14

### Vấn đề
Tồn tại 4 kho dữ liệu vị trí song song và chồng chéo:
- `frontend/data/cold-start/places.json.bak` (1.701, thô chưa lọc)
- `frontend/data/cold-start/places.json` (491, đã lọc cold-start)
- `backend/data/places-expanded.json` (344, corpus OSM qua build-corpus)
- DB `places` (347, bao gồm 3 bản ghi test/rác)

Review tool (D-048) chỉ duyệt `places.json`, chưa áp được vào DB → hai bộ quyết định khác nhau, không rõ cái nào là nguồn sự thật.

### Quyết định
1. **`backend/data/places-expanded.json` là nguồn sự thật duy nhất (source of truth)** cho dữ liệu vị trí. `places.json` và `places.json.bak` chuyển sang trạng thái archive (chỉ đọc, không dùng làm nguồn seed).
2. `seed.ts` ưu tiên đọc `places-expanded.json` (đã có) → DB luôn đồng bộ với file này.
3. DB phải khớp 100% với `places-expanded.json` (upsert theo `id`, không tạo trùng). Các bản ghi test/rác không được để lại trong DB.
4. Review tool bổ sung cờ `--data <file>` để duyệt dataset khác `places.json` (mặc định), và `--state <file>` để overlay quyết định riêng theo dataset. Khi dùng `--data`, overlay mặc định ghi vào `<file>.review-state.json` để không trộn phán quyết giữa hai bộ.
5. Quy trình duyệt: chạy tool → duyệt từng place → xuất báo cáo phán quyết → admin xem báo cáo → áp vào DB qua SQL (cập nhật `status`, `moderation_status`, `duplicate_of`...). Không tự động áp.

### Hành động đã thực hiện (2026-11-14)
- Backup toàn bộ vào `backup/locations/20261114/` (db_dump + 6 file JSON).
- Xoá 3 bản ghi test/rác khỏi DB (`og-unpublished-2a2iz7`, `og-unpublished-3crtpk`, `test-null-coords-vh5uzt`).
- DB giờ khớp chính xác 344/344 với `places-expanded.json`.
- `review-server.mjs` đã bổ sung `--data` / `--state` và chạy được với corpus 344 place (image serving 200, path traversal 404).

### Cách chạy review tool trên nguồn sự thật
```
cd frontend
node scripts/cold-start/review-server.mjs --data ../backend/data/places-expanded.json --port 5199
# mở http://localhost:5199, duyệt từng place (phím 1-5, S, U, N)
# quyết định lưu vào backend/data/places-expanded.json.review-state.json
```

## D-066 — Thay thế dữ liệu Cold-Start sang 358 địa điểm mới từ Web Search — 2026-11-15

### Bối cảnh
Người dùng yêu cầu thay thế bộ cold-start cũ (344 POI OSM) bằng danh sách 358 địa điểm thực tế được thu thập qua web search phân bổ khắp 6 quận Đà Nẵng (Hải Châu, Thanh Khê, Liên Chiểu, Ngũ Hành Sơn, Sơn Trà, Cẩm Lệ), loại bỏ Hòa Vang và đa dạng hóa các trải nghiệm giải trí của giới trẻ (Cà phê chill, bar pub, rạp chiếu phim, workshop, camping, ẩm thực...).

### Quyết định
1. **Làm giàu dữ liệu tự động**: Viết công cụ Golang `~/scripts/dn-places-enricher` để chuẩn hóa 358 địa điểm sang 26 trường theo schema Rendez (slug ID duy nhất, tọa độ geocoded theo centroid/địa chỉ quận, category map, tags, placeholder ảnh).
2. **Lưu trữ an toàn tập dữ liệu cũ**: Di chuyển dữ liệu 344 POI cũ vào `backend/data/archive/places-expanded-344-legacy.json`. File `frontend/data/cold-start/places.json` (491) được giữ nguyên làm mock fixture cho unit test frontend.
3. **Cập nhật nguồn sự thật**: Ghi đè 358 địa điểm đã làm giàu vào `backend/data/places-expanded.json`.
4. **Seed DB & Docker Migrator**: Cập nhật `seed.ts` hỗ trợ taxonomy danh mục mở rộng và dọn dẹp an toàn các FK mồ côi (`dailyPick`, `placeEmbedding`, `affinityCache`, `interactionEvent`). Gắn seed vào Docker migrator stage để tự động hóa khi khởi tạo container.
5. **Dọn dẹp file thừa**: Xóa các file `.bak` dư thừa, dọn thư mục rỗng `frontend/scratch/`, quy hoạch các bản dump SQL cũ vào thư mục `backup/db_dumps/`.

## D-067 — Thuật toán Search & Recommendation: nhánh name + composite cold-start — 2026-11-15

### Bối cảnh
Người dùng báo kết quả tìm kiếm tệ: gõ đúng tên quán mà quán không đứng đầu
("P Coffee" hạng 14), gõ "trinh ca phe" thì mất hẳn "Trình Cà Phê". Đánh giá lại
trên DB thật (358 place): `place_embeddings` = **0 hàng** (dense nhánh chết),
`reviews` = 7, `affinity_cache` = 2 → cả hai thuật toán đang chạy ở chế độ suy giảm.

### Quyết định — Search (4 nhánh RRF)
1. **Nhánh exact-name (weight 5)** và **prefix-name (weight 3)**: so trên
   `immutable_search_normalize(p.name)` — chỉ tên, không lẫn địa chỉ. Đây là bằng
   chứng trực tiếp người dùng gõ đúng tên quán.
2. **Field-boost lexical**: `GREATEST(similarity(name,q)×3, similarity(haystack,q))`
   — sửa lỗi "Trinh" trong địa chỉ đường đè "Trình" trong tên.
3. **Entity routing bằng dữ liệu**: nếu nhánh name khớp → tắt structured
   (`weight 0`). Không dùng heuristic từ vựng (đã thử và gây regression).
4. **Dense không còn là điều kiện bỏ hybrid**: dense rỗng chỉ mất 1 nhánh.

### Quyết định — Recommendation (cold-start)
5. Thay `ORDER BY review_count DESC, id ASC` (thực chất là alphabet khi mọi quán
   0 review) bằng **điểm composite**: Bayesian rating (0.45) + verified/tier (0.20)
   + độ đầy đủ hồ sơ (0.20) + độ mới (0.15).
6. **Nhiễu theo giờ** (md5(id+hour_bucket)): trong 1 giờ danh sách ổn định, giữa
   các giờ đổi → khám phá được mà không phá tính tất định.
7. **Cap đa dạng theo category** (tối đa 3 venue/category trong danh sách) cho cả
   cold-start lẫn nhánh affinity.
8. **KHÔNG dùng trường `quality`** trong dataset JSON: nó không được map vào DB
   (schema `Place` không có cột này) và là điểm đầy đủ dữ liệu, không phải chất
   lượng venue — dùng sẽ là bịa tín hiệu.

### Bằng chứng (eval v3, 127 query, đóng băng trên DB 358 place)
| Chỉ số (hybrid3) | Trước | Sau | Δ |
|---|---|---|---|
| P@5 | 0.360 | 0.384 | +0.024 |
| P@10 | 0.347 | 0.370 | +0.023 |
| R@10 | 0.302 | 0.331 | +0.029 |
| nDCG@10 | 0.298 | 0.339 | +0.041 |
| MRR | 0.312 | 0.358 | +0.046 |

Nhóm `entity` P@5: 0.383 → 0.437. MRR của "P Coffee", "Trình Cà Phê",
"trinh ca phe", "Acacia Café", "Bánh mì Bà Lan", "Bánh mì Ông Tý": **0.00–0.50 → 1.00**.
Không nhóm/variant nào bị giảm điểm.

### Việc còn lại (BACKLOG)
- Chạy `scripts/embed-places.ts` cho 358 place để dense nhánh hoạt động thật.
- Cân nhắc `tsvector`/`ts_rank_cd` thay trigram cho lexical (BM25-like: có TF-IDF,
  trigram không có) — đo lại trên eval v3 trước khi đổi.
