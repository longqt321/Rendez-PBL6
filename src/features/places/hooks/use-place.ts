import { useQuery } from "@tanstack/react-query"
import { getPlace } from "../api/get-place-detail"

export function placeQueryKey(id: string) {
  return ["places", id] as const
}

/** Chi tiết một địa điểm. */
export function usePlace(id: string) {
  return useQuery({
    queryKey: placeQueryKey(id),
    queryFn: ({ signal }) => getPlace(id, signal),
  })
}
