# FILTER FUNNEL — dữ liệu thật từ OSM Đà Nẵng

**Nguồn:** Overpass, `backend/data/raw/osm-*.json`
**Công cụ:** `backend/scripts/build-corpus`

---

## Lần chạy 1 — 2026-11-11 14:56 (vòng L1, **code cũ**)

> ⚠️ Số dưới đây là **thật** nhưng từ phiên bản code **trước** khi thêm: gộp curated, `qualityScore`,
> cap-cafe, chuẩn hoá quận, cross-check. Dùng làm **baseline đối chiếu**, không phải kết quả cuối.

File: `osm-L1-20261111-145659.json` — 2214 element

| Tầng | Vào | Ra | Loại | Tỉ lệ | Lý do |
|------|-----|-----|------|-------|-------|
| RAW  |  —  | 2214 |  —   |   —   | Overpass L1 (dedup theo OSM id) |
| T1   | 2214 | 1893 | 321 | 14.5% | không có name hoặc toạ độ |
| T2   | 1893 | 1890 | 3 | 0.2% | name không có chữ cái |
| T3   | 1890 | 1872 | 18 | 1.0% | trùng tên + <50m |
| T4   | 1872 | 1872 | 0 | 0.0% | ngoài bbox |
| CUỐI |  —  | **1872** |  —  |   —   | corpus |

### Phân bố quận (lần 1 — CÓ LỖI, đã sửa ở code mới)

Hải Châu 704 (37.6%) · An Hải 503 (26.9%) · Thanh Khê 129 · Hòa Cường 123 · Liên Chiểu 92 ·
Sơn Trà 81 · An Khê 60 · Ngũ Hành Sơn 46 · Hòa Khánh 35 · Cẩm Lệ 32 · Hòa Vang 21 · Hải Vân 18 ·
Hòa Xuân 13 · **+ 7 nhãn bẩn**: Ngu Hanh Son 5, Quận Hải Châu 5, Danang 1, Hai Chau 1,
Quận Cẩm Lệ 1, Quận Ngũ Hành Sơn 1, Quận Sơn Trà 1.

→ Nguyên nhân: chưa có `normalizeDistrict()`. Đã sửa.

### Phân bố category (lần 1 — cafe quá cao)

cafe 885 (47.3%) · quan-an 290 (15.5%) · viet-nam 168 · banh-mi 120 · hai-san 84 · y 42 ·
an-vat 39 · pho 34 · nhat 26 · han 24 · mi-quang 21 · bun 18 · kem-bo 17 · an-do 16 · com 16 ·
che 15 · chay 11 · thai 7 · banh-canh 6 · com-ga 6

→ Nguyên nhân: L1 chỉ lấy `amenity` cơ bản, Đà Nẵng nhiều cafe. Đã sửa bằng L5/L6 + cap-cafe.

### Metadata coverage (lần 1)

| Trường | Số | Tỉ lệ |
|---|---|---|
| openingHours | 298 | 15.9% |
| phone | 258 | 13.8% |
| cuisine | 560 | 29.9% |
| website | 176 | 9.4% |

---

## Lần chạy 3 — 2026-11-11 19:00 (sau audit + D-AI-42/44) ✅ **HIỆN TẠI**

**Kết quả: 344 POI, seed thành công.** Thay đổi so với lần 2: tầng T2b (lọc tên),
T4b (địa điểm nổi bật, `-min-signals 2`), giới hạn chuỗi (`-max-branch 3`),
tách bán lẻ 5 nhãn, lexicon món thắng cuisine.

| Tầng | Vào | Ra | Loại | Tỉ lệ | Lý do |
|------|-----|-----|------|-------|-------|
| RAW  |  —  | 3202 |  —   |   —   | Overpass L6+L7 (dedup theo OSM id) |
| T1   | 3202 | 2690 | 512 | 16.0% | không có name hoặc toạ độ |
| T2   | 2690 | 2684 | 6 | 0.2% | name không có chữ cái |
| T2b  | 2684 | 2585 | 99 | 3.7% | tên không searchable (địa chỉ 19 · ký hiệu 4 · tên người trơ 42 · phi ẩm thực 34) |
| T3   | 2585 | 2559 | 26 | 1.0% | trùng tên + <50m |
| T4   | 2559 | 2558 | 1 | 0.04% | ngoài bbox |
| T4b  | 2558 | 349 | 2209 | 86.3% | không phải địa điểm nổi bật: tiện ích 341 · thiếu tín hiệu 1830 · chợ nhỏ 38 |
| T5   | 349 | 434 | **+85** | — | gộp curated (+86, trừ 1 trùng với OSM) |
| T6   | 434 | 344 | 90 | 20.7% | giới hạn chuỗi (90 chi nhánh: Đồng Tiến, Full Market, Highlands…) + cap-cafe (0) |
| CUỐI |  —  | **344** |  —  |   —   | corpus |

