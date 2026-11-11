import { describe, expect, test } from "bun:test"

/**
 * Test smoke Phase 0 — không cần Postgres.
 *
 * `env.ts` fail-fast nên phải đặt biến giả TRƯỚC khi import app (dynamic import
 * để tránh static import chạy trước khi gán).
 */
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/rendez_test"
process.env.LOG_LEVEL = "warn"

const { createApp } = await import("../src/app")
const app = createApp()

describe("health", () => {
  test("GET /healthz trả 200 {status:ok} kèm X-Request-Id", async () => {
    const res = await app.request("/healthz")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok" })
    expect(res.headers.get("x-request-id")).toBeTruthy()
  })

  test("route lạ trả 404 {message}", async () => {
    const res = await app.request("/khong-ton-tai")

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ message: "Không tìm thấy" })
  })
})

/**
 * `onError` là nơi duy nhất quyết định shape lỗi (D6) — kiểm trực tiếp bằng
 * route dò gắn vào app riêng của test (không thêm route vào production).
 */
describe("onError", () => {
  test("lỗi không lường trước → 500 {message, code}, giữ X-Request-Id, không lộ stack", async () => {
    // App mới + route dò gắn TRƯỚC request đầu tiên (Hono chốt matcher sau request).
    const probe = createApp()
    probe.get("/__probe/boom", () => {
      throw new Error("chi tiết nội bộ không được ra ngoài")
    })

    const res = await probe.request("/__probe/boom")
    expect(res.status).toBe(500)
    const body = (await res.json()) as { message: string; code: string }
    expect(body.code).toBe("INTERNAL")
    expect(body.message).not.toContain("chi tiết nội bộ")
    expect(res.headers.get("x-request-id")).toBeTruthy()
  })
})
