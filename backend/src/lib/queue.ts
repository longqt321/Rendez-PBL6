import { PgBoss } from "pg-boss"
import { env } from "../env"
import { logger } from "./logger"
import { detectPlaceSuggestions } from "./suggestions-job"

/**
 * Hàng đợi pg-boss (K6, L4) — chạy trên chính Postgres, không thêm hạ tầng.
 *
 * Queue `place-detect` chạy cron 5 phút để phát hiện địa điểm cho bài chưa gắn
 * (A7.2); sau khi tạo bài, route đẩy thêm một job cho riêng bài đó để độ trễ
 * thấp. Retry có backoff + dead letter queue; khai báo queue MỘT LẦN lúc khởi
 * động (idempotent), không tạo queue trong request handler.
 */

const QUEUE = "place-detect"
const DEAD_LETTER_QUEUE = "place-detect-dlq"
/** Cron 5 phút — khớp A7.2. */
const CRON = "*/5 * * * *"

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
