# RESEARCH PROTOCOL — Giao thức đánh giá đăng ký trước (pre-registered)

Tài liệu này **đăng ký trước** (pre-register) cách đo cho các giả thuyết nghiên cứu của
dự án Rendez: đo cái gì, trên dữ liệu nào, bằng chỉ số nào, so với baseline nào, và
**khi nào được phép sửa thiết kế**. Mục đích: kết quả báo cáo không bị "chọn sau khi
thấy điểm" (p-hacking / HARKing).

- **Ngày đăng ký:** 2026-11-13
- **Trạng thái:** đóng băng phần giả thuyết + chỉ số. Sửa đổi chỉ được phép theo mục 8.
- **Liên quan:** [EVAL-PROTOCOL.md](EVAL-PROTOCOL.md) quy định bộ test search đóng băng
  (checksum, cách chạy). Tài liệu này **không thay thế** EVAL-PROTOCOL — nó bổ sung phần
  giả thuyết, thống kê và quy tắc chống p-hacking.

> [!IMPORTANT]
> Đọc mục 8 trước khi chạy bất kỳ lượt đo nào. Mỗi giả thuyết chỉ được **một lần** xem
> kết quả rồi sửa thiết kế. Mọi lần chỉnh sau đó phải ghi ngày + lý do vào mục 9.

---

## 1. Giả thuyết

Giả thuyết phải **bác bỏ được** (falsifiable): nêu rõ chỉ số chính, ngưỡng, và điều kiện
bị coi là sai.

### H1 — Hybrid 3 nhánh (lexical + dense + structured intent) là tốt nhất cho search

**Phát biểu:** trên **cả hai** bộ đánh giá (Đà Nẵng v2 và Yelp subset), `hybrid3` đạt
**P@5 cao hơn** từng phương án sau, với chênh lệch có ý nghĩa thống kê (mục 7):

1. `hybrid2` (RRF lexical + dense, không có nhánh structured)
2. `dense-only` (e5-small, cosine)
3. `lexical` (BM25/tsvector)

**Chỉ số chính:** P@5. **Chỉ số phụ:** nDCG@10, R@10, MRR.

**H1 bị bác bỏ nếu:** bất kỳ so sánh nào ở trên không đạt ý nghĩa sau hiệu chỉnh
Holm–Bonferroni, **hoặc** dấu chênh lệch đảo chiều trên một trong hai dataset.

> [!WARNING]
> Trên bộ Đà Nẵng v2 hiện tại, H1 **chưa thể coi là đã kiểm chứng** vì rò rỉ lexicon
> (mục 3a): 92% query chứa cụm từ mà `intent-lexicon.ts` bắt được. Kết quả đạt yêu cầu
> của H1 chỉ được báo cáo kèm **báo cáo riêng nhóm không rò rỉ** (9 query, P@5 = 0.20 —
> xem 3a). Nếu nhóm không rò rỉ không đủ lớn để kết luận, H1 phải chờ dataset Yelp/Foursquare.

### H2 — Item-item CF tốt hơn popularity cho gợi ý địa điểm

**Phát biểu:** với split leave-one-out, `item-item CF` (co-occurrence trên lịch sử tương
tác) đạt **Recall@10 cao hơn** baseline `popularity` (xếp theo `review_count` / số lượt
tương tác) trên cùng tập người dùng thử.

**Chỉ số chính:** Recall@10. **Chỉ số phụ:** Recall@5, Recall@20, coverage, novelty.

**H2 bị bác bỏ nếu:** Recall@10 của CF không cao hơn popularity với ý nghĩa thống kê sau
hiệu chỉnh, hoặc CF chỉ thắng nhờ phủ định (coverage thấp hơn đáng kể — xem mục 5).

**Trạng thái hiện tại:** chưa có `item-item CF` trong code. H2 là **kế hoạch**, cần dữ
liệu tương tác thật (hiện corpus cold-start gần như không có review/tag). Không được báo
cáo H2 như đã kiểm chứng khi chưa có tập tương tác đủ lớn.

---

## 2. Thiết kế tổng quát

| Thành phần | Search (H1) | Recommendation (H2) |
|---|---|---|
| Đơn vị đo | 1 query | 1 người dùng (1 lần giữ lại 1 item) |
| Split | tập query đóng băng (frozen) | leave-one-out theo lịch sử |
| Nhãn đúng | suy từ ràng buộc DB (grade 0/1/2) | item bị giữ lại |
| Chạy | `bun run scripts/eval-search.ts` | script riêng (chưa có) |

---

## 3. Dữ liệu

### 3a. Đà Nẵng tự gán nhãn — bộ v2 (chính)

