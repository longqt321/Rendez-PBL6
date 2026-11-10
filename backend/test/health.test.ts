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
