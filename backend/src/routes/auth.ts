import { Hono } from "hono"
import { z } from "zod"
import { updateMeInputSchema } from "@rendez/schema"
import type { AppEnv } from "../app"
import { auth } from "../lib/auth"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { toUserProfile } from "../lib/profile"
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
 * better-auth ném `APIError` với `statusCode` + `body.message` tiếng Anh; FE
 * hiển thị thẳng `message` nên phải dịch ở đây, không để lộ chi tiết nội bộ.
 */
function mapAuthError(error: unknown): never {
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : 500

  if (status === 401 || status === 403) throw new ApiError(401, "Email hoặc mật khẩu không đúng")
  if (status === 422 || status === 400) {
    const message =
      typeof error === "object" && error !== null && "body" in error
        ? (error as { body?: { message?: string } }).body?.message
        : undefined
    if (message && /exist/i.test(message)) throw new ApiError(409, "Email đã được sử dụng")
    throw new ApiError(400, "Dữ liệu đăng ký không hợp lệ")
  }
  throw error
}

/** Đếm số liệu hồ sơ — một query, không N+1 (bảng `follows` thêm ở T5.4). */
async function buildProfile(userId: string, viewerId: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new ApiError(401, "Chưa đăng nhập")

  const postCount = await prisma.post.count({
    where: { authorId: user.id, deletedAt: null },
  })

  return toUserProfile(user, viewerId, {
    postCount,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
  })
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
  router.post("/session", async (c) => {
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

      const profile = await buildProfile(userId, userId)
      const result = c.json(profile)
      for (const cookie of headers.getSetCookie()) result.headers.append("Set-Cookie", cookie)
      return result
    } catch (error) {
      if (error instanceof ApiError) throw error
      mapAuthError(error)
    }
  })

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

  /** Đăng ký — endpoint mới, FE chưa có UI (T1.3). */
  router.post("/register", async (c) => {
    const raw = await c.req.json().catch(() => null)
    const parsed = registerInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

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
      mapAuthError(error)
    }
  })

  return router
}

/** Re-export để route khác (GET /users/:handle) dùng chung — một nơi tính hồ sơ. */
export { buildProfile }
