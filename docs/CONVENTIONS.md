# CONVENTIONS

Quy ước bắt buộc cho toàn bộ `src/`. Mọi thay đổi UI phải theo tài liệu này.
Lý do của từng quyết định nằm ở `docs/DECISIONS.md` (D-025 trở đi).

## 1. Không tự chế khi đã có component

Trước khi viết một khối `div` + class, kiểm tra `src/components/ui/` (31 file, sinh bằng
`bunx shadcn@4.23.0 add <name>`). Danh sách hiện có:

`alert` `alert-dialog` `avatar` `badge` `breadcrumb` `button` `calendar` `card`
`collapsible` `dialog` `drawer` `dropdown-menu` `empty` `field` `input`
`input-group` `item` `label` `popover` `radio-group` `scroll-area` `separator`
`skeleton` `sonner` `spinner` `switch` `tabs` `textarea` `toggle` `toggle-group`
`tooltip`

Thiếu component nào thì **cài**, không tự viết:

```bash
bunx shadcn@4.23.0 view <name>          # kiểm tra có trong registry base-nova
bunx shadcn@4.23.0 add <name> --yes
```

Sau khi `add`, **xoá dòng `"use client"`** ở đầu file (dự án đặt `rsc: false`).
Không sửa tay nội dung component sinh ra.

### Bảng thay thế

| Đang tự viết                                  | Dùng                                                  |
| --------------------------------------------- | ----------------------------------------------------- |
| `div` có `rounded-* border bg-card shadow-*`  | `Card` + `CardHeader`/`CardContent`/`CardFooter`      |
| Hàng có icon + tiêu đề + mô tả + nút bên phải | `Item` + `ItemMedia` + `ItemContent` + `ItemActions`  |
| Danh sách các hàng trên                       | `ItemGroup` (+ `ItemSeparator`)                       |
| `div` rỗng có icon + tiêu đề + mô tả          | `Empty` + `EmptyHeader` + `EmptyMedia` + `EmptyTitle` |
| Banner cảnh báo/lỗi                           | `Alert` + `AlertTitle` + `AlertDescription`           |
| `<button aria-pressed>`                       | `Toggle` (đơn) hoặc `ToggleGroup`/`ToggleGroupItem`   |
| `<label>` + `<input>`                         | `Field` + `FieldLabel` + `FieldError`                 |
| `<a><Button/></a>`                            | `<Button render={<Link to="…" />}>`                   |
| `title="…"` để giải thích nút                 | `Tooltip` + `TooltipTrigger`                          |
| `div` xám nhấp nháy khi tải                   | `Skeleton`                                            |
| `<Loader2 className="animate-spin">`          | `Spinner`                                             |
| `<hr>` / `div` có viền chia cách              | `Separator`                                           |
| `document.getElementById` / `querySelector`   | `useRef`                                              |
| `useState` + `setTimeout` để debounce         | `useDebouncedValue` (`@/hooks/use-debounced-value`)   |
| `addEventListener("scroll")` để tải thêm      | `useInfiniteScroll` (`@/hooks/use-infinite-scroll`)   |
| `navigator.geolocation` tự gọi                | `useUserLocation` (`@/hooks/use-user-location`)       |

## 2. Bo góc — chỉ 3 token ngữ nghĩa

Thang Tailwind (`rounded-sm/md/lg/xl/2xl/3xl/4xl`) dùng bình thường. Ngoài thang đó
**chỉ được** dùng 3 token khai ở `src/index.css`:

| Token             | px  | Dùng cho                                  |
| ----------------- | --- | ----------------------------------------- |
| `rounded-surface` | 4   | khối nội dung / panel phụ / khung ảnh lớn |
| `rounded-control` | 3.2 | chip, ô nhỏ trong một hàng, logo chữ      |
| `rounded-thumb`   | 2.4 | ảnh thu nhỏ trong danh sách               |

```diff
- className="rounded-[0.25rem] border border-border"
+ className="rounded-surface border border-border"
```

Không viết `rounded-[…]` với giá trị lẻ ở bất kỳ đâu trong `src/`.

## 3. Màu — chỉ token, không bảng màu thô

Cấm `amber-*`, `emerald-*`, `blue-*`, `red-*`, `green-*`, `slate-*`, `bg-white`,
`text-white`, `border-white`, `bg-black`. Dùng token ngữ nghĩa:

| Nhu cầu                  | Token                                             |
| ------------------------ | ------------------------------------------------- |
| Nhấn / hành động chính   | `text-primary` `bg-primary` `bg-primary/10`       |
| Nguy hiểm / lỗi          | `text-destructive` `bg-destructive/10`            |
| Nền phụ, chip trung tính | `bg-muted` `text-muted-foreground` `bg-secondary` |
| Viền                     | `border-border` `border-border/15`                |
| Điểm đánh giá (sao)      | `text-star` `fill-star`                           |
| Nền trên ảnh / kính mờ   | `bg-background/80 backdrop-blur`                  |

