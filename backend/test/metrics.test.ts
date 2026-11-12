import { beforeEach, describe, expect, test } from "bun:test"
import { metricsSnapshot, recordRequest, resetMetrics } from "../src/lib/metrics"

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
    expect(places).toEqual({ route: "GET /places", count: 2, avgMs: 20, cacheHits: 0 })

    const suggestions = snapshot.byEndpoint.find(
      (entry) => entry.route === "GET /places/suggestions",
    )
    expect(suggestions).toEqual({
      route: "GET /places/suggestions",
      count: 1,
      avgMs: 20,
      cacheHits: 1,
    })
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
