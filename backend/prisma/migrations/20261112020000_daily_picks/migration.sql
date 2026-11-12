-- "Gợi ý hôm nay" (Daily Picks): 3 quán gợi ý mỗi ngày, job pg-boss `daily-picks`
-- tính lúc 00:05 Asia/Ho_Chi_Minh và ghi vào bảng này.
--
-- Hai unique constraint là idempotence của job (job chạy lại / hai worker chen
-- nhau): (pick_date, position) không nhân đôi slot, (pick_date, place_id) chặn
-- cùng một quán xuất hiện 2 lần trong ngày. Index pick_date phục vụ đọc theo
-- ngày và kiểm tra lịch sử 7 ngày của thuật toán.
CREATE TABLE "daily_picks" (
    "id" UUID NOT NULL,
    "pick_date" DATE NOT NULL,
    "position" INTEGER NOT NULL,
    "place_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_picks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_picks_pick_date_position_key" ON "daily_picks"("pick_date", "position");
CREATE UNIQUE INDEX "daily_picks_pick_date_place_id_key" ON "daily_picks"("pick_date", "place_id");
CREATE INDEX "daily_picks_pick_date_idx" ON "daily_picks"("pick_date");

-- RESTRICT: xoá địa điểm không được âm thầm làm mất lịch sử gợi ý.
ALTER TABLE "daily_picks" ADD CONSTRAINT "daily_picks_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
