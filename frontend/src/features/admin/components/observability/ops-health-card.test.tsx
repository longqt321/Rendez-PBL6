import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { AdminObservability } from "../../api/admin-api"
import { OpsHealthCard } from "./ops-health-card"
import { SystemHealthBanner } from "./system-health-banner"

function makeObservability(overrides: Partial<AdminObservability> = {}): AdminObservability {
  return {
    latency: {
      uptimeMs: 3600_000,
      totalQueries: 1000,
      avgLatencyMs: 45,
      p50LatencyMs: 30,
      p95LatencyMs: 120,
      p99LatencyMs: 210,
      cacheHitRatio: 0.72,
      errors4xx: 5,
      errors5xx: 0,
      errorRate4xx: 0.005,
      errorRate5xx: 0,
      byEndpoint: [],
    },
    security: {
      unauthorized401: 2,
      forbidden403: 1,
      rateLimited429: 0,
      authFailed: 0,
    },
    infrastructure: {
      dbPool: { total: 4, idle: 3, waiting: 0, max: 20 },
      queue: { active: true, queued: 0, failed: 0 },
      circuitBreakers: [
        { name: "embeddings", state: "closed", openCount: 0 },
        { name: "mailer", state: "closed", openCount: 0 },
      ],
      eventLoopLagMs: 4.2,
      memoryRssMb: 180,
      heapUsedMb: 90,
      heapTotalMb: 140,
      redisConnected: true,
    },
    searchQuality24h: {
      totalSearches: 100,
      zeroResultSearches: 5,
      zeroResultRate: 0.05,
      topZeroQueries: [],
    },
    webVitals: [],
    slowSql: [],
    behavior24h: [],
    summary: { errorCount: 0, slowCount: 0 },
    events: [],
    ...overrides,
  }
}

describe("Observability Production Health — Boundary Thresholds", () => {
  it("hiển thị trạng thái ổn định khi mọi chỉ số nằm trong ngưỡng an toàn", () => {
    const data = makeObservability()
    render(
      <>
        <SystemHealthBanner data={data} />
        <OpsHealthCard data={data} />
      </>,
    )

    expect(screen.getByText("Hệ thống hoạt động ổn định")).toBeInTheDocument()
    expect(screen.getByText("Tất cả bình thường")).toBeInTheDocument()
    expect(screen.getByText("0 chờ · 0 lỗi")).toBeInTheDocument()
    expect(screen.getByText("4.2 ms")).toBeInTheDocument()
  })

  it("bật cảnh báo nguy hiểm khi circuit breaker đang mở hoặc hàng đợi có job lỗi", () => {
    const base = makeObservability()
    const data = makeObservability({
      infrastructure: {
        ...base.infrastructure!,
        queue: { active: true, queued: 5, failed: 3 },
        circuitBreakers: [
          { name: "embeddings", state: "open", openCount: 2 },
          { name: "mailer", state: "closed", openCount: 0 },
        ],
      },
      security: {
        unauthorized401: 0,
        forbidden403: 0,
        rateLimited429: 4,
        authFailed: 12,
      },
      searchQuality24h: {
        totalSearches: 20,
        zeroResultSearches: 8,
        zeroResultRate: 0.4,
        topZeroQueries: [{ query: "món hiếm", count: 8 }],
      },
    })

    render(
      <>
        <SystemHealthBanner data={data} />
        <OpsHealthCard data={data} />
      </>,
    )

    expect(screen.getByText("Cần kiểm tra ngay")).toBeInTheDocument()
    expect(screen.getByText("1 đang ngắt")).toBeInTheDocument()
    expect(screen.getByText("5 chờ · 3 lỗi")).toBeInTheDocument()
    expect(screen.getByText("12 lượt")).toBeInTheDocument()
    expect(screen.getByText("món hiếm (8)")).toBeInTheDocument()
  })

  it("chuyển sang mức Cần theo dõi khi eventLoopLagMs >= 100ms dù chưa có lỗi 5xx", () => {
    const base = makeObservability()
    const data = makeObservability({
      infrastructure: {
        ...base.infrastructure!,
        eventLoopLagMs: 125.5,
      },
    })

    render(<SystemHealthBanner data={data} />)
    expect(screen.getByText("Cần theo dõi")).toBeInTheDocument()
  })
})
