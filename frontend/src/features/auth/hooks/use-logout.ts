import { useMutation, useQueryClient } from "@tanstack/react-query"
import { logout } from "../api/session"

/**
 * Đăng xuất.
 *
 * Xoá toàn bộ cache sau khi server xác nhận: mọi query đang active đều refetch,
 * `GET /me` trả 401 nên các trang đọc hồ sơ về trạng thái chưa đăng nhập.
 */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
