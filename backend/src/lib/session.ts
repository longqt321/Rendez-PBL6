import { createMiddleware } from "hono/factory"
import type { Context } from "hono"
import type { UserRole } from "@rendez/schema"
import type { AppEnv } from "../app"
import { ApiError } from "./errors"
import { auth } from "./auth"
import { prisma } from "./prisma"
import type { User } from "../../generated/prisma/client"

export async function getViewer(c: Context<AppEnv>): Promise<User | null> {
  const result = await auth.api.getSession({ headers: c.req.raw.headers })
  return (result?.user as User | undefined) ?? null
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getViewer(c)
  if (!user) throw new ApiError(401, "Chưa đăng nhập")

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, deletedAt: true, bannedAt: true },
  })
  if (!record || record.deletedAt) {
    throw new ApiError(401, "Chưa đăng nhập")
  }
  if (record.bannedAt) {
    await prisma.session.deleteMany({ where: { userId: user.id } })
    throw new ApiError(403, "Tài khoản đã bị tạm khoá")
  }

  c.set("userId", user.id)
  c.set("userRole", record.role as UserRole)
  await next()
})

export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const role = c.get("userRole")
    if (!role || !roles.includes(role)) {
      throw new ApiError(403, "Bạn không có quyền truy cập khu vực này")
    }
    await next()
  })
}
