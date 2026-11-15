import { createMiddleware } from "hono/factory"
import type { Context } from "hono"
import type { AppEnv } from "../app"
import { ApiError } from "./errors"
import { auth } from "./auth"
import type { User } from "../../generated/prisma/client"

export async function getViewer(c: Context<AppEnv>): Promise<User | null> {
  const result = await auth.api.getSession({ headers: c.req.raw.headers })
  return (result?.user as User | undefined) ?? null
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getViewer(c)
  if (!user) throw new ApiError(401, "Chưa đăng nhập")
  c.set("userId", user.id)
  await next()
})
