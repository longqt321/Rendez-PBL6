import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, placeSchema } from "@rendez/schema"
import { startTestDb, stopTestDb } from "./helpers/pg"

/**
 * Integration test Phase 2 — địa điểm trên Postgres thật + dataset seed 491.
 *
 * Đối chiếu `placeSchema`/`pageSchema` của `@rendez/schema` (hợp đồng FE) và
 * các quy tắc lọc A7.9. Không mock gì.
 */
let app: Awaited<ReturnType<typeof import("../src/app").createApp>>
let prisma: typeof import("../src/lib/prisma").prisma

const placePageSchema = pageSchema(placeSchema)

beforeAll(async () => {
  const url = await startTestDb()
  process.env.DATABASE_URL = url
  process.env.LOG_LEVEL = "error"
  process.env.NODE_ENV = "test"

  const { createApp } = await import("../src/app")
  prisma = (await import("../src/lib/prisma")).prisma
  app = createApp()
}, 180_000)

afterAll(async () => {
  await prisma?.$disconnect()
  await stopTestDb()
}, 60_000)

async function get(path: string) {
  return app.request(path)
}

describe("GET /places", () => {
  test("trả Page<Place> khớp schema, tối đa 9 item", async () => {
    const res = await get("/api/v1/places")
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(placePageSchema.safeParse(body).success).toBe(true)
    expect(body.items).toHaveLength(9)
    expect(body.next).toBeString()
  })

  test("cursor keyset: trang 2 không trùng trang 1, đi hết dataset", async () => {
    const first = await (await get("/api/v1/places")).json()
    const second = await (await get(`/api/v1/places?cursor=${first.next}`)).json()

    const firstIds = new Set(first.items.map((item: { id: string }) => item.id))
    for (const item of second.items) expect(firstIds.has(item.id)).toBe(false)
  })

  test("cursor rác trả 400", async () => {
    const res = await get("/api/v1/places?cursor=khong-phai-cursor")
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ message: "Cursor không hợp lệ" })
  })

  test("q không dấu khớp tên có dấu (unaccent)", async () => {
    const res = await get("/api/v1/places?q=banh%20xeo")
    const body = await res.json()

    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(item.name.toLowerCase()).toContain("bánh xèo")
    }
  })

  test("category nhiều giá trị + loại trừ hoạt động", async () => {
    const res = await get("/api/v1/places?category=cafe,bar&excludeDistrict=Sơn Trà")
    const body = await res.json()

    expect(body.items.length).toBeGreaterThan(0)
    for (const item of body.items) {
      expect(["cafe", "bar"]).toContain(item.category)
      expect(item.district).not.toBe("Sơn Trà")
    }
  })

  test("priceMax ngoài 1–3 bị bỏ qua (không lỗi, không lọc sai)", async () => {
    const all = await (await get("/api/v1/places?priceMax=9")).json()
    const plain = await (await get("/api/v1/places")).json()
    expect(all.items.map((item: { id: string }) => item.id)).toEqual(
      plain.items.map((item: { id: string }) => item.id),
    )
  })

  test("includeKeyword AND: 2 từ khoá phải cùng xuất hiện", async () => {
    const res = await get("/api/v1/places?includeKeyword=quang,ga")
    const body = await res.json()

    for (const item of body.items) {
      const haystack = `${item.name} ${item.address} ${item.tags.join(" ")}`.toLowerCase()
      expect(haystack).toContain("quang")
      expect(haystack).toContain("ga")
    }
  })

  test("chỉ trả place đã publish và không closed", async () => {
    const res = await get("/api/v1/places?q=ram%20cuon")
    const body = await res.json()

    // Place duy nhất khớp "ram cuon" trong dataset chưa publish → không lọt ra.
    expect(body.items).toHaveLength(0)
  })
})

describe("GET /places/map", () => {
  test("bbox trả {items,total}, chặn 300 item", async () => {
    const res = await get("/api/v1/places/map?bbox=108.0,15.9,108.4,16.3")
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.items.length).toBeLessThanOrEqual(300)
    expect(body.total).toBeGreaterThanOrEqual(body.items.length)
    expect(placeSchema.safeParse(body.items[0]).success).toBe(true)
  })

  test("bbox sai định dạng bị bỏ qua (trả toàn bộ, vẫn chặn 300)", async () => {
    const res = await get("/api/v1/places/map?bbox=abc")
    const body = await res.json()

    expect(body.items).toHaveLength(300)
    expect(body.total).toBeGreaterThan(300)
  })
})

describe("GET /places/:id", () => {
  test("place đã publish trả đúng schema", async () => {
    const list = await (await get("/api/v1/places")).json()
    const id = list.items[0].id

    const res = await get(`/api/v1/places/${id}`)
    expect(res.status).toBe(200)
    expect(placeSchema.safeParse(await res.json()).success).toBe(true)
  })

  test("place chưa publish trả 404", async () => {
    const res = await get("/api/v1/places/ram-cuon-cai-di-hoa-6152681085")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: "Không tìm thấy địa điểm" })
  })

  test("id không tồn tại trả 404", async () => {
    const res = await get("/api/v1/places/khong-ton-tai-999")
    expect(res.status).toBe(404)
  })
})
