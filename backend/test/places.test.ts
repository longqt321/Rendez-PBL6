import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { dailyPicksSchema, pageSchema, placeSchema, postSchema } from "@rendez/schema"
import { Prisma } from "../generated/prisma/client"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { registerVerifiedUser } from "./helpers/auth"

/**
 * Integration test Phase 2 — địa điểm trên Postgres thật + dataset seed 491.
 *
 * Đối chiếu `placeSchema`/`pageSchema` của `@rendez/schema` (hợp đồng FE) và
 * các quy tắc lọc A7.9. Không mock gì.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let picks: typeof import("../src/lib/daily-picks")

const placePageSchema = pageSchema(placeSchema)
const postPageSchema = pageSchema(postSchema)

/**
 * Chuẩn hoá tên theo cùng quy tắc `normalizeText` của mock (bỏ dấu, đ→d,
 * dấu câu → khoảng trắng) — dùng để assert kết quả tìm kiếm không phụ thuộc
 * cách dataset viết tên (có/không dấu).
 */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  picks = await import("../src/lib/daily-picks")
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

/** Shape JSON dùng trong test — đủ trường để assert, không cần `any`. */
interface PlaceJson {
  id: string
  name: string
  category: string
  district?: string
  tags: string[]
  address: string
}
interface PageJson {
  items: PlaceJson[]
  next: string | null
}

async function get(path: string) {
  return app.request(path)
}

async function getJson<T>(path: string): Promise<T> {
  return (await (await get(path)).json()) as T
}

