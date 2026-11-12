import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { dailyPicksSchema, pageMetaSchema, pageSchema, placeSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test cho lớp demo kỹ thuật: meta của endpoint danh sách, tìm kiếm
 * nâng cao (token AND / dính chữ / đồng nghĩa / didYouMean), `why` của
 * daily-picks và `/system/*`. Postgres thật + dataset seed, không mock.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let picks: typeof import("../src/lib/daily-picks")

const placePageSchema = pageSchema(placeSchema)

interface ListJson<T = unknown> {
  items: T[]
  next: string | null
  meta?: {
    tookMs: number
    cacheHit: boolean
    totalResults: number
    didYouMean?: string | null
  }
}

interface SearchPlaceJson {
  id: string
  name: string
  district?: string
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

  // Fixture tìm kiếm: các tên mà người dùng thường gõ lệch (dính chữ, thiếu
  // dấu, dùng từ đồng nghĩa). Tạo trực tiếp trong DB test, id cố định để
  // assert chính xác — dataset seed không có các tên này.
  await prisma.place.createMany({
    data: [
      {
        id: "test-search-caphe-trung",
        name: "Cà phê Trung",
        address: "12 Bạch Đằng",
        city: "Đà Nẵng",
        district: "Hải Châu",
        category: "cafe",
        publishedAt: new Date(),
      },
      {
        id: "test-search-nha-hang",
        name: "Nhà Hàng Bà Bè",
        address: "45 Trần Phú",
        city: "Đà Nẵng",
        district: "Hải Châu",
        category: "restaurant",
        publishedAt: new Date(),
      },
      {
        id: "test-search-coffee-house",
        name: "The Coffee House",
        address: "88 Nguyễn Văn Linh",
        city: "Đà Nẵng",
        district: "Thanh Khê",
        category: "cafe",
        publishedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  })
}, 180_000)

afterAll(async () => {
  // Dọn fixture của file này: DB test là container tạm nên không rò rỉ giữa các
  // lần chạy, nhưng test khác thêm sau có thể assert tổng số place — để lại
  // fixture là bẫy cho người viết test tiếp theo.
  await prisma?.place.deleteMany({ where: { id: { startsWith: "test-search-" } } })
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

async function getJson<T>(path: string): Promise<T> {
  const res = await app.request(path)
  expect(res.status).toBe(200)
  return (await res.json()) as T
}

describe("meta của endpoint danh sách", () => {
  test("GET /places trả meta khớp pageMetaSchema, totalResults là COUNT thật", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>("/api/v1/places")
    expect(placePageSchema.safeParse(body).success).toBe(true)
    expect(pageMetaSchema.safeParse(body.meta).success).toBe(true)

    const meta = body.meta!
    expect(Number.isInteger(meta.tookMs)).toBe(true)
    expect(meta.tookMs).toBeGreaterThanOrEqual(0)
    // Chưa có cache ứng dụng cho danh sách → false, không bịa.
    expect(meta.cacheHit).toBe(false)
    expect(meta.totalResults).toBeGreaterThanOrEqual(body.items.length)

    // Đối chiếu COUNT với DB: tổng số place công khai, không closed.
    const expected = await prisma.place.count({
      where: { publishedAt: { not: null }, deletedAt: null, status: { not: "closed" } },
    })
    expect(meta.totalResults).toBe(expected)
  })

  test("GET /places/map giữ `total` cũ và thêm meta cùng giá trị", async () => {
    const body = await getJson<{ items: unknown[]; total: number; meta: ListJson["meta"] }>(
      "/api/v1/places/map?bbox=108.0,15.9,108.4,16.3",
    )
    expect(body.total).toBeGreaterThanOrEqual(body.items.length)
    expect(body.meta?.totalResults).toBe(body.total)
    expect(body.meta?.cacheHit).toBe(false)
  })

  test("GET /places/daily-picks có next + meta, giữ `date`", async () => {
    const today = picks.getPickDate()
    await prisma.dailyPick.deleteMany({ where: { pickDate: new Date(`${today}T00:00:00Z`) } })
    await picks.pickDailyPicks(today)

    const body = await getJson<{
      date: string
      items: unknown[]
      next: string | null
      meta: ListJson["meta"]
    }>("/api/v1/places/daily-picks")

    expect(body.date).toBe(today)
    expect(body.next).toBeNull()
    expect(body.meta?.totalResults).toBe(body.items.length)
    expect(body.meta?.cacheHit).toBe(false)
  })
})

describe("tìm kiếm nâng cao", () => {
  test("?q=caphe trung khớp 'Cà phê Trung' (dính chữ + token AND)", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>(
      "/api/v1/places?q=" + encodeURIComponent("caphe trung"),
    )
    expect(body.items.map((item) => item.id)).toContain("test-search-caphe-trung")
    expect(body.meta?.totalResults).toBeGreaterThan(0)
    // Không có kết quả rỗng thì không gợi ý "ý bạn là…".
    expect(body.meta?.didYouMean ?? null).toBeNull()
  })

  test("?q=caphe (một token dính chữ) khớp tên có khoảng trắng", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>("/api/v1/places?q=caphe")
    expect(body.items.map((item) => item.id)).toContain("test-search-caphe-trung")
  })

  test("token AND: 'trung' + 'hai chau' cùng phải xuất hiện", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>(
      "/api/v1/places?q=" + encodeURIComponent("trung hai chau"),
    )
    expect(body.items.map((item) => item.id)).toContain("test-search-caphe-trung")
    // Chỉ assert trên fixture của mình: corpus seed thêm quán "Trung ..." ở quận
    // khác là chuyện hợp lệ, không được làm đỏ test này.
    const fixture = body.items.find((item) => item.id === "test-search-caphe-trung")
    expect(fixture?.district).toBe("Hải Châu")
  })

  test("?q= toàn ký tự đặc biệt không crash (regression Prisma.join rỗng)", async () => {
    for (const q of ["!!!", "%", "___", "--"]) {
      const body = await getJson<ListJson<SearchPlaceJson>>(
        "/api/v1/places?q=" + encodeURIComponent(q),
      )
      // Chuẩn hoá xong rỗng → không có điều kiện từ khoá, trả danh sách bình thường.
      expect(Array.isArray(body.items)).toBe(true)
      expect(body.meta?.totalResults).toBeGreaterThan(0)
    }
  })

  test("từ đồng nghĩa: 'quan ngon' khớp 'Nhà Hàng Bà Bè'", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>(
      "/api/v1/places?q=" + encodeURIComponent("quan ngon"),
    )
    expect(body.items.map((item) => item.id)).toContain("test-search-nha-hang")
  })

  test("từ đồng nghĩa: 'ca phe' khớp 'The Coffee House' (biến thể coffee)", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>(
      "/api/v1/places?q=" + encodeURIComponent("ca phe"),
    )
    expect(body.items.map((item) => item.id)).toContain("test-search-coffee-house")
  })

  test("0 kết quả + q dài ≥ 3 → meta.didYouMean là tên quán gần nhất (pg_trgm)", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>(
      "/api/v1/places?q=" + encodeURIComponent("caphe trungg"),
    )
    expect(body.items).toEqual([])
    expect(body.meta?.totalResults).toBe(0)
    expect(body.meta?.didYouMean).toBe("Cà phê Trung")
  })

  test("0 kết quả nhưng q quá ngắn (< 3) → didYouMean null", async () => {
    const body = await getJson<ListJson<SearchPlaceJson>>("/api/v1/places?q=qx")
    expect(body.items).toEqual([])
    expect(body.meta?.didYouMean).toBeNull()
  })
})

