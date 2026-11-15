import { useMutation } from "@tanstack/react-query"
import { requestPasswordReset } from "../api/session"

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  })
}
