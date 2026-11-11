import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { env } from "../env"
import { logger } from "./logger"
import { prisma } from "./prisma"

/**
 * better-auth 1.7.19 — xác thực email + password (D4), phiên bằng cookie.
 *
 * Đã xác minh trong source `@better-auth/prisma-adapter@1.7.19`:
 * adapter gọi Prisma qua client property (`prisma.user`, `prisma.session`…)
 * nên model Prisma `User`/`Session` khớp mà không cần khai `modelName`.
 * Chỉ các field lệch tên mới cần map (`image` → `avatarUrl`, `ipAddress` → `ip`).
 *
 * - `advanced.database.n = false`: id do Postgres sinh (`gen_random_uuid()`),
 *   không để better-auth tự sinh chuỗi — cột `id` trong DB là `uuid`.
 * - `additionalFields`: các cột nghiệp vụ của bảng `users` mà better-auth
 *   không biết (handle, bio, location, privateProfile) — khai ở đây để
 *   sign-up ghi được và schema-check không báo thiếu.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  /** Khớp mount thật trong `routes/index.ts` — mặc định của better-auth là `/api/auth`. */
  basePath: "/api/v1/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.corsOrigins,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    /** Khớp validate của FE (mật khẩu tối thiểu 8 ký tự). */
    minPasswordLength: 8,
    /** Đăng ký xong trả luôn phiên — FE không phải gọi login lần hai. */
    autoSignIn: true,
    /**
     * Quên mật khẩu — quyết định 2026-11-11 (email "phương án khả thi nhất"):
     * CHƯA có SMTP, token reset được ghi vào log để dev/test tự lấy. Production
     * cần SMTP thật thì thay hàm này bằng gửi mail — không đổi gì khác.
     * Chữ ký `{ user, url, token }` đã xác minh trong source better-auth 1.7.19
     * (`dist/api/routes/password.mjs` gọi `sendResetPassword({ user, url, token })`).
     */
    sendResetPassword: async ({ user, url, token }) => {
      if (env.NODE_ENV === "production") {
        // Production không log token (ai đọc log lấy được thì reset hộ người khác).
        logger.info({ userId: user.id }, "Yêu cầu đặt lại mật khẩu — cần SMTP thật")
        return
      }
      logger.warn(
        { email: user.email, url, token },
        "DEV ONLY — link đặt lại mật khẩu (chưa có SMTP)",
      )
    },
    /** Token reset hết hạn sau 1 giờ (mặc định của better-auth, khai tường minh). */
    resetPasswordTokenExpiresIn: 60 * 60,
  },

  session: {
    /** 7 ngày — cùng giá trị với `session.expiresIn` mặc định, khai tường minh. */
    expiresIn: 60 * 60 * 24 * 7,
    /** Gia hạn phiên tối đa 1 lần/ngày để giảm ghi DB. */
    updateAge: 60 * 60 * 24,
    fields: {
      ipAddress: "ip",
    },
  },

  user: {
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      handle: { type: "string", required: true },
      bio: { type: "string", required: false, defaultValue: "" },
      location: { type: "string", required: false, defaultValue: "" },
      privateProfile: { type: "boolean", required: false, defaultValue: false },
    },
  },

  advanced: {
    database: {
      /** Cột `id` là uuid có default trong Postgres — không sinh id ở tầng app. */
      generateId: false,
    },
  },
})

export type Auth = typeof auth
