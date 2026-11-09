/**
 * Lý do báo cáo địa điểm — hợp đồng dùng chung giữa client và mock server.
 *
 * `PLACE_REPORT_REASONS` là nguồn duy nhất của danh sách lý do: form chọn từ
 * đây, server validate theo đây. Thêm lý do mới phải sửa cả hai nơi qua mảng này.
 */
export const PLACE_REPORT_REASONS = ["closed", "wrong-info", "duplicate", "other"] as const

export type PlaceReportReason = (typeof PLACE_REPORT_REASONS)[number]

/**
 * Báo cáo do người dùng gửi cho một địa điểm.
 *
 * Server ghi nhận để kiểm duyệt viên xử lý; client không cần đọc lại danh sách
 * báo cáo (không có endpoint GET) — chỉ cần biết đã gửi thành công.
 */
export interface PlaceReport {
  id: string
  placeId: string
  reason: PlaceReportReason
  /** Ghi chú thêm — bắt buộc khi `reason = "other"`, các lý do khác có thể null. */
  detail: string | null
  createdAt: string
}
