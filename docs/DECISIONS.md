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
