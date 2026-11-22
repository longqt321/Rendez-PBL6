import type { PlaceReportReason } from "../types/place-report"

interface ReportReasonMeta {
  label: string
  description: string
}

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
  outdated_menu: {
    label: "Bảng giá đã cũ",
    description: "Giá hoặc thực đơn thực tế tại quán đã thay đổi.",
  },
  wrong_image: {
    label: "Ảnh gắn nhầm quán",
    description: "Ảnh món ăn hoặc không gian không thuộc địa điểm này.",
  },
  other: {
    label: "Lý do khác",
    description: "Mô tả cụ thể ở phần ghi chú bên dưới.",
  },
}
