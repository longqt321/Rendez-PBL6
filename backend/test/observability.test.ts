import { describe, expect, test } from "bun:test"
import { createApp } from "../src/app"
import {
  getRequestContext,
  parseTraceparent,
  recordDbTiming,
  recordEmbedTiming,
  recordRedisTiming,
  runWithRequestContext,
} from "../src/lib/request-context"

describe("request-context & telemetry", () => {
  test("parseTraceparent trích trace_id hợp lệ và loại bỏ chuỗi sai/toàn 0", () => {
    expect(parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")).toBe(
      "4bf92f3577b34da6a3ce929d0e0e4736",
    )
    expect(parseTraceparent("00-00000000000000000000000000000000-00f067aa0ba902b7-01")).toBeNull()
    expect(parseTraceparent("invalid-header")).toBeNull()
    expect(parseTraceparent(undefined)).toBeNull()
  })

  test("AsyncLocalStorage cô lập timing giữa các request chạy song song", async () => {
    const [a, b] = await Promise.all([
      runWithRequestContext(
        {
          requestId: "req-a",
          traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          dbMs: 0,
          dbCount: 0,
          redisMs: 0,
          embedMs: 0,
          externalMs: 0,
        },
        async () => {
          recordDbTiming(12)
          await Bun.sleep(10)
          recordRedisTiming(3)
          return getRequestContext()
        },
      ),
      runWithRequestContext(
        {
          requestId: "req-b",
          traceId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          dbMs: 0,
          dbCount: 0,
          redisMs: 0,
          embedMs: 0,
          externalMs: 0,
        },
        async () => {
          recordDbTiming(45)
          recordDbTiming(5)
          await Bun.sleep(5)
          recordEmbedTiming(20)
          return getRequestContext()
        },
      ),
    ])

    expect(a?.requestId).toBe("req-a")
    expect(a?.dbMs).toBe(12)
    expect(a?.dbCount).toBe(1)
    expect(a?.redisMs).toBe(3)
    expect(a?.embedMs).toBe(0)

    expect(b?.requestId).toBe("req-b")
    expect(b?.dbMs).toBe(50)
    expect(b?.dbCount).toBe(2)
    expect(b?.embedMs).toBe(20)
    expect(b?.redisMs).toBe(0)
  })

  test("createApp kế thừa X-Request-Id hợp lệ và nhận POST /api/v1/telemetry", async () => {
    const app = createApp()
    const healthRes = await app.request("/healthz", {
      headers: {
        "X-Request-Id": "client_req_123456",
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    })
    expect(healthRes.status).toBe(200)
    expect(healthRes.headers.get("X-Request-Id")).toBe("client_req_123456")

    const telemetryRes = await app.request("/api/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { kind: "error", message: "Test error", source: "react-boundary", route: "/discover" },
          { kind: "web-vital", name: "LCP", value: 1420.5, rating: "good", route: "/discover" },
        ],
      }),
    })
    expect(telemetryRes.status).toBe(202)
    expect(await telemetryRes.json()).toEqual({ accepted: 2 })

    const badRes = await app.request("/api/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    })
    expect(badRes.status).toBe(400)
  })
})
