import { Hono } from "hono"
import { z } from "zod"
import {
  MAX_REPORT_DETAIL_LENGTH,
  PLACE_REPORT_REASONS,
  reviewTierSchema,
  upsertReviewInputSchema,
  type ReviewTier,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { ApiError, isUniqueViolation } from "../lib/errors"
import { idempotency } from "../lib/idempotency"
import { db, sql } from "../lib/kysely"
import { prisma } from "../lib/prisma"
import { toApiReportReason, toPrismaReportReason } from "../lib/enums"
import { formatInitials } from "../lib/profile"
import { getViewer, requireAuth } from "../lib/session"
import { recordEvent } from "../lib/interaction-events"
import { invalidatePlacesReadCaches } from "./places"

const reportInputSchema = z.object({
  reason: z.enum(PLACE_REPORT_REASONS),
  detail: z.string().trim().max(MAX_REPORT_DETAIL_LENGTH).optional(),
})

const DEFAULT_REVIEW_LIMIT = 50
const MAX_REVIEW_LIMIT = 100

interface ReviewRow {
  id: string
  place_id: string
  tier: ReviewTier
  content: string
  recommended_dishes: string[]
  quick_tags: string[]
  created_at: Date
  author_id: string
  author_name: string
  author_handle: string
  author_review_count: number
}

function baseReviewsQuery() {
  return db
    .selectFrom("reviews as r")
    .innerJoin("users as u", "u.id", "r.author_id")
    .select([
      "r.id",
      "r.place_id",
      sql<ReviewTier>`r.tier::text`.as("tier"),
      "r.content",
      "r.recommended_dishes",
      "r.quick_tags",
      "r.created_at",
      "u.id as author_id",
      "u.name as author_name",
      "u.handle as author_handle",
      sql<number>`(SELECT COUNT(*)::int FROM reviews r2 WHERE r2.author_id = u.id AND r2.deleted_at IS NULL)`.as(
        "author_review_count",
      ),
    ])
}

function toReviewDto(
  row: ReviewRow,
  viewerId: string | null,
  followedAuthorIds: ReadonlySet<string> = new Set(),
) {
  return {
    id: row.id,
    placeId: row.place_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      initials: formatInitials(row.author_name),
    },
    tier: row.tier,
    content: row.content,
    recommendedDishes: row.recommended_dishes ?? [],
    quickTags: row.quick_tags ?? [],
    authorReviewCount: row.author_review_count,
    isFollowingAuthor: followedAuthorIds.has(row.author_id),
    createdAt: row.created_at.toISOString(),
    isMine: viewerId !== null && viewerId === row.author_id,
  }
}

