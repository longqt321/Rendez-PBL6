import type { UserRole } from "@rendez/schema"
import { differenceInHours, format, parseISO } from "date-fns"

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: "Thành viên",
  moderator: "Kiểm duyệt",
  admin: "Quản trị",
}

export function auditActionVariant(
  action: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("ban") && !action.includes("unban")) return "destructive"
  if (action.includes("unpublish") || action.includes("delete")) return "destructive"
  if (action.includes("publish") || action.includes("unban")) return "default"
  return "secondary"
}

/** Toàn bộ hằng số, ngưỡng cảnh báo và cấu hình hiển thị tập trung cho module Admin. */
export const ADMIN_UI = {
  DEBOUNCE_FAST_MS: 250,
  DEBOUNCE_SEARCH_MS: 300,
  MS_PER_MINUTE: 60_000,
  MINUTES_PER_HOUR: 60,
  PERCENT_SCALE: 100,

  OVERVIEW_SHORT_RANGE_DAYS: 7,
  OVERVIEW_RECENT_ITEMS_LIMIT: 5,

  REPORT_SLA_WARNING_HOURS: 24,
  REPORT_SLA_CRITICAL_HOURS: 72,
  MODERATION_NOTE_MAX_LEN: 300,
  PROD_MIN_REASON_LEN: 10,

  PLACE_NAME_MIN_LEN: 2,
  PLACE_NAME_MAX_LEN: 120,
  PLACE_ADDRESS_MIN_LEN: 2,
  PLACE_ADDRESS_MAX_LEN: 200,
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180,
  MAP_ZOOM_PINNED: 15,
  MAP_ZOOM_CITY: 13,

  OBSERVABILITY_TOP_ENDPOINTS: 8,
  OBSERVABILITY_TOP_WATERFALL: 8,
  OBSERVABILITY_WARN_P95_MS: 250,
  OBSERVABILITY_SLOW_P95_MS: 500,
  ROUTE_LABEL_MAX_LEN: 22,
  ROUTE_LABEL_SLICE_LEN: 20,
  TRACE_ID_PREVIEW_LEN: 8,

  AUDIT_META_PREVIEW_FIELDS: 3,

  PIE_INNER_RADIUS_LG: 52,
  PIE_OUTER_RADIUS_LG: 78,
  PIE_INNER_RADIUS_SM: 44,
  PIE_OUTER_RADIUS_SM: 68,
  PIE_PADDING_ANGLE: 2,
} as const

export const WEB_VITAL_META = {
  LCP: {
    label: "Tốc độ hiển thị trang",
    targetHint: "Dưới 2.500ms",
    good: 2500,
    poor: 4000,
    unit: "ms",
  },
  INP: {
    label: "Độ nhạy khi thao tác",
    targetHint: "Dưới 200ms",
    good: 200,
    poor: 500,
    unit: "ms",
  },
  CLS: {
    label: "Độ ổn định bố cục",
    targetHint: "Dưới 0,1",
    good: 0.1,
    poor: 0.25,
    unit: "",
  },
} as const

export const TIMING_STAGE_LABELS = {
  dbMs: "Đọc cơ sở dữ liệu",
  embedMs: "AI gợi ý & tìm kiếm",
  redisMs: "Bộ nhớ đệm",
  externalMs: "Dịch vụ bên ngoài",
  appMs: "Xử lý ứng dụng",
} as const

export type TimingStageKey = keyof typeof TIMING_STAGE_LABELS

export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
] as const

const API_ROUTE_LABELS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\/places\/recommended/i, label: "Gợi ý cá nhân hoá" },
  { pattern: /\/places\/daily-picks/i, label: "Gợi ý hôm nay" },
  { pattern: /\/places\/[^/]+\/reviews/i, label: "Đánh giá địa điểm" },
  { pattern: /\/places\/[^/]+\/reports/i, label: "Báo cáo địa điểm" },
  { pattern: /\/places\/[^/]+/i, label: "Chi tiết địa điểm" },
  { pattern: /\/places/i, label: "Tìm & danh sách quán" },
  { pattern: /\/posts/i, label: "Bảng tin cộng đồng" },
  { pattern: /\/rooms/i, label: "Đi cùng nhóm" },
  { pattern: /\/collections/i, label: "Bộ sưu tập" },
  { pattern: /\/notifications/i, label: "Thông báo" },
  { pattern: /\/users|\/me\/location|\/me/i, label: "Tài khoản & vị trí" },
  { pattern: /\/session|\/register|\/auth/i, label: "Đăng nhập & xác thực" },
  { pattern: /\/media/i, label: "Tải lên hình ảnh" },
  { pattern: /\/events/i, label: "Ghi nhận tương tác" },
  { pattern: /\/admin/i, label: "Trang quản trị" },
]

