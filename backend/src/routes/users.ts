import { Hono } from "hono"
import { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { toUserProfile } from "../lib/profile"

/**
 * Route người dùng (T2.6).
 *
 * `GET /users?q=` — tìm theo name/handle không dấu (`unaccent`), trả
 * `Page<UserProfile>`. Đếm bài đăng của cả trang bằng một GROUP BY — không N+1
 * (A6.9: số server đếm).
 */

const USERS_PAGE_SIZE = 20

interface UserRow {
  id: string
  name: string
  handle: string
  bio: string
  location: string
  private_profile: boolean
  created_at: Date
}

export function createUsersRouter() {
  const router = new Hono<AppEnv>()

  router.get("/users", async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const q = c.req.query("q")?.trim() ?? ""
    const conditions: Prisma.Sql[] = [Prisma.sql`u.deleted_at IS NULL`]

    if (q.length > 0) {
      const pattern = `%${q.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`)}%`
      conditions.push(
        Prisma.sql`(unaccent(lower(u.name)) LIKE ${pattern} OR unaccent(lower(u.handle)) LIKE ${pattern})`,
      )
    }
    if (cursor) {
      conditions.push(
        Prisma.sql`(u.created_at, u.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      )
    }

    const rows = await prisma.$queryRaw<UserRow[]>(Prisma.sql`
      SELECT u.id, u.name, u.handle, u.bio, u.location, u.private_profile, u.created_at
      FROM users u
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ${USERS_PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, USERS_PAGE_SIZE)
    const last = page.at(-1)

    const postCounts = await prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: page.map((user) => user.id) }, deletedAt: null },
      _count: { authorId: true },
    })
    const countByUser = new Map(postCounts.map((row) => [row.authorId, row._count.authorId]))

    return c.json({
      items: page.map((user) =>
        toUserProfile(
          {
            id: user.id,
            name: user.name,
            handle: user.handle,
            bio: user.bio,
            location: user.location,
            privateProfile: user.private_profile,
            createdAt: user.created_at,
          },
          null,
          {
            postCount: countByUser.get(user.id) ?? 0,
            followerCount: 0,
            followingCount: 0,
            followedByMe: false,
          },
        ),
      ),
      next:
        rows.length > USERS_PAGE_SIZE && last
          ? encodeCursor({ createdAt: last.created_at, id: last.id })
          : null,
    })
  })

  return router
}
