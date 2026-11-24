import { useMutation } from "@tanstack/react-query"
import { changePassword, type ChangePasswordInput } from "../api/session"

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  })
}
