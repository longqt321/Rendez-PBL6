# Hướng dẫn chạy & nghiệm thu Rendez

> Tài liệu dành cho người muốn **chạy app thật** (máy dev hoặc VPS) rồi **kiểm tra
> từng chức năng** trên UI. Mọi lệnh dưới đây đã đối chiếu với `compose.yaml`,
> `deploy/compose.prod.yml`, `deploy/Caddyfile`, `docs/backend/RUNBOOK.md`,
> `docs/backend/SMTP-SETUP.md`, `docs/backend/R2-SETUP.md` và source code FE/BE.
>
> Yêu cầu: Docker + Docker Compose v2 (`docker compose version`), Bun 1.3.x
> (`bun --version`) khi cần build frontend ở máy chủ.

---

## 1. Chạy ở máy dev (nhanh nhất)

```bash
bun install                # cài dependency workspace (lần đầu)
docker compose up -d       # Postgres + migrate + API :8000 + web :5173
```

Thứ tự khởi động tự động: `postgres` (healthy) → `migrate` (chạy migration một
lần rồi thoát) → `api` (chờ migrate xong) → `web` (nginx phục vụ frontend tĩnh
và proxy `/api` vào API). Mở:

| URL | Là gì |
| --- | --- |
| http://localhost:5173 | Web app (frontend) |
| http://localhost:8000/healthz | API health check → `{"status":"ok"}` |

Cấu trúc: container `web` là **frontend build tĩnh** (Vite + nginx), KHÔNG phải
dev server Vite. Vì vậy:

- **Sửa code frontend xong** phải build lại:

  ```bash
  cd frontend && bun run build
  docker compose build web && docker compose up -d web
  ```

- **Sửa code backend xong**:

  ```bash
  docker compose build api && docker compose up -d api
  ```

Xem log:

```bash
docker compose logs -f api     # log API realtime
docker compose logs -f web     # log nginx
docker compose ps              # trạng thái container
```

### Seed dữ liệu (DB trống)

Seed **không tự chạy** trong container. Nếu DB trống (lần đầu), chạy:

```bash
docker compose run --rm migrate bun run seed
```

Seed idempotent (chạy lại không nhân đôi), nạp corpus chính thức **358 địa điểm
Đà Nẵng** (`backend/data/places-expanded.json`). Kiểm tra:

```bash
docker exec rendez-postgres psql -U rendez -d rendez -c "select count(*) from places;"
```

> [!TIP]
> Muốn dev nhanh (hot-reload) thay vì build lại container: `docker compose up -d
> postgres` rồi `bun run dev:api` (API :8000) và `bun run dev` (Vite :5173) —
> xem `docs/backend/RUNBOOK.md` mục 2. Phần dưới tài liệu này giả định dùng
> đường compose ở trên.
>
> Nếu container `web` vẫn chạy (chiếm :5173), chạy dev server ở cổng khác:
> `bun run dev --port 5199 --strictPort`. Cần dev server (không phải bản build
> tĩnh) để thấy overlay Ctrl+Shift+D — xem mục 4.12.

---

## 2. Chạy production thật (VPS + domain)

### Bước 1 — Cài Docker trên VPS

Cài Docker Engine + Docker Compose v2 theo docs chính thức của Docker cho distro
của bạn (Ubuntu/Debian). Kiểm tra:

```bash
docker --version && docker compose version
```

### Bước 2 — Chuẩn bị biến môi trường

```bash
cd /srv/rendez                       # thư mục repo trên máy chủ
cp deploy/.env.example deploy/.env   # hoặc /srv/rendez/.env — nhất quán khi gọi compose
```

Điền đủ các biến (bảng chi tiết ở mục 5):

| Bắt buộc | Lưu ý |
| --- | --- |
| `POSTGRES_PASSWORD` | **Phải khác** mật khẩu dev `rendez_dev` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` — tối thiểu 32 ký tự |
| `BETTER_AUTH_URL` | URL public https của app |
| `CORS_ORIGINS` | Origin FE, ví dụ `https://rendez.example.com` |
| `APP_ORIGIN` | **BẮT BUỘC, fail-fast nếu thiếu** — dùng cho canonical/OG/robots/sitemap và link xác thực email |

