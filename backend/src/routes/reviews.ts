import { Hono } from "hono"
import { z } from "zod"
import {
  MAX_REPORT_DETAIL_LENGTH,
  MAX_REVIEW_CONTENT_LENGTH,
  PLACE_REPORT_REASONS,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { Prisma } from "../../generated/prisma/client"
import { ApiError, isUniqueViolation } from "../lib/errors"
import { idempotency } from "../lib/idempotency"
import { prisma } from "../lib/prisma"
import { toApiReportReason, toPrismaReportReason } from "../lib/enums"
import { formatInitials } from "../lib/profile"
import { getViewer, requireAuth } from "../lib/session"
import { recordEvent } from "../lib/interaction-events"

const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1, "Nội dung đánh giá trống").max(MAX_REVIEW_CONTENT_LENGTH),
})

const reportInputSchema = z.object({
  reason: z.enum(PLACE_REPORT_REASONS),
  detail: z.string().trim().max(MAX_REPORT_DETAIL_LENGTH).optional(),
})

const DEFAULT_REVIEW_LIMIT = 50
const MAX_REVIEW_LIMIT = 100

interface ReviewRow {
  id: string
  place_id: string
  rating: number
  content: string
  created_at: Date
  author_id: string
  author_name: string
  author_handle: string
}

const SELECT_REVIEWS = Prisma.sql`
  SELECT r.id, r.place_id, r.rating, r.content, r.created_at,
         u.id AS author_id, u.name AS author_name, u.handle AS author_handle
  FROM reviews r
  JOIN users u ON u.id = r.author_id
`

function toReviewDto(row: ReviewRow, viewerId: string | null) {
  return {
    id: row.id,
    placeId: row.place_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      initials: formatInitials(row.author_name),
    },
    rating: row.rating,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    isMine: viewerId !== null && viewerId === row.author_id,
  }
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

    // Parse `limit` giống routes/places.ts — giá trị rác về mặc định, cap 100.
    const rawLimit = Number(c.req.query("limit") ?? DEFAULT_REVIEW_LIMIT)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_REVIEW_LIMIT, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_REVIEW_LIMIT

    const rows = await prisma.$queryRaw<ReviewRow[]>(Prisma.sql`
      ${SELECT_REVIEWS}
      WHERE r.place_id = ${placeId} AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ${limit}
    `)

    // Route công khai — phải tự đọc phiên để tính `isMine` (không có requireAuth).
    const viewer = await getViewer(c)
    const viewerId = viewer?.id ?? null
    // Khớp mock: `Page<Review>` — `{ items, next }` (mock không phân trang reviews).
    return c.json({ items: rows.map((row) => toReviewDto(row, viewerId)), next: null })
  })

  /** Tạo hoặc ghi đè đánh giá của chính mình (A7.4). */
  router.post("/places/:id/reviews", requireAuth, idempotency(), async (c) => {
    const placeId = c.req.param("id")
    await requirePublicPlace(placeId)

    const raw = await c.req.json().catch(() => null)
    const parsed = reviewInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const userId = c.get("userId")
    const review = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findFirst({
        where: { placeId, authorId: userId, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        return tx.review.update({
          where: { id: existing.id },
          data: { ...parsed.data },
          select: { id: true },
        })
      }
      return tx.review.create({
        data: { placeId, authorId: userId, ...parsed.data },
        select: { id: true },
      })
    })

    const rows = await prisma.$queryRaw<ReviewRow[]>(Prisma.sql`
      ${SELECT_REVIEWS}
      WHERE r.id = ${review.id}::uuid
      LIMIT 1
    `)
    const row = rows[0]
    if (!row) throw new ApiError(500, "Không lưu được đánh giá")
    // Tín hiệu review cho recommendation — KHÔNG đưa rating vào context (D-049:
    // không dùng rating sao làm tín hiệu rec).
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
