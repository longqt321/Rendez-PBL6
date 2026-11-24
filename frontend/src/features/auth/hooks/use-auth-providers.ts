import { useQuery } from "@tanstack/react-query"
import { getAuthProviders } from "../api/session"

export function useAuthProviders() {
  return useQuery({
    queryKey: ["auth", "providers"],
    queryFn: getAuthProviders,
    staleTime: 60_000,
  })
}