### Nhóm nội dung

| Nhóm | Số | Tỉ lệ |
|---|---|---|
| ẩm thực | 283 | 82.3% |
| mua sắm (sieu-thi 35 + cho 14 + mall 11 — chỉ địa điểm lớn) | 60 | 17.4% |
| giải trí | 16 | 4.7% |

### Phân bố category (top 25)

cafe 91 (26.5%) · quan-an 46 (13.4%) · sieu-thi 35 (10.2%) · viet-nam 19 (5.5%) ·
hai-san 15 (4.4%) · cho 14 (4.1%) · banh-mi 12 (3.5%) · chay 12 (3.5%) · mall 11 (3.2%) ·
y 11 (3.2%) · an-vat 8 (2.3%) · quan-nhau 7 (2%) · khac 6 (1.7%) · massage 6 (1.7%) ·
nhat 5 (1.5%) · com 3 · han 3 · karaoke 3 · mi-quang 3 · nuong 3 · pho 3 · spa 3 ·
arcade 2 · banh 2 · banh-trang-thit-heo 2

### Phân bố quận

Hải Châu 96 (27.9%) · An Hải 83 (24.1%) · Ngũ Hành Sơn 30 (8.7%) · Sơn Trà 27 (7.8%) ·
Thanh Khê 23 (6.7%) · Cẩm Lệ 19 (5.5%) · Hòa Cường 18 (5.2%) · Liên Chiểu 15 (4.4%) ·
**(null) 12 (3.5%)** · An Khê 7 (2%) · Hòa Khánh 6 (1.7%) · Hòa Xuân 6 (1.7%) ·
Hòa Vang 1 (0.3%) · Hải Vân 1 (0.3%)

### Metadata

| Trường | Số | Tỉ lệ | Chỉ tiêu |
|---|---|---|---|
| openingHours | 198 | **57.6%** | ✅ ≥ 25% — **lần đầu vượt ngưỡng** |
| phone | 183 | **53.2%** | ✅ ≥ 20% — **lần đầu vượt ngưỡng** |
| website | 136 | 39.5% | — |
| description | 34 | 9.9% | curated only |
| có ảnh | 20 | 5.8% | — |

→ Metadata tăng vọt vì T4b chỉ giữ POI có ≥2 tín hiệu (phone/website/giờ/brand/chuỗi) —
đúng thiết kế: corpus nhỏ nhưng mỗi POI đều dùng được.

### Chất lượng

- quality trung bình 63.1 · min 15 · max 100 · <10: **0 POI**
- tên có dấu: 58.4%
- district phỏng đoán: 198 (57.6%) ✅ dưới ngưỡng 60%

### Kiểm chỉ tiêu

✅ A2 · A3 · A17 (cafe 26.5% ≤ 35%) · A7 (khac 1.7%) · có sieu-thi/mall/cho/giải trí ·
**không còn tiện ích nhỏ lẻ (0)** · A9 (57.6%) · A10 (53.2%) · district 57.6% ≤ 60%
⚠️ **A1 quy mô 344 < 600** — user chốt chấp nhận (D-AI-42): chất lượng > số lượng.

---

## Lần chạy 2 — 2026-11-11 ~16:45 (vòng L6 + L7, code trước audit) ⚠️ ĐÃ THAY THẾ

**Kết quả: 2726 POI, seed thành công (`[seed] Xong: 2726 place, 29 ảnh`).**

File: L6 + L7 raw (tổng raw 3202 element sau dedup)

| Tầng | Vào | Ra | Loại | Tỉ lệ | Lý do |
|------|-----|-----|------|-------|-------|
| RAW  |  —  | 3202 |  —   |   —   | Overpass L6+L7 (dedup theo OSM id) |
| T1   | 3202 | 2690 | 512 | 16.0% | không có name hoặc toạ độ |
| T2   | 2690 | 2684 | 6 | 0.2% | name không có chữ cái |
| T3   | 2684 | 2658 | 26 | 1.0% | trùng tên + <50m |
| T4   | 2658 | 2657 | 1 | 0.04% | ngoài bbox |
| T5   | 2657 | 2738 | **+81** | — | gộp curated (+86, trừ 5 trùng với OSM) |
| T6   | 2738 | 2726 | 12 | 0.4% | cap-cafe (bỏ cafe điểm thấp) |
| CUỐI |  —  | **2726** |  —  |   —   | corpus |

### Nhóm nội dung

| Nhóm | Số | Tỉ lệ |
|---|---|---|
| ẩm thực | 2467 | 90.5% |
| mua sắm (mart 472 + mall 26 + farm 2) | 500 | 18.3%* |
| giải trí | 131 | 4.8% |

\* *mart 472 (17.3%) cao bất thường — đang kiểm xem có nhiễu gán nhãn không (chưa xác minh).*

