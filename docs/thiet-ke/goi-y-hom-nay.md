# Thiết kế: "Gợi ý hôm nay" (Daily Picks)

> Trạng thái: đã triển khai (2026-11-12) — lưu làm tài liệu thiết kế tham chiếu.
> Phạm vi: 3 quán gợi ý mỗi ngày ở đầu trang `/discover`.

## 1. Mục tiêu & giá trị người dùng

**Vấn đề:** `/discover` hiện là một lưới tĩnh 343 quán sắp theo `created_at` — mở 10 lần liên tiếp thấy đúng một thứ tự. Không có lý do gì để quay lại app mỗi ngày.

**Giá trị:** mỗi ngày mở app thấy 3 quán *khác hôm qua*, được chọn có chủ đích (điểm cao, đa dạng loại hình/khu vực) — tạo thói quen "mở app xem hôm nay ăn gì". Đây là bề mặt rẻ nhất để biến dữ liệu sẵn có (rating, review, category, district) thành nội dung mới mỗi ngày, không cần người dùng phải làm gì.

**Mốc đổi ngày:** picks đổi lúc **00:05 Asia/Ho_Chi_Minh** (xem mục 4) — tức là từ 00:05 trở đi, bất kỳ lúc nào trong ngày mở app đều thấy picks của ngày đó; không có "khe" nào trong ngày mà dải gợi ý biến mất.

**Chỉ số thành công — cách đo, không bịa số:**

| Chỉ số | Cách đo | Nguồn |
|---|---|---|
| Tỉ lệ phiên /discover có tương tác với dải gợi ý (click vào 1 trong 3 quán) | thêm sự kiện `daily_picks_click` (console log phía FE, không cần backend analytics ở vòng này) | FE |
| Số quán được chọn qua các ngày không trùng lặp | query `daily_picks` theo `pick_date` — kiểm tay bằng SQL | DB |
| Thời gian đáp ứng `GET /places/daily-picks` | log `pino` sẵn có (request id + duration) | backend log |
| Tỉ lệ cache hit (304) của endpoint | đếm 200 vs 304 trong log | backend log |

Không đặt mục tiêu số cụ thể (ví dụ "tăng 20% quay lại") vì chưa có baseline đo lường — vòng này chỉ cài đặt **cách đo**.

## 2. Hành vi người dùng kỳ vọng

**Người dùng đã đăng nhập / guest (giống nhau — dữ liệu là công khai, không cá nhân hoá ở vòng này):**

1. Mở `/discover` → ngay dưới toolbar bộ lọc, trên lưới kết quả, có dải **"Gợi ý hôm nay"**: nhãn ngày (vd. "Thứ tư, 12/11") + 3 card quán (dùng lại `PlaceCard`).
2. Bấm card → sang trang chi tiết quán như bấm card thường (`/places/:id`).
3. Ngày mai mở lại → 3 quán khác (hoặc ít nhất không lặp quán nào của 7 ngày gần nhất — xem mục 5).
4. Không có bộ lọc nào áp lên dải này: nó đứng trên lưới, bộ lọc chỉ tác động lưới bên dưới (tránh rối: lọc "quận Sơn Trà" mà dải gợi ý vẫn hiện quán quận khác là *đúng chủ đích* — ghi chú UI nhỏ "chọn độc lập với bộ lọc" nếu cần).
5. Guest thấy y hệt — không có nút yêu cầu đăng nhập.

**Trạng thái phụ:**
- Loading: 3 skeleton card nhỏ (dùng `Skeleton`, khớp `PlaceCardSkeleton` đã có).
- Lỗi / rỗng: **thu gọn im lặng** — dải biến mất, lưới bên dưới hoạt động bình thường. Gợi ý hôm nay là tính năng "thêm", không được làm hỏng trang chính (không dùng `ErrorState` full-width).
- Rất ít quán (< 3 đủ điều chọn): hiện số quán có được.

**Không có nút "làm mới"/"xem thêm" ở vòng này** — dữ liệu đổi theo ngày, làm mới thủ công tạo kỳ vọng sai; "xem thêm" là việc của lưới bên dưới.

## 3. Thiết kế API

**Quyết định: endpoint mới `GET /api/v1/places/daily-picks`** (đặt trong `backend/src/routes/places.ts`, đứng trước `/places/:id` như `suggestions`/`map`/`saved` đã làm).

