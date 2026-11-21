import { Hono } from "hono"
import { z } from "zod"
import { isAPIError } from "better-auth/api"
import {
  updateMeInputSchema,
  validateProfileImageUrl,
  type ProfileMediaFolder,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { auth, verifyEmailCallbackUrl } from "../lib/auth"
import { isLocalMediaFallbackEnabled, localMediaBaseUrl } from "../lib/media-storage"
import { env } from "../env"
import { ApiError } from "../lib/errors"
import { recordAuditLogSafe } from "../lib/audit-log"
import { prisma } from "../lib/prisma"
import { clientIp, rateLimit } from "../lib/rate-limit"
import { findProfileById } from "../lib/users"
import { requireAuth } from "../lib/session"
import { noStore } from "../lib/http-cache"

const handleSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, "Handle chỉ gồm chữ thường, số và gạch dưới")

const registerInputSchema = z.object({
  name: z.string().trim().min(2).max(40),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
  handle: handleSchema,
})

const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
})

function mapAuthError(error: unknown): never {
  if (!isAPIError(error)) throw error

  const message = error.body?.message
  if (error.statusCode === 403 && message && /not verified/i.test(message)) {
    throw new ApiError(
      403,
      "Email chưa được xác thực. Hãy mở link trong email xác thực (kiểm tra cả mục spam) rồi đăng nhập lại.",
    )
  }
  if (error.statusCode === 401 || error.statusCode === 403) {
    throw new ApiError(401, "Email hoặc mật khẩu không đúng")
  }
  if (error.statusCode === 422 || error.statusCode === 400) {
    if (message && /exist/i.test(message)) throw new ApiError(409, "Email đã được sử dụng")
    throw new ApiError(400, "Dữ liệu đăng ký không hợp lệ")
  }
  throw error
}

async function buildProfile(userId: string, viewerId: string | null) {
  // Một nơi dựng hồ sơ: `lib/users.ts` đếm bài/follower/following thật (T5.4).
  const profile = await findProfileById(userId, viewerId)
  if (!profile) throw new ApiError(401, "Chưa đăng nhập")
  return profile
}

async function assertHandleAvailable(handle: string) {
  const taken = await prisma.user.findUnique({ where: { handle }, select: { id: true } })
  if (taken) throw new ApiError(409, "Handle đã được sử dụng")
}

async function assertActiveUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true, bannedAt: true },
  })
  if (!user || user.deletedAt) {
    // signInEmail đã tạo phiên trước khi ta kiểm được — xoá ngay để không còn
    // cookie hợp lệ cho tài khoản đã xoá.
    await prisma.session.deleteMany({ where: { userId } })
    throw new ApiError(401, "Email hoặc mật khẩu không đúng")
  }
  if (user.bannedAt) {
    await prisma.session.deleteMany({ where: { userId } })
    throw new ApiError(403, "Tài khoản đã bị tạm khoá")
  }
}

function validateProfileImages(
  userId: string,
  urls: { url: string | null | undefined; folder: ProfileMediaFolder }[],
): void {
  const hasImage = urls.some(({ url }) => url != null && url !== "")
  const localFallback = isLocalMediaFallbackEnabled()
  const hasR2Public = env.r2Configured && env.R2_PUBLIC_BASE_URL.length > 0

  if (hasImage && !hasR2Public && !localFallback) {
    throw new ApiError(400, "Tính năng ảnh chưa được cấu hình")
  }

  const fallbackBaseUrl = localFallback ? localMediaBaseUrl() : undefined
  const publicBaseUrl = hasR2Public ? env.R2_PUBLIC_BASE_URL : (fallbackBaseUrl ?? "")

  for (const { url, folder } of urls) {
    const result = validateProfileImageUrl(url, {
      userId,
      folder,
      publicBaseUrl,
      fallbackBaseUrl,
    })
    if (!result.ok) throw new ApiError(400, result.message)
  }
}

