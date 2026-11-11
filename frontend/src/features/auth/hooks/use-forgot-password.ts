import { useMutation } from "@tanstack/react-query"
import { requestPasswordReset } from "../api/session"

/** Gửi yêu cầu đặt lại mật khẩu. Server luôn trả thành công (không lộ email tồn tại). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  })
}
