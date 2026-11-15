import { useMutation, useQueryClient } from "@tanstack/react-query"
import { login, type LoginInput } from "../api/session"

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