function dedupeDishes(dishes: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of dishes) {
    const clean = raw.trim()
    const key = clean.toLowerCase()
    if (!clean || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

async function requirePublicPlace(placeId: string): Promise<void> {
  const place = await prisma.place.findFirst({
    where: { id: placeId, publishedAt: { not: null }, deletedAt: null },
    select: { id: true },
  })
  if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")
}

export function createReviewsRouter() {
  const router = new Hono<AppEnv>()

  router.get("/places/:id/reviews", async (c) => {
    const placeId = c.req.param("id")
    await requirePublicPlace(placeId)

    const rawLimit = Number(c.req.query("limit") ?? DEFAULT_REVIEW_LIMIT)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_REVIEW_LIMIT, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_REVIEW_LIMIT

    const rawTier = c.req.query("tier")
    const parsedTier = rawTier ? reviewTierSchema.safeParse(rawTier) : null
    if (parsedTier && !parsedTier.success) {
      throw new ApiError(400, "Mức đánh giá không hợp lệ")
    }
    let reviewQuery = baseReviewsQuery()
      .where("r.place_id", "=", placeId)
      .where("r.deleted_at", "is", null)
    if (parsedTier?.success) {
      reviewQuery = reviewQuery.where("r.tier", "=", parsedTier.data)
    }
    const rows: ReviewRow[] = await reviewQuery
      .orderBy("r.created_at", "desc")
      .orderBy("r.id", "desc")
      .limit(limit)
      .execute()

    const viewer = await getViewer(c)
    const viewerId = viewer?.id ?? null
    const followedAuthorIds = new Set<string>()
    if (viewerId && rows.length > 0) {
      const authorIds = [...new Set(rows.map((r) => r.author_id))]
      const follows = await prisma.follow.findMany({
        where: { followerId: viewerId, followingId: { in: authorIds } },
        select: { followingId: true },
      })
      for (const f of follows) followedAuthorIds.add(f.followingId)
    }
    return c.json({
      items: rows.map((row) => toReviewDto(row, viewerId, followedAuthorIds)),
      next: null,
    })
  })

  /** Tạo hoặc ghi đè đánh giá 3 mức của chính mình (F-002). */
  router.post("/places/:id/reviews", requireAuth, idempotency(), async (c) => {
    const placeId = c.req.param("id")
    await requirePublicPlace(placeId)

    const raw = await c.req.json().catch(() => null)
    const parsed = upsertReviewInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const userId = c.get("userId")
    const data = {
      tier: parsed.data.tier,
      content: parsed.data.content,
      recommendedDishes: dedupeDishes(parsed.data.recommendedDishes),
      quickTags: [...new Set(parsed.data.quickTags.map((t) => t.trim()).filter(Boolean))],
      deletedAt: null,
    }

    const review = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findFirst({
        where: { placeId, authorId: userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      return existing
        ? tx.review.update({
            where: { id: existing.id },
            data,
            select: { id: true },
          })
        : tx.review.create({
            data: { placeId, authorId: userId, ...data },
            select: { id: true },
          })
    })
    invalidatePlacesReadCaches()

    const row = await baseReviewsQuery().where("r.id", "=", review.id).executeTakeFirst()
    if (!row) throw new ApiError(500, "Không lưu được đánh giá")
    await recordEvent({ eventType: "review_created", userId, placeId })
    return c.json(toReviewDto(row, userId), 201)
  })

  /**
   * Xoá đánh giá của chính mình tại địa điểm (204 No Content).
   *
   * 1 user chỉ có tối đa 1 review cho mỗi place (`@@unique([placeId, authorId])`).
   * Dùng soft-delete (`deletedAt = now`) để bảo toàn audit trail và đồng bộ với
   * bộ lọc `deleted_at IS NULL` của hệ thống (aggregate rating, GET reviews).
   * Nếu không tìm thấy review hoặc place không công khai → 404.
   */
  router.delete("/places/:id/reviews", requireAuth, async (c) => {
    const placeId = c.req.param("id")
    await requirePublicPlace(placeId)

    const userId = c.get("userId")
    const existing = await prisma.review.findFirst({
      where: { placeId, authorId: userId, deletedAt: null },
      select: { id: true },
    })
    if (!existing) {
      throw new ApiError(404, "Không tìm thấy đánh giá")
    }

    await prisma.review.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })
    invalidatePlacesReadCaches()

    return c.body(null, 204)
  })

  /** Báo cáo địa điểm — 1 người 1 lý do 1 lần cho mỗi địa điểm (A7.5). */
  router.post("/places/:id/reports", requireAuth, async (c) => {
    const placeId = c.req.param("id")
    await requirePublicPlace(placeId)

    const raw = await c.req.json().catch(() => null)
    const parsed = reportInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Lý do báo cáo không hợp lệ")
    }

    const detail = parsed.data.detail && parsed.data.detail.length > 0 ? parsed.data.detail : null
    if (parsed.data.reason === "other" && detail === null) {
      throw new ApiError(400, "Lý do khác cần mô tả cụ thể")
    }

    const userId = c.get("userId")
    const duplicate = await prisma.placeReport.findUnique({
      where: {
        placeId_reason_reporterId: {
          placeId,
          reason: toPrismaReportReason(parsed.data.reason),
          reporterId: userId,
        },
      },
      select: { id: true },
    })
    if (duplicate) {
      throw new ApiError(400, "Bạn đã gửi báo cáo với lý do này cho địa điểm này rồi")
    }

    const report = await prisma.placeReport
      .create({
        data: {
          placeId,
          reporterId: userId,
          reason: toPrismaReportReason(parsed.data.reason),
          detail,
        },
        select: { id: true, placeId: true, reason: true, detail: true, createdAt: true },
      })
      .catch((error: unknown) => {
        // Hai request song song cùng vượt qua bước kiểm trùng → unique constraint
        // chặn ở DB. Đây vẫn là lỗi ĐẦU VÀO (báo cáo trùng), không phải 500.
        if (isUniqueViolation(error)) {
          throw new ApiError(400, "Bạn đã gửi báo cáo với lý do này cho địa điểm này rồi")
        }
        throw error
      })

    return c.json(
      {
        id: report.id,
        placeId: report.placeId,
        reason: toApiReportReason(report.reason),
        detail: report.detail,
        createdAt: report.createdAt.toISOString(),
      },
      201,
    )
  })

  return router
}
