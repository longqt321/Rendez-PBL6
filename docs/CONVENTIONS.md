# CONVENTIONS

Quy ước bắt buộc cho toàn bộ `src/`. Mọi thay đổi UI phải theo tài liệu này.
Lý do của từng quyết định nằm ở `DECISIONS.md` (D-025 trở đi).

## 1. Không tự chế khi đã có component

Trước khi viết một khối `div` + class, kiểm tra `src/components/ui/` (38 file, sinh bằng
`bunx shadcn@4.23.0 add <name>`). Danh sách hiện có:

`alert` `alert-dialog` `aspect-ratio` `avatar` `badge` `breadcrumb` `button` `card`
`carousel` `chart` `collapsible` `command` `dialog` `drawer` `dropdown-menu` `empty`
`field` `hover-card` `input` `input-group` `item` `label` `popover` `progress`
`radio-group` `scroll-area` `separator` `sheet` `sidebar` `skeleton` `sonner` `spinner`
`switch` `table` `tabs` `textarea` `toggle` `toggle-group` `tooltip`

Thiếu component nào thì **cài**, không tự viết:

```bash
bunx shadcn@4.23.0 view <name>          # kiểm tra có trong registry base-nova
bunx shadcn@4.23.0 add <name> --yes
```

Sau khi `add`, **xoá dòng `"use client"`** ở đầu file (dự án đặt `rsc: false`).
Không sửa tay nội dung component sinh ra.

### Bảng thay thế

| Đang tự viết                                         | Dùng                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `div` có `rounded-* border bg-card shadow-*`         | `Card` + `CardHeader`/`CardContent`/`CardFooter`                |
| Hàng có icon + tiêu đề + mô tả + nút bên phải        | `Item` + `ItemMedia` + `ItemContent` + `ItemActions`            |
| Danh sách các hàng trên                              | `ItemGroup` (+ `ItemSeparator`)                                 |
| `div` rỗng có icon + tiêu đề + mô tả                 | `Empty` + `EmptyHeader` + `EmptyMedia` + `EmptyTitle`           |
| Banner cảnh báo/lỗi                                  | `Alert` + `AlertTitle` + `AlertDescription`                     |
| `<span>` tròn/pill hiển thị số đếm / nhãn trạng thái | `Badge` (`variant="destructive"`/`"default"`/`"secondary"`)      |
| `<button aria-pressed>` hoặc nhóm nút chọn chế độ    | `Toggle` (đơn) hoặc `ToggleGroup`/`ToggleGroupItem`             |
| `<label>` + `<input>`                                | `Field` + `FieldLabel` + `FieldError`                           |
| `<a><Button/></a>`                                   | `<Button nativeButton={false} render={<Link to="…" />}>`        |
| `title="…"` để giải thích nút                        | `Tooltip` + `TooltipTrigger`                                    |
| `div` xám nhấp nháy khi tải                          | `Skeleton`                                                      |
| `<Loader2 className="animate-spin">`                 | `Spinner` (bắt buộc có `aria-label` tiếng Việt)                 |
| `<hr>` / `div` có viền chia cách                     | `Separator`                                                     |
| `document.getElementById` / `querySelector`          | `useRef`                                                        |
| `useState` + `setTimeout` để debounce                | `useDebounce` (`@uidotdev/usehooks`)                            |
| `new ResizeObserver(...)` đo kích thước khung        | `useMeasure` (`@uidotdev/usehooks`)                             |
| `navigator.clipboard.writeText(...)`                 | `useCopyToClipboard` (`@uidotdev/usehooks`)                     |
| `window.matchMedia(...)`                             | `useIsDesktop` (`@/hooks/use-breakpoint`) / `useMediaQuery`     |
| `localStorage` / `sessionStorage` thủ công           | `useLocalStorage` / `useSessionStorage` (`@uidotdev/usehooks`)  |
| `JSON.stringify(a) === JSON.stringify(b)`            | `isEqual` (`es-toolkit`)                                        |
| `useState(loading)` + `async/try/catch` gọi API      | `useMutation` / `useQuery` (`@tanstack/react-query`)            |
| `useEffect` gọi `setState` đồng bộ từ props          | Dẫn xuất giá trị (`draft ?? defaultValue`) hoặc reset `key`     |
| `addEventListener("scroll")` để tải thêm             | `useInfiniteScroll` (`@/hooks/use-infinite-scroll`)             |
| `navigator.geolocation` tự gọi                       | `useUserLocation` (`@/hooks/use-user-location`)                 |
| `<input type="file">` + `ref` + `onChange`           | `useDropzone` (`react-dropzone`)                                |
| `useSearchParams` rời rạc                            | `nuqs` (`useQueryState` / `useQueryStates`)                     |
| Bản đồ Leaflet thiếu dark-mode hoặc thiếu CSS        | `import "leaflet/dist/leaflet.css"` + `useTheme()` + `map-tiles-dark` |

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

