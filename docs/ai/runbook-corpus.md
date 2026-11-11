# RUNBOOK — Mở rộng corpus (chạy tay, ~20 phút)

**Tại sao phải chạy tay:** môi trường agent phiên này **không có shell** (workspace trỏ
`/home/longtran/Projects/frontend` đã không tồn tại) và **browser sandbox không có internet**
(đã xác minh: `fetch('https://example.com')` → TypeError). Code đã viết sẵn, bạn chỉ chạy.

---

## Bước 0 — Backup (bắt buộc trước khi reseed)

Postgres chạy trong Docker, host không có `pg_dump`:

```fish
cd ~/Projects/rendez
docker exec rendez-postgres pg_dump -U rendez -d rendez > backend/data/backup-(date +%Y%m%d-%H%M).sql
ls -lh backend/data/backup-*.sql
```

## Bước 1 — Fetch OSM (vòng L6 + L7)

```fish
cd ~/Projects/rendez/backend/scripts/fetch-osm
go build -o fetch-osm .; and ./fetch-osm -round L6 -out ../../data/raw
./fetch-osm -round L7 -out ../../data/raw
```

- **L6** = đa dạng ẩm thực + tên tiếng Việt **không dấu** (quan nhau, lau nuong, nuong bo,
  an vat, banh mi, oc, che…), dùng `out meta center` để có timestamp/version phục vụ chấm
  điểm "còn hoạt động".
- **L7** = **giải trí** (user chốt 2026-11-11): karaoke (`amenity=karaoke_box`, `karaoke=yes`),
  music box/nhạc sống (`amenity=music_venue` + tên "music box/nhạc sống/acoustic"),
  cinema, bowling, bida (`sport=billiards`), arcade/escape game, spa/massage,
  công viên nước. **KHÔNG có casino** (user yêu cầu bỏ, D-AI-38).
- **L6** cũng lấy **siêu thị lớn + TTTM** (`shop=supermarket|mall|department_store` +
  tên "trung tâm thương mại/tttm/vincom/aeon/coopmart/winmart/big c/lotte mart").
  **KHÔNG lấy** cửa hàng tiện lợi / tạp hóa / cửa hàng thực phẩm / cửa hàng rượu —
  app không chứa tiện ích Google Maps (D-AI-42).

- `502` / `504` = Overpass quá tải. Script chờ 5s → 20s → 45s rồi tự đổi endpoint
  (6 endpoint dự phòng). **Đừng Ctrl+C** — tệ nhất ~4 phút.
- Cả 6 endpoint fail → đợi 10–15 phút rồi chạy lại.
- L6 nặng hơn L1; nếu `504` liên tục, chạy `-round L5` trước (nhẹ hơn, vẫn có quán nhậu/mart/farm).

## Bước 2 — Lọc + chấm điểm + cân bằng lớp

```fish
cd ../build-corpus
go build -o build-corpus .; and ./build-corpus -raw ../../data/raw -out ../../data/places-expanded.json
```

Output in ra:
- **Bảng funnel 8 tầng**: RAW → T1 (name+toạ độ) → T2 (có chữ cái) → **T2b (tên searchable)**
  → T3 (dedup <50m) → T4 (trong bbox) → **T4b (địa điểm nổi bật)** → T5 (gộp curated)
  → T6 (cap-cafe) → CUỐI
- **Bảng lý do loại** của T2b (địa chỉ / ký hiệu / tên người trơ / phi ẩm thực) và
  T4b (tiện ích / chợ nhỏ / thiếu tín hiệu)
- **Phân bố quận** kèm dòng nguồn: bao nhiêu `addr:district` thật vs bao nhiêu **phỏng đoán centroid**
- **Phân bố category / metadata / qualityScore / tỉ lệ tên có dấu**
- **Cảnh báo** nếu: 1 quận > 40% · cafe > 35% · `khac` > 20% · corpus < 600 ·
  còn POI tiện ích · bộ lọc nổi bật loại > 85%

Cơ chế quan trọng:
- `-min-signals 2` — **chỉ giữ quán có mô hình kinh doanh thật**: cần ≥2 tín hiệu trong
  {phone thật, website thật, opening_hours, brand, tên thuộc chuỗi}. Mall + siêu thị lớn
  + chợ nổi tiếng luôn giữ. Giảm xuống 1 nếu corpus quá nhỏ (D-AI-42).
