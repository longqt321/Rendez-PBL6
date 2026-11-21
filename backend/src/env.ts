import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(8000),

  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("postgres"), {
      message: "DATABASE_URL phải là connection string Postgres",
    }),

  REDIS_URL: z.string().url().or(z.literal("")).default(""),

  CORS_ORIGINS: z.string().default(""),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  TRUSTED_PROXIES: z.string().default(""),

  BETTER_AUTH_SECRET: z.string().min(32).default("rendez-dev-secret-0123456789abcdef"),

  BETTER_AUTH_URL: z.string().url().default("http://localhost:8000"),

  APP_ORIGIN: z.string().url().default("http://localhost:5173"),

  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET: z.string().default(""),

  R2_PUBLIC_BASE_URL: z.string().url().or(z.literal("")).default(""),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),

  MAIL_FROM: z.string().default(""),
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

/** Proxy tin cậy dưới dạng mảng (IP hoặc CIDR IPv4) — rỗng = không tin proxy nào. */
const trustedProxies = parsed.data.TRUSTED_PROXIES.split(",")
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
  trustedProxies,
  /** Đủ cấu hình R2 mới bật upload ảnh (xem `lib/r2.ts`). */
  r2Configured:
    parsed.data.R2_ACCOUNT_ID.length > 0 &&
    parsed.data.R2_ACCESS_KEY_ID.length > 0 &&
    parsed.data.R2_SECRET_ACCESS_KEY.length > 0 &&
    parsed.data.R2_BUCKET.length > 0,
  /** Đủ cấu hình SMTP mới gửi mail thật (xem `lib/mailer.ts`). */
  mailConfigured:
    parsed.data.SMTP_HOST.length > 0 &&
    parsed.data.SMTP_USER.length > 0 &&
    parsed.data.SMTP_PASSWORD.length > 0 &&
    parsed.data.MAIL_FROM.length > 0,
} as const

export type Env = typeof env
