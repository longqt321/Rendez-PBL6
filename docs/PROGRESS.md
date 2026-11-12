# PROGRESS — phiên 2026-11-11

## Trạng thái hiện tại (19:00): **corpus 344 POI đã seed, sẵn sàng kiểm thử**

| Hạng mục | Trạng thái |
|---|---|
| Pipeline data (fetch → build → seed) | ✅ Xong, đã xác minh bằng output thật |
| Corpus | **344 POI**, 86 curated, 258 OSM |
| Docs | ✅ Đã đồng bộ |
| Backend / Frontend | ✅ Đã đồng bộ (category map, seed) |
| **Phần AI search** | ⬜ **Chưa bắt đầu** |

---

## Lượt chạy 19:00 — Audit dữ liệu + định hướng "địa điểm nổi bật"

### Kết quả chạy thật (ĐÃ XÁC MINH)

```
[build] T4b (địa điểm nổi bật): 349 (loại 2209)
[build] GIỚI HẠN CHUỖI: bỏ 90 chi nhánh trùng thương hiệu (giữ tối đa 3/thương hiệu)
[build] đã ghi 344 place
[seed] Xong: 344 place
```

| Chỉ tiêu | Kết quả |
|---|---|
| A1 quy mô | ⚠️ 344 < 600 — **user chốt chấp nhận** (D-AI-42) |
| A2 tên có chữ cái | ✅ 100% |
| A3 toạ độ | ✅ 100% |
| A17 cafe | ✅ 26.5% (91) |
| A7 khac | ✅ 1.7% (6) |
| sieu-thi / mall / cho | ✅ 35 / 11 / 14 |
| giải trí | ✅ 16 (4.7%) |
| Không còn tiện ích nhỏ lẻ | ✅ 0 |
| A9 openingHours | ✅ **57.6%** (lần đầu vượt 25%) |
| A10 phone | ✅ **53.2%** (lần đầu vượt 20%) |
| district phỏng đoán | ✅ 57.6% ≤ 60% |
| Quality TB | 63.1 · min 15 · max 100 · <10: 0 |

### Nguyên nhân thay đổi so với lần 2 (2726 POI)

| Thay đổi | Tác động |
|---|---|
| Thêm **T2b** (lọc tên) | Loại 99 tên rác: địa chỉ 19, ký hiệu 4, tên người trơ 42, phi ẩm thực 34 |
| Thêm **T4b** (địa điểm nổi bật, `-min-signals 2`) | Loại 2209: tiện ích 341, thiếu tín hiệu 1830, chợ nhỏ 38 |
| Thêm **`-max-branch 3`** | Cắt 90 chi nhánh chuỗi (76 Đồng Tiến Bakery, Full Market, Highlands…) |
| Tách bán lẻ 5 nhãn (D-AI-40) | `sieu-thi` 472→35 (chỉ thương hiệu lớn), `cua-hang-tien-loi`/`tap-hoa`/`thuc-pham`/`ruou` → loại hết |
| Lexicon món thắng cuisine | "Bánh Bèo Nóng" → `banh-beo` thay vì `viet-nam` |

### 8 lỗi đã sửa (từ 2 agent phản biện + 1 audit agent)

| # | Lỗi | Sửa |
|---|---|---|
| 1 | Data-code drift (`mart` trên đĩa, `sieu-thi` trong code) | `validCategories` → build FAIL; `seed.ts` assert lần 2 |
| 2 | Tạp hóa gán `sieu-thi` | Tách `tap-hoa`, T4b loại |
| 3 | "Gần Vincom Plaza" → mall, "Crowne Plaza" (khách sạn) → mall | Tag quyết định trước tên; chặn `gần/near/đối diện` |
| 4 | "Nhà hàng chay" → `quan-an` (mất nhãn chay) | Bỏ term chung; sort lexicon dài→ngắn |
| 5 | `spa` gộp `shop=massage` | Tách nhãn `massage` |
| 6 | `shop=wine` → `quan-nhau` | → `cua-hang-ruou` |
| 7 | OSM vandalism (phone "123456789", web "Loren.com") | `looksFakePhone`/`looksFakeWebsite` |
| 8 | Lỗi nhãn do tên (`Chợ Mân Thái`→thai, `thegioididong.com`→com) | `nonFoodMarkers` + `cho` chỉ khớp đầu tên |

Chi tiết: `docs/LESSONS.md` L-020, L-021, L-022 · `DECISIONS-ai.md` D-AI-40..44.

### Đã cập nhật tài liệu

- `docs/ai/filter-funnel.md` — lần chạy 3 (344 POI) đầy đủ funnel 8 tầng + lý do loại
- `docs/ai/runbook-corpus.md` — funnel 8 tầng, `-min-signals`, `-max-branch`
- `docs/LESSONS.md` — L-020..L-022
- `DECISIONS-ai.md` — D-AI-40..44
- `MUC-TIEU-DO-DUOC.md` — A1 đổi ≥600, thêm A1b/A1c
- `docs/PROGRESS.md` — file này

