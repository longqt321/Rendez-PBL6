import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Place } from "@/features/places/types/place"

export async function getSavedPlaces(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Place>> {
  const { data } = await api.get<Page<Place>>("/places/saved", {
    params: { cursor: cursor ?? undefined },
    signal,
  })
  return data
}
