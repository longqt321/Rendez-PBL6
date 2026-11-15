import { api } from "@/lib/axios"
import { getAnonId } from "@/lib/events"
import type { Page } from "@/types/api"
import type { Place } from "../types/place"

export async function getRecommendedPlaces(limit = 6, signal?: AbortSignal): Promise<Place[]> {
  try {
    const anonId = getAnonId()
    const { data } = await api.get<Page<Place>>("/places/recommended", {
      params: anonId === undefined ? { limit } : { limit, anonId },
      signal,
    })
    return data.items
  } catch {
    // 404 (endpoint chưa có), 401 hay lỗi mạng đều coi là "chưa có gợi ý".
    return []
  }
}
