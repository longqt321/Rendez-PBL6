-- P0/P1 kiến trúc search + rec (báo cáo BAO-CAO-KIEN-TRUC-SEARCH-REC-COLDSTART.md, mục 9.1).
-- Extension `vector` phải đã tồn tại TRƯỚC migration này (image pgvector/pgvector:0.8.7-pg17
-- có sẵn; DB cũ chuyển bằng pg_dump/restore rồi CREATE EXTENSION — xem checklist P0).

-- (1) Vector venue — dùng cho cả search dense và content-based rec.
--     content_hash (sha256 của text đã embed) biết khi nào phải re-embed.
CREATE TABLE place_embeddings (
  place_id      TEXT PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  model         TEXT NOT NULL,
  dim           SMALLINT NOT NULL,
  embedding     vector(384) NOT NULL,
  content_hash  TEXT NOT NULL,
  embedded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (2) Log tương tác — append-only, nguồn học duy nhất cho affinity/ALS/eval.
--     Partition theo tháng; PK partitioned phải chứa cột partition.
CREATE TABLE interaction_events (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  anon_id     text,
  event_type  text NOT NULL,
  place_id    text REFERENCES places(id) ON DELETE SET NULL,
  post_id     uuid REFERENCES posts(id) ON DELETE SET NULL,
  query       text,
  weight      smallint NOT NULL,
  context     jsonb NOT NULL DEFAULT '{}',
  session_id  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Phải có partition ngay trong migration, nếu không INSERT sẽ lỗi
-- "no partition of relation found for row". Default partition bắt mọi giá trị
-- ngoài các partition tháng (kể cả tương lai) để không bao giờ mất event.
CREATE TABLE interaction_events_default PARTITION OF interaction_events DEFAULT;
CREATE TABLE interaction_events_2026_11 PARTITION OF interaction_events
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE INDEX interaction_events_user_time ON interaction_events (user_id, created_at DESC);
CREATE INDEX interaction_events_place_time ON interaction_events (place_id, event_type, created_at DESC);
CREATE INDEX interaction_events_anon_time ON interaction_events (anon_id, created_at DESC);
