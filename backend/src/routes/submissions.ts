import { Hono } from "hono"
import {
  createPlaceSubmissionInputSchema,
  reviewPlaceSubmissionInputSchema,
  type PlaceSubmission,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import type { PlaceCategory as PrismaPlaceCategory } from "../../generated/prisma/client"
import { ApiError } from "../lib/errors"
import { prisma } from "../lib/prisma"
import { requireAuth, requireRole } from "../lib/session"
import { toApiCategory, toPrismaCategory } from "../lib/enums"
import { createSystemNotification } from "../lib/notifications"
import { slugify } from "../lib/slug"

function toSubmissionDto(row: {
  id: string
  submitterId: string
  submitter?: { name: string } | null
  name: string
  address: string
  city: string
  district: string | null
  category: string
  priceLevel: number | null
  lat: number | null
  lng: number | null
  openingHours: string | null
  phone: string | null
  description: string | null
  tags: string[]
  imageUrls: string[]
  status: string
  reviewerId: string | null
  reviewNote: string | null
  createdPlaceId: string | null
  createdAt: Date
  updatedAt: Date
}): PlaceSubmission {
  return {
    id: row.id,
    submitterId: row.submitterId,
    ...(row.submitter?.name ? { submitterName: row.submitter.name } : {}),
    name: row.name,
    address: row.address,
    city: row.city,
    ...(row.district ? { district: row.district } : {}),
    category: toApiCategory(row.category),
    priceLevel: row.priceLevel as 1 | 2 | 3 | null,
    ...(row.lat !== null ? { lat: row.lat } : {}),
    ...(row.lng !== null ? { lng: row.lng } : {}),
    ...(row.openingHours ? { openingHours: row.openingHours } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.description ? { description: row.description } : {}),
    tags: row.tags,
    imageUrls: row.imageUrls,
    status: row.status as "pending" | "reviewed" | "dismissed",
    ...(row.reviewerId ? { reviewerId: row.reviewerId } : {}),
    ...(row.reviewNote ? { reviewNote: row.reviewNote } : {}),
    ...(row.createdPlaceId ? { createdPlaceId: row.createdPlaceId } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function createSubmissionsRouter() {
  const router = new Hono<AppEnv>()

  /** Người dùng gửi đề xuất địa điểm mới */
  router.post("/places/submissions", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const raw = await c.req.json().catch(() => null)
    const parsed = createPlaceSubmissionInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const input = parsed.data
    const created = await prisma.placeSubmission.create({
      data: {
        submitterId: userId,
        name: input.name,
        address: input.address,
        city: input.city,
        district: input.district ?? null,
        category: toPrismaCategory(input.category) as PrismaPlaceCategory,
        priceLevel: input.priceLevel ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        openingHours: input.openingHours ?? null,
        phone: input.phone ?? null,
        description: input.description ?? null,
        tags: input.tags,
        imageUrls: input.imageUrls,
        status: "pending",
      },
    })

    return c.json(toSubmissionDto(created), 201)
  })

  /** Danh sách địa điểm đã đề xuất của người dùng */
  router.get("/me/submissions", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const rows = await prisma.placeSubmission.findMany({
      where: { submitterId: userId },
      orderBy: { createdAt: "desc" },
    })
    return c.json({ items: rows.map(toSubmissionDto) })
  })

  /** Admin duyệt danh sách đề xuất */
  router.get("/admin/submissions", requireRole("admin", "moderator"), async (c) => {
    const status = c.req.query("status")
    const validStatus =
      status === "reviewed" || status === "dismissed" || status === "pending" ? status : undefined

    const rows = await prisma.placeSubmission.findMany({
      where: validStatus ? { status: validStatus } : undefined,
      include: {
        submitter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return c.json({ items: rows.map(toSubmissionDto) })
  })

  /** Admin phê duyệt hoặc từ chối đề xuất */
  router.patch("/admin/submissions/:id", requireRole("admin", "moderator"), async (c) => {
    const id = c.req.param("id")
    const reviewerId = c.get("userId")!

    const raw = await c.req.json().catch(() => null)
    const parsed = reviewPlaceSubmissionInputSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const { status, reviewNote } = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.placeSubmission.findUnique({
        where: { id },
      })
      if (!submission) throw new ApiError(404, "Không tìm thấy đề xuất")

      let createdPlaceId: string | null = submission.createdPlaceId

      if (status === "reviewed" && !createdPlaceId) {
        // Tự động tạo địa điểm công khai khi duyệt đề xuất
        const baseSlug = slugify(submission.name)
        const slug = `${baseSlug}-${submission.id.slice(0, 6)}`

        const newPlace = await tx.place.create({
          data: {
            id: slug,
            name: submission.name,
            address: submission.address,
            city: submission.city,
            district: submission.district,
            category: submission.category,
            priceLevel: submission.priceLevel,
            lat: submission.lat,
            lng: submission.lng,
            openingHours: submission.openingHours,
            phone: submission.phone,
            description: submission.description,
            publishedAt: new Date(),
            status: "open",
            moderatedBy: reviewerId,
            moderatedAt: new Date(),
            moderationStatus: "approved",
          },
        })
        createdPlaceId = newPlace.id

        if (submission.imageUrls.length > 0) {
          await tx.placeImage.createMany({
            data: submission.imageUrls.map((url, pos) => ({
              placeId: newPlace.id,
              url,
              position: pos,
            })),
          })
        }

        await createSystemNotification({
          userId: submission.submitterId,
          title: "Đề xuất địa điểm đã được duyệt",
          body: `Địa điểm "${submission.name}" do bạn đề xuất đã được ban quản trị phê duyệt và đăng tải!`,
        })
      } else if (status === "dismissed") {
        await createSystemNotification({
          userId: submission.submitterId,
          title: "Đề xuất địa điểm chưa được duyệt",
          body: `Địa điểm "${submission.name}" bạn đề xuất chưa được duyệt: ${reviewNote || "Chưa đạt tiêu chuẩn cộng đồng"}`,
        })
      }

      return tx.placeSubmission.update({
        where: { id },
        data: {
          status,
          reviewerId,
          reviewNote: reviewNote ?? null,
          createdPlaceId,
        },
      })
    })

    return c.json(toSubmissionDto(updated))
  })

  return router
}