export function createAuthRouter() {
  const router = new Hono<AppEnv>()

  router.get("/me", requireAuth, async (c) => {
    return noStore(c, await buildProfile(c.get("userId"), c.get("userId")))
  })

  router.patch("/me", requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => null)
    const parsed = updateMeInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const userId = c.get("userId")
    validateProfileImages(userId, [
      { url: parsed.data.avatarUrl, folder: "avatars" },
      { url: parsed.data.coverUrl, folder: "covers" },
    ])
    await prisma.user.update({ where: { id: userId }, data: parsed.data })
    return noStore(c, await buildProfile(userId, userId))
  })

  router.post(
    "/session",
    rateLimit({ scope: "auth-session", limit: 20, windowSeconds: 60 }),
    async (c) => {
      const raw = await c.req.json().catch(() => null)
      const parsed = loginInputSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ApiError(400, "Cần email và mật khẩu để đăng nhập")
      }

      try {
        const { headers, response } = await auth.api.signInEmail({
          body: parsed.data,
          headers: c.req.raw.headers,
          returnHeaders: true,
        })
        const userId = (response as { user?: { id?: string } } | null)?.user?.id
        if (!userId) throw new ApiError(401, "Email hoặc mật khẩu không đúng")

        await assertActiveUser(userId)

        const profile = await buildProfile(userId, userId)
        const result = c.json(profile)
        for (const cookie of headers.getSetCookie()) result.headers.append("Set-Cookie", cookie)
        return result
      } catch (error) {
        const ip = clientIp(c.req.raw.headers, c.env?.remoteAddress)
        void recordAuditLogSafe({
          action: "auth.login_failed",
          entity: "auth",
          meta: {
            email: parsed.data.email,
            reason: error instanceof ApiError ? error.message : "invalid_credentials",
          },
          ip: ip === "unknown" ? null : ip,
        })
        if (error instanceof ApiError) throw error
        mapAuthError(error)
      }
    },
  )

  router.delete("/session", requireAuth, async (c) => {
    try {
      await auth.api.signOut({ headers: c.req.raw.headers })
    } catch {
      // Phiên đã hết hạn ở DB vẫn coi như đăng xuất thành công — mục tiêu là
      // client sạch cookie; không nuốt lỗi hạ tầng vì signOut chỉ xoá 1 dòng.
    }
    return c.json({ loggedOut: true })
  })

  router.delete("/me", requireAuth, async (c) => {
    const userId = c.get("userId")
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId } }),
    ])
    return c.json({ deleted: true })
  })

  router.post(
    "/register",
    rateLimit({ scope: "auth-register", limit: 20, windowSeconds: 60 }),
    async (c) => {
      const raw = await c.req.json().catch(() => null)
      const parsed = registerInputSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
      }
      await assertHandleAvailable(parsed.data.handle)

      try {
        const { headers, response } = await auth.api.signUpEmail({
          body: {
            ...parsed.data,
            // Link trong mail xác thực redirect về trang FE (trustedOrigins đã
            // gồm APP_ORIGIN) — mặc định của better-auth là "/" sẽ trỏ về API.
            callbackURL: verifyEmailCallbackUrl(),
          },
          headers: c.req.raw.headers,
          returnHeaders: true,
        })
        const result = response as { token?: string | null; user?: { id?: string } } | null
        const userId = result?.user?.id
        if (!userId) throw new ApiError(500, "Không tạo được tài khoản")

        if (result?.token == null) {
          return c.json({ requiresVerification: true } as const, 201)
        }

        // Nhánh dự phòng nếu sau này tắt requireEmailVerification: giữ hành vi cũ.
        const profile = await buildProfile(userId, userId)
        const sessionResult = c.json(profile, 201)
        for (const cookie of headers.getSetCookie()) {
          sessionResult.headers.append("Set-Cookie", cookie)
        }
        return sessionResult
      } catch (error) {
        if (error instanceof ApiError) throw error
        // 422 "Failed to create user": có thể do đua handle (P2002 bị better-auth
        // nuốt) — kiểm lại để trả 409 thay vì 400 chung chung.
        if (isAPIError(error) && error.statusCode === 422) {
          await assertHandleAvailable(parsed.data.handle)
        }
        mapAuthError(error)
      }
    },
  )

  return router
}

export { buildProfile }
