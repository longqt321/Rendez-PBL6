import type {
  AdminOverview,
  AdminPlace,
  AdminReport,
  AdminReportStatus,
  AdminUser,
  AuditLogEntry,
  PlaceCategory,
  UpdateAdminPlaceInput,
  UpdateAdminReportInput,
  UpdateAdminUserInput,
  UserRole,
} from "@rendez/schema"
import { api } from "@/lib/axios"
import type { Page } from "@/types/api"

export type AdminReportStatusFilter = AdminReportStatus | "all"
export type AdminPlaceVisibilityFilter = "all" | "published" | "unpublished" | "closed"
export type AdminUserRoleFilter = UserRole | "all"
export type AdminUserStatusFilter = "all" | "active" | "banned"

export interface AdminReportsQuery {
  status?: AdminReportStatusFilter
  cursor?: string | null
}

export type AdminPlaceCategoryFilter = PlaceCategory | "all"

export interface AdminPlacesQuery {
  visibility?: AdminPlaceVisibilityFilter
  district?: string
  category?: AdminPlaceCategoryFilter
  q?: string
  cursor?: string | null
}

export interface AdminUsersQuery {
  role?: AdminUserRoleFilter
  status?: AdminUserStatusFilter
  q?: string
  cursor?: string | null
}

export interface AuditLogsQuery {
  entity?: string
  action?: string
  q?: string
  cursor?: string | null
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data } = await api.get<AdminOverview>("/admin/overview")
  return data
}

export async function getAdminReports(query: AdminReportsQuery = {}): Promise<Page<AdminReport>> {
  const { data } = await api.get<Page<AdminReport>>("/admin/reports", {
    params: {
      status: query.status ?? "pending",
      cursor: query.cursor ?? undefined,
    },
  })
  return data
}

export async function updateAdminReport(
  reportId: string,
  input: UpdateAdminReportInput,
): Promise<AdminReport> {
  const { data } = await api.patch<AdminReport>(
    `/admin/reports/${encodeURIComponent(reportId)}`,
    input,
  )
  return data
}

export async function getAdminPlaces(query: AdminPlacesQuery = {}): Promise<Page<AdminPlace>> {
  const { data } = await api.get<Page<AdminPlace>>("/admin/places", {
    params: {
      visibility: query.visibility ?? "all",
      district: query.district && query.district !== "all" ? query.district : undefined,
      category: query.category && query.category !== "all" ? query.category : undefined,
      q: query.q?.trim() ? query.q.trim() : undefined,
      cursor: query.cursor ?? undefined,
    },
  })
  return data
}

export async function updateAdminPlace(
  placeId: string,
  input: UpdateAdminPlaceInput,
): Promise<AdminPlace> {
  const { data } = await api.patch<AdminPlace>(
    `/admin/places/${encodeURIComponent(placeId)}`,
    input,
  )
  return data
}

export async function getAdminUsers(query: AdminUsersQuery = {}): Promise<Page<AdminUser>> {
  const { data } = await api.get<Page<AdminUser>>("/admin/users", {
    params: {
      role: query.role ?? "all",
      status: query.status ?? "all",
      q: query.q?.trim() ? query.q.trim() : undefined,
      cursor: query.cursor ?? undefined,
    },
  })
  return data
}

export async function updateAdminUser(
  userId: string,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}`, input)
  return data
}

export async function getAuditLogs(query: AuditLogsQuery = {}): Promise<Page<AuditLogEntry>> {
  const { data } = await api.get<Page<AuditLogEntry>>("/admin/audit-logs", {
    params: {
      entity: query.entity && query.entity !== "all" ? query.entity : undefined,
      action: query.action && query.action !== "all" ? query.action : undefined,
      q: query.q?.trim() ? query.q.trim() : undefined,
      cursor: query.cursor ?? undefined,
    },
  })
  return data
}

export type ObservabilityEventKind =
  "all" | "slow_request" | "server_error" | "client_error" | "web_vital"

export interface ObservabilityEventItem {
  id: string
  kind: Exclude<ObservabilityEventKind, "all">
  timestamp: string
  requestId?: string
  traceId?: string
  method?: string
  route?: string
  status?: number
  durationMs?: number
  timing?: {
    dbMs: number
    dbCount: number
    redisMs: number
    embedMs: number
    externalMs: number
    appMs: number
  }
  message?: string
  metric?: "LCP" | "INP" | "CLS" | "FCP" | "TTFB"
  value?: number
  rating?: "good" | "needs-improvement" | "poor"
  source?: string
}

export interface AdminObservability {
  latency: {
    uptimeMs: number
    totalQueries: number
    avgLatencyMs: number
    p50LatencyMs: number
    p95LatencyMs: number
    p99LatencyMs: number
    cacheHitRatio: number
    errors4xx?: number
    errors5xx?: number
    errorRate4xx?: number
    errorRate5xx?: number
    byEndpoint: {
      route: string
      count: number
      avgMs: number
      p95Ms: number
      p99Ms: number
      cacheHits: number
      errorCount5xx?: number
      errorRate5xx?: number
    }[]
  }
  security?: {
    unauthorized401: number
    forbidden403: number
    rateLimited429: number
  }
  infrastructure?: {
    dbPool: {
      total: number
      idle: number
      waiting: number
      max: number
    }
    memoryRssMb: number
    heapUsedMb: number
    heapTotalMb: number
    redisConnected: boolean
  }
  searchQuality24h?: {
    totalSearches: number
    zeroResultSearches: number
    zeroResultRate: number
    topZeroQueries: { query: string; count: number }[]
  }
  webVitals: {
    name: "LCP" | "INP" | "CLS"
    p75: number | null
    samples: number
    poor: number
    good: number
  }[]
  slowSql: {
    query: string
    calls: number
    meanMs: number
    totalMs: number
    rows: number
  }[]
  behavior24h: {
    eventType: string
    count: number
  }[]
  summary: {
    errorCount: number
    slowCount: number
  }
  events: ObservabilityEventItem[]
}

export async function getAdminObservability(query?: {
  kind?: ObservabilityEventKind
  q?: string
}): Promise<AdminObservability> {
  const { data } = await api.get<AdminObservability>("/admin/observability", {
    params: {
      kind: query?.kind && query.kind !== "all" ? query.kind : undefined,
      q: query?.q?.trim() ? query.q.trim() : undefined,
    },
  })
  return data
}
