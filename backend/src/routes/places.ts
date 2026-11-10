import { Hono } from "hono"
import type { AppEnv } from "../app"
import { decodeCursor, encodeCursor } from "../lib/cursor"
import { ApiError } from "../lib/errors"
import { findPublicPlace, listPlaces, listPlacesInMap, parsePlaceFilters } from "../lib/places"

/**
 * Route địa điểm (Phase 2) — khớp hợp đồng Phần A:
 * - `GET /places` `Page<Place>` + cursor keyset + bộ lọc A7.9.
 * - `GET /places/map` `{items, total}` chặn 300.
 * - `GET /places/:id` 404 khi chưa publish (A6.6).
 */

/** Khớp mock (`PLACES_PAGE_SIZE = 9`) — FE infinite scroll không phụ thuộc số này. */
const PLACES_PAGE_SIZE = 9
/** Chặn trên cho `/places/map` — khung nhìn zoom nhỏ không trả cả dataset. */
const MAP_MAX_PLACES = 300

/** Id place là slug từ dataset (`mirkocoffeechillbeer-493`), không phải uuid. */
const PLACE_ID_RE = /^[A-Za-z0-9_-]{1,120}$/

export function createPlacesRouter() {
  const router = new Hono<AppEnv>()

  router.get("/places", async (c) => {
    const filters = parsePlaceFilters(c.req.query())
    const rawCursor = c.req.query("cursor")
    const cursor = rawCursor ? decodeCursor(rawCursor) : null
    if (rawCursor && !cursor) {
      throw new ApiError(400, "Cursor không hợp lệ")
    }

    const page = await listPlaces(filters, cursor, PLACES_PAGE_SIZE)
    return c.json({ items: page.items, next: page.next ? encodeCursor(page.next) : null })
  })

  // Đứng trước `/places/:id` — nếu không `:id` sẽ nuốt cả "map"/"saved".
  router.get("/places/map", async (c) => {
    const filters = parsePlaceFilters(c.req.query())
    const result = await listPlacesInMap(filters, MAP_MAX_PLACES)
    return c.json(result)
  })

  router.get("/places/:id", async (c) => {
    const id = c.req.param("id")
    if (!PLACE_ID_RE.test(id)) throw new ApiError(404, "Không tìm thấy địa điểm")

    const place = await findPublicPlace(id)
    if (!place) throw new ApiError(404, "Không tìm thấy địa điểm")
    return c.json(place)
  })

  return router
}
