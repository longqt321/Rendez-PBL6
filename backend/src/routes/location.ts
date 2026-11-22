import { Hono } from "hono"
import { LRUCache } from "lru-cache"
import {
  createAnchorInputSchema,
  syncedLocationSchema,
  updateAnchorInputSchema,
  upsertSyncedLocationInputSchema,
  type CityLandmark,
  type SyncedLocation,
  type UserLocationAnchor,
} from "@rendez/schema"
import type { AppEnv } from "../app"
import { decryptJsonForUser, encryptJsonForUser, hmacIdentifier } from "../lib/crypto"
import { UUID_ID_RE } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { jsonWithCache, noStore } from "../lib/http-cache"
import { logger } from "../lib/logger"
import { prisma } from "../lib/prisma"
import { rateLimit } from "../lib/rate-limit"
import { getRedis } from "../lib/redis"
import { requireAuth } from "../lib/session"

const MAX_USER_ANCHORS = 10
const SYNCED_LOCATION_TTL_SECONDS = 4 * 60 * 60 // 4 giờ
const SYNCED_LOCATION_KEY_PREFIX = "user:location:"
const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000 // 1 giờ

export interface GeocodeSuggestion {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

// Dùng LRUCache chuẩn của cộng đồng để giới hạn số lượng entry và tự động thu hồi TTL
const geocodeCache = new LRUCache<string, GeocodeSuggestion[]>({
  max: 500,
  ttl: GEOCODE_CACHE_TTL_MS,
})

const GEOCODE_RATE_LIMIT = rateLimit({
  scope: "geocode",
  limit: 30,
  windowSeconds: 60,
  byUser: true,
})

// Fallback in-memory có giới hạn kích thước (LRUCache) khi chưa kết nối Redis (giá trị vẫn được mã hóa AES-256-GCM).
const memoryLocations = new LRUCache<string, string>({
  max: 5_000,
  ttl: SYNCED_LOCATION_TTL_SECONDS * 1000,
})

const LOCATION_PUT_RATE_LIMIT = rateLimit({
  scope: "me-location",
  limit: 10,
  windowSeconds: 60,
  byUser: true,
})

interface EncryptedAnchorPayload {
  lat: number
  lng: number
  address: string | null
}

function getSyncedLocationKey(userId: string): string {
  return `${SYNCED_LOCATION_KEY_PREFIX}${hmacIdentifier("location", userId)}`
}

function toAnchorDto(row: {
  id: string
  userId: string
  label: string
  kind: "home" | "work" | "school" | "custom"
  encryptedCoords: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}): UserLocationAnchor | null {
  const coords = decryptJsonForUser<EncryptedAnchorPayload>(row.userId, row.encryptedCoords)
  if (!coords) return null
  return {
    id: row.id,
    label: row.label,
    kind: row.kind,
    lat: coords.lat,
    lng: coords.lng,
    address: coords.address ?? null,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function readSyncedLocation(userId: string): Promise<SyncedLocation | null> {
  const key = getSyncedLocationKey(userId)
  const redis = getRedis()
  let sealed: string | null = null

  if (redis) {
    try {
      sealed = await redis.get(key)
    } catch (err) {
      logger.warn({ err }, "Lỗi đọc vị trí đồng bộ từ Redis — fallback memory")
    }
  }
  if (!sealed) {
    sealed = memoryLocations.get(key) ?? null
    if (!sealed) return null
  }

  const decrypted = decryptJsonForUser<unknown>(userId, sealed)
  if (!decrypted) return null
  const parsed = syncedLocationSchema.safeParse(decrypted)
  return parsed.success ? parsed.data : null
}

async function writeSyncedLocation(userId: string, location: SyncedLocation): Promise<void> {
  const key = getSyncedLocationKey(userId)
  const sealed = encryptJsonForUser(userId, location)
  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(key, sealed, "EX", SYNCED_LOCATION_TTL_SECONDS)
      return
    } catch {
      // Fallback sang memory nếu Redis lỗi tạm thời
    }
  }
  memoryLocations.set(key, sealed)
}

async function deleteSyncedLocation(userId: string): Promise<void> {
  const key = getSyncedLocationKey(userId)
  memoryLocations.delete(key)
  const redis = getRedis()
  if (redis) {
    try {
      await redis.del(key)
    } catch {
      // Bỏ qua lỗi xóa Redis tạm thời
    }
  }
}

export function createLocationRouter() {
  const router = new Hono<AppEnv>()

  /** Tìm kiếm địa chỉ / địa điểm qua OpenStreetMap Nominatim (ưu tiên Đà Nẵng). */
  router.get("/geocode", requireAuth, GEOCODE_RATE_LIMIT, async (c) => {
    const q = (c.req.query("q") ?? "").trim()
    if (q.length < 2 || q.length > 120) {
      return noStore(c, { items: [] as GeocodeSuggestion[] })
    }

    const cacheKey = q.toLowerCase()
    const cached = geocodeCache.get(cacheKey)
    if (cached) {
      return jsonWithCache(c, { items: cached }, { maxAge: 300, scope: "private" })
    }

    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("format", "jsonv2")
    url.searchParams.set("q", q)
    url.searchParams.set("countrycodes", "vn")
    url.searchParams.set("viewbox", "107.9,16.25,108.4,15.9")
    url.searchParams.set("bounded", "0")
    url.searchParams.set("limit", "6")
    url.searchParams.set("accept-language", "vi")

    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "RendezApp/1.0 (https://rendez.local)" },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        logger.warn({ status: res.status }, "Nominatim geocode trả về lỗi")
        return noStore(c, { items: [] as GeocodeSuggestion[] })
      }
      const rows = (await res.json()) as Array<{
        place_id: number
        name?: string
        display_name: string
        lat: string
        lon: string
      }>
      const items: GeocodeSuggestion[] = rows
        .map((row) => {
          const lat = Number.parseFloat(row.lat)
          const lng = Number.parseFloat(row.lon)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          const firstSegment = row.display_name.split(",")[0]?.trim() || row.display_name
          return {
            id: String(row.place_id),
            name: row.name?.trim() || firstSegment,
            address: row.display_name,
            lat,
            lng,
          }
        })
        .filter((x): x is GeocodeSuggestion => x !== null)

      geocodeCache.set(cacheKey, items)
      return jsonWithCache(c, { items }, { maxAge: 300, scope: "private" })
    } catch (err) {
      logger.warn({ err }, "Không thể gọi Nominatim geocode")
      return noStore(c, { items: [] as GeocodeSuggestion[] })
    }
  })

  /** Danh sách địa danh nổi tiếng của thành phố (công khai). */
  router.get("/landmarks", async (c) => {
    const items = await prisma.cityLandmark.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })
    const payload: CityLandmark[] = items.map((lm) => ({
      id: lm.id,
      slug: lm.slug,
      name: lm.name,
      district: lm.district,
      lat: lm.lat,
      lng: lm.lng,
      sortOrder: lm.sortOrder,
    }))
    return jsonWithCache(c, { items: payload }, { maxAge: 300, scope: "public" })
  })

  /** Danh sách mốc cá nhân của người dùng hiện tại. */
  router.get("/me/anchors", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const rows = await prisma.userLocationAnchor.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    })
    const items = rows.map(toAnchorDto).filter((x): x is UserLocationAnchor => x !== null)
    return noStore(c, { items })
  })

  /** Tạo mốc cá nhân mới (tối đa 10 mốc/user). */
  router.post("/me/anchors", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const rawBody = await c.req.json().catch(() => null)
    const parsed = createAnchorInputSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu mốc không hợp lệ")
    }
    const input = parsed.data
    const encryptedCoords = encryptJsonForUser(userId, {
      lat: input.lat,
      lng: input.lng,
      address: input.address ?? null,
    } satisfies EncryptedAnchorPayload)

    const created = await prisma.$transaction(async (tx) => {
      const count = await tx.userLocationAnchor.count({ where: { userId } })
      if (count >= MAX_USER_ANCHORS) {
        throw new ApiError(400, `Bạn chỉ có thể lưu tối đa ${MAX_USER_ANCHORS} mốc vị trí`)
      }
      if (input.isDefault) {
        await tx.userLocationAnchor.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        })
      }
      return tx.userLocationAnchor.create({
        data: {
          userId,
          label: input.label,
          kind: input.kind,
          encryptedCoords,
          isDefault: input.isDefault ?? false,
        },
      })
    })

    c.header("Cache-Control", "no-store")
    return c.json({ anchor: toAnchorDto(created) }, 201)
  })

  /** Cập nhật mốc cá nhân. */
  router.patch("/me/anchors/:id", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const id = c.req.param("id")
    if (!UUID_ID_RE.test(id)) throw new ApiError(400, "ID mốc không hợp lệ")

    const rawBody = await c.req.json().catch(() => null)
    const parsed = updateAnchorInputSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dữ liệu cập nhật không hợp lệ")
    }
    const input = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.userLocationAnchor.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) {
        throw new ApiError(404, "Không tìm thấy mốc vị trí")
      }
      if (input.isDefault === true) {
        await tx.userLocationAnchor.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }

      let nextEncrypted = existing.encryptedCoords
      if (input.lat !== undefined || input.lng !== undefined || input.address !== undefined) {
        const currentCoords = decryptJsonForUser<EncryptedAnchorPayload>(
          userId,
          existing.encryptedCoords,
        )
        if (!currentCoords) {
          throw new ApiError(500, "Không thể giải mã tọa độ mốc hiện tại")
        }
        nextEncrypted = encryptJsonForUser(userId, {
          lat: input.lat ?? currentCoords.lat,
          lng: input.lng ?? currentCoords.lng,
          address: input.address !== undefined ? input.address : currentCoords.address,
        } satisfies EncryptedAnchorPayload)
      }

      return tx.userLocationAnchor.update({
        where: { id },
        data: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.kind !== undefined ? { kind: input.kind } : {}),
          ...(nextEncrypted !== existing.encryptedCoords ? { encryptedCoords: nextEncrypted } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
      })
    })

    return noStore(c, { anchor: toAnchorDto(updated) })
  })

  /** Xóa mốc cá nhân. */
  router.delete("/me/anchors/:id", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const id = c.req.param("id")
    if (!UUID_ID_RE.test(id)) throw new ApiError(400, "ID mốc không hợp lệ")

    const deleted = await prisma.userLocationAnchor.deleteMany({
      where: { id, userId },
    })
    if (deleted.count === 0) {
      throw new ApiError(404, "Không tìm thấy mốc vị trí")
    }

    return noStore(c, { deleted: true })
  })

  /** Lấy vị trí GPS đồng bộ gần nhất từ điện thoại (lưu Redis đã mã hóa). */
  router.get("/me/location", requireAuth, async (c) => {
    const userId = c.get("userId")!
    const location = await readSyncedLocation(userId)
    return noStore(c, { location })
  })

  /** Đẩy vị trí GPS chính xác (accuracy <= 150m) từ điện thoại lên tài khoản. */
  router.put("/me/location", requireAuth, LOCATION_PUT_RATE_LIMIT, async (c) => {
    const userId = c.get("userId")!
    const rawBody = await c.req.json().catch(() => null)
    const parsed = upsertSyncedLocationInputSchema.safeParse(rawBody)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Tọa độ GPS không hợp lệ")
    }

    const location: SyncedLocation = {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      accuracy: parsed.data.accuracy,
      updatedAt: new Date().toISOString(),
    }
    await writeSyncedLocation(userId, location)
    return noStore(c, { location })
  })

  /** Xóa vị trí đồng bộ trên Redis. */
  router.delete("/me/location", requireAuth, async (c) => {
    const userId = c.get("userId")!
    await deleteSyncedLocation(userId)
    return noStore(c, { cleared: true })
  })

  return router
}
