-- Bảo mật phòng lọc nhóm (D-056):
-- 1. Guest token: bỏ cột plaintext cũ (dead), thay bằng HMAC-SHA256 + mốc hoạt động.
-- 2. Unique tên hiển thị không phân biệt hoa thường trong cùng phòng — chốt cuối
--    cho race check-then-create của join (Prisma không khai được expression index).
-- 3. CAS apply: ghi ai áp và lúc nào để `updateMany where status=open` nguyên tử.

ALTER TABLE "room_members" DROP COLUMN "guest_token";

ALTER TABLE "room_members" ADD COLUMN "token_hash" TEXT;
ALTER TABLE "room_members" ADD COLUMN "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "room_members_token_hash_key" ON "room_members"("token_hash");

CREATE UNIQUE INDEX "room_members_room_display_lower_key" ON "room_members" ("room_id", LOWER("display_name"));

ALTER TABLE "room_proposals" ADD COLUMN "applied_by" UUID;
ALTER TABLE "room_proposals" ADD COLUMN "applied_at" TIMESTAMP(3);
