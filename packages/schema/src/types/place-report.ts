
export const PLACE_REPORT_REASONS = ["closed", "wrong-info", "duplicate", "other"] as const

export type PlaceReportReason = (typeof PLACE_REPORT_REASONS)[number]

export interface PlaceReport {
  id: string
  placeId: string
  reason: PlaceReportReason

  detail: string | null
  createdAt: string
}
