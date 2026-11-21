import { createApp } from "./app"
import { env } from "./env"
import { logger } from "./lib/logger"
import { prisma } from "./lib/prisma"
import { pubsub } from "./lib/pubsub"
import { startQueue, stopQueue } from "./lib/queue"
import { closeRedis } from "./lib/redis"

const app = createApp()

// Khởi tạo Postgres PubSub (LISTEN/NOTIFY) cho giao tiếp đa tiến trình SSE
await pubsub.init().catch((err) => logger.error({ err }, "Lỗi khởi tạo PubSub"))

// Chỉ instance đầu tiên (hoặc nếu không có biến WORKER_DISABLED) mới chạy pg-boss cron
const isWorkerDisabled =
  process.env.WORKER_DISABLED === "true" || process.env.WORKER_DISABLED === "1"
if (!isWorkerDisabled) {
  await startQueue()
}

const server = Bun.serve({
  port: env.PORT,
  reusePort: true, // Cho phép nhiều tiến trình Bun bind cùng 1 cổng để tận dụng đa nhân CPU
  idleTimeout: 30,

  fetch: (request, bunServer) =>
    app.fetch(request, { remoteAddress: bunServer.requestIP(request)?.address ?? "" }),
})

logger.info(
  {
    pid: process.pid,
    port: server.port,
    env: env.NODE_ENV,
    worker: !isWorkerDisabled,
  },
  "API instance đã khởi động",
)

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal, pid: process.pid }, "Nhận tín hiệu tắt — đóng server")

  await server.stop()
  await pubsub.cleanup().catch((error) => logger.error({ err: error }, "Đóng PubSub lỗi"))
  if (!isWorkerDisabled) {
    await stopQueue().catch((error) => logger.error({ err: error }, "Đóng queue lỗi"))
  }
  await prisma.$disconnect().catch((error) => logger.error({ err: error }, "Đóng Prisma lỗi"))
  await closeRedis()
  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))
