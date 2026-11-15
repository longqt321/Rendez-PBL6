import { useQuery } from "@tanstack/react-query"
import { useMe } from "@/features/profile/hooks/use-me"
import { getUserSuggestions } from "../api/get-user-suggestions"

export function userSuggestionsQueryKey() {
  return ["users", "suggestions"] as const
}

export function useUserSuggestions() {
  const { data: me } = useMe()

  return useQuery({
    queryKey: userSuggestionsQueryKey(),
    queryFn: ({ signal }) => getUserSuggestions(signal),
    enabled: !!me,
    staleTime: 60_000,
    retry: 1,
  })
}
