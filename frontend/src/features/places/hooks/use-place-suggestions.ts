import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getPlaceSuggestions } from "../api/get-place-suggestions"

export function usePlaceSuggestions(caption: string) {
  const trimmed = caption.trim()

  return useQuery({
    queryKey: ["place-suggestions", trimmed],
    queryFn: ({ signal }) => getPlaceSuggestions(trimmed, signal),
    enabled: trimmed.length >= 8,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}
