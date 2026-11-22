import { PgBoss } from "pg-boss"
import { env } from "../env"
import { logger } from "./logger"
import { prisma } from "./prisma"
import { getPickDate, pickDailyPicks } from "./daily-picks"
import { detectPlaceSuggestions } from "./suggestions-job"
import { maintainInteractionPartitions } from "./event-retention"
import { refreshAffinityCache } from "./affinity"

const QUEUE = "place-detect"
const DEAD_LETTER_QUEUE = "place-detect-dlq"

const CRON = "*/5 * * * *"

const DAILY_PICKS_QUEUE = "daily-picks"
const DAILY_PICKS_DLQ = "daily-picks-dlq"

const DAILY_PICKS_CRON = "5 0 * * *"
const DAILY_PICKS_TIME_ZONE = "Asia/Ho_Chi_Minh"

const EVENT_RETENTION_QUEUE = "event-retention"
const EVENT_RETENTION_DLQ = "event-retention-dlq"

const EVENT_RETENTION_CRON = "0 4 * * *"

const AFFINITY_QUEUE = "refresh-affinity"
const AFFINITY_DLQ = "refresh-affinity-dlq"

const AFFINITY_CRON = "30 3 * * *"

const AUTH_CLEANUP_QUEUE = "auth-cleanup"
const AUTH_CLEANUP_DLQ = "auth-cleanup-dlq"
const AUTH_CLEANUP_CRON = "15 4 * * *"

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

  // Dọn bản ghi hết hạn (session, verification, idempotency_keys) hàng ngày lúc 04:15.
  await instance.createQueue(AUTH_CLEANUP_DLQ)
  await instance.createQueue(AUTH_CLEANUP_QUEUE, {
    retryLimit: 3,
    retryDelay: 600,
    retryBackoff: true,
    deadLetter: AUTH_CLEANUP_DLQ,
  })
  await instance.work(AUTH_CLEANUP_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const now = new Date()
      const [sessions, verifications, idempotency] = await Promise.all([
        prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } }),
      ])
      logger.info(
        {
          jobId: job.id,
          sessions: sessions.count,
          verifications: verifications.count,
          idempotency: idempotency.count,
        },
        "auth-cleanup xong",
      )
    }
  })
  await instance.schedule(AUTH_CLEANUP_QUEUE, AUTH_CLEANUP_CRON, null, {
    tz: DAILY_PICKS_TIME_ZONE,
    missed: "once",
  })

  boss = instance
  logger.info({ queue: QUEUE, cron: CRON }, "pg-boss đã khởi động")
}

export async function enqueuePlaceDetect(postId: string): Promise<void> {
  if (!boss) return
  try {
    await boss.send(QUEUE, { postId })
  } catch (error) {
    // Bài đã lưu; cron 5 phút sẽ xử lý lại nên chỉ ghi log, không ném.
    logger.warn({ err: error, postId }, "Không đẩy được job place-detect")
  }
}

export interface QueueStatsSnapshot {
  active: boolean
  queued: number
  failed: number
}

export async function getQueueStats(): Promise<QueueStatsSnapshot> {
  if (!boss) return { active: false, queued: 0, failed: 0 }
  try {
    const queues = await boss.getQueues()
    let queued = 0
    let failed = 0
    for (const q of queues) {
      queued += Number(q.queuedCount ?? 0) + Number(q.activeCount ?? 0)
      if (q.name.endsWith("-dlq")) {
        failed += Number(q.totalCount ?? q.queuedCount ?? 0)
      }
    }
    return { active: true, queued, failed }
  } catch (error) {
    logger.warn({ err: error }, "Không đọc được thống kê hàng đợi pg-boss")
    return { active: true, queued: 0, failed: 0 }
  }
}

export async function stopQueue(): Promise<void> {
  const instance = boss
  boss = null
  await instance?.stop({ graceful: true })
}