Tuỳ chọn (điền nếu muốn tính năng tương ứng hoạt động thật):

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_PUBLIC_BASE_URL` — upload ảnh (thiếu → route media trả 503, phần còn lại
  chạy bình thường). Hướng dẫn từng bước: `docs/backend/R2-SETUP.md`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` — mail
  xác thực email + quên mật khẩu (thiếu → dev vẫn log link, **production thì
  mail không gửi được và không log link**). Hướng dẫn: `docs/backend/SMTP-SETUP.md`.

### Bước 3 — Build frontend với APP_ORIGIN

`deploy/compose.prod.yml` đã truyền `APP_ORIGIN` vào build arg `VITE_APP_ORIGIN`
của `frontend/Dockerfile` — chỉ cần build qua compose:

```bash
bun install --frozen-lockfile
docker compose -f compose.yaml -f deploy/compose.prod.yml build
```

> [!IMPORTANT]
> `APP_ORIGIN` được nạp lúc **build** frontend (canonical/OG/robots/sitemap nằm
> trong bundle tĩnh) và lúc **chạy** API. Sửa `APP_ORIGIN` xong phải build lại
> (`... build` rồi `up -d`) chứ không chỉ restart.

### Bước 4 — Chạy

```bash
docker compose --env-file /srv/rendez/.env \
  -f compose.yaml -f deploy/compose.prod.yml up -d
```

Lưu ý cấu trúc prod (đọc `deploy/compose.prod.yml`):

