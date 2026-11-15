import { useQuery } from "@tanstack/react-query"
import { getDailyPicks } from "../api/get-daily-picks"

export function useDailyPicks() {
  return useQuery({
    queryKey: ["daily-picks"],
    queryFn: ({ signal }) => getDailyPicks(signal),
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
