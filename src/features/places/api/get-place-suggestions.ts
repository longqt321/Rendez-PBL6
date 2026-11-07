import { api } from "@/lib/axios"
import type { PlaceSuggestion } from "../types/place"

/**
 * `GET /places/suggestions?q=...` — gợi ý địa điểm cho nội dung đang soạn.
 *
 * Server tự quyết định thứ tự và số lượng; client render đúng thứ tự nhận được.
 */
export async function getPlaceSuggestions(
  caption: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const { data } = await api.get<{ suggestions: PlaceSuggestion[] }>("/places/suggestions", {
    params: { q: caption, limit: 3 },
    signal,
  })
  return data.suggestions
}
