-- 1. Tách Place.sources (String[]) thành 2 bảng chuẩn 3NF: sources + place_sources
CREATE TABLE "sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

CREATE TABLE "place_sources" (
  "place_id" TEXT NOT NULL,
  "source_id" UUID NOT NULL,
  CONSTRAINT "place_sources_pkey" PRIMARY KEY ("place_id", "source_id"),
  CONSTRAINT "place_sources_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "place_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "place_sources_source_id_place_id_idx" ON "place_sources"("source_id", "place_id");

-- Backfill dữ liệu từ places.sources trước khi bỏ cột
INSERT INTO "sources" ("name")
SELECT DISTINCT btrim(s)
FROM "places", unnest("sources") AS s
WHERE btrim(s) <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "place_sources" ("place_id", "source_id")
SELECT DISTINCT p."id", src."id"
FROM "places" p
CROSS JOIN LATERAL unnest(p."sources") AS s
JOIN "sources" src ON src."name" = btrim(s)
WHERE btrim(s) <> ''
ON CONFLICT ("place_id", "source_id") DO NOTHING;

ALTER TABLE "places" DROP COLUMN "sources";

-- 2. Xoá bảng rate_limits (đã chuyển sang Redis container)
DROP TABLE IF EXISTS "rate_limits";

-- 3. Bật pg_stat_statements để theo dõi hiệu suất truy vấn PostgreSQL
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EXCEPTION WHEN OTHERS THEN
  -- Bỏ qua nếu instance test không nạp shared_preload_libraries=pg_stat_statements
  NULL;
END $$;
