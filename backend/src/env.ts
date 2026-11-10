import { z } from "zod"

/**
 * Biến môi trường của backend — đọc MỘT chỗ duy nhất, parse fail-fast lúc boot.
 *
 * Lỗi cấu hình phải lộ ra ngay khi khởi động (không âm thầm chạy với giá trị
 * sai). Không import module nào khác trước khi parse xong để tránh side effect
 * chạy trước khi env được kiểm tra.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** Cổng HTTP của API — khớp mặc định proxy dev của FE (`VITE_PROXY_TARGET` :8000). */
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),

  /**
   * Connection string Postgres. Runtime dùng URL này; Prisma CLI (migrate)
   * đọc biến cùng tên qua `prisma.config.ts`.
   */
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("postgres"), {
      message: "DATABASE_URL phải là connection string Postgres",
    }),

  /**
   * Origin được phép gọi API (phân tách bằng dấu phẩy). Mặc định rỗng = không
   * CORS — dev dùng proxy của Vite nên không cần; đặt khi gọi API từ origin khác.
   */
  CORS_ORIGINS: z.string().default(""),

  /** Mức log của pino. */
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  /**
   * Secret ký cookie phiên của better-auth (tối thiểu 32 ký tự).
   * Bắt buộc ở production; dev/test dùng giá trị mặc định của .env.example.
   */
  BETTER_AUTH_SECRET: z.string().min(32).default("rendez-dev-secret-0123456789abcdef"),

  /**
   * Base URL của API — better-auth dùng để dựng URL callback/cookie.
   * Không có scheme đặc biệt ở Phase 1 (chỉ email+password).
   */
  BETTER_AUTH_URL: z.string().url().default("http://localhost:8000"),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ")
  throw new Error(`Biến môi trường không hợp lệ: ${issues}`)
}

/** Origin CORS dưới dạng mảng — `hono/cors` nhận mảng origin. */
const corsOrigins = parsed.data.CORS_ORIGINS.split(",")
  .map((value) => value.trim())
  .filter(Boolean)

/**
 * Production không được chạy bằng secret dev — secret mặc định ai cũng biết,
 * dùng nó ở production là lỗ hổng giả mạo cookie phiên.
 */
if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.BETTER_AUTH_SECRET === "rendez-dev-secret-0123456789abcdef"
) {
  throw new Error("BETTER_AUTH_SECRET phải được đặt riêng ở production (>= 32 ký tự)")
}

export const env = {
  ...parsed.data,
  corsOrigins,
} as const

export type Env = typeof env
