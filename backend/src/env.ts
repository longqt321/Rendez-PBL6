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
   * IP/CIDR của reverse proxy được tin cậy (phân tách bằng dấu phẩy).
   *
   * Chỉ khi request đến TỪ một địa chỉ trong danh sách này thì `X-Forwarded-For`
   * mới được dùng để lấy IP người gọi (rate limit). Để rỗng = không tin proxy
   * nào: IP lấy từ socket, header do client tự gửi bị bỏ qua — chống giả mạo
   * `X-Forwarded-For` để né rate limit.
   */
  TRUSTED_PROXIES: z.string().default(""),

  /**
   * Secret ký cookie phiên của better-auth (tối thiểu 32 ký tự).
   * Bắt buộc ở production; dev/test dùng giá trị mặc định của .env.example.
   */
  BETTER_AUTH_SECRET: z.string().min(32).default("rendez-dev-secret-0123456789abcdef"),

  /** URL công khai của API — better-auth dùng để dựng callback URL. */
  BETTER_AUTH_URL: z.string().url().default("http://localhost:8000"),

  /**
   * Origin của frontend — nơi link trong email (xác thực email) redirect về.
   * Cũng được thêm vào trustedOrigins của better-auth: callbackURL gửi kèm
   * endpoint xác thực phải thuộc origin này mới được chấp nhận.
   */
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),

  /**
   * Cloudflare R2 (S3-compatible). Đủ cả 4 biến thì bật tính năng ảnh
   * (presigned PUT + `POST /media`); thiếu → route media trả 503 thay vì
   * crash — môi trường dev không có credentials vẫn chạy được phần còn lại.
   */
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET: z.string().default(""),
  /**
   * Chuỗi rỗng phải hợp lệ (biến có mặt nhưng chưa điền — đúng như
   * `.env.example`): `z.string().url()` từ chối `""` nên boot sẽ chết dù R2
   * chưa bật. `r2Configured` mới là nơi quyết định bật/tắt tính năng ảnh.
   */
  R2_PUBLIC_BASE_URL: z.string().url().or(z.literal("")).default(""),

  /**
   * SMTP gửi mail (quên mật khẩu). Đủ cả 4 biến thì gửi mail thật qua
   * nodemailer (tương thích Resend/Brevo/SES… — xem docs/backend/SMTP-SETUP.md);
   * thiếu → dev/test log token ra log như trước, production chỉ ghi nhận.
   */
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  /** Địa chỉ From hiển thị, ví dụ `Rendez <no-reply@rendez.example.com>`. */
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
