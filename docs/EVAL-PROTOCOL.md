# EVAL PROTOCOL — Bộ đánh giá search ĐÓNG BĂNG

Quy ước bắt buộc cho mọi lượt cải tiến search/recommendation từ 2026-11-13.

## 1. Nguyên tắc đóng băng

| Quy tắc | Chi tiết |
|---|---|
| **v1 là bất biến** | `backend/data/eval/search-eval-v1.json` và `search-eval-v1-labels.json` **không được sửa**, kể cả "chỉ đổi một query cho đúng". |
| **Checksum bảo vệ** | `search-eval-v1.sha256` = sha256(queries + labels). `eval-search.ts` từ chối chấm điểm nếu lệch (đã test: thêm 1 byte vào labels → script dừng). |
| **Nhãn chốt tại thời điểm freeze** | Tập id kỳ vọng lưu sẵn trong labels. Venue mới thêm sau này **không** làm đổi nhãn → các lượt so sánh vẫn cùng thang đo. |
| **Muốn bộ mới → tạo v2** | `search-eval-v2.json` + `--freeze-v2` (bổ sung tham số khi cần). Không sửa v1 để "làm đẹp" điểm. |
| **Không tune theo từng query** | Cải tiến phải là thay đổi tổng quát (thuật toán, lexicon từ vựng dữ liệu, tham số). Cấm hardcode id venue hoặc câu query của bộ test vào code. |

Rủi ro đã biết: bộ test chỉ có một tập, nên tinh chỉnh nhiều vòng trên nó sẽ overfit.
Khi có ≥ 2 lượt cải tiến lớn, tạo **v2 (held-out)** để xác nhận lại.

## 2. Nhãn suy ra thế nào (khách quan, tái lập được)

Nhãn lấy từ **thuộc tính DB**, không từ kết quả search:

- **grade 2** — thoả TOÀN BỘ ràng buộc của query (`category`, `tagsAll`, `tagsAny`, `district`).
- **grade 1** — chỉ thoả ràng buộc `category` (khi query có category): "gần đúng một phần".
- **grade 0** — còn lại.

Điều kiện nền cho mọi nhãn: `published_at IS NOT NULL AND deleted_at IS NULL AND status <> 'closed'`.

## 3. Chỉ số

| Chỉ số | Ý nghĩa |
|---|---|
| `P@5`, `P@10` | Tỉ lệ kết quả trong top-K có grade ≥ 1 (không trả về quán lạc đề) |
| `R@10` | Tỉ lệ venue grade 2 được tìm thấy trong top-10 |
| `nDCG@10` | Chất lượng xếp hạng có phân cấp (grade 2 nặng hơn grade 1) |
| `MRR` | Vị trí venue đúng đầu tiên (người dùng thấy kết quả tốt sớm) |
| `zeroRate` | Tỉ lệ query trả 0 kết quả (đo "bịt miệng" người dùng) |
| `latencyP50/P95` | Độ trễ đo trong tiến trình (không gồm network) |

## 4. Cách chạy

```bash
cd backend
bun run scripts/eval-search.ts --set 2      # bộ chính (v2, 149 query) — dùng từ nay
bun run scripts/eval-search.ts --set 1      # bộ lịch sử (v1, 50 query) — kiểm regression
bun run scripts/eval-search.ts --set 2 --freeze   # CHỈ dùng một lần khi tạo bộ mới
```

`--set` mặc định 1. Kết quả ghi đè `search-eval-v<set>-baseline.json` — file này là
**kết quả mới nhất**, không phải lịch sử. Muốn giữ lịch sử thì copy sang
`search-eval-v<set>-baseline-<ngày>.json` trước khi chạy.

Script verify checksum `<set>.sha256` trước khi chấm: file query hoặc nhãn bị sửa → in
`Bộ test đã bị sửa (checksum lệch)` và dừng, không chấm điểm.

> [!IMPORTANT]
> Checksum tính trên **bytes gốc** của 2 file json, nên `backend/data/eval/*.json` đã được
> đưa vào `.prettierignore` — nếu `lint-staged` (pre-commit) format lại file, checksum lệch
> và script từ chối chấm điểm dù nội dung không đổi.

