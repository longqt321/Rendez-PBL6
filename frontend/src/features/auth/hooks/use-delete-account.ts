import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAccount } from "../api/session"

/**
 * Xoá tài khoản.
 *
 * Server xoá mềm + thu hồi mọi phiên; client xoá sạch cache để mọi trang đọc
 * `GET /me` về trạng thái chưa đăng nhập.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
