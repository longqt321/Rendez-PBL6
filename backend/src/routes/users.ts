import { Hono } from "hono"
import { Prisma } from "../../generated/prisma/client"
import type { AppEnv } from "../app"
import { UUID_ID_RE, decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { toUserProfile } from "../lib/profile"
import { listCollectionsOfOwner, toCollectionSummary } from "../lib/collections"
import { createActorNotification } from "../lib/notifications"
import { listPosts } from "../lib/posts"
import { getViewer, requireAuth } from "../lib/session"
import { findProfileByHandle, findProfileById, setFollow } from "../lib/users"
import { jsonWithCache, noStore } from "../lib/http-cache"
import { suggestUsersToFollow } from "../lib/user-suggestions"
import { rateLimit } from "../lib/rate-limit"

/**
 * Route người dùng (T2.6 + T5.3 + T5.4).
 *
 * `GET /users?q=` — tìm theo name/handle không dấu (`unaccent`), trả
 * `Page<UserProfile>`. Đếm bài đăng của cả trang bằng một GROUP BY — không N+1
 * (A6.9: số server đếm).
 *
 * `GET /users/suggestions` — gợi ý người nên theo dõi (đăng nhập, `no-store`),
 * thuật toán trong `lib/user-suggestions.ts`.
 *
 * `GET /users/:handle` + `/posts?tab=` + `/collections` — trang cá nhân; tab
 * `saved`/`pinned` của người khác trả RỖNG (khớp mock: chỉ chủ mới xem được).
 * `POST/DELETE /users/:handle/follow` — idempotent, cấm tự theo dõi (400).
 */

const USERS_PAGE_SIZE = 20
const PROFILE_POSTS_PAGE_SIZE = 5

// 20 follow/unfollow mỗi phút/user — chặn spam theo dõi (V8-04).
const FOLLOW_RATE_LIMIT = rateLimit({ scope: "follow", limit: 20, windowSeconds: 60, byUser: true })

interface UserRow {
  id: string
  name: string
  handle: string
  bio: string
  location: string
  avatar_url: string | null
  cover_url: string | null
  private_profile: boolean
  created_at: Date
}

export function createUsersRouter() {
  const router = new Hono<AppEnv>()

  router.get("/users", async (c) => {
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor, UUID_ID_RE) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const q = c.req.query("q")?.trim() ?? ""
    const conditions: Prisma.Sql[] = [Prisma.sql`u.deleted_at IS NULL`]

    if (q.length > 0) {
      // Chuẩn hoá 2 phía (bỏ dấu, dấu câu → space) như `normalizeText` của mock —
      // nếu chỉ bỏ dấu ở cột thì `?q=ngọc` không khớp.
      const needle = Prisma.sql`'%' || immutable_search_normalize(${q}) || '%'`
      conditions.push(
        Prisma.sql`(immutable_search_normalize(u.name) LIKE ${needle} OR immutable_search_normalize(u.handle) LIKE ${needle})`,
      )
    }
    if (cursor) {
      conditions.push(
        Prisma.sql`(u.created_at, u.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      )
    }

    const rows = await prisma.$queryRaw<UserRow[]>(Prisma.sql`
      SELECT u.id, u.name, u.handle, u.bio, u.location, u.avatar_url, u.cover_url, u.private_profile, u.created_at
      FROM users u
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ${USERS_PAGE_SIZE + 1}
    `)

    const page = rows.slice(0, USERS_PAGE_SIZE)
    const last = page.at(-1)
    const pageIds = page.map((user) => user.id)
    const viewer = await getViewer(c)
    const viewerId = viewer?.id ?? null

    // Đếm cho cả trang bằng GROUP BY (không N+1): bài, follower, following.
    const [postCounts, followerCounts, followingCounts, followedRows] = await Promise.all([
      prisma.post.groupBy({
        by: ["authorId"],
        where: { authorId: { in: pageIds }, deletedAt: null },
        _count: { authorId: true },
      }),
      prisma.follow.groupBy({
        by: ["followingId"],
        where: { followingId: { in: pageIds } },
        _count: { followingId: true },
      }),
      prisma.follow.groupBy({
        by: ["followerId"],
        where: { followerId: { in: pageIds } },
        _count: { followerId: true },
      }),
      viewerId
        ? prisma.follow.findMany({
            where: { followerId: viewerId, followingId: { in: pageIds } },
            select: { followingId: true },
          })
        : Promise.resolve([]),
    ])
    const postByUser = new Map(postCounts.map((row) => [row.authorId, row._count.authorId]))
    const followerByUser = new Map(
      followerCounts.map((row) => [row.followingId, row._count.followingId]),
    )
    const followingByUser = new Map(
      followingCounts.map((row) => [row.followerId, row._count.followerId]),
    )
    const followedIds = new Set(followedRows.map((row) => row.followingId))

    return c.json({
      items: page.map((user) =>
        toUserProfile(
          {
            id: user.id,
            name: user.name,
            handle: user.handle,
            bio: user.bio,
            location: user.location,
            avatarUrl: user.avatar_url,
            coverUrl: user.cover_url,
            privateProfile: user.private_profile,
            createdAt: user.created_at,
          },
          viewerId,
          {
            postCount: postByUser.get(user.id) ?? 0,
            followerCount: followerByUser.get(user.id) ?? 0,
            followingCount: followingByUser.get(user.id) ?? 0,
            followedByMe: followedIds.has(user.id),
          },
        ),
      ),
      next:
        rows.length > USERS_PAGE_SIZE && last
          ? encodeCursor({ createdAt: last.created_at, id: last.id })
          : null,
    })
  })

  /**
   * Gợi ý người nên theo dõi — phải khai TRƯỚC `/users/:handle`, nếu không
   * `suggestions` bị nuốt thành handle (cùng pattern `/places/suggestions`).
   *
   * `followedByMe` phụ thuộc người xem → `no-store`: không tầng cache nào được
   * lưu body (kể cả `private, no-cache` vẫn cho trình duyệt lưu — V3-01).
   */
  router.get("/users/suggestions", requireAuth, async (c) => {
    const items = await suggestUsersToFollow(c.get("userId"))
    return noStore(c, { items })
  })

  /** Hồ sơ công khai theo handle — 404 khi không tồn tại (A6.3). */
  router.get("/users/:handle", async (c) => {
    const handle = c.req.param("handle")
    const viewer = await getViewer(c)
    const profile = await findProfileByHandle(handle, viewer?.id ?? null)
    if (!profile) throw new ApiError(404, "Không tìm thấy người dùng")
    // `followedByMe` phụ thuộc người xem → `private, no-cache` (không `max-age`):
    // refetch sau khi theo dõi phải revalidate, nếu không trình duyệt trả body cũ
    // trong cache và nút "Theo dõi" đứng im (V3-01).
    return jsonWithCache(c, profile, { maxAge: 15, scope: "private" })
  })

  /**
   * Bài đăng trên trang cá nhân — `tab=posts|saved|pinned`.
   * Tab `saved`/`pinned` chỉ chủ hồ sơ xem được; người khác nhận trang RỖNG
   * (khớp mock, không phải 403 — client không phân biệt).
   */
  router.get("/users/:handle/posts", async (c) => {
    const handle = c.req.param("handle")
    const viewer = await getViewer(c)
    const viewerId = viewer?.id ?? null
    const profile = await findProfileByHandle(handle, viewerId)
    if (!profile) throw new ApiError(404, "Không tìm thấy người dùng")

    const tab = c.req.query("tab") ?? "posts"
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor, UUID_ID_RE) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    if (tab === "saved" || tab === "pinned") {
      if (profile.id !== viewerId) return c.json({ items: [], next: null })
      const page = await listPosts({
        filter: "all",
        viewerId,
        savedOf: profile.id,
        cursor,
        pageSize: PROFILE_POSTS_PAGE_SIZE,
      })
      return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
    }

    const page = await listPosts({
      filter: "all",
      viewerId,
      authorId: profile.id,
      cursor,
      pageSize: PROFILE_POSTS_PAGE_SIZE,
    })
    return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
  })

  /** Bộ sưu tập công khai của một người — ẩn private trừ khi xem chính mình. */
  router.get("/users/:handle/collections", async (c) => {
    const handle = c.req.param("handle")
    const viewer = await getViewer(c)
    const viewerId = viewer?.id ?? null
    const profile = await findProfileByHandle(handle, viewerId)
    if (!profile) throw new ApiError(404, "Không tìm thấy người dùng")

    const rows = await listCollectionsOfOwner(profile.id, viewerId)
    return c.json({ items: rows.map((row) => toCollectionSummary(row)), next: null })
  })

  /** Theo dõi / bỏ theo dõi — idempotent, cấm tự theo dõi (400). */
  async function toggleFollow(c: Parameters<typeof getViewer>[0], followed: boolean) {
    const handle = c.req.param("handle") ?? ""
    const viewerId = c.get("userId")
    const profile = await findProfileByHandle(handle, viewerId)
    if (!profile) throw new ApiError(404, "Không tìm thấy người dùng")
    if (profile.id === viewerId) throw new ApiError(400, "Không thể tự theo dõi chính mình")

    const created = await setFollow(viewerId, profile.id, followed)
    if (followed && created) {
      const actor = await prisma.user.findUnique({
        where: { id: viewerId },
        select: { id: true, name: true },
      })
      if (actor) {
        await createActorNotification({ userId: profile.id, kind: "follow", actor })
      }
    }

    const updated = await findProfileById(profile.id, viewerId)
    if (!updated) throw new ApiError(404, "Không tìm thấy người dùng")
    return c.json(updated)
  }

  router.post("/users/:handle/follow", requireAuth, FOLLOW_RATE_LIMIT, (c) => toggleFollow(c, true))
  router.delete("/users/:handle/follow", requireAuth, FOLLOW_RATE_LIMIT, (c) =>
    toggleFollow(c, false),
  )

  return router
}
