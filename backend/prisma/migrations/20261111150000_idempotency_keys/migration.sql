-- Idempotency cho mutation quan trọng (K2): bảng lưu response theo
-- (key, user_id) — replay khi client gửi lại cùng key, 422 khi key dùng với
-- payload khác, 409 khi request cũ còn đang xử lý. FK CASCADE để xoá user
-- không để lại hàng mồ côi; index expires_at để dọn hàng hết hạn.
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_status" INTEGER,
    "response_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key","user_id")
);

CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
