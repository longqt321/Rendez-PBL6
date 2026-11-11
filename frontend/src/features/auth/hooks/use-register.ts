import { useMutation, useQueryClient } from "@tanstack/react-query"
import { register, type RegisterInput } from "../api/session"

/**
 * Đăng ký tài khoản.
 *
 * Backend trả 201 kèm Set-Cookie (autoSignIn) nên sau khi thành công người dùng
 * đã đăng nhập: ghi hồ sơ vào cache `["me"]` và nạp lại dữ liệu liên quan.
 */
export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile)
      void queryClient.invalidateQueries()
    },
  })
}