- Postgres **không mở cổng** ra ngoài; API cũng không — **Caddy là cổng duy nhất**
  (80/443, TLS tự động qua Let's Encrypt).
- Service `web` (nginx dev) **tự tắt** ở prod (`entrypoint: ["true"]`) — Caddy
  phục vụ frontend tĩnh từ mount `./frontend/dist:/srv/web:ro`. Thư mục
  `frontend/dist` được sinh khi build ở bước 3.
- Volumes dữ liệu: `/var/lib/rendez/pgdata` (Postgres), backup ở
  `/var/backups/rendez` (cron `deploy/backup-db.sh`, xem `deploy/README.md`).

### Bước 5 — DNS và TLS

1. Trỏ bản ghi **A** của domain (ví dụ `rendez.example.com`) về IP VPS.
2. Sửa `deploy/Caddyfile`: thay `rendez.example.com` bằng domain thật.
3. Caddy tự xin chứng chỉ Let's Encrypt khi nhận request đầu. Kiểm tra:

```bash
curl https://<domain>/healthz          # {"status":"ok"}
curl -I https://<domain>/api/v1/places # có ETag + Cache-Control
```

> [!WARNING]
> Chạy local không xin được chứng chỉ Let's Encrypt (cần domain công khai).
> Cấu hình prod này **chưa được chạy trên máy chủ thật** — chỉ đã kiểm cú pháp
> và luồng logic (xem `deploy/README.md` mục 5 "Chưa xác minh").

### Bước 6 — Kiểm tra an toàn sau khi chạy

```bash
docker compose --env-file /srv/rendez/.env -f compose.yaml -f deploy/compose.prod.yml logs api \
  | grep "DEV ONLY"    # phải KHÔNG có kết quả ở production
```

---

## 3. Tài khoản & dữ liệu đầu

### Tạo tài khoản qua UI

1. Mở app → **Đăng ký** (`/register`) → nhập tên, email, mật khẩu.
2. Từ 2026-11-12, **bắt buộc xác thực email**: đăng ký thành công **không tạo
   phiên**, cần bấm link trong email trước khi đăng nhập.
3. **Khi chưa cấu hình SMTP (dev)**: link xác thực được in vào log API:

   ```bash
   docker compose logs api | grep "link xác thực"
   # → "DEV ONLY — link xác thực email (chưa có SMTP)" kèm URL
   ```

   Mở URL đó trong trình duyệt → redirect về `/verify-email` trên FE → xác thực
   xong mới đăng nhập được.
4. Đăng nhập tại `/login`. Quên mật khẩu tại `/forgot-password` (link reset cũng
   in log khi chưa có SMTP, chuỗi `DEV ONLY — link đặt lại mật khẩu`).

### Dữ liệu đầu

- Seed nạp **358 địa điểm** (`backend/data/places-expanded.json`, `backend/scripts/seed.ts`).
  Đánh giá/bài đăng/bộ sưu tập để rỗng — nội dung do bạn tạo khi nghiệm thu.
- Job nền pg-boss chạy cron `*/5 * * * *` (tự đề xuất địa điểm cho bài chưa gắn
  địa điểm) — không cần thao tác gì.

---

## 4. CHECKLIST NGHIỆM THU

> Mở http://localhost:5173 (dev) hoặc `https://<domain>` (prod). Đánh ✔ khi
> kết quả khớp "Kết quả mong đợi".

### 4.1 Tài khoản

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 1 | Đăng ký | `/register` → điền tên/email/mật khẩu → gửi | Thông báo "hãy xác thực email"; **chưa** được đăng nhập |
| 2 | Xác thực email | Lấy link từ log API (dev) hoặc hộp thư (có SMTP) → mở | Về `/verify-email`, hiện trạng thái xác thực thành công |
| 3 | Đăng nhập | `/login` → email + mật khẩu | Vào app; avatar hiện trên topbar |
| 4 | Đăng nhập khi chưa xác thực | Đăng nhập bằng email chưa bấm link | Báo lỗi "Email chưa được xác thực" |
| 5 | Quên mật khẩu | `/forgot-password` → nhập email → lấy link (log hoặc mail) → đặt mật khẩu mới | Đặt được mật khẩu mới; đăng nhập bằng mật khẩu mới thành công |

### 4.2 Khám phá (`/discover`)

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 6 | Tìm kiếm | Gõ vào ô search trên topbar → Enter | Về `/search` có kết quả |
| 7 | Lọc loại hình | Bấm chip loại (cà phê, ăn uống…) trên toolbar | Danh sách lọc đúng loại; badge số lượng thay đổi |
| 8 | Lọc quận | Bấm "Quận" trên toolbar → chọn quận | Chỉ còn quán thuộc quận đó |
| 9 | Lọc mức giá | Bấm "Mức giá" → chọn ₫ / ₫₫ / ₫₫₫ | Lọc theo mức giá **tối đa**. Lưu ý: corpus hiện toàn `priceLevel = 1` nên nhóm giá bị disabled kèm chú thích — đúng thiết kế, không phải lỗi |
| 10 | Sắp xếp | Menu "Sắp xếp" → lần lượt **Mới nhất / Đánh giá cao / Gần tôi** | Mới nhất: thứ tự mặc định. Đánh giá cao: quán có review lên trước (quán 0 review xuống cuối). Gần tôi: xin quyền vị trí rồi sắp theo khoảng cách |
| 11 | Dải "Gợi ý hôm nay" | Mở `/discover`, nhìn dải trên cùng | 3 card quán server chọn mỗi ngày, tiêu đề "Gợi ý hôm nay" kèm ngày |
| 12 | Bộ lọc chia sẻ giữa Lưới/Bản đồ | Đặt filter rồi bấm nút **Bản đồ** | `/map` giữ nguyên filter trên URL |

### 4.3 Bản đồ (`/map`)

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 13 | Pin theo khung nhìn | Kéo/zoom bản đồ Đà Nẵng | Pin chỉ hiện theo vùng đang xem (cluster khi zoom xa) |
| 14 | Popup | Bấm một pin | Popup hiện tên, ảnh, rating của quán |
| 15 | Vào trang quán | Bấm nút trong popup | Điều hướng tới `/discover/:id` |

### 4.4 Trang quán (`/discover/:id`)

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 16 | Thông tin quán | Mở một quán từ `/discover` | Ảnh, tên, địa chỉ, rating + số đánh giá, mức giá, giờ mở cửa |
| 17 | Viết đánh giá | Tab "Đánh giá" → "Viết đánh giá" → chọn sao + nội dung → gửi | Đánh giá hiện; rating quán cập nhật; sửa được đánh giá của mình |
| 18 | Lưu bộ sưu tập | Bấm "Lưu vào bộ sưu tập" → chọn/tạo bộ sưu tập | Toast thành công; quán xuất hiện trong `/saved` tab "Bộ sưu tập" |
| 19 | Báo cáo | Bấm "Báo cáo" → chọn lý do → gửi | Toast thành công |
| 20 | Check-in | Bấm "Đăng bài check-in tại đây" | Mở form đăng bài với địa điểm đã gắn sẵn |

### 4.5 Cộng đồng (`/social`)

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 21 | Đăng bài không ảnh | `/social` → ô soạn "Hôm nay bạn ăn gì?…" → gõ nội dung → Đăng | Bài xuất hiện trong feed; tab "Của tôi" thấy bài |
| 22 | Đăng bài kèm ảnh (cần R2) | Bấm nút ảnh trong ô soạn → chọn file → Đăng | Ảnh hiện trên bài. **Chưa cấu hình R2 → hiện "Tính năng ảnh chưa được cấu hình"** — đúng hành vi, không phải lỗi |
| 23 | Gắn địa điểm | Trong ô soạn → gõ tên quán → chọn gợi ý → Đăng | Bài hiện chip địa điểm; bấm vào mở `/discover/:id`. Sau vài phút job nền có thể gửi thông báo đề xuất địa điểm nếu bài chưa gắn |
| 24 | Like / bình luận / lưu | Trên một bài: bấm tim, viết bình luận, bấm "Lưu bài" | Số tim +1 (bấm lại để bỏ), bình luận hiện trong thread, bài vào `/saved` tab "Đã lưu" |
| 25 | Chia sẻ + OG preview | Bấm "Chia sẻ" trên bài → copy link `/post/:id` → dán vào [Sharing Debugger của Facebook](https://developers.facebook.com/tools/debug/) | Debugger hiện tiêu đề/mô tả/ảnh OG của bài. Cần domain public https (prod). **Chưa xác minh**: chưa có domain thật để chạy debugger |
| 26 | Feed theo tab | Chuyển tab Tất cả / Chưa gắn địa điểm / Đang theo dõi / Của tôi | Mỗi tab lọc đúng; tab "Đang theo dõi" chỉ hiện khi đã đăng nhập |

### 4.6 Theo dõi người dùng

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 27 | Tìm người | `/search?q=<tên>` → tab **Người** | Danh sách user khớp (tìm không dấu được) + khối "Gợi ý theo dõi" |
| 28 | Theo dõi | Bấm "Theo dõi" trên kết quả hoặc khối gợi ý | Nút đổi thành "Đang theo dõi"; bấm lại để bỏ |
| 29 | Hồ sơ người khác | Mở `/u/:handle` | Ảnh bìa, avatar, tên/bio, stats (người theo dõi / đang theo dõi), tabs Bài đăng / Đã ghim / Đã lưu / Bộ sưu tập, nút "Theo dõi" |

### 4.7 Bộ sưu tập

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 30 | Tạo bộ sưu tập | `/saved` → tab "Bộ sưu tập" → tạo mới (hoặc qua "Lưu vào bộ sưu tập" ở trang quán) | Bộ sưu tập hiện trong lưới |
| 31 | Thêm/xoá địa điểm | Mở `/collections/:id` → thêm quán từ trang quán, xoá khỏi bộ sưu tập | Danh sách cập nhật đúng |
| 32 | Sửa bộ sưu tập | Bấm sửa trên bộ sưu tập của mình → đổi tên/mô tả | Lưu thành công |
| 33 | Xem công khai | Mở link bộ sưu tập ở tab ẩn danh (chưa đăng nhập) | Bộ sưu tập công khai xem được khi chưa đăng nhập |

### 4.8 Phòng lọc nhóm

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 34 | Tạo phòng | `/discover` → "Đi cùng nhóm" → tab "Tạo phòng mới" → nhập tên → Tạo | Vào `/rooms/:code`; banner phòng hiện trên toolbar; bộ lọc cá nhân bị ẩn (cả nhóm cùng một kết quả) |
| 35 | Mời qua mã | Copy mã phòng → máy/tab khác (có thể để guest, không cần đăng nhập) → "Đi cùng nhóm" → tab tham gia → nhập mã | Cả hai cùng thấy phòng; danh sách thành viên cập nhật |
| 36 | Đề xuất include/exclude | Trong phòng: form "Đề xuất của bạn" → chọn include hoặc exclude → chọn loại/quận/từ khoá → gửi | Đề xuất hiện trong "Đề xuất của cả nhóm" kèm tên người đề xuất |
| 37 | Áp dụng đề xuất | Bấm "Áp dụng" trên một đề xuất (ai cũng bấm được) | Kết quả lọc chung của cả nhóm thay đổi theo đề xuất |
| 38 | Realtime SSE | Mở phòng ở 2 tab; tab A gửi đề xuất | Tab B thấy đề xuất mới **ngay** không cần refresh (SSE `/api/v1/rooms/:code/events`) |
| 39 | Rời phòng | Bấm rời phòng trên banner | Quay về `/discover` với bộ lọc cá nhân bình thường |

### 4.9 Thông báo

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 40 | Chuông + badge | Đang đăng nhập ở tab A; tab B (user khác) like/bình luận bài hoặc follow | Badge số chưa đọc trên mục "Thông báo" tăng **ngay** (SSE realtime) |
| 41 | Danh sách thông báo | Mở `/notification` | Thông báo like/comment/follow hiện đúng, phân loại rõ; bấm vào điều hướng tới đối tượng |
| 42 | Đánh dấu đã đọc | Bấm thông báo / đánh dấu tất cả đã đọc | Badge giảm về 0 |

### 4.10 Hồ sơ & cài đặt

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 43 | Sửa hồ sơ | `/settings` → đổi "Tên hiển thị", "Giới thiệu", "Địa điểm" → "Lưu thay đổi" | Lưu thành công; tên mới hiện trên topbar và `/profile` |
| 44 | Ảnh đại diện / ảnh bìa | `/settings` → chọn ảnh mới | Ảnh **upload ngay khi chọn** (không cần bấm Lưu) — cần R2. Không có R2 → báo lỗi cấu hình ảnh |
| 45 | Riêng tư | Bật "Hồ sơ riêng tư" | Lưu thành công; kiểm tra `/u/:handle` từ tài khoản khác |
| 46 | Xoá tài khoản | `/settings` → "Xoá tài khoản" → xác nhận | Xoá và đăng xuất (cẩn thận — không hoàn tác) |

### 4.11 Phiên & đa tab

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 47 | Đăng xuất | Menu avatar → "Đăng xuất" | Về trang chủ trạng thái khách; cache xoá sạch |
| 48 | Đồng bộ đa tab khi đăng xuất | Mở app ở 2 tab → đăng xuất ở tab A | Tab B hiện toast "Bạn đã đăng xuất ở tab khác" rồi **tự** điều hướng về `/login` (BroadcastChannel `rendez-session`) — không cần refresh tay |

> [!NOTE]
> Chỉ sự kiện **đăng xuất** được phát đa tab. Đăng nhập ở tab A không tự đăng
> nhập tab B — tab B phải thao tác rồi mới thấy phiên mới (phép dò `GET /me`).

### 4.12 Demo bảo vệ — search thông minh, overlay dev, `/system`, card mới

> Mục này bổ sung cho đợt demo bảo vệ (commit `25558ee`, `b81a62e`, `e6153fd`).
> Các bước đã đối chiếu với source: `backend/src/routes/places.ts`,
> `backend/src/routes/system.ts`, `backend/src/lib/search-synonyms.ts`,
> `frontend/src/components/dev/api-debug-overlay.tsx`,
> `frontend/src/features/places/components/place-card.tsx`,
> `frontend/src/features/places/lib/danang-districts.ts`.

#### A. Tìm kiếm thông minh

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 49 | Tìm không dấu | `/search?q=caphe trung` (hoặc gõ vào ô search) | Ra quán **"Cà phê Trung"** — chuẩn hoá bỏ dấu/dấu câu chạy cả FE lẫn SQL (`immutable_search_normalize`) |
| 50 | Sai chính tả → "Ý bạn là" | Gõ `caphe trungg` (thừa chữ g) | Trên `/search` hiện dòng **"Ý bạn là Trình cà phê?"** — tên gợi ý là nút bấm được, bấm → tìm lại bằng đúng tên |
| 51 | Từ đồng nghĩa | Gõ `quan ngon` | Kết quả gồm cả nhóm `quan-an` / `nha hang` / `quan-nhau` (map đồng nghĩa server-side, xem `search-synonyms.ts`) |

#### B. Overlay dev (Ctrl+Shift+D) — "ẩn với user thường"

Overlay chỉ tồn tại ở bản dev: `import.meta.env.PROD` → component trả `null`
ngay từ ngoài, nhánh dev bị tree-shake khỏi bundle production.

1. Chạy dev server (tránh đụng cổng 5173 của container `web`):

   ```bash
   bun run dev --port 5199 --strictPort   # Vite :5199, API vẫn :8000 qua proxy
   ```

   (Đây là cùng lệnh Playwright dùng cho e2e — xem `frontend/playwright.config.ts`.)

2. Mở http://localhost:5199 → bấm **Ctrl+Shift+D** → góc phải dưới hiện overlay
   mono kiểu:

   ```
   GET /api/v1/places · 17ms · cache: MISS · 343 kết quả
   ```

   Số liệu đọc thẳng từ `meta` server trả (`tookMs`, `cacheHit`, `totalResults`,
   `didYouMean` khi có) — không tự đo lại ở client.

3. **Điểm demo then chốt**: mở bản build PROD (docker `web` :5173) → Ctrl+Shift+D
   **không hiện gì** — overlay không nằm trong bundle production.

> [!NOTE]
> Danh sách `/places` hiện chưa có cache ứng dụng nên `cacheHit` luôn `false`
> (overlay luôn ghi `MISS` cho endpoint này — đúng, không phải lỗi). Cache ứng
> dụng thật nằm ở `GET /places/suggestions` — xem demo cold/warm ở mục D.

#### C. `/system` — số liệu vận hành

FE có route `/system` (`frontend/src/features/system/pages/system-page.tsx`, **ẩn khỏi
thanh điều hướng**, chỉ mở trực tiếp khi demo) gọi `GET /system/stats` và `POST /system/reset`.
Cũng có thể demo trực tiếp bằng curl:

```bash
# Số liệu: uptime, tổng query, latency TB, tỉ lệ cache hit, đếm venue trong DB
curl -s http://localhost:8000/api/v1/system/stats | jq

# Xoá bộ đếm trong RAM (KHÔNG xoá dữ liệu DB)
curl -s -X POST http://localhost:8000/api/v1/system/reset
```

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 52 | Xem số liệu vận hành | `GET /api/v1/system/stats` | JSON có `uptimeMs`, `totalQueries`, `avgLatencyMs`, `cacheHitRatio`, `byEndpoint`, `venues` (total/published/withImages/withTags/withHours) |
| 53 | Reset chỉ ở dev | `POST /api/v1/system/reset` ở dev → `{ "reset": true }`; ở production (NODE_ENV=production) | **403** "Reset metrics chỉ khả dụng ở môi trường demo/dev" — điểm demo bảo mật |

#### D. Cold vs warm cache (60 giây)

Cache ứng viên gợi ý có TTL **60 giây** (`suggestions.ts`), nên demo phải làm
trong vòng một phút:

```bash
# Lần 1 — cold: cacheHit false
curl -s "http://localhost:8000/api/v1/places/suggestions?q=hôm nay ăn gì" | jq .meta
# → { "tookMs": …, "cacheHit": false, "totalResults": … }

# Lần 2 ngay sau đó — warm: cacheHit true, tookMs thấp hơn hẳn
curl -s "http://localhost:8000/api/v1/places/suggestions?q=hôm nay ăn gì" | jq .meta
# → { "tookMs": …, "cacheHit": true, … }
```

#### E. Card địa điểm mới

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 54 | Chip "Điểm gợi ý" | Mở `/discover`, nhìn 3 card dải **"Gợi ý hôm nay"** | Card có chip ✨ **"Điểm gợi ý X/100"** kèm quận, "Đang mở/Đóng" và tối đa 3 signal — dữ liệu `why` do backend tính (`matchPercent` là điểm chất lượng tuyệt đối, không phải % khớp sở thích) |
| 55 | Badge "Mới" | Tìm quán được duyệt trong 14 ngày gần nhất (~43 quán) | Badge "Mới" trên card — tính theo `publishedAt`, không phải `createdAt` |
| 56 | Vibe tags | Nhìn phần thẻ trên card | Tối đa 3 tag hiện, thẻ dư gộp thành "+N" |
| 57 | Trạng thái mở cửa | So sánh card quán đang mở và quán đã đóng | Badge xanh "Đang mở cửa" / xám "Đã đóng cửa" theo giờ mở cửa |
| 58 | Ẩn "Chưa có đánh giá" | Nhìn card quán 0 review | **Không** hiện nhãn "Chưa có đánh giá" (chỉ hiện rating khi `reviewCount > 0`) |
| 59 | Đếm kết quả từ server | Chạy tìm kiếm trống trên `/discover` (khi overlay dev bật) | Overlay ghi **343 kết quả** — số đọc từ `meta.totalResults`, không phải đếm client |

#### F. Bộ lọc quận chuẩn 7 nhãn

| # | Chức năng | Bước thao tác | Kết quả mong đợi |
|---|---|---|---|
| 60 | 7 nhãn quận | `/discover` → "Quận" | Đúng 7 nhãn: **Hải Châu, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ, Hòa Vang, Hoàng Sa** |

> [!WARNING]
> Nhãn quận là **phân nhóm xấp xỉ theo ranh giới quận cũ** của corpus OSM (các
> tên cũ Thanh Khê, An Hải, Hòa Cường… đã được gộp/sửa trong DB — quyết định
> `D-060`). Không coi ranh giới này là ranh giới hành chính chính thức.

#### G. Ảnh minh hoạ theo category

Ảnh đại diện sinh lúc build theo category + hash tên quán (`manifest.json`),
nên quán cùng category có ảnh khác nhau nhưng ổn định giữa các lần build. Hiện
manifest mới có **3 ảnh** (`cafe-1`, `cafe-2`, `quan-an-1`); 29 ảnh còn lại chờ
quota AI reset rồi sinh lại — đã ghi `docs/BACKLOG.md`. Quán chưa có ảnh vẫn
hiển thị bình thường (placeholder), không phải lỗi.

---

## 5. Bảng biến môi trường tổng hợp

Nguồn: `backend/.env.example`, `deploy/.env.example`, `deploy/compose.prod.yml`,
`docs/backend/RUNBOOK.md` mục 3.

| Biến | Bắt buộc? | Ý nghĩa | Ví dụ |
|---|---|---|---|
| `DATABASE_URL` | ✔ | Postgres; compose tự dựng từ `POSTGRES_*` | `postgresql://rendez:pass@postgres:5432/rendez` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | ✔ (prod) | Thông số Postgres; compose ghép thành `DATABASE_URL` | `rendez` / mật khẩu mạnh / `rendez` |
| `NODE_ENV` | ✔ (prod) | `production` → env.ts **từ chối** secret dev | `production` |
| `PORT` | — | Cổng API (compose cố định 8000) | `8000` |
| `BETTER_AUTH_SECRET` | ✔ (prod) | Secret ký session, ≥ 32 ký tự | `openssl rand -base64 48` |
| `BETTER_AUTH_URL` | ✔ (prod) | URL public của API — better-auth dựng link reset | `https://rendez.example.com` |
| `CORS_ORIGINS` | ✔ (prod) | CSV origin FE được gọi API | `https://rendez.example.com` |
| `APP_ORIGIN` | ✔ (prod) | Origin FE công khai — link xác thực email, `og:url`/canonical, tuyệt đối hoá ảnh OG, robots/sitemap lúc build FE | `https://rendez.example.com` |
| `TRUSTED_PROXIES` | ✔ (prod) | IP proxy tin tưởng để lấy IP client (rate limit); prod cố định IP Caddy | `172.30.0.2` |
| `LOG_LEVEL` | — | `fatal\|error\|warn\|info\|debug\|trace` | `info` |
| `R2_ACCOUNT_ID` | tuỳ chọn | Cloudflare account ID (upload ảnh) | 32 ký tự hex |
| `R2_ACCESS_KEY_ID` | tuỳ chọn | Access key token R2 (Object Read & Write) | — |
| `R2_SECRET_ACCESS_KEY` | tuỳ chọn | Secret key R2 (chỉ hiện một lần) | — |
| `R2_BUCKET` | tuỳ chọn | Tên bucket | `rendez` |
| `R2_PUBLIC_BASE_URL` | tuỳ chọn | Domain đọc ảnh công khai | `https://pub-xxxx.r2.dev` |
| `SMTP_HOST` | tuỳ chọn | Host SMTP gửi mail | `smtp.resend.com` |
| `SMTP_PORT` | tuỳ chọn | Cổng SMTP (mặc định 465 SMTPS) | `465` |
| `SMTP_USER` | tuỳ chọn | User SMTP | `resend` |
| `SMTP_PASSWORD` | tuỳ chọn | Password SMTP (API key Resend `re_...`) | — |
| `MAIL_FROM` | tuỳ chọn | Địa chỉ From, phải thuộc domain đã xác minh | `Rendez <no-reply@mail.tenmien.vn>` |

> [!NOTE]
> Dev (`docker compose up -d`): chỉ cần `POSTGRES_*` (mặc định `rendez_dev`) —
> mọi biến khác có mặc định an toàn. Prod: 5 biến đầu bảng là bắt buộc
> (fail-fast khi thiếu), `APP_ORIGIN` ngoài API còn được truyền vào **build**
> frontend.

---

## 6. Sự cố thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Container `api` unhealthy / restart loop | Lỗi boot (env sai, DB chưa sẵn) | `docker compose logs -f api` xem thông báo; env được validate một lần lúc boot, sai thì thoát ngay với thông báo rõ |
| `POSTGRES_PASSWORD phải được đặt` / `BETTER_AUTH_SECRET phải được đặt` | Thiếu biến khi chạy prod | Điền đủ vào `.env` rồi `up -d` lại |
| `BETTER_AUTH_SECRET phải được đặt riêng ở production` | Chạy prod với secret dev | Đặt secret ≥ 32 ký tự (`openssl rand -base64 48`) |
| Upload ảnh lỗi "Tính năng ảnh chưa được cấu hình" (503) | Thiếu biến `R2_*` | Điền đủ 5 biến R2 (`docs/backend/R2-SETUP.md`), restart API. Lỗi CORS khi PUT → thêm CORS Policy cho bucket |
| Không nhận mail xác thực / quên mật khẩu | Thiếu `SMTP_*` + `MAIL_FROM`, hoặc domain chưa xác minh | Điền đủ biến (`docs/backend/SMTP-SETUP.md`). Dev: link vẫn in log (`grep "link xác thực"`). Prod: mail thất bại chỉ log `Gửi email ... thất bại`, **không log link** |
| Trang trắng ở prod | Build FE khi chưa có `APP_ORIGIN` (canonical/OG trỏ localhost) hoặc thiếu mount `frontend/dist` | Đặt `APP_ORIGIN` rồi build lại qua compose; kiểm tra volume `./frontend/dist:/srv/web:ro` của Caddy |
| Port conflict (5173 / 8000 / 5432 đã bị chiếm) | Dev server Vite đang chạy cùng container `web`; hoặc service khác chiếm cổng | Tắt tiến trình chiếm cổng, hoặc đổi `API_PORT` / `WEB_PORT` / `POSTGRES_PORT` khi `docker compose up` |
| FE gọi API lỗi 403 CORS | Origin FE không nằm trong `CORS_ORIGINS` | Thêm origin vào `CORS_ORIGINS`, restart API |
| Đăng nhập báo "Email chưa được xác thực" | User tạo trước khi bật verification | Chạy `bun run db:deploy` (migration backfill) hoặc gửi lại mail xác thực từ trang đăng nhập |
| 429 liên tục khi test tay | Rate limit theo IP | Chờ hết cửa sổ hoặc xoá bản ghi `rate_limits` của IP đó |
| SSE phòng/thông báo không nhận cập nhật | API chạy nhiều instance | Pub/sub hiện in-RAM, chỉ hỗ trợ 1 instance API |
| `prisma migrate deploy` báo `CLI.COMMAND_MOVED` | `bunx` tải Prisma mới | Dùng Prisma trong `node_modules` (image migrator) hoặc `bun run db:deploy` |

---

## 7. Những gì CHƯA xác minh

Nghiêm túc ghi nhận để không nhầm "đã chạy" với "đã kiểm chứng":

- **Cấu hình production trên VPS thật** (Docker + domain + TLS Let's Encrypt):
  cấu hình đã được kiểm cú pháp và luồng logic, **chưa chạy trên máy chủ thật**
  (`deploy/README.md` mục 5).
- **SMTP thật**: các bước Resend theo tài liệu chính thức 11/2026, chưa gửi mail
  thử từ môi trường này. Dev không có SMTP vẫn nghiệm thu được nhờ link in log.
- **Facebook Sharing Debugger**: cần domain public https; chưa chạy thử với
  domain thật.
- **R2 production**: nên dùng Custom Domain thay `r2.dev` (giới hạn băng thông) —
  chưa kiểm chứng trên bucket thật.
