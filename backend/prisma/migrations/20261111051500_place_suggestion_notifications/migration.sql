-- Idempotence job phát hiện địa điểm (A7.2): mỗi bài chỉ được thông báo 1 lần.
CREATE TABLE "place_suggestion_notifications" (
    "post_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_suggestion_notifications_pkey" PRIMARY KEY ("post_id")
);

ALTER TABLE "place_suggestion_notifications" ADD CONSTRAINT "place_suggestion_notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_suggestion_notifications" ADD CONSTRAINT "place_suggestion_notifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