describe("why của daily-picks", () => {
  test("mỗi item có why thật: matchPercent 0–100, signals ≤ 3, openNow boolean|null", async () => {
    const today = picks.getPickDate()
    await prisma.dailyPick.deleteMany({ where: { pickDate: new Date(`${today}T00:00:00Z`) } })
    await picks.pickDailyPicks(today)

    const res = await app.request("/api/v1/places/daily-picks")
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: {
        place: { id: string; district?: string }
        reason: string
        why?: {
          matchPercent: number
          district?: string
          distanceKm: number | null
          openNow: boolean | null
          signals: string[]
        }
      }[]
    }
    expect(dailyPicksSchema.safeParse(body).success).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)

    for (const item of body.items) {
      const why = item.why
      expect(why).toBeDefined()
      expect(Number.isInteger(why!.matchPercent)).toBe(true)
      expect(why!.matchPercent).toBeGreaterThanOrEqual(0)
      expect(why!.matchPercent).toBeLessThanOrEqual(100)
      expect(why!.signals.length).toBeGreaterThan(0)
      expect(why!.signals.length).toBeLessThanOrEqual(3)
      expect(why!.distanceKm).toBeNull()
      expect([true, false, null]).toContain(why!.openNow)
      if (item.place.district) expect(why!.district).toBe(item.place.district)
    }
  })

  test("matchPercent tính từ công thức chọn quán (không phải số ngẫu nhiên)", async () => {
    const today = picks.getPickDate()
    await prisma.dailyPick.deleteMany({ where: { pickDate: new Date(`${today}T00:00:00Z`) } })
    await picks.pickDailyPicks(today)

    const body = await getJson<{
      items: { place: { id: string }; why: { matchPercent: number } }[]
    }>("/api/v1/places/daily-picks")

    for (const item of body.items) {
      const [reviewCount, imageCount, place] = await Promise.all([
        prisma.review.count({ where: { placeId: item.place.id, deletedAt: null } }),
        prisma.placeImage.count({ where: { placeId: item.place.id } }),
        prisma.place.findUniqueOrThrow({
          where: { id: item.place.id },
          select: { createdAt: true },
        }),
      ])
      const expected = picks.pickMatchPercent(
        { reviewCount, imageCount, createdAt: place.createdAt },
        today,
      )
      expect(item.why.matchPercent).toBe(expected)
    }
  })
})

