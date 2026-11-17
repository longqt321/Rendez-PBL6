import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Quality gate cho DES (cold-start recommendation).
 *
 * `getRecommendedPlaces` chạy truy vấn SQL thật trên `places`/`review`/
 * `affinity_cache` — nên phải dựng Postgres test (migration + seed cold-start)
 * giống mọi integration test khác, không được gọi trực tiếp khi chưa có DB.
 */
let getRecommendedPlaces: typeof import("../src/lib/recommendations").getRecommendedPlaces
let prisma: typeof import("../src/lib/prisma").prisma

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"

  getRecommendedPlaces = (await import("../src/lib/recommendations")).getRecommendedPlaces
  prisma = (await import("../src/lib/prisma")).prisma
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

describe("Recommendation System & DES Quality Gate", () => {
  it("getRecommendedPlaces trả kết quả cho guest (cold-start DES)", async () => {
    const res = await getRecommendedPlaces({ userId: null, anonId: "anon_test_des" }, 5)
    expect(res).toBeDefined()
    expect(res.strategy).toBe("cold-start")
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items.length).toBeLessThanOrEqual(5)

    // Kiểm tra cấu trúc item trả về
    const first = res.items[0]!
    expect(first.id).toBeDefined()
    expect(first.name).toBeDefined()
    expect(first.category).toBeDefined()
  })

  it("giới hạn trần category cap hoạt động trên cold-start (không độc quyền 1 category)", async () => {
    const res = await getRecommendedPlaces({ userId: null, anonId: "anon_diversity_test" }, 10)
    expect(res.items.length).toBeGreaterThan(0)
    const categoryCounts = new Map<string, number>()
    for (const item of res.items) {
      categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1)
    }
    // Không một category nào được chiếm quá 3 slot khi lấy danh sách (nếu có đa dạng catalog)
    for (const [, count] of categoryCounts) {
      expect(count).toBeLessThanOrEqual(3)
    }
  })
})
