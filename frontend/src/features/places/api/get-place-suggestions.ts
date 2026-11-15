import { api } from "@/lib/axios"
import type { PlaceSuggestion } from "../types/place"

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
