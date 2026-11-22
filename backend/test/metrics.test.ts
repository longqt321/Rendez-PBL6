import { beforeEach, describe, expect, test } from "bun:test"
import { metricsSnapshot, recordAuthFailure, recordRequest, resetMetrics } from "../src/lib/metrics"

/**
 * Test thuần cho bộ đếm metrics — không DB, không HTTP. Mỗi test reset trước
 * để không phụ thuộc thứ tự chạy.
 */
describe("metrics", () => {
  beforeEach(() => {
    resetMetrics()
  })

  test("reset xoá sạch bộ đếm, snapshot rỗng", () => {
    recordRequest("GET /places", 10, false)
    resetMetrics()

    const snapshot = metricsSnapshot()
    expect(snapshot.totalQueries).toBe(0)
    expect(snapshot.avgLatencyMs).toBe(0)
    expect(snapshot.cacheHitRatio).toBe(0)
    expect(snapshot.byEndpoint).toEqual([])
  })

  test("cộng dồn count/tổng ms/cacheHits theo route", () => {
    recordRequest("GET /places", 10, false)
    recordRequest("GET /places", 30, false)
    recordRequest("GET /places/suggestions", 20, true)

    const snapshot = metricsSnapshot()
    expect(snapshot.totalQueries).toBe(3)
    // (10 + 30 + 20) / 3 = 20
    expect(snapshot.avgLatencyMs).toBe(20)
    // 1 hit / 3 request = 0.333
    expect(snapshot.cacheHitRatio).toBe(0.333)

    const places = snapshot.byEndpoint.find((entry) => entry.route === "GET /places")
    expect(places).toEqual({
      route: "GET /places",
      count: 2,
      avgMs: 20,
      p95Ms: 30,
      p99Ms: 30,
      cacheHits: 0,
      errorCount5xx: 0,
      errorRate5xx: 0,
    })

    const suggestions = snapshot.byEndpoint.find(
      (entry) => entry.route === "GET /places/suggestions",
    )
    expect(suggestions).toEqual({
      route: "GET /places/suggestions",
      count: 1,
      avgMs: 20,
      p95Ms: 20,
      p99Ms: 20,
      cacheHits: 1,
      errorCount5xx: 0,
      errorRate5xx: 0,
    })
  })

  test("đếm chính xác tỷ lệ lỗi 4xx/5xx và tín hiệu bảo mật 401/403/429", () => {
    recordRequest("GET /places", 15, false, 200)
    recordRequest("GET /places", 40, false, 500)
    recordRequest("POST /auth", 10, false, 401)
    recordRequest("GET /admin/users", 8, false, 403)
    recordRequest("POST /posts", 5, false, 429)
    recordAuthFailure()

    const snapshot = metricsSnapshot()
    expect(snapshot.errors5xx).toBe(1)
    expect(snapshot.errors4xx).toBe(3)
    expect(snapshot.errorRate5xx).toBe(0.2)
    expect(snapshot.security).toEqual({
      unauthorized401: 1,
      forbidden403: 1,
      rateLimited429: 1,
      authFailed: 1,
    })
    expect(snapshot.eventLoopLagMs).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(snapshot.circuitBreakers)).toBe(true)
    const places = snapshot.byEndpoint.find((entry) => entry.route === "GET /places")
    expect(places?.errorCount5xx).toBe(1)
    expect(places?.errorRate5xx).toBe(0.5)
  })

  test("byEndpoint sắp theo số request giảm dần", () => {
    recordRequest("GET /users", 5, false)
    recordRequest("GET /places", 5, false)
    recordRequest("GET /places", 5, false)

    const routes = metricsSnapshot().byEndpoint.map((entry) => entry.route)
    expect(routes).toEqual(["GET /places", "GET /users"])
  })

  test("uptimeMs là số không âm", () => {
    expect(metricsSnapshot().uptimeMs).toBeGreaterThanOrEqual(0)
  })
})
