import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { createTtlCache, jsonWithCache } from "../src/lib/http-cache"

/**
 * Unit test cache TTL + single-flight (G2) — không cần DB.
 *
 * Kiểm ba tính chất quan trọng: cache trong TTL, hết TTL nạp lại, nhiều request
 * cùng key chỉ chạy loader một lần.
 */
describe("createTtlCache", () => {
  test("trong TTL chỉ gọi loader một lần", async () => {
    let calls = 0
    const cache = createTtlCache<number>({ ttlMs: 10_000, maxEntries: 4 })

    const first = await cache.get("k", async () => ++calls)
    const second = await cache.get("k", async () => ++calls)

    expect(first).toBe(1)
    expect(second).toBe(1)
    expect(calls).toBe(1)
  })

  test("hết TTL nạp lại giá trị mới", async () => {
    let calls = 0
    const cache = createTtlCache<number>({ ttlMs: 1, maxEntries: 4 })

    expect(await cache.get("k", async () => ++calls)).toBe(1)
    await Bun.sleep(5)
    expect(await cache.get("k", async () => ++calls)).toBe(2)
    expect(calls).toBe(2)
  })

  test("single-flight: request song song cùng key dùng chung một promise", async () => {
    let calls = 0
    const cache = createTtlCache<string>({ ttlMs: 10_000, maxEntries: 4 })
    const load = async () => {
      calls += 1
      await Bun.sleep(10)
      return "value"
    }

    const [a, b, c] = await Promise.all([
      cache.get("k", load),
      cache.get("k", load),
      cache.get("k", load),
    ])

    expect([a, b, c]).toEqual(["value", "value", "value"])
    expect(calls).toBe(1)
  })

  test("clear() buộc nạp lại", async () => {
    let calls = 0
    const cache = createTtlCache<number>({ ttlMs: 10_000, maxEntries: 4 })

    await cache.get("k", async () => ++calls)
    cache.clear()
    expect(await cache.get("k", async () => ++calls)).toBe(2)
  })

  test("quá maxEntries thì xoá phần tử cũ nhất", async () => {
    let calls = 0
    const cache = createTtlCache<number>({ ttlMs: 10_000, maxEntries: 2 })

    await cache.get("a", async () => ++calls)
    await cache.get("b", async () => ++calls)
    await cache.get("c", async () => ++calls) // đẩy "a" ra khỏi cache

    expect(await cache.get("a", async () => ++calls)).toBe(4)
    expect(await cache.get("c", async () => ++calls)).toBe(3)
  })
})

/**
 * Header của `jsonWithCache` (V3-01): dữ liệu công khai được cache `max-age`,
 * dữ liệu phụ thuộc người xem phải `no-cache` — trình duyệt revalidate mỗi lần
 * đọc nên sau mutation (theo dõi, thích) refetch luôn thấy dữ liệu mới.
 */
describe("jsonWithCache", () => {
  const app = new Hono()
  app.get("/public", (c) => jsonWithCache(c, { value: 1 }, { maxAge: 30 }))
  app.get("/private", (c) => jsonWithCache(c, { value: 1 }, { maxAge: 15, scope: "private" }))
  const changing = new Hono()
  let value = 1
  changing.get("/private", (c) => jsonWithCache(c, { value }, { maxAge: 15, scope: "private" }))

  test("scope public → public, max-age (đúng mục đích cache công khai)", async () => {
    const res = await app.request("/public")
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=30")
    expect(res.headers.get("ETag")).not.toBeNull()
  })

  test("scope private → private, no-cache — không max-age (V3-01)", async () => {
    const res = await app.request("/private")
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache")
  })

  test("private vẫn trả 304 khi ETag không đổi (giữ lợi ích ETag)", async () => {
    const first = await app.request("/private")
    const etag = first.headers.get("ETag")
    expect(etag).not.toBeNull()

    const second = await app.request("/private", { headers: { "If-None-Match": etag! } })
    expect(second.status).toBe(304)
    expect(second.headers.get("Cache-Control")).toBe("private, no-cache")
  })

  test("body đổi → ETag đổi → 200 với body mới (không trả body cũ)", async () => {
    const first = await changing.request("/private")
    const etag = first.headers.get("ETag")!

    value = 2 // dữ liệu đổi sau mutation (theo dõi/like)
    const second = await changing.request("/private", { headers: { "If-None-Match": etag } })
    expect(second.status).toBe(200)
    expect(second.headers.get("ETag")).not.toBe(etag)
    expect(await second.json()).toEqual({ value: 2 })
  })
})