Lý do không mở rộng `GET /places/suggestions`: endpoint đó là gợi ý theo *caption đang soạn* (tín hiệu nội dung), hợp đồng và test hoàn toàn khác; trộn hai nghiệp vụ vào một route vi phạm "một nghiệp vụ một nơi".

### Request

Không tham số. Không nhận ngày — server luôn trả picks của "hôm nay" theo timezone server-side (mục 4). Query lạ → bỏ qua (không lỗi 400, giữ đơn giản).

### Response (zod — thêm vào `packages/schema/src/place.schema.ts`)

```ts
export const dailyPickSchema = z.object({
  place: placeSchema,        // dùng nguyên placeSchema hiện có — FE tái dùng PlaceCard
  reason: z.string(),        // vd. "Điểm cao · Quận Hải Châu"
})
export const dailyPicksSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // ngày theo Asia/Ho_Chi_Minh
  items: z.array(dailyPickSchema).max(3),
})
```

Dùng `placeSchema` đầy đủ (không phải `placeSummarySchema`) vì FE render bằng `PlaceCard` cần `tags`, `imageHeight`, `rating`, `priceLevel`.

### Cache policy

- Dữ liệu **công khai, giống nhau với mọi người** (không phụ thuộc viewer, không có `likedByMe`…). Đúng trường hợp `scope: "public"` của `jsonWithCache` — không dính lỗi V3-01 (đó là lỗi của dữ liệu *riêng tư* gắn `max-age`).
- `jsonWithCache(c, body, { maxAge: 300 })` — 5 phút: đủ để CDN/浏览器 gánh traffic trong ngày, vẫn ngắn hơn chu kỳ đổi dữ liệu (ngày) nên sai lệch giờ đổi ngày là vô hại. ETag tự đổi khi picks đổi → client refetch sau 5 phút nhận 304 hoặc body mới.
- Server-side: đọc từ bảng `daily_picks` (mục 4) — 1 query có index, không cần `createTtlCache` thêm một tầng.

### Rate limit

**Không áp dụng** ở vòng này. Endpoint là GET công khai, đọc 1 row đã cache, chi phí ~ bằng `GET /places/:id` (cũng không có limit). Thêm limit vào GET công khai chỉ thêm bảng `rate_limits` ghi mỗi request — overengineering. Nếu sau này thấy abuse trong log thì thêm `rateLimit({ scope: "daily-picks", limit: 60, windowSeconds: 60 })` — cơ chế sẵn có.

### Lỗi

- Không có picks cho hôm nay (job chưa chạy / DB rỗng): `200 { date, items: [] }` — **không phải 404/500**; FE coi rỗng = thu gọn dải. Tránh biến lỗi hạ tầng thành lỗi người dùng.
- Lỗi DB thật: 500 shape `{ message }` chuẩn (D6) — FE đã xử lý như mục 2.

## 4. Thiết kế dữ liệu

### Bảng mới `daily_picks` — CÓ, cần bảng

Không dùng cache in-memory: tiến trình API có thể restart giữa ngày (mất cache = phải tính lại, và hai tiến trình sẽ tính khác nhau nếu thuật toán có yếu tố ngẫu nhiên); dự án không có Redis (K6 — pg-boss chạy trên chính Postgres, DECISIONS không cho thêm hạ tầng). Bảng là nguồn sự thật đơn giản nhất:

```prisma
model DailyPick {
  id        String   @id @default(uuid()) @db.Uuid
  pickDate  DateTime @map("pick_date") @db.Date   // ngày theo Asia/Ho_Chi_Minh
  position  Int                                          // 1..3
  placeId   String   @map("place_id")
  place     Place    @relation(fields: [placeId], references: [id])
  reason    String
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([pickDate, position])   // idempotence: 3 slot/ngày, job chạy lại không nhân đôi
  @@unique([pickDate, placeId])    // bất biến nghiệp vụ: 1 quán không xuất hiện 2 lần trong cùng ngày
  @@index([pickDate])
  @@map("daily_picks")
}
```

Thêm `relation` tương ứng vào `model Place` (`dailyPicks DailyPick[]`).

### Job pg-boss hằng ngày

Khai báo trong `backend/src/lib/queue.ts` — **queue mới `daily-picks`**, KHÔNG nhét vào `place-detect` (cron 5 phút, nghiệp vụ khác; mỗi queue một cron riêng là cách pg-boss dùng — đã xác minh trong source `node_modules/pg-boss` v12.38.1):

