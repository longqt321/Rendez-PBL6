import type {
  NotificationType,
  ReportReason,
  RoomProposalField as PrismaProposalField,
} from "../../generated/prisma/client"
import type { NotificationKind } from "./notifications"
import type { PlaceCategory, PlaceReportReason, RoomProposalField } from "@rendez/schema"

/**
 * Quy đổi enum giữa API (gạch nối, khớp `@rendez/schema`) và Prisma (gạch dưới).
 *
 * MỘT NƠI DUY NHẤT: trước đây mỗi file tự viết `replace(/_/g,"-")` hoặc tệ hơn là
 * `as never` — sai với enum có `@map` (`wrong-info`, `priceMax`) và không ai phát hiện
 * cho tới khi gặp giá trị thật.
 */

/** `street_food` (Prisma) ↔ `street-food` (API) — bảng tường minh, không cast tự do. */
const CATEGORY_TO_PRISMA: Record<PlaceCategory, string> = {
  cafe: "cafe",
  restaurant: "restaurant",
  "street-food": "street_food",
  bakery: "bakery",
  dessert: "dessert",
  bar: "bar",
}

const CATEGORY_TO_API: Record<string, PlaceCategory> = {
  cafe: "cafe",
  restaurant: "restaurant",
  // DB lưu `street-food` (gạch nối, do `@map` của enum); nhận cả dạng gạch dưới
  // để không vỡ nếu có dữ liệu cũ ghi theo tên member TS.
  street_food: "street-food",
  "street-food": "street-food",
  bakery: "bakery",
  dessert: "dessert",
  bar: "bar",
}

export function toApiCategory(value: string): PlaceCategory {
  const mapped = CATEGORY_TO_API[value]
  if (!mapped) throw new Error(`Loại hình địa điểm không rõ: ${value}`)
  return mapped
}

/**
 * Đọc giá trị từ query string — nhận cả tên API lẫn tên Prisma; trả `null`
 * (thay vì throw) khi không phải loại hình đã biết để bộ lọc bỏ qua giá trị rác
 * thay vì 500 khi cast `::place_category` ở SQL thô.
 */
export function parseApiCategory(value: string): PlaceCategory | null {
  return CATEGORY_TO_API[value] ?? null
}

export function toPrismaCategory(value: PlaceCategory): string {
  return CATEGORY_TO_PRISMA[value]
}

/** API `wrong-info` ↔ Prisma `wrong_info` (DB lưu `wrong-info` qua `@map`). */
const REPORT_REASON_TO_PRISMA: Record<PlaceReportReason, ReportReason> = {
  closed: "closed",
  "wrong-info": "wrong_info",
  duplicate: "duplicate",
  other: "other",
}

export function toPrismaReportReason(reason: PlaceReportReason): ReportReason {
  return REPORT_REASON_TO_PRISMA[reason]
}

export function toApiReportReason(reason: ReportReason): PlaceReportReason {
  return reason.replace(/_/g, "-") as PlaceReportReason
}

/** API `place-suggestion` ↔ Prisma `place_suggestion`. */
const NOTIFICATION_TO_PRISMA: Record<NotificationKind, NotificationType> = {
  "place-suggestion": "place_suggestion",
  like: "like",
  comment: "comment",
  follow: "follow",
  system: "system",
}

export function toPrismaNotificationType(kind: NotificationKind): NotificationType {
  return NOTIFICATION_TO_PRISMA[kind]
}

/**
 * Giá trị DB → kind API. DB lưu `place-suggestion` (gạch nối, do `@map`) nên
 * chuẩn hoá về gạch dưới trước khi so khớp — nhận cả hai dạng cho an toàn.
 */
export function toApiNotificationType(value: string): NotificationKind {
  const normalized = value.replace(/-/g, "_")
  if (normalized === "place_suggestion") return "place-suggestion"
  if (
    normalized === "like" ||
    normalized === "comment" ||
    normalized === "follow" ||
    normalized === "system"
  ) {
    return normalized
  }
  throw new Error(`Loại thông báo không rõ: ${value}`)
}

/** API `priceMax` ↔ Prisma `price_max`. */
export function toPrismaProposalField(field: RoomProposalField): PrismaProposalField {
  return (field === "priceMax" ? "price_max" : field) as PrismaProposalField
}

export function toApiProposalField(field: PrismaProposalField): RoomProposalField {
  return (field === "price_max" ? "priceMax" : field) as RoomProposalField
}
