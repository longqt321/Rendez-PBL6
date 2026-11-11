import { Hono } from "hono"
import { z } from "zod"
import { isAPIError } from "better-auth/api"
import { updateMeInputSchema } from "@rendez/schema"
import type { AppEnv } from "../app"
import { auth } from "../lib/auth"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { rateLimit } from "../lib/rate-limit"
import { findProfileById } from "../lib/users"
import { requireAuth } from "../lib/session"

/**
 * Route auth + hồ sơ (Phase 1).
 *
 * Hợp đồng (Phần A của kế hoạch):
 * - `GET /me` 401 khi chưa đăng nhập, 200 `userProfileSchema`.
 * - `PATCH /me` chỉ 4 trường `updateMeInputSchema`; trường lạ bị bỏ qua.
 * - `POST /session` đăng nhập email+password → trả hồ sơ + Set-Cookie phiên.
 * - `DELETE /session` → `{ loggedOut: true }`.
 * - `POST /register` endpoint mới (FE chưa có UI) → hồ sơ + Set-Cookie.
 */

/** Handle: chữ thường, số, gạch dưới; 3–30 ký tự (quy ước mới, xem DECISIONS). */
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

/**
 * Chuyển lỗi better-auth thành `{ message }` tiếng Việt (D6).
 *
 * `isAPIError` là predicate chính thức của better-auth (chấp nhận cả hai bản
 * APIError nội bộ) — trước đây file này tự kiểm `"statusCode" in error` kiểu
 * duck-typing, dễ sai khi thư viện đổi hình dạng lỗi.
 */
function mapAuthError(error: unknown): never {
  if (!isAPIError(error)) throw error

  if (error.statusCode === 401 || error.statusCode === 403) {
    throw new ApiError(401, "Email hoặc mật khẩu không đúng")
  }
  if (error.statusCode === 422 || error.statusCode === 400) {
    const message = error.body?.message
    if (message && /exist/i.test(message)) throw new ApiError(409, "Email đã được sử dụng")
    throw new ApiError(400, "Dữ liệu đăng ký không hợp lệ")
  }
  throw error
}

/** Đếm số liệu hồ sơ — một query, không N+1 (bảng `follows` thêm ở T5.4). */
async function buildProfile(userId: string, viewerId: string | null) {
  // Một nơi dựng hồ sơ: `lib/users.ts` đếm bài/follower/following thật (T5.4).
  const profile = await findProfileById(userId, viewerId)
  if (!profile) throw new ApiError(401, "Chưa đăng nhập")
  return profile
}

/**
 * Lỗi đăng ký: better-auth chỉ kiểm email trùng (thông báo "User already
 * exists"), còn `handle` là additionalField nên trùng handle bị adapter Prisma
 * ném P2002 — better-auth nuốt lỗi đó và trả 422 "Failed to create user"
 * (đã đọc source `dist/api/routes/sign-up.mjs`). Vì vậy phải kiểm handle trước
 * khi gọi signUpEmail, và kiểm lại sau lỗi 422 để bắt trường hợp đua (hai
 * request cùng handle, một request thắng).
 */
async function assertHandleAvailable(handle: string) {
  const taken = await prisma.user.findUnique({ where: { handle }, select: { id: true } })
  if (taken) throw new ApiError(409, "Handle đã được sử dụng")
}

/**
 * Tài khoản đã xoá mềm vẫn còn trong DB (giữ lịch sử bài/bình luận) nên
 * better-auth vẫn xác thực được mật khẩu. Chặn ở đây để người đã xoá tài khoản
 * không đăng nhập lại được bằng phiên cũ.
 */
async function assertActiveUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true },
  })
  if (!user || user.deletedAt) {
    // signInEmail đã tạo phiên trước khi ta kiểm được — xoá ngay để không còn
    // cookie hợp lệ cho tài khoản đã xoá.
    await prisma.session.deleteMany({ where: { userId } })
    throw new ApiError(401, "Email hoặc mật khẩu không đúng")
  }
}

export function createAuthRouter() {
  const router = new Hono<AppEnv>()

  /** Hồ sơ của chính mình — 401 khi chưa đăng nhập (khớp mock). */
  router.get("/me", requireAuth, async (c) => {
    return c.json(await buildProfile(c.get("userId"), c.get("userId")))
  })

  /** Cập nhật hồ sơ — chỉ 4 trường hợp đồng; trường lạ bị bỏ qua. */
  router.patch("/me", requireAuth, async (c) => {
    const raw = await c.req.json().catch(() => null)
    const parsed = updateMeInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const userId = c.get("userId")
    await prisma.user.update({ where: { id: userId }, data: parsed.data })
    return c.json(await buildProfile(userId, userId))
  })

  /**
   * Đăng nhập email + password.
   *
   * Trả hồ sơ (không trả token trong body) và chuyển nguyên `Set-Cookie` của
   * better-auth sang response — FE dùng cookie phiên, không lưu token.
   */
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
        if (error instanceof ApiError) throw error
        mapAuthError(error)
      }
    },
  )

  /** Đăng xuất — xoá phiên hiện tại, trả `{ loggedOut: true }` (A6.10). */
  router.delete("/session", requireAuth, async (c) => {
    try {
      await auth.api.signOut({ headers: c.req.raw.headers })
    } catch {
      // Phiên đã hết hạn ở DB vẫn coi như đăng xuất thành công — mục tiêu là
      // client sạch cookie; không nuốt lỗi hạ tầng vì signOut chỉ xoá 1 dòng.
    }
    return c.json({ loggedOut: true })
  })

  /**
   * Xoá tài khoản — xoá MỀM (`users.deleted_at`) để giữ nguyên bài/bình luận và
   * không phải xử lý cascade 15 bảng. Xoá luôn mọi phiên để cookie cũ mất hiệu
   * lực ngay; email/handle vẫn chiếm unique index nên KHÔNG đăng ký lại được
   * cùng email (ghi ở DECISIONS 2026-11-11 — mở lại sau nếu cần).
   */
  router.delete("/me", requireAuth, async (c) => {
    const userId = c.get("userId")
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId } }),
    ])
    return c.json({ deleted: true })
  })

  /** Đăng ký — endpoint mới, FE chưa có UI (T1.3). */
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
          body: parsed.data,
          headers: c.req.raw.headers,
          returnHeaders: true,
        })
        const userId = (response as { user?: { id?: string } } | null)?.user?.id
        if (!userId) throw new ApiError(500, "Không tạo được tài khoản")

        const profile = await buildProfile(userId, userId)
        const result = c.json(profile, 201)
        for (const cookie of headers.getSetCookie()) result.headers.append("Set-Cookie", cookie)
        return result
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

/** Re-export để route khác (GET /users/:handle) dùng chung — một nơi tính hồ sơ. */
export { buildProfile }
