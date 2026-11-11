import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { env } from "../env"
import { logger } from "./logger"
import { sendAccountExistsEmail, sendResetPasswordEmail, sendVerifyEmailEmail } from "./mailer"
import { prisma } from "./prisma"

/**
 * Link xác thực email redirect về trang FE — dùng chung cho mail và route đăng ký.
 *
 * Kèm `verified=1` để trang `/verify-email` phân biệt được "vừa xác thực xong"
 * với "mở trang trực tiếp / link thiếu token". Trước đây trang không có tham số
 * nào để kiểm nên luôn hiện "Xác thực thành công" kể cả khi không có token.
 */
export const VERIFY_EMAIL_CALLBACK_PATH = "/verify-email?verified=1"

/** URL FE nhận kết quả xác thực (đã nằm trong trustedOrigins). */
export function verifyEmailCallbackUrl(): string {
  return new URL(VERIFY_EMAIL_CALLBACK_PATH, env.APP_ORIGIN).toString()
}

/**
 * Origin tin cậy cho better-auth: origin CORS của API + origin FE (đích redirect
 * của link xác thực email). Trùng nhau thì bỏ bản lặp.
 */
const trustedOrigins = [...new Set([...env.corsOrigins, env.APP_ORIGIN])]

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
  trustedOrigins,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    /** Khớp validate của FE (mật khẩu tối thiểu 8 ký tự). */
    minPasswordLength: 8,
    /**
     * Đăng ký xong trả luôn phiên — FE không phải gọi login lần hai.
     * Khi `requireEmailVerification` bật, better-auth tự bỏ auto sign-in và trả
     * `{ token: null, user }` (đã đọc `dist/api/routes/sign-up.mjs:155,241`).
     */
    autoSignIn: true,
    /**
     * Bắt buộc xác thực email trước khi đăng nhập (quyết định 2026-11-12).
     * better-auth chặn ở `sign-in.mjs:338` với lỗi 403 "Email not verified";
     * route `/session` map lỗi đó sang message tiếng Việt.
     */
    requireEmailVerification: true,
    /**
     * Quên mật khẩu — quyết định 2026-11-11 (email "phương án khả thi nhất"):
     * đủ cấu hình SMTP (`env.mailConfigured`) thì gửi mail thật qua nodemailer
     * (`lib/mailer.ts`, tương thích Resend/Brevo/SES…); thiếu thì giữ hành vi cũ:
     * dev/test log token để tự lấy, production chỉ ghi nhận (không log token).
     * Chữ ký `{ user, url, token }` đã xác minh trong source better-auth 1.7.19
     * (`dist/api/routes/password.mjs` gọi `sendResetPassword({ user, url, token })`).
     */
    sendResetPassword: async ({ user, url, token }) => {
      try {
        const sent = await sendResetPasswordEmail({ to: user.email, url, name: user.name })
        if (sent) {
          logger.info({ userId: user.id }, "Đã gửi email đặt lại mật khẩu")
          return
        }
      } catch (error) {
        // Lỗi SMTP không được lộ ra API (chống dò email) — chỉ log cho người vận hành.
        logger.error({ err: error, userId: user.id }, "Gửi email đặt lại mật khẩu thất bại")
      }
      if (env.NODE_ENV === "production") {
        // Production không log token (ai đọc log lấy được thì reset hộ người khác).
        logger.warn({ userId: user.id }, "Yêu cầu đặt lại mật khẩu — chưa cấu hình SMTP")
        return
      }
      logger.warn(
        { email: user.email, url, token },
        "DEV ONLY — link đặt lại mật khẩu (chưa có SMTP)",
      )
    },
    /** Token reset hết hạn sau 1 giờ (mặc định của better-auth, khai tường minh). */
    resetPasswordTokenExpiresIn: 60 * 60,
    /**
     * Đăng ký bằng email ĐÃ có tài khoản.
     *
     * better-auth trả response "generic duplicate" (`{ token: null, user }` giả)
     * để không lộ email tồn tại, và gọi hook này (`dist/api/routes/sign-up.mjs`
     * dòng 201 — đã đọc source). Trước đây hook không được khai nên không có mail
     * nào được gửi: người dùng thấy "kiểm tra email" rồi chờ mãi (V1-02).
     *
     * Xử lý theo trạng thái tài khoản thật (xem `notifyExistingUserSignUp`):
     * chưa xác thực → gửi lại link xác thực; đã xác thực → mail "tài khoản đã
     * tồn tại" kèm lối đăng nhập / đặt lại mật khẩu. Lỗi gửi mail bị nuốt để
     * response vẫn trung tính (không lộ email tồn tại qua mã lỗi).
     */
    onExistingUserSignUp: async ({ user }) => {
      try {
        const action = await notifyExistingUserSignUp(user)
        logger.info(
          { userId: user.id, action },
          "Đăng ký với email đã tồn tại — đã gửi mail hướng dẫn",
        )
      } catch (error) {
        logger.error({ err: error, userId: user.id }, "Gửi mail cho đăng ký trùng email thất bại")
      }
    },
  },

  /**
   * Xác thực email — quyết định 2026-11-12.
   *
   * - `sendVerificationEmail`: chữ ký `{ user, url, token }` đã xác minh trong
   *   source better-auth 1.7.19 (`dist/api/routes/email-verification.mjs` và
   *   `dist/api/routes/sign-up.mjs`). Đủ SMTP thì gửi mail thật; thiếu thì
   *   dev/test log link để tự lấy, production chỉ ghi nhận (không log token).
   * - `sendOnSignUp`: gửi mail ngay khi đăng ký (mặc định đã bật khi
   *   `requireEmailVerification` — khai tường minh).
   * - `autoSignInAfterVerification`: bấm link xong có phiên luôn, không phải
   *   đăng nhập lại (better-auth set cookie phiên trong response redirect).
   * - `expiresIn`: token xác thực hết hạn sau 1 giờ, như token reset mật khẩu.
   */
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      try {
        const sent = await sendVerifyEmailEmail({ to: user.email, url, name: user.name })
        if (sent) {
          logger.info({ userId: user.id }, "Đã gửi email xác thực")
          return
        }
      } catch (error) {
        // Lỗi SMTP không được lộ ra API (chống dò email) — chỉ log cho người vận hành.
        logger.error({ err: error, userId: user.id }, "Gửi email xác thực thất bại")
      }
      if (env.NODE_ENV === "production") {
        // Production không log token (ai đọc log lấy được thì xác thực hộ người khác).
        logger.warn({ userId: user.id }, "Yêu cầu xác thực email — chưa cấu hình SMTP")
        return
      }
      logger.warn(
        { email: user.email, url, token },
        "DEV ONLY — link xác thực email (chưa có SMTP)",
      )
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
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

