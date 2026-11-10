import { createApp } from "./app"
import { env } from "./env"
import { logger } from "./lib/logger"

const app = createApp()

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

logger.info({ port: server.port, env: env.NODE_ENV }, "API đã khởi động")

/**
 * Graceful shutdown (G5): ngừng nhận request mới rồi thoát.
 * Phase 0 chưa có pg-boss/Prisma kết nối — bổ sung đóng chúng khi thêm.
 */
function shutdown(signal: string): void {
  logger.info({ signal }, "Nhận tín hiệu tắt — đóng server")
  server.stop()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