| Thuộc tính | Giá trị |
|---|---|
| File | `backend/data/eval/search-eval-v2.json` + `search-eval-v2-labels.json` |
| Số query | **112** (38 ý định) |
| Checksum đóng băng | `ffc586ec7c4e02fc5d2614b9cfaa912f2937793b8a7b841a827785d6ef73c6c7` (sha256 của queries‖labels, ghi trong `search-eval-v2.sha256`) |
| Nhãn | suy tự động từ `category` / `tagsAll` / `tagsAny` / `district` (khách quan, tái lập được) |
| Corpus | 344 venue (86 curated + 258 OSM) — **pilot**, không phải quy mô sản phẩm |

> [!CAUTION]
> **Rò rỉ lexicon (đo 2026-11-13).** `intent-lexicon.ts` được viết cùng lúc với bộ v2 và
> dùng chung từ vựng. Kết quả đo: **103/112 query (92.0%)** chứa ít nhất một cụm mà
> lexicon bắt được thành thuộc tính; chỉ **9 query** là "không rò rỉ". Trên 9 query đó,
> `hybrid3` chỉ đạt **P@5 = 0.20** (tổng 1.8/9), trong khi nhóm rò rỉ đạt ≈ 0.93.
>
> Hệ quả: điểm tổng 0.873 của hybrid3 **không** phải bằng chứng năng lực tổng quát. Mọi
> báo cáo H1 trên bộ này **bắt buộc** trình bày hai dòng: (a) toàn bộ 112 query, (b) nhóm
> không rò rỉ (9 query, nêu rõ n nhỏ nên CI rất rộng). Không được chỉ báo cáo (a).
>
> Cách khắc phục về lâu dài: bộ v3 viết bởi người **không** đọc `intent-lexicon.ts`
> (mục 6), hoặc dataset ngoài (3b).

### 3b. Yelp subset (đối chứng ngoài, chưa import)

- Phạm vi: **1–2 thành phố** (chọn thành phố có ≥ 500 business và đủ review để dựng nhãn).
- **Version ghi tại thời điểm import**: tên file gốc, ngày tải, số business, số review,
  checksum sha256 của file đã lọc. Ghi vào bảng "Nhật ký dữ liệu" (mục 9) **trước** khi đo.
- Nhãn: relevance nhị phân từ `stars` + `categories` (ngưỡng chốt trước khi xem kết quả).
- Mục đích: kiểm chứng H1 ngoài miền dữ liệu Đà Nẵng, nơi lexicon **không** được viết
  cùng bộ query → loại bỏ rò rỉ.

### 3c. Foursquare NYC / TKY — next-POI (chỉ kế hoạch)

- Dùng cho bài toán **next-POI** (dự đoán địa điểm tiếp theo theo chuỗi check-in), không
  dùng cho H1/H2 hiện tại.
- Trạng thái: **kế hoạch**, chưa tải, chưa có split. Không báo cáo số liệu.

---

## 4. Splits

| Bài toán | Split | Quy tắc |
|---|---|---|
| Search | **frozen query set** | Toàn bộ 112 query cố định; checksum chặn sửa. Không chia train/test vì không có bước học trên query. |
| Recommendation | **leave-one-out** | Với mỗi user: giữ lại item tương tác **gần nhất về thời gian** làm test, phần còn lại làm lịch sử. User có < 3 tương tác bị loại (không đủ tín hiệu). |

Không dùng lại cùng một user/item ở cả hai phía. Không lấy mẫu âm theo cách thay đổi
giữa các phương pháp — mọi phương pháp chấm trên **cùng** tập candidate.

---

## 5. Chỉ số

| Chỉ số | Định nghĩa | Dùng cho |
|---|---|---|
| `P@5`, `P@10` | tỉ lệ kết quả top-K có grade ≥ 1 | H1 (chính: P@5) |
| `R@10` | tỉ lệ venue grade 2 tìm được trong top-10 | H1 |
| `nDCG@10` | xếp hạng có phân cấp (grade 2 nặng hơn grade 1) | H1 |
| `MRR` | nghịch đảo vị trí kết quả đúng đầu tiên | H1 |
| `Recall@K`, K = 5, 10, 20 | tỉ lệ item đúng nằm trong top-K | H2 (chính: K=10) |
| `coverage` | % item trong corpus xuất hiện ít nhất 1 lần trong toàn bộ danh sách gợi ý | H2 (chống "chỉ gợi ý top phổ biến") |
| `novelty` | trung bình `-log2(popularity)` của item được gợi ý | H2 |

Chỉ số phụ **không** dùng để tuyên bố thắng; chỉ để giải thích cơ chế và phát hiện
trường hợp thắng nhờ đánh đổi (ví dụ CF thắng Recall nhưng coverage sụp).

