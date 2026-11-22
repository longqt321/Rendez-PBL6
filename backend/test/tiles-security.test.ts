import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import type { AppEnv } from "../src/app"
import { createTilesRouter } from "../src/routes/tiles"

function createTileApp() {
  const app = new Hono<AppEnv>()
  app.route("/", createTilesRouter())
  return app
}

describe("GET /tiles/:z/:x/:file — Boundary Values & Security", () => {
  const app = createTileApp()

  test("từ chối zoom ngoài biên [10, 19] hoặc không phải số nguyên (BVA: -1, 0, 9, 20, 99, abc)", async () => {
    for (const z of ["-1", "0", "9", "20", "99", "abc", "12.5"]) {
      const res = await app.request(`/tiles/${z}/500/500.png`)
      expect(res.status).toBe(400)
    }
  })

  test("từ chối tọa độ x hoặc y âm hoặc >= 2^z", async () => {
    // Ở z = 10, 2^10 = 1024 -> x, y hợp lệ thuộc [0, 1023]
    for (const path of [
      "/tiles/10/-1/0.png",
      "/tiles/10/1024/0.png",
      "/tiles/10/0/1024.png",
      "/tiles/10/99999/0.png",
      "/tiles/10/abc/0.png",
    ]) {
      const res = await app.request(path)
      expect(res.status).toBe(400)
    }
  })

  test("chặn path traversal và đuôi file không phải .png", async () => {
    for (const path of [
      "/tiles/12/100/..%2F..%2Fetc%2Fpasswd",
      "/tiles/12/100/100.svg",
      "/tiles/12/100/100.jpg",
      "/tiles/12/100/100.png.bak",
      "/tiles/12/100/-5.png",
    ]) {
      const res = await app.request(path)
      expect([400, 404]).toContain(res.status)
    }
  })

  test("khi cả upstream OSM và Carto đều lỗi mạng, trả ảnh PNG fallback hợp lệ (không 500)", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error("Simulated upstream network failure")
    }) as unknown as typeof fetch

    try {
      // Dùng tọa độ hợp lệ trong z=10 (chưa có trong disk cache)
      const res = await app.request("/tiles/10/1/1.png")
      expect(res.status).toBe(200)
      expect(res.headers.get("Content-Type")).toContain("image/png")
      const bytes = new Uint8Array(await res.arrayBuffer())
      // Magic header của file PNG: 89 50 4E 47
      expect(bytes[0]).toBe(0x89)
      expect(bytes[1]).toBe(0x50)
      expect(bytes[2]).toBe(0x4e)
      expect(bytes[3]).toBe(0x47)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