### Chưa làm

- [ ] Audit lại 344 POI (agent trước audit trên 449)
- [ ] Cross-check Wikidata trên corpus 344
- [ ] Kiểm tay 50 mẫu gán nhãn (A8)
- [ ] **Ranker AI (pairwise logistic)** ← phần chính
- [ ] 100 query gán nhãn
- [ ] Thí nghiệm N-1..N-7
- [ ] Trang `/demo`
- [ ] Báo cáo đồ án

---

## Lượt chạy 15:20–15:45 — rà soát pipeline + sửa 7 lỗi

### Nguyên nhân không tự chạy được (đã xác minh)

| Kiểm tra | Kết quả |
|---|---|
| `run_command` | ❌ fail: `/home/longtran/Projects/frontend: no such directory` — workspace binding trỏ path cũ |
| `browser fetch example.com` | ❌ `TypeError` — browser sandbox **không có internet** |
| Go toolchain trong sandbox | ❌ không có |

⇒ Mọi thay đổi do agent viết, **người dùng chạy tay**.

### Lỗi đã phát hiện & sửa trong lượt này

| # | File | Lỗi | Mức |
|---|---|---|---|
| 1 | `crosscheck/main.go` | Struct hẹp khiến ghi đè file làm **mất address/phone/hours/district/tier/images** của ~1800 quán | 🔴 |
| 2 | `build-corpus/main.go` | Công thức cap-cafe sai → tỉ lệ cuối vẫn > 35% | 🔴 |
| 3 | `build-corpus/main.go` | Phân bố đếm trước gộp curated + cap → % không khớp corpus cuối | 🟡 |
| 4 | `build-corpus/main.go` | Quán curated `quality=0` bị cap-cafe cắt oan | 🟡 |
| 5 | `crosscheck/main.go` | `Meta` nil → panic | 🟡 |
| 6 | `fetch-osm/main.go` | Request body tái dùng → lần thử 2/3 gửi body rỗng | 🔴 |
| 7 | `fetch-osm/main.go` | Regex L6 một âm tiết khớp "Comfort"/"Phoenix"/"Smart" | 🟡 |

Chi tiết bài học: `docs/LESSONS.md` L-015, L-016.

### Lần chạy 2 (16:45) — 2726 POI (ĐÃ THAY THẾ bởi lần chạy 3)

Funnel: raw 3202 → T1 2690 → T2 2684 → T3 2658 → T4 2657 → T5 2738 → T6 2726.
Metadata: hours 15.2%, phone 15.7% (chưa đạt). district phỏng đoán 88%.
Lý do thay thế: 472 "mart" thực ra là 410 cửa hàng tiện lợi + 32 siêu thị; 76/84 bánh mì
là một chuỗi bakery; tầng lọc tên chỉ loại 0.22%.

---

## Phiên 2026-11-11 → 2026-11-12 — tự hành đêm + ngày: 8 tính năng mới + kiểm thử đầy đủ

### Kết quả chạy thật (ĐÃ XÁC MINH, ngày 2026-11-12)

| Chỉ tiêu | Kết quả |
|---|---|
| Backend `bun test --parallel=1` | **256 pass / 0 fail**, 25 file, ~154 giây |
| Typecheck backend | 0 lỗi |
| Unit test frontend | **135 pass / 29 file** |
| Typecheck + lint frontend | 0 lỗi, 0 cảnh báo |
| e2e Playwright project `mock` | **42 pass / 16 spec** |
| Mã nguồn backend | 45 file `src` ~7.200 dòng, 56 route handler tự viết |
| Mã nguồn frontend | 282 file ~21.300 dòng |
| Migration đã áp dụng | 18 |
| Bảng schema `public` | 27 |
| Seed | 344 địa điểm seed (343 published: 86 curated + 257 OSM; 1 chưa duyệt làm mẫu test), 29 ảnh gốc (87 tệp gồm biến thể WebP) |
| DB dev | 3 user thật (đã dọn 167 user fixture test + 32 post rác + 6 phòng test) |

### 8 tính năng mới (thiết kế `docs/thiet-ke/`, quyết định `docs/DECISIONS.md` D-055..D-058)

1. **Gợi ý hôm nay (daily picks)**: bảng `daily_picks`, job pg-boss cron 00:05
   Asia/Ho_Chi_Minh, transaction + test rollback bằng trigger Postgres thật, ưu tiên quán
   curated có ảnh (imageCount +2 điểm, cổng chất lượng), `GET /places/daily-picks` public
   `max-age=300` + ETag.
2. **Tìm người + gợi ý theo dõi**: `GET /users/suggestions` (`no-store`, chỉ dữ liệu công
   khai), scoring theo quán chung/theo dõi chéo/hoạt động 30 ngày, chặn pool ứng viên 500
   người mới nhất, index `reviews(author_id)` (migration `20261112030000_audit_indexes`,
   đồng thời bỏ index thừa `daily_picks_pick_date_idx`).
