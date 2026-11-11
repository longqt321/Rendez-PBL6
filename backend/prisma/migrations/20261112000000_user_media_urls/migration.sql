-- Ảnh hồ sơ do người dùng tải lên qua presigned URL (T7.1).
-- `avatar_url` đã có từ migration init; chỉ bổ sung cột ảnh bìa.
ALTER TABLE "users" ADD COLUMN "cover_url" TEXT;
