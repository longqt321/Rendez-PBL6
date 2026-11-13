import { PgBoss } from "pg-boss"
import { env } from "../env"
import { logger } from "./logger"
import { getPickDate, pickDailyPicks } from "./daily-picks"
import { detectPlaceSuggestions } from "./suggestions-job"
import { maintainInteractionPartitions } from "./event-retention"
import { refreshAffinityCache } from "./affinity"

/**
 * Hàng đợi pg-boss (K6, L4) — chạy trên chính Postgres, không thêm hạ tầng.
 *
 * Queue `place-detect` chạy cron 5 phút để phát hiện địa điểm cho bài chưa gắn
 * (A7.2); sau khi tạo bài, route đẩy thêm một job cho riêng bài đó để độ trễ
 * thấp. Retry có backoff + dead letter queue; khai báo queue MỘT LẦN lúc khởi
 * động (idempotent), không tạo queue trong request handler.
 *
 * Queue `daily-picks` riêng (nghiệp vụ khác, cron riêng — cách pg-boss dùng):
 * tính 3 quán "Gợi ý hôm nay" lúc 00:05 Asia/Ho_Chi_Minh — chạy ngay sau mốc
 * đổi ngày để cả ngày đều có picks (chạy muộn hơn sẽ có khung giờ rỗng mỗi sáng).
 */

const QUEUE = "place-detect"
const DEAD_LETTER_QUEUE = "place-detect-dlq"
/** Cron 5 phút — khớp A7.2. */
const CRON = "*/5 * * * *"

const DAILY_PICKS_QUEUE = "daily-picks"
const DAILY_PICKS_DLQ = "daily-picks-dlq"
/** 00:05 Asia/Ho_Chi_Minh — ngay sau mốc đổi ngày. */
const DAILY_PICKS_CRON = "5 0 * * *"
const DAILY_PICKS_TIME_ZONE = "Asia/Ho_Chi_Minh"

const EVENT_RETENTION_QUEUE = "event-retention"
const EVENT_RETENTION_DLQ = "event-retention-dlq"
/** 04:00 mỗi ngày — giờ thấp điểm, không tranh việc với cron 5 phút. */
const EVENT_RETENTION_CRON = "0 4 * * *"

const AFFINITY_QUEUE = "refresh-affinity"
const AFFINITY_DLQ = "refresh-affinity-dlq"
/** 03:30 mỗi ngày — trước event-retention (04:00) để tính trên partition còn đủ. */
const AFFINITY_CRON = "30 3 * * *"

let boss: PgBoss | null = null

export async function startQueue(): Promise<void> {
  if (boss) return

  const instance = new PgBoss({ connectionString: env.DATABASE_URL })
  instance.on("error", (error) => logger.error({ err: error }, "pg-boss lỗi"))

  await instance.start()
  await instance.createQueue(DEAD_LETTER_QUEUE)
  await instance.createQueue(QUEUE, {
    retryLimit: 5,
    retryDelay: 60,
    retryBackoff: true,
    deadLetter: DEAD_LETTER_QUEUE,
  })

  await instance.work<{ postId?: string }>(QUEUE, async (jobs) => {
    for (const job of jobs) {
      const count = await detectPlaceSuggestions(job.data?.postId)
      logger.info({ jobId: job.id, postId: job.data?.postId ?? null, count }, "place-detect xong")
    }
  })

  await instance.schedule(QUEUE, CRON)

  // "Gợi ý hôm nay": retry 5 lần backoff 5→10→20→40→80 phút, hết lượt vào DLQ.
  // `missed: "once"` — server downtime qua 00:05 thì chạy bù 1 lần khi lên.
  await instance.createQueue(DAILY_PICKS_DLQ)
  await instance.createQueue(DAILY_PICKS_QUEUE, {
    retryLimit: 5,
    retryDelay: 300,
    retryBackoff: true,
    deadLetter: DAILY_PICKS_DLQ,
  })
  await instance.work(DAILY_PICKS_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const date = getPickDate()
      const count = await pickDailyPicks(date)
      logger.info({ jobId: job.id, pickDate: date, count }, "daily-picks xong")
    }
  })
  await instance.schedule(DAILY_PICKS_QUEUE, DAILY_PICKS_CRON, null, {
    tz: DAILY_PICKS_TIME_ZONE,
    missed: "once",
  })

  // Bảo trì partition `interaction_events`: tạo tháng T+1, xoá partition >180 ngày.
  await instance.createQueue(EVENT_RETENTION_DLQ)
  await instance.createQueue(EVENT_RETENTION_QUEUE, {
    retryLimit: 3,
    retryDelay: 600,
    retryBackoff: true,
    deadLetter: EVENT_RETENTION_DLQ,
  })
  await instance.work(EVENT_RETENTION_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const result = await maintainInteractionPartitions()
      logger.info({ jobId: job.id, ...result }, "event-retention xong")
    }
  })
  await instance.schedule(EVENT_RETENTION_QUEUE, EVENT_RETENTION_CRON, null, {
    tz: DAILY_PICKS_TIME_ZONE,
    missed: "once",
  })

  // Item-item affinity cho gợi ý cá nhân hoá: tính lại toàn bộ cache mỗi ngày.
  // `missed: "once"` — server downtime qua 03:30 thì chạy bù khi lên; cache cũ
  // vẫn dùng được nên không cần chạy bù nhiều lần.
  await instance.createQueue(AFFINITY_DLQ)
  await instance.createQueue(AFFINITY_QUEUE, {
    retryLimit: 3,
    retryDelay: 600,
    retryBackoff: true,
    deadLetter: AFFINITY_DLQ,
  })
  await instance.work(AFFINITY_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const count = await refreshAffinityCache()
      logger.info({ jobId: job.id, places: count }, "refresh-affinity xong")
    }
  })
  await instance.schedule(AFFINITY_QUEUE, AFFINITY_CRON, null, {
    tz: DAILY_PICKS_TIME_ZONE,
    missed: "once",
  })

  boss = instance
  logger.info({ queue: QUEUE, cron: CRON }, "pg-boss đã khởi động")
}

/** Đẩy job cho một bài vừa tạo — lỗi queue không được làm hỏng request. */
export async function enqueuePlaceDetect(postId: string): Promise<void> {
  if (!boss) return
  try {
    await boss.send(QUEUE, { postId })
  } catch (error) {
    // Bài đã lưu; cron 5 phút sẽ xử lý lại nên chỉ ghi log, không ném.
    logger.warn({ err: error, postId }, "Không đẩy được job place-detect")
  }
}

export async function stopQueue(): Promise<void> {
  const instance = boss
  boss = null
  await instance?.stop({ graceful: true })
}
