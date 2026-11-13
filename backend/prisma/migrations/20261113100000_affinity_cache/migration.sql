-- P1 rec: cache item-item affinity tính từ `interaction_events`
-- (báo cáo kiến trúc search/rec mục 9 — job `refreshAffinityCache` ghi lại toàn bộ).
--
-- Vì sao là bảng cache chứ không phải view: cosine item-item là O(Σ|vector|²)
-- trên toàn bộ event 90 ngày — không tính lại trong request. Job định kỳ tính
-- một lần rồi API chỉ đọc 1 dòng theo `place_id`.
--
-- `related` là mảng JSON `[{ "id": "<place_id>", "score": <cosine> }, ...]` đã
-- sắp xếp giảm dần và cắt top-K ở tầng ứng dụng (K đổi được mà không cần migrate).

CREATE TABLE affinity_cache (
  place_id    TEXT PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  related     JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job giám sát đọc "cache cũ nhất" để biết có phải chạy lại không.
CREATE INDEX affinity_cache_computed_at ON affinity_cache (computed_at DESC);