3. **Share + OG động**: nginx UA-sniff bot → proxy `GET /og/place/:id` và `/og/post/:id`
   (Hono, escape qua `hono/html`, `safeImageUrl` chặn `javascript:`/`data:`), Caddy tương
   ứng ở prod, cache public 600s / 404 60s.
4. **Lọc giá + sắp xếp server-side**: `sort=newest/rating/distance`, `PlaceCursor` 3 kind,
   keyset cursor xử lý NULL distance, `priceMax` 1–3; ảnh responsive WebP sinh lúc build
   (58 biến thể, tổng ảnh trang discover 2,61 MB → 0,72 MB, `EXPLAIN` 3 sort < 50 ms).
5. **Bắt buộc xác thực email trước khi đăng nhập (D-056)**: đăng ký không tạo phiên, mail
   xác thực → redirect `/verify-email?verified=1`, đăng nhập chưa xác thực → 403 message
   tiếng Việt.
6. **Rate limit social byUser**: `POST /posts` 30/giờ, like 30/phút, comment 10/phút,
   follow 20/phút (429 + `Retry-After`).
7. **Cache private `no-cache`** cho dữ liệu phụ thuộc viewer; interceptor 401 FE (chỉ đá
   phiên khi mutation/GET `authRequired`) + `BroadcastChannel` đồng bộ đăng xuất đa tab.
8. **Deploy**: `compose.prod` sửa network split (postgres/migrate vào `rendez_net`), thêm
   `APP_ORIGIN` + 5 biến `R2_*`, Caddy mount `/srv/web` + matcher file tĩnh 404 + `(?i)`
   regex bot, nginx `proxy_buffering off` cho SSE, SEO origin động (plugin Vite sinh
   `robots.txt`/`sitemap.xml` từ `APP_ORIGIN` lúc build, token `__APP_ORIGIN__` trong
   `index.html`).

### Đã cập nhật tài liệu

- `docs/backend/REPORT.md` — số liệu mới + mục 8 tính năng mới + mục 12 Chưa xác minh
- `docs/backend/README.md` — trạng thái 2026-11-12
- `docs/PROGRESS.md` — file này

### Chưa xác minh

- [ ] `caddy validate` (máy dev không có binary Caddy)
- [ ] Deploy prod thật
- [ ] SMTP/Resend thật (mail dev vẫn log link)
- [ ] Preview FB/Zalo thật (cần domain public)
- [ ] `bun test` không cờ `--parallel=1` có race không

---

## Phiên 2026-11-13 — demo bảo vệ: search thông minh + quan sát vận hành + card mới

### Commit (main, tuần tự)

| Commit | Nội dung |
|---|---|
| `25558ee` | corpus: chuẩn hoá 7 quận + vibes từ OSM + `publishedAt` trải theo hash |
| `b81a62e` | API: `meta {tookMs, cacheHit, totalResults, didYouMean}`; search không dấu + đồng nghĩa + "Ý bạn là"; `why` daily-picks; `/system/stats` + `/system/reset` |
| `e6153fd` | FE: card vibes + badge "Mới" + chip "Điểm gợi ý X/100"; "Ý bạn là"; overlay dev Ctrl+Shift+D; ảnh minh hoạ theo hash; count từ `meta` |

### Kết quả verify (ĐÃ XÁC MINH, ngày 2026-11-13)

| Chỉ tiêu | Kết quả |
|---|---|
| Backend `bun test --parallel=1` | **289 pass / 0 fail** |
| Unit test frontend | **146 pass** |
| e2e Playwright `mock` | **42 pass** |
| DB | **344 place, 343 published** (`psql` đếm trực tiếp, `deleted_at IS NULL`) |
| Overlay dev | Chỉ bundle dev (`import.meta.env.PROD` → `null` + tree-shake); Ctrl+Shift+D toggle |
| `/system` | `GET /system/stats` + `POST /system/reset` (403 khi `NODE_ENV=production`); **FE không có route /system** |
| Filter quận | Đúng 7 nhãn (phân nhóm xấp xỉ theo quận cũ — D-060) |

### Tài liệu đã cập nhật

- `docs/HUONG-DAN-CHAY-VA-NGHIEM-THU.md` — mục **4.12 Demo bảo vệ** (mục 49–60:
  search không dấu/sai chính tả/đồng nghĩa, overlay dev, `/system` cold–warm
  cache, card mới, 7 quận) + TIP cổng dev 5199
- `docs/PROGRESS.md` — file này

### Chưa làm (đã ghi BACKLOG)

- [ ] 29 ảnh minh hoạ còn lại chờ quota AI reset (hiện manifest có 3: `cafe-1`,
  `cafe-2`, `quan-an-1`) — xem `docs/BACKLOG.md`
- [ ] Ranker AI (pairwise logistic), 100 query gán nhãn, thí nghiệm N-1..N-7
