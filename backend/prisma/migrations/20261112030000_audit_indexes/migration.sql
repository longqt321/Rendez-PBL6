-- Audit cuối (M-05, MINOR-19):
--
-- 1. `reviews` thiếu index bắt đầu bằng `author_id` trong khi gợi ý theo dõi
--    (`suggestUsersToFollow`) chạy subquery tương quan `WHERE r.author_id = u.id`
--    cho từng ứng viên ⇒ Seq Scan mỗi lần. `posts` đã có `(author_id, created_at)`.
-- 2. `daily_picks_pick_date_idx` trùng tiền tố với unique
--    `(pick_date, position)` — Postgres dùng được index unique cho truy vấn chỉ
--    theo `pick_date`, nên index riêng chỉ tốn chi phí ghi.
CREATE INDEX "reviews_author_id_idx" ON "reviews"("author_id");
DROP INDEX "daily_picks_pick_date_idx";
