import { useMutation, useQueryClient } from "@tanstack/react-query"
import { login } from "../api/session"

/**
 * Đăng nhập lại phiên mock ở dev.
 *
 * Ghi hồ sơ trả về vào cache `["me"]` — header và các trang đọc hồ sơ hiện ngay
 * mà không cần tải lại trang.
 */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => login(),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile)
      void queryClient.invalidateQueries()
    },
  })
}
