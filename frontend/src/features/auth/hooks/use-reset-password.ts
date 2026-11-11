import { useMutation } from "@tanstack/react-query"
import { resetPassword, type ResetPasswordInput } from "../api/session"

/** Đặt lại mật khẩu bằng token trong link email. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  })
}
