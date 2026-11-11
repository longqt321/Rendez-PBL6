import { useMutation, useQueryClient } from "@tanstack/react-query"
import { login, type LoginInput } from "../api/session"

/**
 * Đăng nhập email + password.
 *
 * Ghi hồ sơ trả về vào cache `["me"]` — header và các trang đọc hồ sơ hiện ngay
 * mà không cần tải lại trang.
 */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile)
      void queryClient.invalidateQueries()
    },
  })
}