- `-max-branch 3` — mỗi **thương hiệu** chỉ giữ tối đa 3 chi nhánh điểm cao nhất.
  Lý do: 76/84 "bánh mì" từng là chi nhánh Đồng Tiến Bakery (D-AI-44).
  Key = tên chuẩn hoá cắt tại "-", bỏ token số; key 1 từ được bỏ qua (tên chung).
- `-cap-cafe 0.35` — downsample **giữ quán điểm cao nhất** (`qualityScore`), không theo thứ tự OSM.
  Công thức đúng để tỉ lệ **cuối** = cap: `keep = cap·(N−C)/(1−cap)`.
- Quán curated được gán **sàn điểm 60** để không bị cap-cafe cắt oan.
- `districtApprox: true` = district là phỏng đoán theo centroid (ranker phải coi là xấp xỉ).

File kết quả: `backend/data/places-expanded.json`

## Bước 3 — Cross-check Wikidata (điểm cộng, không phải điều kiện loại)

```fish
cd ../crosscheck
go build -o crosscheck .; and ./crosscheck -in ../../data/places-expanded.json -out ../../data/places-expanded.json
```

- Chạy **4 truy vấn con** (lưới 2×2) để tránh WDQS 504; mỗi mảnh retry 3 lần.
- Một mảnh lỗi → cảnh báo và đi tiếp; **corpus không bị sửa** khi toàn bộ thất bại.
- Khớp tên chuẩn hoá + <300m → `+10` (khớp chính xác) / `+6` (khớp lỏng), ghi
  `crosscheck`, `crosscheckQid`, `crosscheckName`, `crosscheckDistM`.
- **Kỳ vọng tỉ lệ khớp 1–5%** — Wikidata phủ rất thấp với quán bình dân VN.
  Không khớp **không** có nghĩa quán không tồn tại. Phải ghi rõ trong báo cáo.

## Bước 4 — Reseed

```fish
cd ~/Projects/rendez; and bun run db:seed
```

`seed.ts`:
- Ưu tiên `backend/data/places-expanded.json`, không có thì dùng dataset gốc 491.
- Upsert theo id → curated/curated-v2 không bị mất.
- **Tự dọn** place `tier='osm'` không còn trong corpus (rác từ lần seed trước).
  Chỉ xoá `tier='osm'`; **không bao giờ** xoá curated.

Verify:

```sql
SELECT count(*) FROM "places";
SELECT tier, count(*) FROM "places" GROUP BY tier;
SELECT count(*) FROM "places" WHERE name !~ '[[:alpha:]]';  -- phải = 0
SELECT count(*) FROM "places" WHERE lat IS NULL;            -- phải = 0
```

## Bước 5 — Ghi số thật vào docs

Copy output bảng funnel + phân bố từ bước 2 và kết quả cross-check từ bước 3 vào
`docs/ai/filter-funnel.md`. **Mọi ô phải có số thật. Ô trống = chưa chạy.**

---

## Chỉ tiêu (không hạ)

| # | Chỉ tiêu | Ngưỡng |
|---|---|---|
| A1 | POI | ≥ 600 (đổi từ 1500 — D-AI-42: chỉ giữ địa điểm nổi bật) |
| A1b | Không còn tiện ích nhỏ lẻ | 0 POI `cua-hang-tien-loi`/`tap-hoa`/`thuc-pham`/`ruou`/`farm` |
| A2 | Tên có chữ cái | 100% |
| A3 | Có tọa độ | 100% |
| A4 | Trùng lặp | 0 cặp |
| A5 | Quận | ≥ 8/12 có ≥ 20 POI |
| A6 | Category | ≥ 25 nhãn có ≥ 3 POI |
| A7 | `khac` | ≤ 20% |
| A8 | Precision gán nhãn (kiểm 50 mẫu) | ≥ 85% |
| A9 | openingHours | ≥ 25% |
| A10 | phone | ≥ 20% |
| A16 | Quận max | ≤ 40% |
| A17 | cafe | ≤ 35% (downsample có kiểm soát) |
| A19 | Có `sourceId` | 100% |

---

## Đã biết trước — hạn chế phải ghi vào báo cáo