describe("/system/*", () => {
  test("GET /system/stats trả số liệu vận hành + venue đếm thật từ DB", async () => {
    // Tạo ít nhất một request nghiệp vụ để bộ đếm có dữ liệu.
    await app.request("/api/v1/places")

    const body = await getJson<{
      uptimeMs: number
      totalQueries: number
      avgLatencyMs: number
      cacheHitRatio: number
      byEndpoint: { route: string; count: number; avgMs: number; cacheHits: number }[]
      venues: {
        total: number
        published: number
        withImages: number
        withTags: number
        withHours: number
      }
    }>("/api/v1/system/stats")

    expect(body.uptimeMs).toBeGreaterThanOrEqual(0)
    expect(body.totalQueries).toBeGreaterThan(0)
    expect(body.avgLatencyMs).toBeGreaterThanOrEqual(0)
    expect(body.cacheHitRatio).toBeGreaterThanOrEqual(0)
    expect(body.cacheHitRatio).toBeLessThanOrEqual(1)
    expect(body.byEndpoint.length).toBeGreaterThan(0)
    for (const entry of body.byEndpoint) {
      expect(entry.route.length).toBeGreaterThan(0)
      expect(entry.count).toBeGreaterThan(0)
      expect(entry.avgMs).toBeGreaterThanOrEqual(0)
    }
    // Không tự đếm chính route quan sát.
    expect(body.byEndpoint.some((entry) => entry.route.includes("/system"))).toBe(false)

    // Venue: đối chiếu COUNT thật.
    const total = await prisma.place.count({ where: { deletedAt: null } })
    const published = await prisma.place.count({
      where: { deletedAt: null, publishedAt: { not: null } },
    })
    expect(body.venues.total).toBe(total)
    expect(body.venues.published).toBe(published)
    expect(body.venues.withImages).toBeLessThanOrEqual(total)
    expect(body.venues.withTags).toBeLessThanOrEqual(total)
    expect(body.venues.withHours).toBeLessThanOrEqual(total)
  })

  test("POST /system/reset xoá bộ đếm nhưng KHÔNG xoá dữ liệu DB", async () => {
    await app.request("/api/v1/places")
    const before = await getJson<{ totalQueries: number }>("/api/v1/system/stats")
    expect(before.totalQueries).toBeGreaterThan(0)

    const placesBefore = await prisma.place.count()

    const res = await app.request("/api/v1/system/reset", { method: "POST" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reset: true })

    const after = await getJson<{ totalQueries: number; venues: { total: number } }>(
      "/api/v1/system/stats",
    )
    expect(after.totalQueries).toBe(0)
    expect(await prisma.place.count()).toBe(placesBefore)
  })
})
