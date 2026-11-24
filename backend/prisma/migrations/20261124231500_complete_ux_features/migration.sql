-- Migration: complete UX features (20261124231500)
-- Bổ sung enum values, điều chỉnh price_level nullable, và tạo các bảng hỗ trợ:
-- review_images, review_helpful_votes, place_submissions, collection_collaborators, user_blocks

ALTER TYPE "review_tier" ADD VALUE IF NOT EXISTS 'not_for_me';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'direct-message';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'room-event';

DO $$ BEGIN
  CREATE TYPE "submission_status" AS ENUM ('pending', 'reviewed', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. places.price_level nullable
ALTER TABLE "places" ALTER COLUMN "price_level" DROP DEFAULT;
ALTER TABLE "places" ALTER COLUMN "price_level" DROP NOT NULL;
ALTER TABLE "places" DROP CONSTRAINT IF EXISTS "places_price_level_check";
ALTER TABLE "places" ADD CONSTRAINT "places_price_level_check" CHECK ("price_level" IS NULL OR ("price_level" BETWEEN 1 AND 3));

-- 2. users.notification_prefs
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB NOT NULL DEFAULT '{}';

-- 3. collection_places.note
ALTER TABLE "collection_places" ADD COLUMN IF NOT EXISTS "note" TEXT;

-- 4. direct_messages.attachment
ALTER TABLE "direct_messages" ADD COLUMN IF NOT EXISTS "attachment" JSONB;

-- 5. review_images
CREATE TABLE IF NOT EXISTS "review_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "review_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_images_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "review_images_review_id_position_idx" ON "review_images"("review_id", "position");
DO $$ BEGIN
  ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. review_helpful_votes
CREATE TABLE IF NOT EXISTS "review_helpful_votes" (
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_votes_pkey" PRIMARY KEY ("review_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "review_helpful_votes_user_id_idx" ON "review_helpful_votes"("user_id");
DO $$ BEGIN
  ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. place_submissions
CREATE TABLE IF NOT EXISTS "place_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submitter_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Đà Nẵng',
    "district" TEXT,
    "category" "place_category" NOT NULL,
    "price_level" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "opening_hours" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "submission_status" NOT NULL DEFAULT 'pending',
    "reviewer_id" UUID,
    "review_note" TEXT,
    "created_place_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "place_submissions_status_created_at_idx" ON "place_submissions"("status", "created_at");
CREATE INDEX IF NOT EXISTS "place_submissions_submitter_id_idx" ON "place_submissions"("submitter_id");
DO $$ BEGIN
  ALTER TABLE "place_submissions" ADD CONSTRAINT "place_submissions_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "place_submissions" ADD CONSTRAINT "place_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "place_submissions" ADD CONSTRAINT "place_submissions_created_place_id_fkey" FOREIGN KEY ("created_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 8. collection_collaborators
CREATE TABLE IF NOT EXISTS "collection_collaborators" (
    "collection_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_collaborators_pkey" PRIMARY KEY ("collection_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "collection_collaborators_user_id_idx" ON "collection_collaborators"("user_id");
DO $$ BEGIN
  ALTER TABLE "collection_collaborators" ADD CONSTRAINT "collection_collaborators_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "collection_collaborators" ADD CONSTRAINT "collection_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 9. user_blocks
CREATE TABLE IF NOT EXISTS "user_blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id")
);
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");
DO $$ BEGIN
  ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
