import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"
import { env } from "../env"

/**
 * Prisma 7 bắt buộc driver adapter (đã xác minh docs + source 7.10.1).
 * Pool do `pg.Pool` quản lý — cấu hình mặc định đủ cho 1 instance (J4).
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
})
