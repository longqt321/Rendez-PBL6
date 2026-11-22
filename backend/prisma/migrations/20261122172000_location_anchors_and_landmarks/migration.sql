-- CreateEnum
CREATE TYPE "anchor_kind" AS ENUM ('home', 'work', 'school', 'custom');

-- CreateTable
CREATE TABLE "user_location_anchors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "kind" "anchor_kind" NOT NULL DEFAULT 'custom',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" VARCHAR(200),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_location_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_landmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "district" VARCHAR(60),
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_landmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_location_anchors_user_id_idx" ON "user_location_anchors"("user_id");

-- Partial unique index: mỗi user tối đa 1 mốc mặc định
CREATE UNIQUE INDEX "user_location_anchors_user_default_uidx" ON "user_location_anchors"("user_id") WHERE "is_default" = true;

-- CreateIndex
CREATE UNIQUE INDEX "city_landmarks_slug_key" ON "city_landmarks"("slug");

-- CreateIndex
CREATE INDEX "city_landmarks_sort_order_idx" ON "city_landmarks"("sort_order");

-- AddForeignKey
ALTER TABLE "user_location_anchors" ADD CONSTRAINT "user_location_anchors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