/** Hành vi đã thực hiện khi có người đăng ký lại bằng email đã tồn tại (dùng cho test). */
export type ExistingUserSignUpAction = "verification-resent" | "account-exists-mail"

/**
 * Gửi mail cho người đăng ký lại bằng email đã tồn tại (V1-02).
 *
 * Tách khỏi hook để test được nhánh quyết định mà không cần chạy better-auth.
 * Người dùng CHƯA xác thực đang chờ mail xác thực → gửi lại link thật (cùng
 * cơ chế với `/auth/send-verification-email`); đã xác thực → mail "tài khoản
 * đã tồn tại" chỉ chứa link đăng nhập / quên mật khẩu (không kèm token để
 * không bị lạm dụng làm công cụ ép gửi link đổi mật khẩu).
 *
 * Lỗi SMTP ném ra cho hook log — response đăng ký vẫn là 201 trung tính.
 */
export async function notifyExistingUserSignUp(user: {
  id: string
  email: string
  name: string
  emailVerified: boolean
}): Promise<ExistingUserSignUpAction> {
  if (!user.emailVerified) {
    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: verifyEmailCallbackUrl() },
    })
    return "verification-resent"
  }
  const sent = await sendAccountExistsEmail({
    to: user.email,
    name: user.name,
    loginUrl: new URL("/login", env.APP_ORIGIN).toString(),
    forgotPasswordUrl: new URL("/forgot-password", env.APP_ORIGIN).toString(),
  })
  if (!sent && env.NODE_ENV !== "production") {
    // Dev chưa có SMTP: không có mail thật, ghi nhận để người vận hành biết.
    logger.warn({ userId: user.id }, "Đăng ký trùng email đã xác thực — chưa cấu hình SMTP")
  }
  return "account-exists-mail"
}
