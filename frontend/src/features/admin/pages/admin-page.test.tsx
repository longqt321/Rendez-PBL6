import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminPage } from "./admin-page"

const authState = vi.hoisted((): { role: "admin" | "moderator" } => ({
  role: "admin",
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
      role: authState.role,
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
    },
    isPending: false,
    isError: false,
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
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("AdminPage", () => {
  beforeEach(() => {
    authState.role = "admin"
  })

  it("admin thấy đầy đủ 6 mục điều hướng và số liệu tổng quan", () => {
    renderAdmin()

    expect(
      screen.getByRole("heading", { level: 1, name: /Trung tâm điều hành/u }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Tổng quan/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Báo cáo/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Địa điểm/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Người dùng/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Hiệu suất & Log/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Nhật ký kiểm toán/u }).length).toBeGreaterThan(0)
    expect(screen.getByText("340")).toBeInTheDocument()
  })

  it("moderator không thấy mục Người dùng và Hiệu suất & Log", () => {
    authState.role = "moderator"
    renderAdmin()

    expect(screen.getAllByRole("button", { name: /Tổng quan/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Báo cáo/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Địa điểm/u }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Nhật ký kiểm toán/u }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /Người dùng/u })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Hiệu suất & Log/u })).not.toBeInTheDocument()
  })
})