```ts
// API đã xác minh trong node_modules/pg-boss/dist/types.d.ts + index.d.ts:
// schedule(name, cron, data?, options?: ScheduleOptions) — ScheduleOptions có
// `tz?: string` và `missed?: 'skip' | 'once'` (mặc định 'skip').
await instance.createQueue(DAILY_PICKS_QUEUE, {
  retryLimit: 5,
  retryDelay: 300,        // 5 phút; retryBackoff: true → 5, 10, 20, 40, 80 phút
  retryBackoff: true,
  deadLetter: DAILY_PICKS_DLQ,
})
await instance.work(DAILY_PICKS_QUEUE, async (jobs) => { ... })
await instance.schedule(DAILY_PICKS_QUEUE, "5 0 * * *", null, {
  tz: "Asia/Ho_Chi_Minh",
  missed: "once",   // server downtime qua 00:05 → chạy bù 1 lần khi lên
})
```

- **Giờ chạy: 00:05 Asia/Ho_Chi_Minh** — chạy ngay sau mốc đổi ngày để **cả ngày** đều có picks của ngày đó (nếu chạy 06:00, khung 00:00–06:00 dải gợi ý sẽ rỗng 6 giờ mỗi sáng). `tz` là tùy chọn chính thức của pg-boss v12 (không phải bịa). Picks của ngày D được tính từ dữ liệu tại thời điểm 00:05 ngày D.
- **Idempotence:** hai unique constraint — `@@unique([pickDate, position])` (job chạy lại không nhân đôi slot) và `@@unique([pickDate, placeId])` (DB chặn cùng một quán xuất hiện 2 lần trong ngày, kể cả khi thuật toán có bug). Job chạy lại (retry, hay hai worker chen nhau) thì `createMany` với `skipDuplicates: true` (Prisma) hoặc catch P2002 như `suggestions-job.ts` đã làm với `isUniqueViolation`. Job chỉ INSERT, không UPDATE — hôm nay đã có picks thì hôm nay không đổi.
- **Tính + insert trong MỘT transaction:** bọc `pickDailyPicks(date)` (đọc ứng viên + lịch sử 7 ngày + tính điểm) và `createMany` trong cùng `prisma.$transaction`. Nếu job chết giữa chừng sau khi insert 1–2 row, transaction rollback → không còn trạng thái "2/3 row"; retry tính lại từ đầu và ra đúng bộ 3. Điều kiện để retry ra **cùng kết quả**: mọi mốc thời gian trong thuật toán lấy theo `pickDate` (không phải `now()`), và bước xáo trộn seeded theo `pickDate` — retry lúc 00:07 hay 03:00 cùng ngày đều ra cùng 3 quán.
- **Khi job fail:** retry 5 lần backoff **5 → 10 → 20 → 40 → 80 phút**; hết lượt vào DLQ `daily-picks-dlq` (pattern của `place-detect`). Trong lúc chưa có picks, endpoint trả `items: []` và FE thu gọn — người dùng không thấy lỗi. Job ngày sau vẫn chạy độc lập. **Không** chạy job bù trong request handler (làm request chậm, vi phạm "lỗi queue không hỏng request" của `enqueuePlaceDetect`).
- **Giữ lịch sử:** không xoá row cũ — cần cho kiểm tra "không lặp 7 ngày" và cho chỉ số. Bảng 3 row/ngày, tăng trưởng không đáng kể; dọn dẹp là việc của sau (ghi BACKLOG nếu cần).
- **Migration:** migration mới `backend/prisma/migrations/2026MMDD000000_daily_picks/migration.sql` — KHÔNG sửa migration cũ (quy tắc bắt buộc).

## 5. Thuật toán chọn

### Dữ liệu thật (đã query DB 2026-11-12, `rendez-postgres`)

- 343/344 quán đã publish; **343 quán không có tag nào**, 343 quán `status='unknown'`, 343 quán `price_level=1`, 12 quán thiếu district.
- Chỉ **1 review** trong toàn bộ DB, 29 ảnh place → gần như không quán nào có rating thực (aggregate trả 0).
- Phân bố category: restaurant 216, cafe 91, street-food 15, bakery 14, bar 7.
- ⇒ **Không thể dùng tags/giá/status/rating làm tín hiệu chính** — công thức dựa trên cái có thật: `category`, `district`, `review_count` (dù hiện ~0), `created_at`, và lịch sử picks.

