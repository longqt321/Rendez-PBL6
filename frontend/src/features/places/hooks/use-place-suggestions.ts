import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getPlaceSuggestions } from "../api/get-place-suggestions"

/**
 * Gợi ý địa điểm theo nội dung bài đang soạn.
 *
 * Server tự quyết định thứ tự và số lượng gợi ý; hook này chỉ giữ request + cache.
 * `keepPreviousData` để danh sách không nhấp nháy khi người dùng gõ tiếp.
 */
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
