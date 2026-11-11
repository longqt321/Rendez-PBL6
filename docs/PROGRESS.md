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