### Phân bố category (top 25)

cafe 954 (35%) · mart 472 (17.3%) · quan-an 291 (10.7%) · viet-nam 174 (6.4%) ·
banh-mi 131 (4.8%) · spa 108 (4%) · quan-nhau 101 (3.7%) · y 60 (2.2%) · hai-san 53 (1.9%) ·
an-vat 45 (1.7%) · pho 27 (1%) · khac 26 (1%) · mall 26 (1%) · nhat 25 (0.9%) · han 24 (0.9%) ·
an-do 20 (0.7%) · kem-bo 19 (0.7%) · com 18 (0.7%) · chay 17 (0.6%) · bun 16 (0.6%) ·
thai 15 (0.6%) · nuong 13 (0.5%) · karaoke 11 (0.4%) · com-ga 8 (0.3%) · mi-quang 8 (0.3%)

### Phân bố quận (13 giá trị sạch — normalizeDistrict hoạt động ✅)

Hải Châu 824 (30.2%) · An Hải 787 (28.9%) · Thanh Khê 177 (6.5%) · Hòa Cường 161 (5.9%) ·
**(null) 141 (5.2%)** · Sơn Trà 136 (5%) · Liên Chiểu 113 (4.1%) · Ngũ Hành Sơn 108 (4%) ·
An Khê 88 (3.2%) · Cẩm Lệ 84 (3.1%) · Hòa Khánh 49 (1.8%) · Hòa Xuân 35 (1.3%) ·
Hòa Vang 17 (0.6%) · Hải Vân 6 (0.2%)

(null) = POI cách mọi centroid > 12 km (biển / Hòa Vang sâu) — **không bịa quận**.

### Metadata

| Trường | Số | Tỉ lệ | Chỉ tiêu |
|---|---|---|---|
| openingHours | 413 | 15.2% | ❌ < 25% — **chưa đạt, báo cáo trung thực** |
| phone | 427 | 15.7% | ❌ < 20% — **chưa đạt, báo cáo trung thực** |
| website | 275 | 10.1% | — |
| description | 34 | 1.2% | curated only |
| có ảnh | 20 | 0.7% | — |

### Chất lượng

- quality trung bình 42.5 · min 0 · max 100
- quality < 10: **4 POI** (không cần lọc thêm)
- tên có dấu: 816 (29.9%)

### Cross-check Wikidata

| | |
|---|---|
| Khớp | **0 / 2726 (0%)** |
| Wikidata trong bbox | 631 item, 2 item ăn uống |

→ **Không có tín hiệu từ nguồn này.** Hai khả năng: (a) Wikidata thật sự không phủ quán ăn
Đà Nẵng, (b) query/filter có vấn đề (631 item/bbox thấp bất thường). **Chưa xác minh** vì sandbox
không có internet. Báo cáo phải ghi: *"cross-check Wikidata trả 0 khớp — nguồn không cho tín hiệu
với quán ăn bình dân Đà Nẵng; không dùng làm bằng chứng chất lượng"*.

### Kiểm chỉ tiêu (từ verify-corpus.sh)

✅ A1 (2726≥1500) · A2 (100%) · A3 (100%) · A17 (cafe 35%) · A7 (khac 1%) ·
có mart/mall/giải trí
⚠️ district phỏng đoán 88% > 60%
❌ A9 (15.2% < 25%) · A10 (15.7% < 20%) — **giữ ngưỡng, báo "chưa đạt"** (không hạ lần 2)

## Chưa xác minh

- [x] ~~Chưa chạy build-corpus với code mới (L6 + L7)~~ → **đã chạy 16:45, số ở trên**
- [x] ~~`mart` 472 — chưa kiểm mẫu~~ → **audit xác nhận sai bản chất** (410 convenience), đã tách nhãn + loại tiện ích (D-AI-40/42)
- [x] ~~Tầng lọc tên danh nghĩa~~ → đã thêm T2b (lần chạy 3: loại 99)
- [x] ~~Chuỗi bakery chiếm 17% corpus~~ → đã thêm `-max-branch 3` (cắt 90)
- [ ] Chưa kiểm tay 50 mẫu gán nhãn (A8) — audit agent đã đọc 100% corpus 449 và liệt kê 20 bất thường, đã sửa 3 nhóm lớn; cần audit lại trên corpus 344
- [ ] `district` phỏng đoán 57.6% — chưa đối chiếu ranh giới thật (A16)
- [ ] Cross-check Wikidata — chưa chạy lại trên corpus 344
- [ ] 6 nhãn đặc sản ĐN rỗng (banh-beo, banh-khoai, xoi, che, kem-bo, sinh-to) — đã sửa thứ tự lexicon; cần chạy lại và kiểm có "Bánh Bèo Nóng" → banh-beo chưa