### Công thức (chạy trong job, một hàm `pickDailyPicks()` mới)

Ứng viên: mọi place `published_at IS NOT NULL AND status <> 'closed' AND deleted_at IS NULL` — tái dùng điều kiện visibility của `fetchRankCandidates(true)` (không dùng hàm đó trực tiếp vì nó normalize chuỗi cho caption-matching, thừa và đắt; viết query riêng trong module mới `backend/src/lib/daily-picks.ts`).

Bước 1 — **Điểm cơ bản** (mọi quán):

```
score = 2 × ln(1 + review_count)        // review thật vẫn được ưu tiên khi có
      + 1.0 × (quán thêm trong 30 ngày tính tới pickDate)   // quán mới: created_at >= pickDate - 30d (KHÔNG dùng now())
```

Với corpus hiện tại (0 review, ít quán mới) mọi quán gần như bằng điểm → bước 2 quyết định, đúng ý đồ: đa dạng là tiêu chí chính khi dữ liệu nghèo.

Bước 2 — **Đa dạng loại hình**: chọn theo vòng lặp round-robin thứ tự category *xáo trộn seeded* (seed = `pickDate` — cùng ngày chạy lại ra cùng kết quả, khác ngày khác kết quả): mỗi vòng chọn quán điểm cao nhất còn lại của một category, trừ khi category đã đủ đại diện. Với 6 category và 3 slot: 3 slot gần như luôn thuộc 3 category khác nhau (restaurant/cafe luôn có; street-food/bakery/bar có ít nhưng đủ cho 3 slot khác category).

Bước 3 — **Đa dạng khu vực**: trong cùng category, ưu tiên quán có `district` khác các quán đã chọn trong ngày (12 quán thiếu district vẫn đủ điều, xếp sau cùng trong category).

Bước 4 — **Không lặp 7 ngày**: loại ứng viên đã xuất hiện trong 7 ngày gần nhất (`SELECT place_id FROM daily_picks WHERE pick_date > current_date - 7`). Nếu sau khi loại mà không còn đủ 3 quán của một category → nới lỏng: cho phép lặp quán cũ nhất (hơn 7 ngày) thay vì trả thiếu. Với 343 quán và 3 picks/ngày (21 quán/7 ngày) việc cạn ứng viên gần như không xảy ra, nhưng phải xử lý để thuật toán tổng quát.

Bước 5 — `reason`: dựng từ dữ liệu có thật — `"Quán mới"` nếu mới thêm; `"Nhiều đánh giá"` nếu `review_count >= 5`; còn lại `"Gợi ý của ngày"` (trung thực, không bịa "điểm cao" khi rating = 0).

**Xáo trộn seeded:** dùng mulberry32 đơn giản (~5 dòng, tự viết trong module, không thêm dependency — tinh thần D-055 "không kéo package cho nhu cầu nhỏ").

### Kiểm thử thuật toán

Unit test `backend/test/daily-picks.test.ts` (thuần hàm, cho input là mảng candidate + lịch sử picks — không cần DB):
1. Cùng `(candidates, history, date)` → kết quả giống hệt (deterministic).
2. Khác `date` → xác suất khác thứ tự (chạy 50 ngày giả lập, assert không có chuỗi 3 quán giống 2 ngày liên tiếp).
3. Lịch sử 7 ngày chứa quán X → X không được chọn khi còn ứng viên.
4. Chỉ có 2 quán đủ điều → trả 2, không crash.
5. 3 slot thuộc ≥ 2 category khác nhau khi corpus có ≥ 2 category.
6. Quán mới (< 30 ngày) được ưu tiên trên quán cũ cùng điểm khi còn slot category.

Integration test trong `backend/test/places.test.ts` (Postgres thật, pattern sẵn có): seed places + gọi trực tiếp `pickDailyPicks(date)` 2 lần → `daily_picks` vẫn đúng 3 row (idempotence); `GET /places/daily-picks` trả đúng shape + `Cache-Control: public, max-age=300`. **Case transaction:** giả lập job chết sau khi insert 1–2 row (ném lỗi trong `$transaction` sau `createMany` một phần, hoặc dùng spy để `createMany` fail giữa chừng) → retry `pickDailyPicks(date)` → bảng vẫn đúng 3 row, **cùng bộ quán** như lần tính đầy đủ (chứng minh rollback + tính theo `pickDate`).