---

## 6. Baselines (chốt trước khi đo)

| Baseline | Cài đặt | Ghi chú |
|---|---|---|
| `lexical` | BM25 trên `tsvector` (Postgres full-text) | không dùng trigram similarity để khớp mô tả "BM25" |
| `dense-only` | `Xenova/multilingual-e5-small`, cosine trên pgvector | 384 chiều, lượng tử hoá q8 |
| `hybrid2` | RRF(lexical, dense), k = 60, trọng số 1:1 | |
| `hybrid3` | RRF + nhánh structured (`intent-lexicon.ts`), trọng số 2 | phương pháp đang đề xuất |
| `popularity` | xếp theo `review_count` (hoà → `created_at` mới hơn) | baseline "không cá nhân hoá" |
| `random` | lấy ngẫu nhiên đều trên candidate set, seed cố định | sàn tham chiếu; nếu một phương pháp không vượt `random` thì kết quả vô nghĩa |

Mọi baseline chấm trên **cùng** candidate set và cùng nhãn. Không baseline nào được
tinh chỉnh riêng cho bộ test (ví dụ chọn trọng số RRF bằng cách nhìn điểm v2 rồi giữ lại
— nếu đã làm, phải khai báo ở mục 9).

---

## 7. Thống kê

| Hạng mục | Quy định |
|---|---|
| Kiểm định | **paired bootstrap**, 10.000 lần lấy mẫu lại **theo cặp** (cùng query/user cho cả hai phương pháp) |
| Khoảng tin cậy | **CI 95%** (percentile) cho chênh lệch trung bình giữa hai phương pháp |
| Đa so sánh | **Holm–Bonferroni** trên toàn bộ cặp so sánh trong một giả thuyết (H1 có 3 cặp × 2 dataset = 6 phép so sánh) |
| Ngưỡng ý nghĩa | **α = 0.05** (sau hiệu chỉnh) |
| Báo cáo | luôn kèm chênh lệch tuyệt đối, CI 95%, p-value thô và p-value sau hiệu chỉnh, và n |

Quy tắc đọc kết quả:

- CI chứa 0 → **không** được nói "tốt hơn", kể cả khi điểm trung bình cao hơn.
- n nhỏ (như nhóm không rò rỉ 9 query) → CI rất rộng; báo cáo nguyên văn "chưa đủ bằng
  chứng", không suy diễn.
- Không dùng "gần significant" (p = 0.06) để tuyên bố xu hướng.

---

## 8. Quy tắc chống p-hacking

1. **Số lần được xem kết quả rồi sửa thiết kế: 1 lần cho mỗi giả thuyết.** "Sửa thiết kế"
   gồm: đổi chỉ số chính, đổi baseline, đổi cách chia split, đổi ngưỡng nhãn, đổi trọng
   số RRF sau khi đã thấy điểm, thêm/bớt query.
2. Lần chỉnh đó **bắt buộc** ghi vào mục 9: ngày, giả thuyết, đã đổi gì, **lý do**, và
   kết quả **trước** khi đổi (để người đọc tự đánh giá).
3. Sau khi dùng hết 1 lần, giả thuyết đó **đóng**: kết quả tiếp theo chỉ được báo cáo
   nguyên trạng, không chỉnh thiết kế nữa. Muốn thử biến thể mới → khai báo **giả thuyết
   mới** (H1b, H3…) và đăng ký trước khi chạy.
4. Cấm hardcode id venue / câu query của bộ test vào code (đã quy định ở EVAL-PROTOCOL §1).
5. Cấm chạy nhiều cấu hình rồi chỉ báo cáo cấu hình tốt nhất ("best-of-N"). Nếu có quét
   tham số, phải báo cáo **toàn bộ** đường cong hoặc dùng tập validation riêng.
6. Mọi lượt đo lưu lại file kết quả có ngày; không ghi đè baseline cũ mà không copy
   (xem EVAL-PROTOCOL §4).

---

## 9. Nhật ký thay đổi protocol & dữ liệu

Ghi mọi lần chỉnh thiết kế hoặc thêm dataset. Không xoá dòng cũ.

| Ngày | Hạng mục | Thay đổi | Lý do | Kết quả trước khi đổi |
|---|---|---|---|---|
| 2026-11-13 | Khởi tạo | Đăng ký H1, H2 + toàn bộ mục 1–8 | Thiết lập chuẩn đo trước khi chạy thêm thí nghiệm | — |
| 2026-11-13 | Dữ liệu 3a | Ghi nhận rò rỉ lexicon 92% (103/112), nhóm không rò rỉ P@5 = 0.20 | Phân tích phát hiện lexicon và bộ v2 dùng chung từ vựng | Điểm tổng hybrid3 P@5 0.873 (không đổi, chỉ bổ sung cách đọc) |

