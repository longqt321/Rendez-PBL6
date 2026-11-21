import { env } from "../env"
import { logger } from "./logger"

let client: Bun.RedisClient | null = null
let initAttempted = false

/**
 * Lấy Redis client dùng chung (Bun.RedisClient) khi có `REDIS_URL`.
 * Trả `null` khi không cấu hình hoặc kết nối lỗi để hệ thống fallback an toàn.
 */
export function getRedis(): Bun.RedisClient | null {
  if (!env.REDIS_URL) return null
  if (client) return client
  if (initAttempted) return null
  initAttempted = true
  try {
    const instance = new Bun.RedisClient(env.REDIS_URL, {
      connectionTimeout: 2_000,
      autoReconnect: true,
      maxRetries: 3,
    })
    instance.onclose = (err) => {
      if (err) logger.warn({ err }, "Redis kết nối bị đóng")
    }
    client = instance
    return client
  } catch (err) {
    logger.warn({ err }, "Khởi tạo Redis thất bại, dùng fallback in-memory")
    return null
  }
}

export async function closeRedis(): Promise<void> {
  if (!client) return
  try {
    client.close()
  } catch (err) {
    logger.warn({ err }, "Đóng Redis lỗi")
  } finally {
    client = null
    initAttempted = false
  }
}
