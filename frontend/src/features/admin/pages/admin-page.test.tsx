import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AdminRuntimeEnv } from "@rendez/schema"
import { render, screen } from "@testing-library/react"
import { NuqsAdapter } from "nuqs/adapters/react-router/v8"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminPage } from "./admin-page"

const testState = vi.hoisted((): { role: "admin" | "moderator"; runtimeEnv: AdminRuntimeEnv } => ({
  role: "admin",
  runtimeEnv: "development",
}))

vi.mock("@/hooks/use-breakpoint", () => ({
  BREAKPOINTS: { md: "(min-width: 768px)", lg: "(min-width: 1024px)" },
  useIsDesktop: () => true,
  useIsMobile: () => false,
}))

vi.mock("@/features/profile/hooks/use-me", () => ({
  useMe: () => ({
    data: {
      id: "u-admin",
      name: "Admin Test",
      handle: "admin_test",
      initials: "AT",
      bio: "",
      location: "Đà Nẵng",
      joinedAt: "2026-10-01T00:00:00Z",
      privateProfile: false,
      followersCount: 0,
      followingCount: 0,
      postCount: 0,
      role: testState.role,
    },
    isPending: false,
    isError: false,
  }),
}))

vi.mock("../hooks/use-admin", () => ({
  useAdminOverview: () => ({
    data: {
      uptimeMs: 120_000,
      totalQueries: 50,
      avgLatencyMs: 14,
      cacheHitRatio: 0.72,
      byEndpoint: [],
      runtime: {
        env: testState.runtimeEnv,
        piiMasked: testState.runtimeEnv !== "development",
        redisConnected: true,
        mailConfigured: false,
        mediaStorage: "local",
        demoAutoVerifyEmail: true,
      },
      venues: {
        total: 358,
        published: 340,
        unpublished: 10,
        closed: 8,
        withImages: 300,
        withTags: 350,
        withHours: 290,
      },
      reports: { pending: 3, reviewed: 12, dismissed: 2, total: 17 },
      users: { total: 42, active: 40, banned: 2, admins: 1, moderators: 2 },
      activity: { auditLogs24h: 9, interactionEvents24h: 120 },
      trends14d: [
        { date: "2026-11-21", interactions: 80, reviews: 4, reports: 1, auditLogs: 3 },
        { date: "2026-11-22", interactions: 120, reviews: 6, reports: 2, auditLogs: 9 },
      ],
      venuesByCategory: [
        { category: "cafe", total: 140, published: 135 },
        { category: "restaurant", total: 120, published: 112 },
      ],
      venuesByDistrict: [
        { district: "Hải Châu", published: 150, unpublished: 4, closed: 2 },
        { district: "Sơn Trà", published: 100, unpublished: 3, closed: 1 },
      ],
      reportsByReason: [{ reason: "closed", pending: 2, total: 5 }],
    },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useAdminReports: () => ({
    data: { pages: [{ items: [], next: null }] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useAuditLogs: () => ({
    data: { pages: [{ items: [], next: null }] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useAdminPlaces: () => ({
    data: { pages: [{ items: [], next: null }] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useAdminUsers: () => ({
    data: { pages: [{ items: [], next: null }] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useAdminObservability: () => ({
    data: {
      latency: {
        uptimeMs: 120_000,
        totalQueries: 50,
        avgLatencyMs: 14,
        p50LatencyMs: 10,
        p95LatencyMs: 32,
        p99LatencyMs: 48,
        cacheHitRatio: 0.72,
        byEndpoint: [],
      },
      webVitals: [],
      slowSql: [],
      behavior24h: [],
      summary: { errorCount: 0, slowCount: 0 },
      events: [],
    },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useUpdateAdminReport: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdminPlace: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdminUser: () => ({ mutate: vi.fn(), isPending: false }),
  ADMIN_KEYS: { all: ["admin"] },
}))

function renderAdmin(initialEntry = "/admin") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <NuqsAdapter>
          <AdminPage />
        </NuqsAdapter>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("AdminPage", () => {
  beforeEach(() => {
    testState.role = "admin"
    testState.runtimeEnv = "development"
  })

  it("admin thấy đầy đủ 6 mục điều hướng, thẻ chẩn đoán Dev và số liệu tổng quan", () => {
    renderAdmin()

    expect(screen.getByText(/Trung tâm điều hành/u)).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Tổng quan/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Báo cáo/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Địa điểm/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Người dùng/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Hiệu suất & Quan sát/u }).length).toBeGreaterThan(
      0,
    )
    expect(screen.getAllByRole("button", { name: /Nhật ký kiểm toán/u }).length).toBeGreaterThan(0)
    expect(screen.getByText("340")).toBeInTheDocument()
    expect(screen.getByText(/DEV · Sandbox/u)).toBeInTheDocument()
    expect(screen.getByText(/Chẩn đoán Runtime/u)).toBeInTheDocument()
    expect(document.title).toContain("[DEV]")
  })

  it("moderator không thấy mục Người dùng và Hiệu suất & Quan sát", () => {
    testState.role = "moderator"
    renderAdmin()

    expect(screen.getAllByRole("button", { name: /Tổng quan/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Báo cáo/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Địa điểm/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Nhật ký kiểm toán/u }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /Người dùng/u })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Hiệu suất & Quan sát/u })).not.toBeInTheDocument()
  })

  it("môi trường production hiện banner cảnh báo đỏ và ẩn thẻ chẩn đoán Dev", () => {
    testState.runtimeEnv = "production"
    renderAdmin()

    expect(screen.getByText(/Dữ liệu người dùng thật/u)).toBeInTheDocument()
    expect(screen.queryByText(/Chẩn đoán Runtime/u)).not.toBeInTheDocument()
    expect(document.title).toContain("[PROD]")
  })
})
