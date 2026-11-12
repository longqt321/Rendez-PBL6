import { Hono } from "hono"
import { z } from "zod"
import {
  MAX_CAPTION_LENGTH,
  MIN_CAPTION_LENGTH,
  MAX_POST_IMAGE_URL_LENGTH,
  MAX_POST_IMAGES,
  MAX_REVIEW_CONTENT_LENGTH,
  validatePostImageUrls,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { env } from "../env"
import { UUID_ID_RE, decodeCursor, encodeCursor, requireUuid } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { idempotency } from "../lib/idempotency"
import { prisma } from "../lib/prisma"
import { findPost, listPosts, type PostFilter } from "../lib/posts"
import { findComment, listCommentsForPost, parseCommentSort } from "../lib/comments"
import { createActorNotification } from "../lib/notifications"
import { enqueuePlaceDetect } from "../lib/queue"
import { invalidateSuggestionCache } from "../lib/suggestions"
import { rateLimit } from "../lib/rate-limit"
import { getViewer, requireAuth } from "../lib/session"

/**
 * Route bài đăng + bình luận (Phase 3).
 *
 * Hợp đồng (Phần A): feed `Page<Post>` với filter all|unplaced|mine|saved,
 * like/save idempotent, gắn địa điểm có side effect A7.3, bình luận phẳng
 * lồng 1 cấp (A7.6). GET công khai; mutation cần đăng nhập.
 */

const POSTS_PAGE_SIZE = 5

/**
 * Chống spam tương tác (V8-04) — đếm theo userId nên nhiều người dùng chung IP
 * (văn phòng, NAT) không chặn lẫn nhau. Ngưỡng cao hơn thao tác thường nhiều
 * lần, chỉ chặn spam (10 click liên tiếp như vòng 8 đo được).
 */
const LIKE_RATE_LIMIT = rateLimit({ scope: "like", limit: 30, windowSeconds: 60, byUser: true })
const COMMENT_RATE_LIMIT = rateLimit({
  scope: "comment",
  limit: 10,
  windowSeconds: 60,
  byUser: true,
})

const createPostSchema = z.object({
  caption: z.string().trim().min(MIN_CAPTION_LENGTH).max(MAX_CAPTION_LENGTH),
  placeId: z.string().min(1).nullable().optional(),
  images: z
    .array(z.string().min(1).max(MAX_POST_IMAGE_URL_LENGTH, "URL ảnh quá dài"))
    .max(MAX_POST_IMAGES, `Tối đa ${MAX_POST_IMAGES} ảnh mỗi bài đăng`)
    .optional(),
})

/**
 * Ảnh bài đăng phải do CHÍNH người gọi tải lên thư mục `posts/<userId>/` của
 * bucket. Logic kiểm URL nằm chung `@rendez/schema` (`validatePostImageUrls`)
 * để mock server dùng đúng một nguồn; hàm này chỉ thêm phần phụ thuộc env.
 *
 * Trả mảng rỗng khi client không gửi ảnh — request không ảnh không bị ảnh
 * hưởng bởi việc R2 chưa cấu hình.
 */
function validatePostImages(images: string[] | undefined, userId: string): string[] {
  // Chưa có bucket (hoặc thiếu domain công khai) thì không xác thực được ảnh
  // thuộc về ai — từ chối thay vì nhận URL tuỳ ý.
  if (images && images.length > 0 && (!env.r2Configured || env.R2_PUBLIC_BASE_URL.length === 0)) {
    throw new ApiError(400, "Tính năng ảnh chưa được cấu hình")
  }

  const result = validatePostImageUrls(images, { userId, publicBaseUrl: env.R2_PUBLIC_BASE_URL })
  if (!result.ok) throw new ApiError(400, result.message)

  return result.images
}

const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Nội dung bình luận trống").max(MAX_REVIEW_CONTENT_LENGTH),
  parentId: z.string().uuid().nullable().optional(),
})

const toggleSchema = z.object({ liked: z.boolean().optional() })
const saveSchema = z.object({ saved: z.boolean().optional() })

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  return c.req.json().catch(() => null)
}

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown, fallback: string): T {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? fallback)
  return parsed.data
}

