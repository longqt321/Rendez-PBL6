import { api } from "@/lib/axios"
import type { Place } from "../types/place"

export async function getSimilarPlaces(placeId: string, signal?: AbortSignal): Promise<Place[]> {
  const { data } = await api.get<{ items: Place[] }>(`/places/${placeId}/similar`, { signal })
  return data.items
}