const BEHAVIOR_EVENT_LABELS: Record<string, string> = {
  place_view: "Xem địa điểm",
  place_detail_view: "Mở chi tiết quán",
  place_impression: "Hiển thị thẻ quán",
  place_save: "Lưu địa điểm",
  place_share: "Chia sẻ quán",
  search_query: "Tìm kiếm",
  filter_change: "Đổi bộ lọc",
  review_create: "Viết đánh giá",
  post_create: "Đăng bài viết",
  room_create: "Tạo phòng nhóm",
}

/** Chuyển đường dẫn API kỹ thuật sang tên chức năng dễ hiểu cho người vận hành. */
export function describeApiRoute(route?: string): string {
  if (!route) return "Khác"
  for (const entry of API_ROUTE_LABELS) {
    if (entry.pattern.test(route)) return entry.label
  }
  const cleaned = route.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, "").replace(/^\/api\/v1/, "")
  if (cleaned.length <= ADMIN_UI.ROUTE_LABEL_MAX_LEN) return cleaned || "Trang chủ"
  return `${cleaned.slice(0, ADMIN_UI.ROUTE_LABEL_SLICE_LEN)}…`
}

export function describeBehaviorEvent(eventType: string): string {
  return BEHAVIOR_EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ")
}

export function formatUptime(uptimeMs: number): string {
  const totalMinutes = Math.max(0, Math.round(uptimeMs / ADMIN_UI.MS_PER_MINUTE))
  if (totalMinutes < ADMIN_UI.MINUTES_PER_HOUR) return `${totalMinutes} phút`
  const hours = Math.floor(totalMinutes / ADMIN_UI.MINUTES_PER_HOUR)
  const mins = totalMinutes % ADMIN_UI.MINUTES_PER_HOUR
  return mins > 0 ? `${hours}g ${mins}p` : `${hours} giờ`
}

export interface TimingSnapshot {
  dbMs: number
  redisMs: number
  embedMs: number
  externalMs: number
  appMs: number
}

/** Tìm bước chiếm tỷ trọng thời gian lớn nhất trong 1 yêu cầu (hoặc tổng hợp nhiều yêu cầu). */
export function findDominantTimingStage(
  timing: TimingSnapshot,
): { key: TimingStageKey; label: string; ms: number; percent: number } | null {
  const entries = (Object.keys(TIMING_STAGE_LABELS) as TimingStageKey[]).map((key) => ({
    key,
    label: TIMING_STAGE_LABELS[key],
    ms: timing[key],
  }))
  const total = entries.reduce((sum, item) => sum + item.ms, 0)
  if (total <= 0) return null
  const top = entries.reduce((best, curr) => (curr.ms > best.ms ? curr : best))
  return {
    ...top,
    percent: Math.round((top.ms / total) * ADMIN_UI.PERCENT_SCALE),
  }
}

/** Định dạng ngày ngắn gọn `dd/MM` bằng `date-fns`. */
export function formatAdminShortDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "dd/MM")
  } catch {
    return isoDate
  }
}

/** Đánh giá mức khẩn cấp SLA của báo cáo dựa trên `date-fns/differenceInHours`. */
export function resolveReportSlaUrgency(
  status: string,
  createdAtIso: string,
): "critical" | "warning" | "normal" {
  if (status !== "pending") return "normal"
  const ageHours = differenceInHours(new Date(), parseISO(createdAtIso))
  if (ageHours >= ADMIN_UI.REPORT_SLA_CRITICAL_HOURS) return "critical"
  if (ageHours >= ADMIN_UI.REPORT_SLA_WARNING_HOURS) return "warning"
  return "normal"
}