Màu mới phải thêm biến vào **cả 4 khối skin** trong `src/index.css`
(`:root`, `.dark`, `[data-skin="retro"]`, `[data-skin="retro"].dark`) rồi map qua
`@theme inline` (`--color-<tên>: var(--<tên>)`).

## 4. Cỡ chữ

Thang Tailwind: `text-xs` (12px) là **nhỏ nhất** được dùng. Không `text-[10px]`,
`text-[11px]`, `text-[0.7rem]`. Cần nhỏ hơn nữa thì giảm padding/khoảng cách, không
giảm cỡ chữ.

## 5. Số, ngày, khoảng cách — dùng `@/lib/format`

| Hàm                       | Kết quả                       |
| ------------------------- | ----------------------------- |
| `formatCount(n)`          | `999`, `1 N`, `1,5 N`, `2 Tr` |
| `formatNumber(n)`         | `1.234`                       |
| `formatRating(n)`         | `4,5`                         |
| `formatDate(iso)`         | `07/11/2026`                  |
| `formatRelativeTime(iso)` | `18 giờ trước`, `Hôm qua`     |
| `formatDistance(km)`      | `350 m`, `1,2 km`             |
| `formatCoordinate(n)`     | `16.0544` (dấu chấm, để copy) |

Cấm `toFixed`, `toLocaleString`, `toLocaleDateString`, `Intl.*` trong component.

## 6. Hằng số — dùng `@/lib/constants`

Giới hạn ký tự (`MAX_CAPTION_LENGTH`, `MAX_COLLECTION_NAME_LENGTH`,
`MAX_COLLECTION_DESCRIPTION_LENGTH`, `MAX_REVIEW_CONTENT_LENGTH`,
`PLACE_SUGGESTION_MIN_CHARS`), toạ độ và zoom mặc định
(`DANANG_CENTER`, `DANANG_CENTER_TUPLE`, `DANANG_DEFAULT_ZOOM`) đều khai ở đó.
Component và `src/mocks/server.ts` phải đọc cùng một nguồn.

Nghiệp vụ riêng của một feature đặt ở `src/features/<feature>/lib/`:

- `places/lib/category-meta.ts` — nhãn loại hình
- `places/lib/price-level.ts` — `priceLevelLabel()`, `priceLevelAriaLabel()`
- `places/lib/danang-districts.ts` — quận + `calculateDistanceKm`

## 7. Tiêu đề nhóm

`SectionHeading` (`@/components/shared/section-heading`) cho mọi tiêu đề nhóm nội dung.
Không copy lại chuỗi class `font-heading text-sm font-bold tracking-wide uppercase`.

## 8. Form

`react-hook-form` + `zod` + `@hookform/resolvers`. Component của base-ui **không nhận
`ref`/`onChange`** như input HTML — dùng `Controller`:

```tsx
<Controller
  control={form.control}
  name="field"
  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
/>
```

Không bao giờ spread `{...form.register("x")}` vào `Switch`, `RadioGroup`, `Toggle`.

## 9. Trợ năng

- Mọi nút chỉ có icon phải có `aria-label` tiếng Việt.
- `Spinner` đã có `role="status"`; **không** bọc thêm `role="status"` (đọc hai lần).
- `Spinner` hardcode `aria-label="Loading"` tiếng Anh (template shadcn, không sửa tay file
  `ui/`) → **mọi nơi dùng phải truyền `aria-label` tiếng Việt** mô tả đúng ngữ cảnh:
  `aria-label="Đang tải bình luận"`, `aria-label="Đang đăng bài"`, `aria-label="Đang lưu đánh giá"`.
  Prop truyền vào ghi đè nhãn mặc định vì `Spinner` spread `{...props}` sau nhãn gốc.
- `ItemGroup` đã có `role="list"`; **không** thêm `role="list"` lần nữa.
- Icon trang trí: `aria-hidden="true"`.
- Vùng cuộn có `tabIndex={0}` và `aria-label`.

## 10. Cổng kiểm tra trước khi báo xong

```bash
bunx tsc -p tsconfig.app.json --noEmit
bunx eslint <các file đã sửa>
bunx prettier --check <các file đã sửa>
```

Sau đó các lệnh grep sau phải **không còn kết quả** trong phần mã của feature:

```bash
grep -rn "rounded-\[" src/features src/components/layout
grep -rn "text-\[10px\]\|text-\[11px\]" src/features src/components/layout
grep -rn "toFixed\|toLocaleString\|toLocaleDateString" src/features src/components/layout
grep -rn "amber-\|emerald-\|blue-[0-9]\|bg-white\|text-white\|border-white" src/features src/components/layout
grep -rn "document.getElementById\|document.querySelector" src/features
```
