import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { idempotencyHeaders } from "@/lib/idempotency"
import type { PlaceMediaItem, PlaceMediaKind } from "@rendez/schema"

export const placeMediaKeys = {
  byPlace: (placeId: string, kind?: PlaceMediaKind) =>
    ["place-media", placeId, kind ?? "all"] as const,
}

export function usePlaceMedia(placeId: string, kind?: PlaceMediaKind) {
  return useQuery({
    queryKey: placeMediaKeys.byPlace(placeId, kind),
    queryFn: async () => {
      const params = kind ? { kind } : undefined
      const { data } = await api.get<{ items: PlaceMediaItem[]; next: string | null }>(
        `/places/${placeId}/media`,
        { params },
      )
      return data.items
    },
    enabled: Boolean(placeId),
  })
}

export function useAddPlaceImages(placeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (images: Array<{ url: string; kind: PlaceMediaKind }>) => {
      const { data } = await api.post<{ items: PlaceMediaItem[] }>(
        `/places/${placeId}/images`,
        { images },
        { headers: idempotencyHeaders() },
      )
      return data.items
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["place-media", placeId] })
    },
  })
}
