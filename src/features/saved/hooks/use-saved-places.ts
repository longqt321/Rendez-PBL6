import { useQuery } from "@tanstack/react-query"
import { getSavedPlaces } from "../api/get-saved-places"

export const savedPlacesQueryKey = ["places", "saved"] as const

/** Địa điểm đã lưu (nằm trong bộ sưu tập của tôi). */
export function useSavedPlaces() {
  return useQuery({
    queryKey: savedPlacesQueryKey,
    queryFn: ({ signal }) => getSavedPlaces(signal),
  })
}