## 6. Thiết kế UI

### Vị trí

Trong `frontend/src/features/places/pages/discover-page.tsx`, chèn **giữa `<DiscoverToolbar>` và khối kết quả** (lưới/skeleton/empty). Dải picks **luôn hiển thị độc lập** với trạng thái lưới (kể cả khi lưới đang loading hay lỗi) — trừ khi picks rỗng thì ẩn hẳn.

```
[DiscoverToolbar]
[DailyPicksSection]  ← mới: heading nhỏ "Gợi ý hôm nay" + ngày + 3 card
[lưới kết quả / skeleton / empty]
```

### Component mới

`frontend/src/features/places/components/daily-picks-section.tsx`:
- Heading: `h2` nhìn thấy được (không `sr-only` — bài học V6: `h1` sr-only gây vấn đề a11y/SEO; `h2` "Gợi ý hôm nay · 12/11").
- Lưới 3 card: `grid grid-cols-1 sm:grid-cols-3 gap-4` — mobile xếp dọc (3 card dọc quá dài? dùng `grid-cols-3` thu nhỏ ảnh — quyết định khi làm, ưu tiên không phá nhịp lưới bên dưới: mobile để `grid-cols-1` nhưng card ảnh thấp hơn, hoặc carousel ngang scroll-snap. **Chọn mặc định: hàng ngang cuộn được trên mobile** (`flex overflow-x-auto snap-x`) vì không đẩy lưới kết quả xuống quá xa; desktop `grid-cols-3`).
- Card: tái dùng `PlaceCard` nguyên vẹn (dark mode, a11y, fallback ảnh đã xử lý trong component đó — không viết card mới).

### Trạng thái

| Trạng thái | Hiển thị |
|---|---|
| Loading | 3 `Skeleton` khối card (chiều cao cố định thấp, tránh layout shift — set `min-h`) |
| Rỗng (`items.length === 0`) | Không render gì cả (kể cả heading) |
| Lỗi fetch | Không render gì cả — lưới bên dưới vẫn báo lỗi của chính nó nếu lỗi |
| Có dữ liệu | Heading + ngày + 3 `PlaceCard` |

### Hook & API FE

- `frontend/src/features/places/api/get-daily-picks.ts` — theo pattern `get-places.ts` (axios instance chung, AbortSignal).
- `frontend/src/features/places/hooks/use-daily-picks.ts` — `useQuery({ queryKey: ["daily-picks"], staleTime: 5 * 60_000, retry: 1 })`; lỗi → component return `null`.

### Không phá layout hiện tại

- Không đụng `useDiscoverView`, bộ lọc, infinite scroll — dải picks là block độc lập phía trên.
- Dark mode: kế thừa từ `PlaceCard`/token theme, không hardcode màu.
- A11y: `h2` thật, list semantics (`ul > li` như lưới hiện tại), ảnh `PlaceCard` đã có alt; dải ẩn khi rỗng để không có heading mồ côi.
- Mobile: đã quét 20/20 nút < 44px ở V6 — card dùng lại `PlaceCard` nên kích thước tap giữ nguyên chuẩn cũ.

## 7. Kế hoạch triển khai

Chia 4 bước nhỏ, mỗi bước typecheck/lint/test xanh riêng:

| Bước | Việc | File chạm |
|---|---|---|
| 1. Schema + migration | Thêm `DailyPick` + relation Place; migration SQL mới | `backend/prisma/schema.prisma`, `backend/prisma/migrations/<mới>/migration.sql` |
| 2. Thuật toán + job | Module picks thuần hàm + queue mới | `backend/src/lib/daily-picks.ts` (mới), `backend/src/lib/queue.ts`, `backend/test/daily-picks.test.ts` (mới) |
| 3. Endpoint | Route + schema zod + test integration | `backend/src/routes/places.ts`, `packages/schema/src/place.schema.ts`, `backend/test/places.test.ts`, `docs/backend/API.md` |
| 4. FE | Hook + component + chèn vào page + mock MSW + e2e | `frontend/src/features/places/api/get-daily-picks.ts` (mới), `hooks/use-daily-picks.ts` (mới), `components/daily-picks-section.tsx` (mới), `pages/discover-page.tsx`, `frontend/src/mocks/server.ts`, `frontend/e2e/discover.spec.ts` |

