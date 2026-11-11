import { useMutation } from "@tanstack/react-query"
import { sendVerificationEmail } from "../api/session"

/** Gửi lại mail xác thực email. Server luôn trả thành công (không lộ email tồn tại). */
export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: (email: string) => sendVerificationEmail(email),
  })
}