Các quy tắc bên dưới đã được tự động kiểm tra tại `PreToolUse` bởi `~/.local/bin/agy-hooks`
(chặn ngay khi `edit_file`/`write_file` vi phạm). Trước khi báo hoàn thành, vẫn chạy đủ:

```bash
bun run typecheck
bun run lint
cd frontend && bun run format:check
```

Và đảm bảo các lệnh `rg` sau **không còn kết quả** trong phần mã feature/layout/backend vừa sửa:

```bash
rg -n "rounded-\[|text-\[10px\]|text-\[11px\]" frontend/src/features frontend/src/components/layout
rg -n "toFixed\(|toLocaleString\(|toLocaleDateString\(" frontend/src/features frontend/src/components/layout
rg -n "amber-|emerald-|blue-[0-9]|bg-white|text-white|border-white" frontend/src/features frontend/src/components/layout
rg -n "new ResizeObserver|navigator\.clipboard\.writeText|JSON\.stringify\([^)]+\)\s*===?\s*JSON\.stringify" frontend/src
rg -n "document\.getElementById|document\.querySelector" frontend/src/features
rg -n "as unknown as" frontend/src backend/src
```

## 11. Backend & Package-First (`backend/src/` & `packages/schema/`)

Cấm tự viết lại thuật toán, truy vấn SQL thô cho CRUD/join thông thường, hoặc helper đã có thư
viện chuẩn cài sẵn trong dự án:

| Nhu cầu                                | Dùng chuẩn đã cài sẵn                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| CRUD đơn giản                          | **Prisma Client Native** (`prisma.*`)                                                 |
| CTE, `DISTINCT ON`, `LATERAL JOIN`     | **Kysely** type-safe (`db`, `sql` từ `backend/src/lib/kysely.ts`)                     |
| SQL đặc thù PostgreSQL bắt buộc        | Chỉ `FOR UPDATE`, `pgvector <=>`, `pg_trgm`, `generate_series`, `pg_stat_statements` (kèm comment `agy-allow-raw-sql` ghi rõ lý do) |
| Cache bộ nhớ                           | `LRUCache` (`lru-cache`) — cấm `new Map()` tự evict                                   |
| Khoảng cách / hình học địa lý          | `@turf/distance`, `@turf/boolean-point-in-polygon` — cấm tự viết Haversine           |
| Giờ mở cửa / ngày giờ                  | `isOpenNow` (`@rendez/schema`, dùng `opening_hours` + `Asia/Ho_Chi_Minh`), `date-fns` |
| So sánh sâu / tiện ích mảng-object     | `es-toolkit` (`isEqual`, `chunk`, `uniqBy`...)                                        |
| Thống kê / bầu chọn / resilience       | `simple-statistics`, `votes` (`InstantRunoff`), `cockatiel`, `hdr-histogram-js`       |
| Ký S3/R2, escape HTML, che PII         | `aws4fetch`, `escape-html`, `maskdata`                                                |
| Bảo toàn kiểu & lỗi                    | Cấm `as unknown as`; cấm nuốt lỗi im lặng `.catch(() => {})` ở backend               |
