import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"
import { rankPlaceSuggestions, type RankCandidate } from "../src/lib/ranking"

let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma
let getRecommendedPlaces: typeof import("../src/lib/recommendations").getRecommendedPlaces

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.BYPASS_RATE_LIMIT = "1"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  getRecommendedPlaces = (await import("../src/lib/recommendations")).getRecommendedPlaces
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

describe("Search, ranking and recommendations regression fixes", () => {
  test("GET /places meta.totalResults phản ánh đúng số lượng sau khi lọc", async () => {
    const allRes = await app.request("/api/v1/places")
    expect(allRes.status).toBe(200)
    const allJson = (await allRes.json()) as { meta?: { totalResults?: number } }
    const totalAll = allJson.meta?.totalResults ?? 0

    const filteredRes = await app.request(
      `/api/v1/places?category=cafe&district=${encodeURIComponent("Hải Châu")}`,
    )
    expect(filteredRes.status).toBe(200)
    const filteredJson = (await filteredRes.json()) as {
      items: { category: string; district?: string }[]
      meta?: { totalResults?: number }
    }
    const filteredTotal = filteredJson.meta?.totalResults ?? 0

    expect(filteredTotal).toBeGreaterThan(0)
    expect(filteredTotal).toBeLessThan(totalAll)

    const exactDbCount = await prisma.place.count({
      where: {
        deletedAt: null,
        publishedAt: { not: null },
        category: "cafe",
        district: "Hải Châu",
      },
    })
    expect(filteredTotal).toBe(exactDbCount)
  })

  test("GET /places/map giữ nguyên bbox ngay cả khi sort=distance", async () => {
    const tightBox = "108.21,16.06,108.23,16.08"
    const res = await app.request(
      `/api/v1/places/map?bbox=${tightBox}&sort=distance&lat=16.07&lng=108.22`,
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      items: { lat?: number | null; lng?: number | null }[]
    }
    expect(json.items.length).toBeGreaterThan(0)
    for (const item of json.items) {
      expect(item.lng).toBeGreaterThanOrEqual(108.21)
      expect(item.lng).toBeLessThanOrEqual(108.23)
      expect(item.lat).toBeGreaterThanOrEqual(16.06)
      expect(item.lat).toBeLessThanOrEqual(16.08)
    }
  })

  test("tìm kiếm intent thuần 'cà phê Hải Châu' lọc cứng 100% và hỗ trợ phân trang cursor", async () => {
    const res = await app.request(`/api/v1/places?q=${encodeURIComponent("cà phê Hải Châu")}`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      items: { category: string; district?: string | null }[]
      next: string | null
      meta?: { totalResults?: number; parsedFilters?: { field: string; value: string }[] }
    }
    expect(json.items.length).toBeGreaterThan(0)
    for (const item of json.items) {
      expect(item.category).toBe("cafe")
      expect(item.district).toBe("Hải Châu")
    }
    expect(
      json.meta?.parsedFilters?.some((f) => f.field === "district" && f.value === "Hải Châu"),
    ).toBe(true)

    if (json.next) {
      const page2 = await app.request(
        `/api/v1/places?q=${encodeURIComponent("cà phê Hải Châu")}&cursor=${encodeURIComponent(json.next)}`,
      )
      expect(page2.status).toBe(200)
      const json2 = (await page2.json()) as {
        items: { category: string; district?: string | null }[]
      }
      expect(json2.items.length).toBeGreaterThan(0)
      for (const item of json2.items) {
        expect(item.category).toBe("cafe")
        expect(item.district).toBe("Hải Châu")
      }
    }
  })

  test("S-3: tìm kiếm gộp phủ định & mức giá ('quán ăn Hải Châu không hải sản giá rẻ')", async () => {
    const res = await app.request(
      `/api/v1/places?q=${encodeURIComponent("quán ăn Hải Châu không hải sản giá rẻ")}`,
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      items: {
        name: string
        address: string
        category: string
        district?: string | null
        priceLevel: number
        tags: string[]
      }[]
    }
    expect(json.items.length).toBeGreaterThan(0)
    for (const item of json.items) {
      expect(item.category).toBe("restaurant")
      expect(item.district).toBe("Hải Châu")
      expect(item.priceLevel).toBeLessThanOrEqual(1)
      const hay = `${item.name} ${item.address} ${item.tags.join(" ")}`.toLowerCase()
      expect(hay).not.toContain("hải sản")
    }
  })

  test("rankPlaceSuggestions bắt 'tiem banh', kiểm tra ranh giới từ và trả lý do tiếng Việt tự nhiên", () => {
    const bakery: RankCandidate = {
      id: "tiem-banh-a",
      category: "bakery",
      rating: 4.6,
      reviewCount: 40,
      city: "Đà Nẵng",
      district: "Hải Châu",
      districtNorm: "hai chau",
      nameNorm: "bakes danang",
      addressNorm: "12 tran phu hai chau",
      cityNorm: "da nang",
      tags: ["bánh ngọt"],
      tagsNorm: ["banh ngot"],
    }
    const falseBarMatch: RankCandidate = {
      id: "quan-bar-b",
      category: "bar",
      rating: 4.9,
      reviewCount: 200,
      city: "Đà Nẵng",
      district: "Sơn Trà",
      districtNorm: "son tra",
      nameNorm: "bar",
      addressNorm: "vo van kiet",
      cityNorm: "da nang",
      tags: ["chill"],
      tagsNorm: ["chill"],
    }

    const ranked = rankPlaceSuggestions(
      "hom nay di tiem banh mua banh ngot o hai chau gap barista",
      [falseBarMatch, bakery],
    )
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0]?.candidate.id).toBe("tiem-banh-a")
    expect(ranked[0]?.reason).toBe("Phù hợp: bánh ngọt · Cùng nhóm Tiệm bánh")
    expect(ranked[0]?.reason).not.toMatch(/hai chau|tiem banh|banh ngot/u)

    const rankedDistrict = rankPlaceSuggestions("chieu nay ghe quan o hai chau", [bakery])
    expect(rankedDistrict[0]?.reason).toContain("Hải Châu")

    // "bar" không được khớp bên trong "barista"
    const barEntry = ranked.find((r) => r.candidate.id === "quan-bar-b")
    expect(barEntry?.reason ?? "").not.toContain("Quán bar")
  })

  test("getRecommendedPlaces backfill khi actor ít affinity và giữ trần category cap", async () => {
    const samplePlaces = await prisma.place.findMany({
      where: { publishedAt: { not: null }, deletedAt: null },
      select: { id: true },
      take: 2,
    })
    const seedPlaceId = samplePlaces[0]?.id
    const relatedPlaceId = samplePlaces[1]?.id
    expect(seedPlaceId).toBeDefined()
    expect(relatedPlaceId).toBeDefined()

    await prisma.affinityCache.upsert({
      where: { placeId: seedPlaceId! },
      create: {
        placeId: seedPlaceId!,
        related: [{ id: relatedPlaceId!, score: 0.95 }],
      },
      update: {
        related: [{ id: relatedPlaceId!, score: 0.95 }],
      },
    })

    const anonId = "anon_backfill_test_1"
    await prisma.interactionEvent.create({
      data: {
        anonId,
        placeId: seedPlaceId!,
        eventType: "favorite",
        weight: 3,
      },
    })

    const rec = await getRecommendedPlaces({ userId: null, anonId }, 8)
    expect(rec.items).toHaveLength(8)

    const ids = new Set(rec.items.map((item) => item.id))
    expect(ids.size).toBe(8)
    expect(ids.has(seedPlaceId!)).toBe(false)
    expect(ids.has(relatedPlaceId!)).toBe(true)

    const categoryCounts = new Map<string, number>()
    for (const item of rec.items) {
      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1)
    }
    for (const [, count] of categoryCounts) {
      expect(count).toBeLessThanOrEqual(3)
    }
  })

  test("R-1 & R-2: single-user content fallback hoạt động khi cache trống, và negative net-weight bị loại khỏi seed", async () => {
    const cafePlace = await prisma.place.findFirst({
      where: { publishedAt: { not: null }, deletedAt: null, category: "cafe" },
      select: { id: true },
    })
    expect(cafePlace).toBeDefined()

    // Đảm bảo seed này KHÔNG có dòng trong affinity_cache -> thử nghiệm single-user fallback
    await prisma.affinityCache.deleteMany({ where: { placeId: cafePlace!.id } })

    const singleAnon = "anon_single_user_r1"
    await prisma.interactionEvent.create({
      data: {
        anonId: singleAnon,
        placeId: cafePlace!.id,
        eventType: "favorite",
        weight: 3,
      },
    })

    const rec = await getRecommendedPlaces({ userId: null, anonId: singleAnon }, 6)
    expect(rec.strategy).toBe("affinity")
    expect(rec.seedCount).toBe(1)
    expect(rec.items.some((item) => item.id === cafePlace!.id)).toBe(false)

    // R-2: khi actor huỷ lưu / ẩn (-5) khiến net-weight <= 0, không còn là seed dương nữa
    await prisma.interactionEvent.create({
      data: {
        anonId: singleAnon,
        placeId: cafePlace!.id,
        eventType: "unsave",
        weight: -5,
      },
    })
    const recAfterHide = await getRecommendedPlaces({ userId: null, anonId: singleAnon }, 6)
    expect(recAfterHide.strategy).toBe("cold-start")
    expect(recAfterHide.seedCount).toBe(0)
  })
})
