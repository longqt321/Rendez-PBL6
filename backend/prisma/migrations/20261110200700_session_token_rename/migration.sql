-- Đổi tên cột token_hash -> token để khớp tên trường better-auth (bảng rỗng ở dev).
ALTER TABLE "sessions" RENAME COLUMN "token_hash" TO "token";
ALTER INDEX "sessions_token_hash_key" RENAME TO "sessions_token_key";
