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
