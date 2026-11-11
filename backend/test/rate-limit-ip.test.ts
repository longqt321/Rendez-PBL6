import { beforeAll, describe, expect, test } from "bun:test"

/**
 * Unit test `clientIp` (G4) — chống giả mạo `X-Forwarded-For`.
 *
 * `TRUSTED_PROXIES` được đọc một lần lúc import `env.ts`, nên phải đặt biến môi
 * trường TRƯỚC khi import module.
 */
let clientIp: typeof import("../src/lib/rate-limit").clientIp

beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://placeholder:placeholder@localhost:5432/placeholder"
  process.env.TRUSTED_PROXIES = "10.0.0.0/8,192.168.1.5"
  clientIp = (await import("../src/lib/rate-limit")).clientIp
})

function headers(init: Record<string, string>): Headers {
  return new Headers(init)
}

describe("clientIp", () => {
  test("không có remoteAddress (test gọi app.request) → dùng X-Forwarded-For", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7" }), undefined)).toBe("203.0.113.7")
  })

  test("remoteAddress không thuộc TRUSTED_PROXIES → bỏ qua X-Forwarded-For giả mạo", () => {
    expect(clientIp(headers({ "x-forwarded-for": "1.2.3.4" }), "203.0.113.9")).toBe("203.0.113.9")
  })

  test("remoteAddress trong dải CIDR tin cậy → lấy IP đầu của X-Forwarded-For", () => {
    expect(clientIp(headers({ "x-forwarded-for": "198.51.100.4, 10.1.2.3" }), "10.1.2.3")).toBe(
      "198.51.100.4",
    )
  })

  test("proxy khai chính xác (không CIDR) cũng được tin", () => {
    expect(clientIp(headers({ "x-forwarded-for": "198.51.100.9" }), "192.168.1.5")).toBe(
      "198.51.100.9",
    )
  })

  test("không có header nào → unknown", () => {
    expect(clientIp(headers({}), undefined)).toBe("unknown")
  })

  test("có X-Real-IP nhưng không có X-Forwarded-For → dùng X-Real-IP", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.11" }), undefined)).toBe("198.51.100.11")
  })
})
