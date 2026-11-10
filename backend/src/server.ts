import { createApp } from "./app"
import { env } from "./env"
import { logger } from "./lib/logger"
import { prisma } from "./lib/prisma"
import { startQueue, stopQueue } from "./lib/queue"

const app = createApp()

// pg-boss trước khi nhận request: job cron phát hiện địa điểm (A7.2) cần sẵn sàng.
await startQueue()

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

logger.info({ port: server.port, env: env.NODE_ENV }, "API đã khởi động")

/**
 * Graceful shutdown (G5): ngừng nhận request mới → đóng queue → đóng Prisma.
 * Thứ tự quan trọng: job đang chạy phải dùng được Prisma trước khi nó đóng.
 */
let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, "Nhận tín hiệu tắt — đóng server")

  server.stop()
  await stopQueue().catch((error) => logger.error({ err: error }, "Đóng queue lỗi"))
  await prisma.$disconnect().catch((error) => logger.error({ err: error }, "Đóng Prisma lỗi"))
  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))
