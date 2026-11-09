import { useMutation } from "@tanstack/react-query"
import { createPlaceReport } from "../api/create-place-report"
import type { CreatePlaceReportInput } from "../api/create-place-report"

/**
 * Gửi báo cáo địa điểm (đóng cửa / sai thông tin / trùng / lý do khác).
 *
 * Báo cáo chưa làm thay đổi dữ liệu hiển thị — server xử lý ở hàng chờ kiểm
 * duyệt, nên không cần làm mới cache. Thông báo thành công do component đảm nhận.
 */
export function useCreatePlaceReport(placeId: string) {
  return useMutation({
    mutationFn: (input: CreatePlaceReportInput) => createPlaceReport(placeId, input),
  })
}
