import type {
  AdminPlace,
  AdminReport,
  AdminReportStatus,
  AdminUser,
  AuditLogEntry,
  PlaceCategory,
  PlaceStatus,
  UserRole,
} from "@rendez/schema"
import { maskEmailForAdmin, maskIpForAdmin } from "../../lib/admin-privacy"
import { decodeCursor } from "../../lib/cursor"
import { toApiCategory, toApiReportReason } from "../../lib/enums"
import { ApiError } from "../../lib/errors"
import { clientIp } from "../../lib/rate-limit"

export const ADMIN_CONSTANTS = {
  PAGE_SIZE: 20,
  SEARCH_QUERY_MAX_LEN: 100,
  TREND_LOOKBACK_DAYS: 13,
  TREND_FILTER_WINDOW_DAYS: 15,
  OBSERVABILITY_RING_LIMIT: 300,
  OBSERVABILITY_RETURN_LIMIT: 100,
  OBSERVABILITY_TOP_ENDPOINTS: 15,
  OBSERVABILITY_BEHAVIOR_LIMIT: 12,
  OBSERVABILITY_SLOW_SQL_LIMIT: 10,
  OBSERVABILITY_SQL_PREVIEW_LEN: 240,
  WEB_VITALS_PERCENTILE: 0.75,
  CLS_DECIMAL_PLACES: 3,
} as const

export const REPORT_STATUS_FILTERS = new Set(["pending", "reviewed", "dismissed", "all"])
export const PLACE_VISIBILITY_FILTERS = new Set(["all", "published", "unpublished", "closed"])
export const PLACE_CATEGORY_FILTERS = new Set<PlaceCategory>([
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
])
export const USER_ROLE_FILTERS = new Set(["all", "user", "moderator", "admin"])
export const USER_STATUS_FILTERS = new Set(["all", "active", "banned"])

export function reqIp(c: {
  req: { raw: Request }
  env?: { remoteAddress?: string }
}): string | null {
  const ip = clientIp(c.req.raw.headers, c.env?.remoteAddress)
  return ip === "unknown" ? null : ip
}

export function parseAdminCursor(raw: string | undefined, pattern: RegExp) {
  if (!raw) return null
  const cursor = decodeCursor(raw, pattern)
  if (!cursor) throw new ApiError(400, "Cursor không hợp lệ")
  return cursor
}

export interface ReportRow {
  id: string
  place_id: string
  place_name: string
  place_published_at: Date | null
  place_status: string
  reporter_name: string
  reporter_handle: string
  reason: string
  detail: string | null
  status: string
  created_at: Date
  updated_at: Date
}

export function toAdminReportDto(row: ReportRow): AdminReport {
  return {
    id: row.id,
    placeId: row.place_id,
    placeName: row.place_name,
    placePublished: row.place_published_at !== null,
    placeStatus: row.place_status as PlaceStatus,
    reporterName: row.reporter_name,
    reporterHandle: row.reporter_handle,
    reason: toApiReportReason(row.reason),
    detail: row.detail,
    status: row.status as AdminReportStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export interface PlaceAdminRow {
  id: string
  name: string
  address: string
  district: string | null
  category: string
  price_level: number
  status: string
  lat: number | null
  lng: number | null
  published_at: Date | null
  moderation_status: string | null
  moderation_note: string | null
  moderated_at: Date | null
  review_count: number
  report_count: number
  created_at: Date
}

export function toAdminPlaceDto(row: PlaceAdminRow): AdminPlace {
  const level = row.price_level === 2 || row.price_level === 3 ? row.price_level : 1
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    district: row.district,
    category: toApiCategory(row.category),
    priceLevel: level,
    status: row.status as PlaceStatus,
    lat: row.lat,
    lng: row.lng,
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    moderationStatus: row.moderation_status,
    moderationNote: row.moderation_note,
    moderatedAt: row.moderated_at ? row.moderated_at.toISOString() : null,
    reviewCount: Number(row.review_count),
    reportCount: Number(row.report_count),
    createdAt: row.created_at.toISOString(),
  }
}

export interface UserAdminRow {
  id: string
  name: string
  handle: string
  email: string
  email_verified: boolean
  role: string
  banned_at: Date | null
  ban_reason: string | null
  post_count: number
  review_count: number
  created_at: Date
}

export function toAdminUserDto(row: UserAdminRow, maskPii: boolean): AdminUser {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    email: maskEmailForAdmin(row.email, maskPii),
    emailVerified: row.email_verified,
    role: row.role as UserRole,
    bannedAt: row.banned_at ? row.banned_at.toISOString() : null,
    banReason: row.ban_reason,
    postCount: Number(row.post_count),
    reviewCount: Number(row.review_count),
    createdAt: row.created_at.toISOString(),
  }
}

export interface AuditLogRow {
  id: string
  action: string
  entity: string
  entity_id: string | null
  meta: unknown
  ip: string | null
  created_at: Date
  actor_id: string | null
  actor_name: string | null
  actor_handle: string | null
  actor_role: string | null
}

export function toAuditLogDto(row: AuditLogRow, maskPii: boolean): AuditLogEntry {
  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {}
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    meta,
    ip: maskIpForAdmin(row.ip, maskPii),
    createdAt: row.created_at.toISOString(),
    actor:
      row.actor_id && row.actor_name && row.actor_handle && row.actor_role
        ? {
            id: row.actor_id,
            name: row.actor_name,
            handle: row.actor_handle,
            role: row.actor_role as UserRole,
          }
        : null,
  }
}