**Tổng: ~4 file sửa + ~6 file mới + 1 migration.**

Test cần viết:
- Backend unit: thuật toán (6 case mục 5).
- Backend integration (Postgres thật): idempotence job, shape endpoint, cache header.
- FE unit: `use-daily-picks` (mock MSW) — rỗng → không render; lỗi → không render.
- E2E mock (`discover.spec.ts` thêm describe): mở `/discover` thấy dải "Gợi ý hôm nay" với 3 card mock; mock trả rỗng → dải biến mất, lưới vẫn hoạt động.
  - **Thứ tự đăng ký mock (quan trọng):** trong `frontend/src/mocks/server.ts` phải đăng ký `GET /places/daily-picks` **TRƯỚC** pattern `/^\/places\/([^/]+)$/` (quanh dòng 1385). MSW/route matching ở file này theo thứ tự khai báo — đăng ký sau thì pattern `:id` nuốt mất `daily-picks` và trả 404 "Không tìm thấy địa điểm" (đúng lỗi đã ghi chú ở route backend "đứng trước `/places/:id`").
  - **Ảnh trong mock:** 3 card picks phải lấy place từ `MOCK_PLACES` (ảnh trỏ `/data/cold-start/…` như fixture hiện có) — KHÔNG bịa URL ảnh mới, vì test đầu của `discover.spec.ts` assert `img[alt^="Ảnh "]` phải hiện và `first h3` là tên card picks; ảnh hỏng sẽ làm test đỏ vì lý do không liên quan tính năng.

**Rủi ro & cách giảm:**

| Rủi ro | Mức | Giảm |
|---|---|---|
| Job fail ngày đầu → /discover thiếu dải | Trung bình | `missed: "once"` + retry 5 lần (5→10→20→40→80 phút) + DLQ; FE thu gọn im lặng nên không lỗi người dùng |
| **Hạn chế `missed: "once"`:** server sập qua mốc 00:05 rồi downtime kéo dài hơn 1 ngày → chỉ chạy bù 1 lần, picks của ngày bị lỡ KHÔNG có (ngày sau mới có) | Thấp | Chấp nhận được: FE thu gọn im lặng; nếu cần khắc phục thì job bù chạy theo `pickDate` thiếu (ghi BACKLOG, không làm vòng này) |
| Hai tiến trình API chạy job song song | Thấp | `@@unique([pickDate, position])` + `@@unique([pickDate, placeId])` + catch P2002 (pattern `suggestions-job.ts`) |
| pg-boss `tz` không hoạt động như kỳ vọng | Thấp | Đã xác minh `tz?: string` trong type v12.38.1; test integration chạy job tay với `pickDate` truyền vào (không phụ thuộc clock) |
| Clock server lệch múi giờ khi tính `pickDate` | Thấp | Tính `pickDate` bằng `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })` (en-CA cho `YYYY-MM-DD`) ở MỘT chỗ duy nhất trong module, test riêng |
| Dải picks đẩy lưới kết quả xuống thấp trên mobile | Thấp | Hàng ngang cuộn được, ảnh thấp; kiểm tay 5 breakpoint như vòng 6 |
| Quán được chọn rồi bị unpublish/close giữa ngày → card 404 | Thấp | Endpoint JOIN lại điều kiện visibility khi trả (`place_id IN (...) AND published_at IS NOT NULL AND status <> 'closed' AND deleted_at IS NULL`), quán mất thì trả ít hơn 3 — FE tự co |

## 8. Ngoài phạm vi (không làm vòng này)

- **Cá nhân hoá** theo lịch sử save/review của người dùng — cần nhiều dữ liệu hành vi hơn corpus hiện có (1 review); để sau khi có crowdsource tags/giá (tính năng 5 trong kế hoạch).
- Nút "làm mới", "xem thêm", "không quan tâm quán này".
- Analytics backend (bảng event) — vòng này chỉ log FE console + log server sẵn có.
- Dọn dẹp lịch sử `daily_picks` cũ (retention).
- Đẩy picks vào notification/email.
- Áp dụng picks cho `/map` hoặc trang khác.
- Thêm Redis hay bất kỳ hạ tầng cache mới.
