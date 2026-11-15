import { useMutation } from "@tanstack/react-query"
import { register, type RegisterInput, type RegisterResult } from "../api/session"

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput): Promise<RegisterResult> => register(input),
  })
}
