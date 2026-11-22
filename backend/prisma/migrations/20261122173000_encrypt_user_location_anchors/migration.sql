-- Clean break: thay thế các cột tọa độ/địa chỉ plaintext bằng encrypted_coords (AES-256-GCM)
TRUNCATE TABLE "user_location_anchors";

ALTER TABLE "user_location_anchors"
  DROP COLUMN "lat",
  DROP COLUMN "lng",
  DROP COLUMN "address",
  ADD COLUMN "encrypted_coords" TEXT NOT NULL;
