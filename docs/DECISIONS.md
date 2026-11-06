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
