import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { env } from "../env"
import { logger } from "./logger"
import { sendAccountExistsEmail, sendResetPasswordEmail, sendVerifyEmailEmail } from "./mailer"
import { prisma } from "./prisma"

export const VERIFY_EMAIL_CALLBACK_PATH = "/verify-email?verified=1"

export function verifyEmailCallbackUrl(): string {
  return new URL(VERIFY_EMAIL_CALLBACK_PATH, env.APP_ORIGIN).toString()
}

const staticTrustedOrigins = [...new Set([...env.corsOrigins, env.APP_ORIGIN])]

function resolveTrustedOrigins(request?: Request): string[] {
  if (env.NODE_ENV === "production" || !request) return staticTrustedOrigins
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  if (!forwardedHost) return staticTrustedOrigins
  const dynamicOrigin = `${forwardedProto}://${forwardedHost}`
  return staticTrustedOrigins.includes(dynamicOrigin)
    ? staticTrustedOrigins
    : [...staticTrustedOrigins, dynamicOrigin]
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,

  basePath: "/api/v1/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: resolveTrustedOrigins,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  emailAndPassword: {
    enabled: true,

    minPasswordLength: 8,

    autoSignIn: true,

    requireEmailVerification: true,

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

    resetPasswordTokenExpiresIn: 60 * 60,

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

  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      let sent = false
      try {
        sent = await sendVerifyEmailEmail({ to: user.email, url, name: user.name })
        if (sent) {
          logger.info({ userId: user.id }, "Đã gửi email xác thực")
          return
        }
      } catch (error) {
        // Lỗi SMTP không được lộ ra API (chống dò email) — chỉ log cho người vận hành.
        logger.error({ err: error, userId: user.id }, "Gửi email xác thực thất bại")
      }
      if (!sent && process.env.DEMO_AUTO_VERIFY_EMAIL === "true") {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
        logger.warn(
          { userId: user.id },
          "DEMO_AUTO_VERIFY_EMAIL=true — tự động kích hoạt email sau khi SMTP dự phòng kích hoạt",
        )
        return
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
    expiresIn: 60 * 60 * 24 * 7,

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
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },

  advanced: {
    trustedProxyHeaders: true,
    database: {
      generateId: false,
    },
  },
})

export type Auth = typeof auth

export type ExistingUserSignUpAction = "verification-resent" | "account-exists-mail"

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