---

## 10. Quy tắc gán nhãn thủ công (annotation)

Áp dụng khi nhãn **không** suy được tự động (ví dụ Yelp relevance, hoặc adjudication các
ca biên ở Đà Nẵng).

| Quy tắc | Chi tiết |
|---|---|
| Số annotator | **2 người độc lập**, chấm cùng một tập, không trao đổi trong lúc chấm |
| Đồng thuận | **Cohen's κ ≥ 0.6** trên toàn tập. Nếu κ < 0.6 → xem lại guideline, chấm lại; ghi lại κ từng vòng |
| Phân xử | Ca bất đồng do **người thứ ba** (adjudicator) quyết; quyết định của adjudicator là nhãn cuối |
| Cách ly thông tin | Annotator **không được đọc `backend/src/lib/intent-lexicon.ts`** (và không xem kết quả search) trước khi chấm — nếu không, nhãn sẽ thiên vị đúng thứ mà phương pháp đề xuất bắt được |
| Guideline | Viết guideline chấm **trước** khi chấm; sửa guideline giữa chừng phải chấm lại từ đầu tập đó |
| Lưu vết | Lưu nhãn thô của từng annotator + κ + danh sách ca adjudication |

---

## 11. Giới hạn đã biết (phải nêu trong mọi báo cáo)

1. **Corpus 344 venue chỉ là pilot.** Không đủ để kết luận về hành vi ở quy mô thành phố
   thật (hàng nghìn venue, phân phối category dài đuôi). Mọi tuyên bố "tốt hơn" chỉ đúng
   trong phạm vi corpus này.
2. **`e5-small` là model nhỏ** (384 chiều, lượng tử hoá q8). Kết quả dense/hybrid có thể
   khác đáng kể với model lớn hơn; không suy rộng sang "dense retrieval nói chung".
3. **Không có online A/B test.** Toàn bộ đo offline trên tập nhãn suy tự động; không đo
   được tác động lên hành vi người dùng thật (click, đặt chỗ, quay lại).
4. **Rò rỉ lexicon trên bộ v2** (mục 3a) — hạn chế nghiêm trọng nhất của kết quả search
   hiện tại.
5. **Nhãn suy tự động từ ràng buộc DB** chỉ đúng bằng chất lượng metadata (tag nghèo,
   nhiều venue thiếu tag) → trần chất lượng bị giới hạn bởi dữ liệu, không chỉ thuật toán.
6. **H2 chưa có dữ liệu tương tác thật** → mọi số liệu rec hiện tại (nếu có) là mô phỏng.

---

## 12. Giao thức Đánh giá Recommendation (Bổ sung 2026-11-16)

Để giải quyết giới hạn mục 11.6 (chưa có dữ liệu tương tác rec), giao thức nghiên cứu cho hệ thống Recommendation (H2) được chuẩn hóa theo chuẩn quốc tế:

### 12.1 Giao thức Full-Catalog Leave-One-Out
1. **Phân tách Dữ liệu (Temporal Split)**:
   - Với mỗi người dùng có $\ge 5$ tương tác tích cực (positive interactions), tương tác mới nhất theo thời gian (`created_at`) được giữ lại làm **Test**, toàn bộ các tương tác trước đó làm **Train**.
   - Bỏ các ca mà item test đã xuất hiện trong train (nhằm đo năng lực khám phá địa điểm mới).
2. **Full-Catalog vs Sampled Negative**:
   - Nghiêm cấm dùng giao thức cũ "1 positive + 99 negatives": Krencik & Rendle (ACM RecSys 2020) đã chứng minh lấy mẫu 99 negatives làm sai lệch thứ hạng thực tế.
   - Bắt buộc đánh giá trên **toàn bộ catalog** ($N \ge 1,500$ đối với MovieLens, $N \ge 10,000$ đối với Yelp).
3. **Chỉ số đo lường chuẩn**:
   - `Recall@5`, `Recall@10`, `Recall@20`: Khả năng tìm thấy đúng địa điểm trong top $K$.
   - `NDCG@10`: Đánh giá vị trí xếp hạng của địa điểm được gợi ý.
   - `MRR`: Tốc độ người dùng tiếp cận được địa điểm phù hợp đầu tiên.
4. **Kiểm định thống kê**: Paired Bootstrap 10,000 vòng lặp có seed cố định ($SEED = 42$) kèm khoảng tin cậy $95\%$ và trị số $p$-value.
