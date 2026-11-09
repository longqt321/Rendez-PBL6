import { api } from "@/lib/axios"
import type { PlaceReport, PlaceReportReason } from "../types/place-report"

export interface CreatePlaceReportInput {
  reason: PlaceReportReason
  /** Bắt buộc khi `reason = "other"`; các lý do khác có thể bỏ trống. */
  detail?: string
}

/**
 * `POST /places/:id/reports` — gửi báo cáo về địa điểm cho kiểm duyệt viên.
 *
 * Mỗi người chỉ báo cáo một lý do một lần cho mỗi địa điểm; gửi lặp lại bị
 * server từ chối (400).
 */
export async function createPlaceReport(
  placeId: string,
  input: CreatePlaceReportInput,
): Promise<PlaceReport> {
  const { data } = await api.post<PlaceReport>(`/places/${placeId}/reports`, input)
  return data
}
