import { Hono } from "hono"
import type { Context } from "hono"
import { z } from "zod"
import {
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  reorderCollectionPlacesSchema,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { requireUuid } from "../lib/cursor"
import { ApiError, isUniqueViolation } from "../lib/errors"
import { idempotency } from "../lib/idempotency"
import { prisma } from "../lib/prisma"
import {
  findCollection,
  findCollectionById,
  listCollectionsOfOwner,
  toCollectionDto,
  toCollectionSummary,
} from "../lib/collections"
import { getViewer, requireAuth } from "../lib/session"
import { recordEvent } from "../lib/interaction-events"

const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Tên bộ sưu tập trống").max(MAX_COLLECTION_NAME_LENGTH),
  description: z.string().trim().max(MAX_COLLECTION_DESCRIPTION_LENGTH).optional(),
  isPrivate: z.boolean().optional(),
})

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1, "Tên bộ sưu tập trống").max(MAX_COLLECTION_NAME_LENGTH).optional(),
  description: z.string().trim().max(MAX_COLLECTION_DESCRIPTION_LENGTH).optional(),
  isPrivate: z.boolean().optional(),
})

const setPlacesSchema = z.object({
  placeId: z.string().min(1),
  member: z.boolean().optional(),
})

async function requireOwnedCollection(id: string, userId: string): Promise<void> {
  const collection = await prisma.collection.findFirst({
    where: { id, deletedAt: null },
    select: { ownerId: true },
  })
  if (!collection) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
  if (collection.ownerId !== userId) throw new ApiError(403, "Không phải bộ sưu tập của bạn")
}

export function createCollectionsRouter() {
  const router = new Hono<AppEnv>()

  router.get("/collections", requireAuth, async (c) => {
    const userId = c.get("userId")
    const placeId = c.req.query("placeId") || null
    const rows = await listCollectionsOfOwner(userId, userId)
    return c.json({ items: rows.map((row) => toCollectionSummary(row, placeId)), next: null })
  })

  router.post("/collections", requireAuth, idempotency(), async (c) => {
    const raw = await c.req.json().catch(() => null)
    const parsed = createCollectionSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const userId = c.get("userId")
    const created = await prisma.collection.create({
      data: {
        ownerId: userId,
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        isPrivate: parsed.data.isPrivate ?? false,
      },
      select: { id: true },
    })

    const row = await findCollectionById(created.id, userId)
    if (!row) throw new ApiError(500, "Không tạo được bộ sưu tập")
    return c.json(toCollectionDto(row, userId), 201)
  })

  router.get("/collections/:id", async (c) => {
    const id = c.req.param("id")
    requireUuid(id, "Không tìm thấy bộ sưu tập")

    // Route công khai — tự đọc phiên để tính `isMine`/`likedByMe`.
    const viewer = await getViewer(c)
    const viewerId = viewer?.id ?? null
    const row = await findCollection(id, viewerId)
    if (!row) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
    return c.json(toCollectionDto(row, viewerId))
  })

  router.patch("/collections/:id", requireAuth, async (c) => {
    const id = c.req.param("id")
    requireUuid(id, "Không tìm thấy bộ sưu tập")

    const userId = c.get("userId")
    await requireOwnedCollection(id, userId)

    const raw = await c.req.json().catch(() => null)
    const parsed = updateCollectionSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    await prisma.collection.update({ where: { id }, data: parsed.data })
    const row = await findCollectionById(id, userId)
    if (!row) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
    return c.json(toCollectionDto(row, userId))
  })

  router.delete("/collections/:id", requireAuth, async (c) => {
    const id = c.req.param("id")
    requireUuid(id, "Không tìm thấy bộ sưu tập")

    const userId = c.get("userId")
    await requireOwnedCollection(id, userId)

    // Xoá mềm: bảng có `deleted_at` và mọi truy vấn đọc đều lọc theo nó — xoá
    // cứng sẽ làm cột đó thành vô nghĩa và mất dữ liệu không khôi phục được.
    await prisma.collection.update({ where: { id }, data: { deletedAt: new Date() } })
    return c.json(true)
  })

  async function toggleLike(c: Context<AppEnv>, liked: boolean) {
    const id = c.req.param("id") ?? ""
    requireUuid(id, "Không tìm thấy bộ sưu tập")

    const userId = c.get("userId")
    const row = await findCollection(id, userId)
    if (!row) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
    if (row.owner_id === userId) {
      throw new ApiError(400, "Không thể thả tim bộ sưu tập của mình")
    }

    if (liked) {
      await prisma.collectionLike.upsert({
        where: { collectionId_userId: { collectionId: id, userId } },
        create: { collectionId: id, userId },
        update: {},
      })
    } else {
      await prisma.collectionLike.deleteMany({ where: { collectionId: id, userId } })
    }

    const updated = await findCollectionById(id, userId)
    if (!updated) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
    return c.json(toCollectionDto(updated, userId))
  }

  router.post("/collections/:id/like", requireAuth, (c) => toggleLike(c, true))
  router.delete("/collections/:id/like", requireAuth, (c) => toggleLike(c, false))

  router.patch("/collections/:id/places", requireAuth, async (c) => {
    const id = c.req.param("id")
    requireUuid(id, "Không tìm thấy bộ sưu tập")

    const userId = c.get("userId")
    await requireOwnedCollection(id, userId)

    const raw = await c.req.json().catch(() => null)
    const parsed = setPlacesSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ")
    }

    const place = await prisma.place.findFirst({
      where: { id: parsed.data.placeId, publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
    })
    if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")

    const member = parsed.data.member !== false
    if (member) {
      const existing = await prisma.collectionPlace.findUnique({
        where: { collectionId_placeId: { collectionId: id, placeId: parsed.data.placeId } },
      })
      if (!existing) {
        const last = await prisma.collectionPlace.aggregate({
          where: { collectionId: id },
          _max: { position: true },
        })
        await prisma.collectionPlace
          .create({
            data: {
              collectionId: id,
              placeId: parsed.data.placeId,
              position: (last._max.position ?? -1) + 1,
            },
          })
          .catch((err: unknown) => {
            if (isUniqueViolation(err)) return
            throw err
          })
      }
    } else {
      await prisma.collectionPlace.deleteMany({
        where: { collectionId: id, placeId: parsed.data.placeId },
      })
    }

    const row = await findCollectionById(id, userId)
    if (!row) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
    // Chỉ lần THÊM mới là tín hiệu "save" — bỏ khỏi bộ sưu tập không phải sở thích.
    if (member) {
      await recordEvent({
        eventType: "place_save",
        userId,
        placeId: parsed.data.placeId,
        context: { collectionId: id },
      })
    }
    return c.json(toCollectionDto(row, userId))
  })

  router.patch("/collections/:id/reorder", requireAuth, async (c) => {
    const id = c.req.param("id")
    requireUuid(id, "Không tìm thấy bộ sưu tập")

    const userId = c.get("userId")
    await requireOwnedCollection(id, userId)

    const raw = await c.req.json().catch(() => null)
    const parsed = reorderCollectionPlacesSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Danh sách thứ tự không hợp lệ")
    }

    const uniqueIds = Array.from(new Set(parsed.data.placeIds))
    await prisma.$transaction(
      uniqueIds.map((placeId, index) =>
        prisma.collectionPlace.updateMany({
          where: { collectionId: id, placeId },
          data: { position: index },
        }),
      ),
    )

    const row = await findCollectionById(id, userId)
    if (!row) throw new ApiError(404, "Không tìm thấy bộ sưu tập")
    return c.json(toCollectionDto(row, userId))
  })

  return router
}
