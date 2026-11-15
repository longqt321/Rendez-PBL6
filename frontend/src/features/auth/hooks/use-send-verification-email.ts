import { useMutation } from "@tanstack/react-query"
import { sendVerificationEmail } from "../api/session"

export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: (email: string) => sendVerificationEmail(email),
  })
}