## 5. Mốc so sánh

### 5a. v2 — bộ chính (112 query, 38 ý định, đo 2026-11-13)

**Thiết kế (v2 được thiết kế lại 2026-11-13 sau khi phát hiện selection bias — L-029):**
phiên bản đầu của v2 lấy ràng buộc từ chính thuộc tính DB nên 37% query có ≥30 venue
thoả đủ → điểm cao giả tạo. Bản redesign: ràng buộc **nhiều chiều** (category + tag +
district), phân bố cân bằng — trung vị số venue thoả đủ = 15, chỉ 22% query có ≥30
venue thoả, 38% query khó (≤10 venue). Nhãn vẫn suy tự động từ ràng buộc (khách quan).

| Phương pháp | P@5 | P@10 | R@10 | nDCG@10 | MRR | zeroRate | p50 | p95 |
|---|---|---|---|---|---|---|---|---|
| Lexical thuần (trigram) | 0.423 | 0.398 | 0.404 | 0.412 | 0.497 | 0 | 33 ms | 51 ms |
| **Hybrid 3 nhánh** | **0.873** | **0.761** | **0.851** | **0.861** | **0.906** | 0 | 64 ms | 113 ms |

> [!WARNING]
> Không so sánh điểm tổng giữa hai bộ khác phân bố độ khó. Chỉ so v2 với v2 (cùng
> checksum), hoặc so theo từng ý định với v1.

P@5 theo ý định (nhóm < 0.8): `friends-district` 0.4, `streetfood-district` 0.2,
`korean` 0.65, `japanese` 0.75, `pizza` 0.75, `burger` 0.75, `specialty` 0.75,
`entertainment` 0.75, `vietnamese` 0.733. Nhóm đạt 1.0: study, outdoor, takeaway,
veg, streetfood, cafe, wifi, seafood, steak, always-open, mọi district thuần.

P@5 theo kiểu diễn đạt: natural 0.952, keyword 0.962, long 0.937, no-diacritic 1.0,
with-district 0.765, english 0.689, **typo 0.28** (điểm yếu rõ nhất — trigram trên
tên quán không bắt được lỗi gõ trong từ khoá ý định).

### 5b. v1 — lịch sử (50 query, 7 nhóm, đo 2026-11-13)

| Phương pháp | P@5 | P@10 | R@10 | nDCG@10 | MRR | zeroRate | p50 | p95 |
|---|---|---|---|---|---|---|---|---|
| Lexical thuần (trigram) | 0.504 | 0.480 | 0.465 | 0.513 | 0.584 | 0 | 39 ms | 48 ms |
| Hybrid 2 nhánh (lexical + dense, RRF k=60) | 0.604 | 0.564 | 0.553 | 0.598 | 0.662 | 0 | 76 ms | 143 ms |
| Hybrid 3 nhánh, structured weight 2 | 0.768 | — | — | — | — | 0 | 68 ms | 94 ms |

(v1 đo lại sau khi thêm trọng số 2: P@5 0.736 → 0.768, không regression.)

Nhóm còn yếu ở cả hai bộ: `date`, `friends`, `bar`, `korean` — trần chất lượng bị
giới hạn bởi dữ liệu (tag nghèo, ít venue), không chỉ thuật toán.

## 6. Khi nào được tạo bộ mới

- Dữ liệu venue thay đổi lớn (thêm >50% venue, thêm tag mới đáng kể).
- Cần đo loại truy vấn mới (ví dụ tìm bài viết, tìm theo ảnh).
- Bộ hiện tại đã bị "học thuộc" qua nhiều vòng tinh chỉnh → cần held-out.

Quy trình: copy `search-eval-v1.json` → `search-eval-v2.json`, sửa/bổ sung query, chạy
`--freeze` cho v2, ghi mốc baseline v2 vào tài liệu này. **Không xoá v1** để còn so sánh lịch sử.
