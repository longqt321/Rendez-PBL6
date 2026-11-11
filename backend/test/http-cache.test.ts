import { describe, expect, test } from "bun:test"
import { createTtlCache } from "../src/lib/http-cache"

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
