import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { pageSchema, placeSchema, postSchema } from "@rendez/schema"
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
const postPageSchema = pageSchema(postSchema)

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
      expect(item.name.toLowerCase()).toContain("bánh xèo")
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
