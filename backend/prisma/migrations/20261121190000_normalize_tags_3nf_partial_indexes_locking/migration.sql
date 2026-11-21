-- 1. Tách Place.tags (String[]) thành 2 bảng chuẩn 3NF: tags + place_tags
CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");
CREATE INDEX "tags_name_trgm_idx" ON "tags" USING gin (immutable_search_normalize("name") gin_trgm_ops);

CREATE TABLE "place_tags" (
  "place_id" TEXT NOT NULL,
  "tag_id" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "place_tags_pkey" PRIMARY KEY ("place_id", "tag_id"),
  CONSTRAINT "place_tags_position_check" CHECK ("position" >= 0),
  CONSTRAINT "place_tags_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "place_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "place_tags_tag_id_place_id_idx" ON "place_tags"("tag_id", "place_id");
CREATE INDEX "place_tags_place_id_position_idx" ON "place_tags"("place_id", "position");

-- Backfill dữ liệu từ places.tags trước khi bỏ cột
INSERT INTO "tags" ("name")
SELECT DISTINCT btrim(t)
FROM "places", unnest("tags") AS t
WHERE btrim(t) <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "place_tags" ("place_id", "tag_id", "position")
SELECT p."id", tg."id", (u.ord - 1)::int
FROM "places" p
CROSS JOIN LATERAL unnest(p."tags") WITH ORDINALITY AS u(val, ord)
JOIN "tags" tg ON tg."name" = btrim(u.val)
WHERE btrim(u.val) <> ''
ON CONFLICT ("place_id", "tag_id") DO NOTHING;

-- Dựng lại index trigram trên places không phụ thuộc cột mảng tags, rồi xoá cột places.tags
DROP INDEX IF EXISTS "places_search_trgm_idx";
ALTER TABLE "places" DROP COLUMN "tags";
CREATE INDEX "places_search_trgm_idx" ON "places" USING gin (
  (
    immutable_search_normalize(
      "name" || ' ' || "address" || ' ' || "city" || ' ' || coalesce("district", '')
    )
  ) gin_trgm_ops
);

-- 2. Partial Unique Indexes tương thích Soft-Delete (WHERE deleted_at IS NULL)
DROP INDEX IF EXISTS "users_handle_key";
CREATE UNIQUE INDEX "users_handle_active_uidx" ON "users"("handle") WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_active_uidx" ON "users"("email") WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "reviews_place_id_author_id_key";
CREATE UNIQUE INDEX "reviews_place_id_author_id_active_uidx" ON "reviews"("place_id", "author_id") WHERE "deleted_at" IS NULL;

-- Partial B-tree indexes cho các truy vấn bản ghi đang hoạt động
CREATE INDEX "places_active_published_idx" ON "places"("published_at", "status") WHERE "deleted_at" IS NULL;
CREATE INDEX "posts_active_created_idx" ON "posts"("created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "comments_active_post_idx" ON "comments"("post_id", "parent_id", "created_at") WHERE "deleted_at" IS NULL;
CREATE INDEX "collections_active_owner_idx" ON "collections"("owner_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- 3. CHECK constraints bảo vệ toàn vẹn dữ liệu ở tầng PostgreSQL
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "places"
  ADD CONSTRAINT "places_coords_check" CHECK (
    ("lat" IS NULL AND "lng" IS NULL)
    OR ("lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180)
  );

-- 4. Vector HNSW index cho place_embeddings (cosine distance)
CREATE INDEX IF NOT EXISTS "place_embeddings_embedding_hnsw_idx"
  ON "place_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- 5. Optimistic locking (version) cho các thực thể ghi đồng thời
ALTER TABLE "places" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "place_reports" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "collections" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rooms" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
