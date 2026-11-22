-- Clean Break migration for F-002 (ReviewTier + recommendedDishes), F-079 (PlaceMediaKind), F-040 (Room voting)

-- 1. New enums & ReportReason extension
ALTER TYPE "report_reason" ADD VALUE IF NOT EXISTS 'outdated_menu';
ALTER TYPE "report_reason" ADD VALUE IF NOT EXISTS 'wrong_image';

CREATE TYPE "review_tier" AS ENUM ('ok', 'good', 'must_try');
CREATE TYPE "place_media_kind" AS ENUM ('venue', 'dish_real', 'menu_price');
CREATE TYPE "room_phase" AS ENUM ('filtering', 'voting', 'locked');
CREATE TYPE "room_voting_mode" AS ENUM ('swipe_match', 'ranked_choice', 'random_wheel');

-- 2. PlaceImage (F-079): non-null kind + uploaded_by_id + captured_at
ALTER TABLE "place_images"
  ADD COLUMN IF NOT EXISTS "uploaded_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "place_images"
  ALTER COLUMN "kind" TYPE "place_media_kind"
  USING (
    CASE
      WHEN "kind" = 'dish_real' THEN 'dish_real'::"place_media_kind"
      WHEN "kind" = 'menu_price' THEN 'menu_price'::"place_media_kind"
      ELSE 'venue'::"place_media_kind"
    END
  ),
  ALTER COLUMN "kind" SET NOT NULL,
  ALTER COLUMN "kind" SET DEFAULT 'venue'::"place_media_kind";

CREATE INDEX IF NOT EXISTS "place_images_place_id_kind_captured_at_idx"
  ON "place_images"("place_id", "kind", "captured_at");

-- 3. PostImage (F-079): kind + captured_at
ALTER TABLE "post_images"
  ADD COLUMN IF NOT EXISTS "kind" "place_media_kind" NOT NULL DEFAULT 'dish_real',
  ADD COLUMN IF NOT EXISTS "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Review (F-002): Clean Break — drop rating, replace with tier + recommended_dishes + quick_tags
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "tier" "review_tier",
  ADD COLUMN IF NOT EXISTS "recommended_dishes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "quick_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "reviews"
SET "tier" = CASE
  WHEN "rating" >= 5 THEN 'must_try'::"review_tier"
  WHEN "rating" >= 3 THEN 'good'::"review_tier"
  ELSE 'ok'::"review_tier"
END
WHERE "tier" IS NULL;

ALTER TABLE "reviews"
  ALTER COLUMN "tier" SET NOT NULL,
  ALTER COLUMN "content" SET DEFAULT '',
  DROP COLUMN IF EXISTS "rating";

-- 5. Room voting (F-040)
ALTER TABLE "rooms"
  ADD COLUMN IF NOT EXISTS "phase" "room_phase" NOT NULL DEFAULT 'filtering',
  ADD COLUMN IF NOT EXISTS "voting_mode" "room_voting_mode" NOT NULL DEFAULT 'swipe_match',
  ADD COLUMN IF NOT EXISTS "voting_deadline_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "winner_place_id" TEXT,
  ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3);

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_winner_place_id_fkey"
  FOREIGN KEY ("winner_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "room_candidates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "room_id" UUID NOT NULL,
  "place_id" TEXT NOT NULL,
  "added_by_member_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "room_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "room_candidates_room_id_place_id_key" ON "room_candidates"("room_id", "place_id");
CREATE INDEX IF NOT EXISTS "room_candidates_room_id_idx" ON "room_candidates"("room_id");

ALTER TABLE "room_candidates"
  ADD CONSTRAINT "room_candidates_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "room_candidates_place_id_fkey"
  FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "room_candidates_added_by_member_id_fkey"
  FOREIGN KEY ("added_by_member_id") REFERENCES "room_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "room_votes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "room_id" UUID NOT NULL,
  "candidate_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "decision" TEXT,
  "rank" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "room_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "room_votes_room_id_candidate_id_member_id_key" ON "room_votes"("room_id", "candidate_id", "member_id");
CREATE INDEX IF NOT EXISTS "room_votes_room_id_member_id_idx" ON "room_votes"("room_id", "member_id");

ALTER TABLE "room_votes"
  ADD CONSTRAINT "room_votes_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "room_votes_candidate_id_fkey"
  FOREIGN KEY ("candidate_id") REFERENCES "room_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "room_votes_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "room_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
