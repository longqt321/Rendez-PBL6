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
bun run scripts/eval-search.ts            # chấm điểm, ghi data/eval/search-eval-v1-baseline.json
bun run scripts/eval-search.ts --freeze   # CHỈ dùng một lần khi tạo bộ mới
```

Kết quả ghi đè `search-eval-v1-baseline.json` — file này là **kết quả mới nhất**, không phải
lịch sử. Muốn giữ lịch sử thì copy sang `search-eval-v1-baseline-<ngày>.json` trước khi chạy.

## 5. Mốc so sánh (baseline v1, đo 2026-11-13)

50 query, 7 nhóm ý định. Cùng một bộ nhãn cho cả hai cột.

| Phương pháp | P@5 | P@10 | R@10 | nDCG@10 | MRR | zeroRate | p50 | p95 |
|---|---|---|---|---|---|---|---|---|
| Lexical thuần (trigram) | 0.504 | 0.480 | 0.465 | 0.513 | 0.584 | 0 | 39 ms | 48 ms |
| Hybrid 2 nhánh (lexical + dense, RRF k=60) | 0.604 | 0.564 | 0.553 | 0.598 | 0.662 | 0 | 76 ms | 143 ms |
| **Hybrid 3 nhánh (+ structured intent)** | **0.736** | **0.682** | **0.732** | **0.743** | **0.750** | 0 | 73 ms | 94 ms |

P@5 theo nhóm (lexical → hybrid 3 nhánh):

| Nhóm | n | Lexical | Hybrid 3 nhánh |
|---|---|---|---|
| study (học/làm việc) | 8 | 0.800 | 0.875 |
| date (hẹn hò) | 7 | 0.543 | 0.600 |
| friends (nhóm bạn/nhậu) | 7 | 0.143 | 0.571 |
| indoor (trong nhà) | 6 | 0.767 | 0.900 |
| budget (giá rẻ/mang đi) | 8 | 0.250 | 0.500 |
| cuisine (món cụ thể) | 10 | 0.500 | 0.900 |
| district (theo quận) | 4 | 0.600 | 0.800 |

Nhóm còn yếu: `budget` (0.5) và `date` (0.6) — dữ liệu tag `Mang đi` chỉ 23 venue,
`Ngoài trời` 39 venue nên trần chất lượng bị giới hạn bởi dữ liệu, không chỉ thuật toán.

## 6. Khi nào được tạo bộ mới

- Dữ liệu venue thay đổi lớn (thêm >50% venue, thêm tag mới đáng kể).
- Cần đo loại truy vấn mới (ví dụ tìm bài viết, tìm theo ảnh).
- Bộ hiện tại đã bị "học thuộc" qua nhiều vòng tinh chỉnh → cần held-out.

Quy trình: copy `search-eval-v1.json` → `search-eval-v2.json`, sửa/bổ sung query, chạy
`--freeze` cho v2, ghi mốc baseline v2 vào tài liệu này. **Không xoá v1** để còn so sánh lịch sử.