export function createPostsRouter() {
  const router = new Hono<AppEnv>()

  /** Feed công khai; `mine`/`saved`/`following` cần đăng nhập. */
  router.get("/posts", async (c) => {
    const rawFilter = c.req.query("filter") ?? "all"
    if (!["all", "unplaced", "mine", "saved", "following"].includes(rawFilter)) {
      throw new ApiError(400, "Bộ lọc không hợp lệ")
    }
    const filter = rawFilter as PostFilter

    const viewer = await getViewer(c)
    if ((filter === "mine" || filter === "saved" || filter === "following") && !viewer) {
      throw new ApiError(401, "Chưa đăng nhập")
    }

    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor, UUID_ID_RE) : null
    if (rawCursor && !cursor) throw new ApiError(400, "Cursor không hợp lệ")

    const page = await listPosts({
      filter,
      q: c.req.query("q")?.trim() || undefined,
      viewerId: viewer?.id ?? null,
      cursor,
      pageSize: POSTS_PAGE_SIZE,
    })

    return c.json({
      items: page.items,
      next: page.next ? encodeCursor(page.next) : null,
    })
  })

  router.post(
    "/posts",
    requireAuth,
    // 30 bài/giờ/user — chống spam bài; đăng bài bình thường không chạm ngưỡng.
    rateLimit({ scope: "posts-create", limit: 30, windowSeconds: 3600, byUser: true }),
    // Chống double-submit: cùng `Idempotency-Key` → replay bài đã tạo (K2).
    idempotency(),
    async (c) => {
      const input = parseOrThrow(createPostSchema, await readJson(c), "Dữ liệu không hợp lệ")
      const userId = c.get("userId")

      if (input.placeId) {
        const place = await prisma.place.findFirst({
          where: { id: input.placeId, deletedAt: null },
          select: { id: true },
        })
        if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")
      }

      const images = validatePostImages(input.images, userId)

      const created = await prisma.post.create({
        data: {
          authorId: userId,
          caption: input.caption,
          placeId: input.placeId ?? null,
          // Bài + ảnh trong MỘT transaction: không có bài "nửa vời" khi insert ảnh lỗi.
          images: {
            create: images.map((url, position) => ({ url, position })),
          },
        },
        select: { id: true },
      })

      const post = await findPost(created.id, userId)
      if (!post) throw new ApiError(500, "Không tạo được bài đăng")

      // Bài chưa gắn địa điểm → đẩy job phát hiện ngay (cron 5 phút là lưới an toàn).
      if (!input.placeId) await enqueuePlaceDetect(created.id)

      return c.json(post, 201)
    },
  )

  router.get("/posts/:id", async (c) => {
    const id = requireUuid(c.req.param("id"), "Không tìm thấy bài đăng")
    const viewer = await getViewer(c)
    const post = await findPost(id, viewer?.id ?? null)
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng")
    return c.json(post)
  })

  /**
   * Gắn địa điểm vào bài — side effects A7.3 trong MỘT transaction:
   * gán placeId, publish place nếu chưa, đánh dấu đã đọc mọi thông báo đề xuất
   * của bài này.
   */
  router.patch("/posts/:id/place", requireAuth, async (c) => {
    const postId = requireUuid(c.req.param("id"), "Không tìm thấy bài đăng")
    // Hợp đồng mock: thiếu `placeId` trả 404 "Thiếu placeId" (không phải 400).
    const parsed = z.object({ placeId: z.string().min(1) }).safeParse(await readJson(c))
    if (!parsed.success) throw new ApiError(404, "Thiếu placeId")
    const placeId = parsed.data.placeId
    const userId = c.get("userId")

    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    })
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng")
    if (post.authorId !== userId) throw new ApiError(403, "Không phải bài đăng của bạn")

    const place = await prisma.place.findFirst({
      where: { id: placeId, deletedAt: null },
      select: { id: true, publishedAt: true },
    })
    if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")

    await prisma.$transaction([
      prisma.post.update({ where: { id: postId }, data: { placeId } }),
      ...(place.publishedAt === null
        ? [prisma.place.update({ where: { id: placeId }, data: { publishedAt: new Date() } })]
        : []),
      prisma.notification.updateMany({
        where: {
          // Thông báo đề xuất thuộc về TÁC GIẢ bài, không phải người gọi.
          userId: post.authorId,
          type: "place_suggestion",
          payload: { path: ["postId"], equals: postId },
        },
        data: { readAt: new Date() },
      }),
    ])

    // Place vừa được publish → cache ứng viên gợi ý đã cũ (G2).
    if (place.publishedAt === null) invalidateSuggestionCache()

    const updated = await findPost(postId, userId)
    if (!updated) throw new ApiError(404, "Không tìm thấy bài đăng")
    return c.json(updated)
  })

  /** Like idempotent — gửi `liked` để đặt trạng thái, bỏ trống thì đảo. */
  router.patch("/posts/:id/like", requireAuth, LIKE_RATE_LIMIT, async (c) => {
    const postId = requireUuid(c.req.param("id"), "Không tìm thấy bài đăng")
    const userId = c.get("userId")
    const input = parseOrThrow(toggleSchema, await readJson(c), "Dữ liệu không hợp lệ")

    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    })
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng")

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    })
    const liked = input.liked ?? existing === null

    if (liked && !existing) {
      // `skipDuplicates` = nguyên tử: hai request like song song không làm
      // request thứ hai ném P2002 → 500; chỉ request tạo được mới thông báo.
      const { count } = await prisma.postLike.createMany({
        data: [{ postId, userId }],
        skipDuplicates: true,
      })
      if (count > 0) {
        await createActorNotification({
          userId: post.authorId,
          kind: "like",
          actor: await actorOf(userId),
          postId,
        })
      }
    } else if (!liked && existing) {
      await prisma.postLike.delete({ where: { postId_userId: { postId, userId } } })
    }

    const updated = await findPost(postId, userId)
    if (!updated) throw new ApiError(404, "Không tìm thấy bài đăng")
    return c.json(updated)
  })

  /** Lưu/bỏ lưu idempotent. */
  router.patch("/posts/:id/save", requireAuth, async (c) => {
    const postId = requireUuid(c.req.param("id"), "Không tìm thấy bài đăng")
    const userId = c.get("userId")
    const input = parseOrThrow(saveSchema, await readJson(c), "Dữ liệu không hợp lệ")

    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    })
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng")

    const existing = await prisma.postSave.findUnique({
      where: { postId_userId: { postId, userId } },
    })
    const saved = input.saved ?? existing === null

    if (saved && !existing) {
      await prisma.postSave.createMany({ data: [{ postId, userId }], skipDuplicates: true })
    }
    if (!saved && existing) {
      await prisma.postSave.delete({ where: { postId_userId: { postId, userId } } })
    }

    const updated = await findPost(postId, userId)
    if (!updated) throw new ApiError(404, "Không tìm thấy bài đăng")
    return c.json(updated)
  })

  router.get("/posts/:id/comments", async (c) => {
    const postId = requireUuid(c.req.param("id"), "Không tìm thấy bài đăng")
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    })
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng")

    const viewer = await getViewer(c)
    const sort = parseCommentSort(c.req.query("sort"))
    const items = await listCommentsForPost(postId, viewer?.id ?? null, sort)
    return c.json({ items, next: null })
  })

  router.post("/posts/:id/comments", requireAuth, COMMENT_RATE_LIMIT, async (c) => {
    const postId = requireUuid(c.req.param("id"), "Không tìm thấy bài đăng")
    const userId = c.get("userId")
    const input = parseOrThrow(createCommentSchema, await readJson(c), "Dữ liệu không hợp lệ")

    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    })
    if (!post) throw new ApiError(404, "Không tìm thấy bài đăng")

    if (input.parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: input.parentId, postId, deletedAt: null },
        select: { id: true, parentId: true },
      })
      if (!parent) throw new ApiError(404, "Không tìm thấy bình luận gốc")
      if (parent.parentId !== null) throw new ApiError(400, "Chỉ hỗ trợ trả lời 1 cấp")
    }

    const created = await prisma.comment.create({
      data: { postId, authorId: userId, body: input.body, parentId: input.parentId ?? null },
      select: { id: true },
    })

    await createActorNotification({
      userId: post.authorId,
      kind: "comment",
      actor: await actorOf(userId),
      postId,
      excerpt: input.body.slice(0, 120),
    })

    const comment = await findComment(created.id, userId)
    if (!comment) throw new ApiError(500, "Không tạo được bình luận")
    return c.json(comment, 201)
  })

  router.patch("/comments/:id/like", requireAuth, LIKE_RATE_LIMIT, async (c) => {
    const commentId = requireUuid(c.req.param("id"), "Không tìm thấy bình luận")
    const userId = c.get("userId")
    const input = parseOrThrow(toggleSchema, await readJson(c), "Dữ liệu không hợp lệ")

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true },
    })
    if (!comment) throw new ApiError(404, "Không tìm thấy bình luận")

    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    })
    const liked = input.liked ?? existing === null

    if (liked && !existing) {
      await prisma.commentLike.createMany({ data: [{ commentId, userId }], skipDuplicates: true })
    }
    if (!liked && existing) {
      await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId } } })
    }

    const updated = await findComment(commentId, userId)
    if (!updated) throw new ApiError(404, "Không tìm thấy bình luận")
    return c.json(updated)
  })

  /**
   * Xoá mềm bình luận của chính mình — reply cũng bị ẩn theo (A7.6).
   * `commentCount` của bài tính lại bằng COUNT ở mọi lần đọc (D3) nên không
   * phải trừ tay như mock.
   */
  router.delete("/comments/:id", requireAuth, async (c) => {
    const commentId = requireUuid(c.req.param("id"), "Không tìm thấy bình luận")
    const userId = c.get("userId")

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, authorId: true },
    })
    if (!comment) throw new ApiError(404, "Không tìm thấy bình luận")
    if (comment.authorId !== userId) throw new ApiError(403, "Không phải bình luận của bạn")

    const now = new Date()
    await prisma.$transaction([
      prisma.comment.update({ where: { id: commentId }, data: { deletedAt: now } }),
      prisma.comment.updateMany({
        where: { parentId: commentId, deletedAt: null },
        data: { deletedAt: now },
      }),
    ])

    return c.json({ deleted: true })
  })

  return router
}

/** Thông tin tác giả cho payload thông báo — một query, không cache ngầm. */
async function actorOf(userId: string): Promise<{ id: string; name: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  })
  if (!user) throw new ApiError(401, "Chưa đăng nhập")
  return user
}
