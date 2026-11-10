-- Rate limit dùng chính Postgres (H4): khoá ghép (key, window_start) + UPSERT
-- nguyên tử, không cần Redis. Index window_start để dọn cửa sổ cũ.
CREATE TABLE "rate_limits" (
    "key" VARCHAR(200) NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key","window_start")
);

CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");