1. **`district` phỏng đoán theo centroid** khi thiếu `addr:district`. Bản ghi đó có
   `districtApprox: true` và `geoPrecision: "district-centroid"`. Muốn chính xác: tải
   GeoJSON ranh giới phường từ OSM và làm point-in-polygon.
2. **`description` = null cho mọi POI mới** — OSM không có, không bịa.
3. **`images` rỗng** — OSM không có ảnh dùng được trực tiếp.
4. **Lexicon món ~50 mục** — precision gán nhãn phải kiểm tay 50 mẫu, không tin định nghĩa.
5. **Dedup ngưỡng 50m** — quán cùng tên khác chủ gần nhau có thể bị gộp nhầm.
6. **Cân bằng lớp là can thiệp vào phân bố** — báo cáo phải ghi: *"corpus được cân bằng lớp
   ở ngưỡng cafe 35% bằng downsample có kiểm soát, giữ quán điểm cao nhất"*.
7. **Cross-check Wikidata phủ thấp (1–5%)** — chỉ là điểm cộng.
8. **Nhãn category mới** `quan-nhau`, `sieu-thi`, `cho`, `mall`, `farm`, `nuong`, `chao`,
   `karaoke`, `massage`… không có trong 34 nhãn gốc; `seed.ts` map về 6 nhóm frontend.
   **Nhãn lạ ⇒ `build-corpus` FAIL và `seed.ts` throw** (L-019/L-022) — không map bừa.
9. **Regex tên L6 dùng biên từ** cho từ một âm tiết (`com`, `pho`, `mart`…) để tránh khớp
   "Comfort"/"Phoenix"/"Smart", nhưng vẫn có thể lọt nhiễu — kiểm qua phân bố category.
10. **Gán nhãn ẩm thực nước ngoài** dựa trên `cuisine` tag + lexicon tên (Nhật/Hàn/Thái/Trung/Ấn).
    Quán không có cả hai → rơi `quan-an`; đây là giới hạn đã biết, không phải lỗi.
11. **Quận để `null`** khi POI cách mọi centroid > 12 km (ra biển, Hòa Vang sâu) — `geoPrecision: "none"`.
12. **Giải trí (L7)** đã nằm trong corpus: nhãn `karaoke`, `music-box`, `cinema`, `bida`,
    `bowling`, `arcade`, `water-park`, `spa`, `massage` (**không có `casino`**). `seed.ts` map về
    6 nhóm frontend (`karaoke`/`cinema`/`bida`/`bowling`/`arcade`/`water-park` → `bar`,
    `music-box` → `cafe`, `spa`/`massage` → `restaurant`).
13. **Mua sắm (D-AI-42):** chỉ còn `sieu-thi` (thương hiệu lớn), `cho` (chợ nổi tiếng whitelist),
    `mall` (TTTM) — cả ba map về `restaurant` ở frontend vì enum chỉ có 6 nhóm.
    `cua-hang-tien-loi`/`tap-hoa`/`cua-hang-thuc-pham`/`cua-hang-ruou`/`farm` **bị loại ở T4b**.
14. **Giải trí làm loãng đánh giá ẩm thực:** khi tính nDCG cho query món ăn, phải lọc theo
    category trước — nếu không, POI giải trí có thể lọt top và làm giảm điểm một cách giả tạo.
    Ghi rõ trong báo cáo.
15. **Cảnh báo có 12 mục** (xem `DECISIONS-ai.md` D-AI-38/42). Muốn thử cảnh báo có hoạt động:
    chạy `./build-corpus -cap-cafe 0.9` — phải thấy "CAP-CAFE KHÔNG ĐẠT".
16. **T2b (lọc tên)** loại: địa chỉ ("43 Hòa Phú 9"), ký hiệu ("3C", "B&M"), tên người trơ
    ("hường", "nga"), phi ẩm thực (khách sạn, thú cưng, văn phòng, kho, nội thất, điện máy).
    **Không loại** "Bà Dưỡng"/"Cô Sáu" (có kính ngữ) — chỉ phạt nhẹ (L-021).
17. **T4b (địa điểm nổi bật)** loại 86% POI thô. Đây là **can thiệp có chủ ý** theo D-AI-42:
    app hướng tới điểm đi chơi, không phải bản đồ tiện ích. Báo cáo phải nêu rõ tỉ lệ loại
    và lý do (`meta.drop_reasons`).
