-- Prisma yêu cầu phía định nghĩa của quan hệ 1-1 phải unique; mỗi notification
-- đề xuất chỉ gắn với đúng một bài.
CREATE UNIQUE INDEX "place_suggestion_notifications_notification_id_key" ON "place_suggestion_notifications"("notification_id");
