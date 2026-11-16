import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, placeSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Backend Test Suite: EP & BVA (Phân vùng tương đương & Giá trị biên)
 * cho API GET /places và /places/map.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const placePageSchema = pageSchema(placeSchema)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"
  process.env.BYPASS_RATE_LIMIT = "1"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

function call(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  return app.request(path, { ...init, headers })
}

describe("GET /places — EP & BVA (Phân vùng tương đương & Phân tích giá trị biên)", () => {
  describe("BVA cho tham số toạ độ lat / lng", () => {
    test("BVA-1: lat sát biên hợp lệ [-90, 90], lng [-180, 180] trả 200", async () => {
      const res = await call("/api/v1/places?sort=distance&lat=89.999&lng=179.999")
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(placePageSchema.safeParse(body).success).toBe(true)
    })

    test("BVA-2: lat vượt biên hợp lệ (> 90 hoặc < -90) xử lý an toàn không 500", async () => {
      const resOver = await call("/api/v1/places?sort=distance&lat=90.001&lng=106.69")
      // Route xử lý an toàn: hoặc fallback về newest (200), hoặc 400 bad request
      expect([200, 400]).toContain(resOver.status)

      const resUnder = await call("/api/v1/places?sort=distance&lat=-90.001&lng=106.69")
      expect([200, 400]).toContain(resUnder.status)
    })

    test("BVA-3: lng vượt biên hợp lệ (> 180 hoặc < -180) xử lý an toàn không 500", async () => {
      const res = await call("/api/v1/places?sort=distance&lat=10.77&lng=180.001")
      expect([200, 400]).toContain(res.status)
    })
  })

  describe("BVA & EP cho tham số tìm kiếm q", () => {
    test("EP-1: q rỗng hoặc toàn khoảng trắng không làm đứt query", async () => {
      const res = await call("/api/v1/places?q=%20%20%20%20")
      expect(res.status).toBe(200)
      const body = (await res.json()) as { items: unknown[] }
      expect(placePageSchema.safeParse(body).success).toBe(true)
      expect(body.items.length).toBeGreaterThan(0)
    })

    test("EP-2: q chứa ký tự đặc biệt SQL/RegEx (', --, %, _, ;) không gây lỗi cú pháp", async () => {
      const maliciousQueries = ["'", "';", "--", "%", "_", "/*", "*/", "@@"]
      for (const q of maliciousQueries) {
        const res = await call(`/api/v1/places?q=${encodeURIComponent(q)}`)
        expect(res.status).toBe(200)
      }
    })

    test("BVA-4: q có độ dài vượt trần 100 ký tự được cắt gọt an toàn", async () => {
      const longQuery = "cafe ".repeat(50) // > 250 ký tự
      const res = await call(`/api/v1/places?q=${encodeURIComponent(longQuery)}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(placePageSchema.safeParse(body).success).toBe(true)
    })
  })

  describe("BVA cho phân trang và bbox", () => {
    test("BVA-5: cursor dị dạng không decode được trả 400 thay vì 500", async () => {
      const res = await call("/api/v1/places?cursor=invalid_base64_payload!@#$")
      expect(res.status).toBe(400)
    })

    test("BVA-6: GET /places/map với bbox đảo ngược (min > max) không crash", async () => {
      // bbox: minLng,minLat,maxLng,maxLat nhưng truyền min > max
      const res = await call("/api/v1/places/map?bbox=107.0,11.0,106.0,10.0")
      expect(res.status).toBe(200)
      const body = (await res.json()) as { items: unknown[] }
      expect(Array.isArray(body.items)).toBe(true)
    })
  })
})
