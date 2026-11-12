import { useQuery } from "@tanstack/react-query"
import { useMe } from "@/features/profile/hooks/use-me"
import { getUserSuggestions } from "../api/get-user-suggestions"

/** Key gọn dưới prefix `["users"]` — `useSetFollow` invalidate theo prefix này. */
export function userSuggestionsQueryKey() {
  return ["users", "suggestions"] as const
}

/**
 * Gợi ý người nên theo dõi — chỉ gọi khi đã đăng nhập.
 *
 * Không nhét `me?.id` vào key: dữ liệu đã `no-store` nên không thể ăn cache chéo
 * giữa các tài khoản, còn key gọn để invalidate theo prefix `["users"]`.
 */
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
