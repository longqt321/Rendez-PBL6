-- AlterTable
ALTER TABLE "posts" ADD COLUMN "pinned_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "posts_author_id_pinned_at_created_at_idx" ON "posts"("author_id", "pinned_at" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "direct_messages_sender_id_recipient_id_created_at_idx" ON "direct_messages"("sender_id", "recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "direct_messages_recipient_id_read_at_created_at_idx" ON "direct_messages"("recipient_id", "read_at", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
