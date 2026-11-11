-- Ảnh bài đăng do người dùng tải lên qua presigned URL (G5b).
-- Mỗi bài tối đa 4 ảnh (chặn ở tầng ứng dụng); `position` giữ thứ tự hiển thị.
CREATE TABLE "post_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "post_images_post_id_position_idx" ON "post_images"("post_id", "position");

ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
