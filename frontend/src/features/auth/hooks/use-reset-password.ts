import { useMutation } from "@tanstack/react-query"
import { resetPassword, type ResetPasswordInput } from "../api/session"

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  })
}