describe("GET /places", () => {
  test("trả Page<Place> khớp schema, tối đa 9 item", async () => {
    const res = await get("/api/v1/places")
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(placePageSchema.safeParse(body).success).toBe(true)
    const page = body as PageJson
    expect(page.items).toHaveLength(9)
    expect(page.next).toBeString()
  })

  test("cursor keyset: trang 2 không trùng trang 1", async () => {
    const first = await getJson<PageJson>("/api/v1/places")
    const second = await getJson<PageJson>(`/api/v1/places?cursor=${first.next}`)

    const firstIds = new Set(first.items.map((item) => item.id))
    for (const item of second.items) expect(firstIds.has(item.id)).toBe(false)
  })

  test("cursor rác trả 400", async () => {
    const res = await get("/api/v1/places?cursor=khong-phai-cursor")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Cursor không hợp lệ" })
  })

  test("q không dấu khớp tên có dấu (unaccent)", async () => {
    const body = await getJson<PageJson>("/api/v1/places?q=banh%20xeo")

    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      // So khớp trên tên đã chuẩn hoá — dataset có thể chứa tên không dấu
      // ("Banh xeo Co Ba"), điều quan trọng là "banh xeo" (không dấu) khớp được.
      expect(normalizeName(item.name)).toContain("banh xeo")
    }
  })

  test("GIN trgm index cho tìm kiếm tồn tại và dùng hàm chuẩn hoá (migration 9+10)", async () => {
    const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'places'
        AND indexname = 'places_search_trgm_idx'
    `
    expect(rows).toHaveLength(1)
    expect(rows[0]?.indexdef).toContain("immutable_search_normalize")
  })

  test("q có dấu khớp tên (chuẩn hoá 2 phía như mock)", async () => {
    const body = await getJson<PageJson>("/api/v1/places?q=" + encodeURIComponent("bánh xèo"))

    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(normalizeName(item.name)).toContain("banh xeo")
    }
  })

  test("category nhiều giá trị + loại trừ hoạt động", async () => {
    const body = await getJson<PageJson>("/api/v1/places?category=cafe,bar&excludeDistrict=Sơn Trà")

    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(["cafe", "bar"]).toContain(item.category)
      expect(item.district).not.toBe("Sơn Trà")
    }
  })

  test("category lạ bị bỏ qua thay vì 500 (mock: không khớp → trang rỗng)", async () => {
    const unknown = await get("/api/v1/places?category=khong-ton-tai")
    expect(unknown.status).toBe(200)
    expect(await unknown.json()).toEqual({ items: [], next: null })

    // Trộn giá trị hợp lệ với rác: chỉ lọc theo giá trị hợp lệ.
    const mixed = await getJson<PageJson>("/api/v1/places?category=cafe,khong-ton-tai")
    expect(mixed.items.length).toBeGreaterThan(0)
    for (const item of mixed.items) expect(item.category).toBe("cafe")
  })

  test("category nhận cả dạng gạch dưới (street_food) lẫn gạch nối (street-food)", async () => {
    const dashed = await getJson<PageJson>("/api/v1/places?category=street-food")
    const underscored = await getJson<PageJson>("/api/v1/places?category=street_food")

    expect(dashed.items.length).toBeGreaterThan(0)
    expect(underscored.items.map((item) => item.id)).toEqual(dashed.items.map((item) => item.id))
    for (const item of dashed.items) expect(item.category).toBe("street-food")
  })

  test("query chứa ký tự NUL trả 400 (Postgres không nhận \\u0000)", async () => {
    const res = await get("/api/v1/places?district=%00")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Dữ liệu chứa ký tự không hợp lệ" })
  })

  test("priceMax ngoài 1–3 bị bỏ qua (không lỗi, không lọc sai)", async () => {
    const all = await getJson<PageJson>("/api/v1/places?priceMax=9")
    const plain = await getJson<PageJson>("/api/v1/places")
    expect(all.items.map((item) => item.id)).toEqual(plain.items.map((item) => item.id))
  })

  test("includeKeyword AND: 2 từ khoá phải cùng xuất hiện", async () => {
    const body = await getJson<PageJson>("/api/v1/places?includeKeyword=quang,ga")

    for (const item of body.items) {
      const haystack = `${item.name} ${item.address} ${item.tags.join(" ")}`.toLowerCase()
      expect(haystack).toContain("quang")
      expect(haystack).toContain("ga")
    }
  })

  test("excludeKeyword loại mọi địa điểm chứa từ khoá (bất kỳ là loại)", async () => {
    // Đối chứng bằng includeKeyword (không phụ thuộc trang đầu dataset có gì).
    const withQuang = await getJson<PageJson>("/api/v1/places?includeKeyword=quang")
    expect(withQuang.items.length).toBeGreaterThan(0)

    const excluded = await getJson<PageJson>("/api/v1/places?excludeKeyword=quang")
    const hay = (item: { name: string; address: string; tags: string[] }) =>
      `${item.name} ${item.address} ${item.tags.join(" ")}`.toLowerCase()
    for (const item of excluded.items) {
      expect(hay(item)).not.toContain("quang")
    }
  })

  test("chỉ trả place đã publish và không closed", async () => {
    // Chọn động một place chưa publish (file test khác có thể đã publish place
    // cứng trong dataset qua PATCH /posts/:id/place).
    const unpublished = await prisma.place.findFirst({
      where: { publishedAt: null, deletedAt: null },
      select: { id: true, name: true },
    })
    if (!unpublished) return

    const body = await getJson<PageJson>(
      `/api/v1/places?q=${encodeURIComponent(unpublished.name.slice(0, 12))}`,
    )
    expect(body.items.some((item) => item.id === unpublished.id)).toBe(false)
  })
})

describe("GET /places/map", () => {
  test("bbox trả {items,total}, chặn 300 item", async () => {
    const res = await get("/api/v1/places/map?bbox=108.0,15.9,108.4,16.3")
    expect(res.status).toBe(200)

    const body = (await res.json()) as { items: unknown[]; total: number }
    expect(body.items.length).toBeLessThanOrEqual(300)
    expect(body.total).toBeGreaterThanOrEqual(body.items.length)
    expect(placeSchema.safeParse(body.items[0]).success).toBe(true)
  })

  test("bbox sai định dạng bị bỏ qua (trả toàn bộ, vẫn chặn 300)", async () => {
    const body = (await (await get("/api/v1/places/map?bbox=abc")).json()) as {
      items: unknown[]
      total: number
    }

    expect(body.items).toHaveLength(300)
    expect(body.total).toBeGreaterThan(300)
  })
})

describe("GET /places/:id", () => {
  test("place đã publish trả đúng schema", async () => {
    const list = await getJson<PageJson>("/api/v1/places")
    const id = list.items[0]!.id

    const res = await get(`/api/v1/places/${id}`)
    expect(res.status).toBe(200)
    expect(placeSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("place chưa publish trả 404", async () => {
    // Chọn động: file test khác có thể đã publish place cứng trong dataset.
    const unpublished = await prisma.place.findFirst({
      where: { publishedAt: null, deletedAt: null },
      select: { id: true },
    })
    if (!unpublished) return

    const res = await get(`/api/v1/places/${unpublished.id}`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: "Không tìm thấy địa điểm" })
  })

  test("id không tồn tại trả 404", async () => {
    const res = await get("/api/v1/places/khong-ton-tai-999")
    expect(res.status).toBe(404)
  })
})

describe("GET /places/:id/posts", () => {
  test("chỉ trả bài gắn địa điểm, khớp pageSchema(postSchema)", async () => {
    const list = await getJson<PageJson>("/api/v1/places")
    const id = list.items[0]!.id

    const res = await get(`/api/v1/places/${id}/posts`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: { place: { id: string } | null }[] }
    expect(postPageSchema.safeParse(body).success).toBe(true)
    for (const post of body.items) {
      expect(post.place?.id).toBe(id)
    }
  })

  test("place chưa publish trả 404", async () => {
    const unpublished = await prisma.place.findFirst({
      where: { publishedAt: null, deletedAt: null },
      select: { id: true },
    })
    if (!unpublished) return

    const res = await get(`/api/v1/places/${unpublished.id}/posts`)
    expect(res.status).toBe(404)
  })

  test("id không tồn tại trả 404", async () => {
    const res = await get("/api/v1/places/khong-ton-tai-999/posts")
    expect(res.status).toBe(404)
  })
})

describe("GET /places/suggestions", () => {
  test("caption ngắn hơn 8 ký tự trả rỗng", async () => {
    const body = await getJson<{ suggestions: unknown[] }>("/api/v1/places/suggestions?q=an%20banh")
    expect(body.suggestions).toHaveLength(0)
  })

  test("caption nhắc món/loại hình trả gợi ý khớp PlaceSummary", async () => {
    const body = await getJson<{ suggestions: { place: { id: string }; reason: string }[] }>(
      "/api/v1/places/suggestions?q=" +
        encodeURIComponent("Hôm nay ăn bánh xèo ở Đà Nẵng rất ngon"),
    )

    expect(body.suggestions.length).toBeGreaterThan(0)
    expect(body.suggestions.length).toBeLessThanOrEqual(3)
    for (const suggestion of body.suggestions) {
      expect(suggestion.place.id.length).toBeGreaterThan(0)
      expect(suggestion.reason.length).toBeGreaterThan(0)
    }
  })

  test("limit bị chặn trên 10", async () => {
    const body = await getJson<{ suggestions: unknown[] }>(
      "/api/v1/places/suggestions?limit=99&q=" + encodeURIComponent("quán ăn ngon ở Đà Nẵng"),
    )
    expect(body.suggestions.length).toBeLessThanOrEqual(10)
  })
})

describe("cache HTTP (G2)", () => {
  test("GET /places/:id trả ETag + Cache-Control public, 304 khi If-None-Match khớp", async () => {
    const published = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
    })
    if (!published) throw new Error("Dataset test không có place đã publish")

    const first = await app.request(`/api/v1/places/${published.id}`)
    expect(first.status).toBe(200)
    const etag = first.headers.get("etag")
    expect(etag).toBeTruthy()
    expect(first.headers.get("cache-control")).toBe("public, max-age=60")

    const second = await app.request(`/api/v1/places/${published.id}`, {
      headers: { "If-None-Match": etag ?? "" },
    })
    expect(second.status).toBe(304)
    expect(await second.text()).toBe("")
  })

  test("GET /places/map trả Cache-Control public 30 giây", async () => {
    const res = await app.request("/api/v1/places/map")
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("public, max-age=30")
  })
})

describe("Daily Picks (Gợi ý hôm nay)", () => {
  const DATE = "2020-01-15" // ngày cố định — không phụ thuộc clock của test

  test("pickDailyPicks chạy 2 lần → daily_picks vẫn đúng 3 row, cùng bộ quán (idempotence)", async () => {
    await prisma.dailyPick.deleteMany({ where: { pickDate: new Date(`${DATE}T00:00:00Z`) } })

    const firstCount = await picks.pickDailyPicks(DATE)
    expect(firstCount).toBe(3)
    const firstRows = await prisma.dailyPick.findMany({
      where: { pickDate: new Date(`${DATE}T00:00:00Z`) },
      orderBy: { position: "asc" },
    })
    expect(firstRows.map((row) => row.placeId)).toEqual([
      ...new Set(firstRows.map((row) => row.placeId)),
    ])

    // Chạy lại (mô phỏng retry/hai worker chen nhau) — không nhân đôi, không đổi bộ.
    await picks.pickDailyPicks(DATE)
    const secondRows = await prisma.dailyPick.findMany({
      where: { pickDate: new Date(`${DATE}T00:00:00Z`) },
      orderBy: { position: "asc" },
    })
    expect(secondRows).toHaveLength(3)
    expect(secondRows.map((row) => row.placeId)).toEqual(firstRows.map((row) => row.placeId))
  })

  test("job chết sau khi insert 1 row → retry ra đúng 3 row, cùng bộ quán", async () => {
    // Mô phỏng trạng thái dở dang: giữ lại duy nhất slot 1 của lần tính đầy đủ,
    // xoá 2 slot còn lại rồi chạy lại — transaction/skipDuplicates phải khôi
    // phục đủ 3 slot với CÙNG bộ quán (tính theo pickDate, không phụ thuộc now()).
    const fullRows = await prisma.dailyPick.findMany({
      where: { pickDate: new Date(`${DATE}T00:00:00Z`) },
      orderBy: { position: "asc" },
    })
    await prisma.dailyPick.deleteMany({
      where: { pickDate: new Date(`${DATE}T00:00:00Z`), position: { gt: 1 } },
    })

    await picks.pickDailyPicks(DATE)
    const recovered = await prisma.dailyPick.findMany({
      where: { pickDate: new Date(`${DATE}T00:00:00Z`) },
      orderBy: { position: "asc" },
    })
    expect(recovered).toHaveLength(3)
    expect(recovered.map((row) => row.placeId)).toEqual(fullRows.map((row) => row.placeId))
  })

  test("GET /places/daily-picks trả shape + Cache-Control public, max-age=300, 304 khi ETag khớp", async () => {
    const today = picks.getPickDate()
    await prisma.dailyPick.deleteMany({ where: { pickDate: new Date(`${today}T00:00:00Z`) } })
    await picks.pickDailyPicks(today)

    const res = await app.request("/api/v1/places/daily-picks")
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("public, max-age=300")

    const body = (await res.json()) as {
      date: string
      items: { place: unknown; reason: string }[]
    }
    expect(dailyPicksSchema.safeParse(body).success).toBe(true)
    expect(body.date).toBe(today)
    expect(body.items).toHaveLength(3)
    for (const item of body.items) {
      expect(typeof item.reason).toBe("string")
      expect(item.reason.length).toBeGreaterThan(0)
      expect(placeSchema.safeParse(item.place).success).toBe(true)
    }

    const etag = res.headers.get("etag")
    expect(etag).toBeTruthy()
    const cached = await app.request("/api/v1/places/daily-picks", {
      headers: { "If-None-Match": etag ?? "" },
    })
    expect(cached.status).toBe(304)
  })

  test("chưa có picks cho hôm nay → 200 với items rỗng (không phải lỗi)", async () => {
    await prisma.dailyPick.deleteMany({
      where: { pickDate: new Date(`${picks.getPickDate()}T00:00:00Z`) },
    })
    const res = await app.request("/api/v1/places/daily-picks")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Sắp xếp kết quả (sort) — thiết kế "Lọc theo giá + Sắp xếp + Ảnh responsive"
// ---------------------------------------------------------------------------

/** Dòng place đủ trường cho test sort (lat/lng/rating/reviewCount). */
interface SortPlaceJson extends PlaceJson {
  rating: number
  reviewCount: number
  lat?: number
  lng?: number
}
interface SortPageJson {
  items: SortPlaceJson[]
  next: string | null
}

/** Công thức client (`calculateDistanceKm` — atan2 Haversine) để so 2 implementation. */
function clientDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

describe("GET /places — sort", () => {
  const LAT = 16.06
  const LNG = 108.22

  /** Đi hết các trang của một query — trả danh sách id theo thứ tự trả về. */
  async function collectAll(query: string): Promise<string[]> {
    const ids: string[] = []
    let cursor: string | null = null
    for (let guard = 0; guard < 200; guard++) {
      const path: string = `/api/v1/places?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      const page: SortPageJson = await getJson<SortPageJson>(path)
      ids.push(...page.items.map((item) => item.id))
      cursor = page.next
      if (!cursor) return ids
    }
    throw new Error("collectAll vượt quá 200 trang — phân trang có thể lặp vô hạn")
  }

  test("sort lạ → newest (thứ tự giống không sort)", async () => {
    const plain = await getJson<SortPageJson>("/api/v1/places")
    const weird = await getJson<SortPageJson>("/api/v1/places?sort=tuyet-voi")
    expect(weird.items.map((item) => item.id)).toEqual(plain.items.map((item) => item.id))
  })

  test("sort=distance thiếu lat/lng → newest (không 400)", async () => {
    const plain = await getJson<SortPageJson>("/api/v1/places")
    const noCoords = await getJson<SortPageJson>("/api/v1/places?sort=distance")
    expect(noCoords.items.map((item) => item.id)).toEqual(plain.items.map((item) => item.id))

    // Toạ độ ngoài miền (lat > 90) cũng rơi về newest.
    const outOfRange = await getJson<SortPageJson>("/api/v1/places?sort=distance&lat=999&lng=0")
    expect(outOfRange.items.map((item) => item.id)).toEqual(plain.items.map((item) => item.id))
  })

  test("sort=distance: tăng dần, khớp công thức client, đi hết trang không trùng/sót", async () => {
    const ids = await collectAll(`sort=distance&lat=${LAT}&lng=${LNG}`)

    // Đủ mọi place đã publish, không trùng.
    const total = await prisma.place.count({
      where: { publishedAt: { not: null }, deletedAt: null },
    })
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(total)

    // Thứ tự tăng dần theo công thức CLIENT (sai số cho phép 0,01 km).
    // Lấy toạ độ qua các trang để so khoảng cách.
    let cursor: string | null = null
    const coords: { lat?: number; lng?: number }[] = []
    for (let guard = 0; guard < 200; guard++) {
      const path: string = `/api/v1/places?sort=distance&lat=${LAT}&lng=${LNG}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      const page: SortPageJson = await getJson<SortPageJson>(path)
      for (const item of page.items) coords.push({ lat: item.lat, lng: item.lng })
      cursor = page.next
      if (!cursor) break
    }

    let previous = -1
    for (const { lat, lng } of coords) {
      // Quán thiếu toạ độ xếp cuối — dataset publish đủ toạ độ nên chỉ kiểm khi có.
      if (lat === undefined || lng === undefined) continue
      const distance = clientDistanceKm(LAT, LNG, lat, lng)
      expect(distance).toBeGreaterThanOrEqual(previous - 0.01)
      previous = distance
    }
  })

  test("Haversine SQL khớp công thức client (sai số < 0,01 km)", async () => {
    const place = await prisma.place.findFirst({
      where: {
        publishedAt: { not: null },
        deletedAt: null,
        lat: { not: null },
        lng: { not: null },
      },
      select: { id: true, lat: true, lng: true },
    })
    if (!place) return

    const rows = await prisma.$queryRaw<{ d: number }[]>(Prisma.sql`
      SELECT (6371 * acos(least(1, greatest(-1,
        cos(radians(${LAT})) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(${LNG}))
        + sin(radians(${LAT})) * sin(radians(p.lat))
      )))) AS d
      FROM places p WHERE p.id = ${place.id}
    `)
    const sqlKm = Number(rows[0]!.d)
    const clientKm = clientDistanceKm(LAT, LNG, place.lat!, place.lng!)
    expect(Math.abs(sqlKm - clientKm)).toBeLessThan(0.01)
  })

  test("sort=rating: quán có đánh giá lên đầu, 0 review xuống cuối; keyset ổn định", async () => {
    // Tạo 2 đánh giá thật (qua helper auth — review cần authorId uuid hợp lệ).
    const user = await registerVerifiedUser(app, prisma, {
      name: "Người Sort",
      handle: `sort_rating_${Math.random().toString(36).slice(2, 8)}`,
    })
    const targets = await prisma.place.findMany({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    })
    await prisma.review.create({
      data: { placeId: targets[0]!.id, authorId: user.id, rating: 5, content: "test" },
    })
    await prisma.review.create({
      data: { placeId: targets[1]!.id, authorId: user.id, rating: 3, content: "test" },
    })

    const ids = await collectAll("sort=rating")
    expect(new Set(ids).size).toBe(ids.length)

    // Trang đầu: quán 5 sao đứng nhất, quán 3 sao nhì.
    expect(ids[0]).toBe(targets[0]!.id)
    expect(ids[1]).toBe(targets[1]!.id)

    // Mọi quán có reviewCount > 0 đứng trước quán 0 review.
    let cursor: string | null = null
    const pages: SortPageJson[] = []
    for (let guard = 0; guard < 200; guard++) {
      const path: string = `/api/v1/places?sort=rating${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      const page: SortPageJson = await getJson<SortPageJson>(path)
      pages.push(page)
      cursor = page.next
      if (!cursor) break
    }
    const flat = pages.flatMap((page) => page.items)
    const firstZero = flat.findIndex((item) => item.reviewCount === 0)
    if (firstZero >= 0) {
      for (let index = firstZero; index < flat.length; index++) {
        expect(flat[index]!.reviewCount).toBe(0)
      }
    }
  })

  test("keyset distance với quán thiếu toạ độ: quán NULL xuất hiện ở trang cuối", async () => {
    // Dataset publish không có quán thiếu toạ độ — tạo riêng cho nhánh NULL.
    await prisma.place.create({
      data: {
        id: `test-null-coords-${Math.random().toString(36).slice(2, 8)}`,
        name: "Quán Không Toạ Độ",
        address: "Đà Nẵng",
        category: "cafe",
        publishedAt: new Date(),
        // lat/lng để trống — đúng nhánh `distance IS NULL`.
      },
    })

    const ids = await collectAll("sort=distance&lat=16.06&lng=108.22")
    const nullPlaceIndex = ids.findIndex((id) => id.startsWith("test-null-coords-"))
    expect(nullPlaceIndex).toBeGreaterThan(-1)
    // Quán thiếu toạ độ xếp sau mọi quán có toạ độ → chỉ đứng sau các quán NULL khác.
    expect(nullPlaceIndex).toBe(ids.length - 1)
  })

  test("cursor kind khác sort → trả trang đầu (không 400)", async () => {
    const ratingFirst = await getJson<SortPageJson>("/api/v1/places?sort=rating")
    // Dùng cursor của sort=rating cho sort=newest — phải trả trang đầu của newest.
    const mixed = await getJson<SortPageJson>(`/api/v1/places?cursor=${ratingFirst.next}`)
    const plain = await getJson<SortPageJson>("/api/v1/places")
    expect(mixed.items.map((item) => item.id)).toEqual(plain.items.map((item) => item.id))
  })

  test("cursor cũ không kind (created_at|id) vẫn đọc được với sort=newest", async () => {
    // Cursor legacy: created_at tương lai + id lớn → keyset không loại dòng nào
    // → trả trang đầu giống không cursor.
    const legacy = Buffer.from(`${new Date("2999-01-01").toISOString()}|zzzz`, "utf8").toString(
      "base64url",
    )
    const legacyPage = await getJson<SortPageJson>(`/api/v1/places?cursor=${legacy}`)
    const plain = await getJson<SortPageJson>("/api/v1/places")
    expect(legacyPage.items.map((item) => item.id)).toEqual(plain.items.map((item) => item.id))
  })
})
