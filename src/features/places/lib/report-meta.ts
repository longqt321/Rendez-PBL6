import type { PlaceReportReason } from "../types/place-report"

interface ReportReasonMeta {
  label: string
  description: string
}

/**
 * Nhãn hiển thị của từng lý do báo cáo.
 *
 * Chỉ chứa dữ liệu để hiển thị; danh sách lý do hợp lệ nằm ở
 * `PLACE_REPORT_REASONS` (types) để client và server dùng chung.
 */
export const REPORT_REASON_META: Record<PlaceReportReason, ReportReasonMeta> = {
  closed: {
    label: "Quán đã đóng cửa",
    description: "Đóng vĩnh viễn hoặc đã chuyển sang địa chỉ khác.",
  },
  "wrong-info": {
    label: "Thông tin sai",
    description: "Sai địa chỉ, sai tên quán hoặc sai loại hình.",
  },
  duplicate: {
    label: "Trùng địa điểm",
    description: "Quán này đã có ở một mục khác trên bản đồ.",
  },
  other: {
    label: "Lý do khác",
    description: "Mô tả cụ thể ở phần ghi chú bên dưới.",
  },
}

export function reportReasonLabel(reason: PlaceReportReason): string {
  return REPORT_REASON_META[reason].label
}
