import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CreateAnchorInput, UpdateAnchorInput } from "@rendez/schema"
import {
  createAnchor,
  deleteAnchor,
  getLandmarks,
  getMyAnchors,
  getSyncedLocation,
  updateAnchor,
} from "../api/location-api"

export const LOCATION_QUERY_KEYS = {
  landmarks: ["landmarks"] as const,
  anchors: ["me", "anchors"] as const,
  syncedLocation: ["me", "synced-location"] as const,
}

export function useLandmarks() {
  return useQuery({
    queryKey: LOCATION_QUERY_KEYS.landmarks,
    queryFn: getLandmarks,
    staleTime: 10 * 60 * 1000,
  })
}

export function useMyAnchors(enabled: boolean) {
  return useQuery({
    queryKey: LOCATION_QUERY_KEYS.anchors,
    queryFn: getMyAnchors,
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useSyncedLocation(enabled: boolean) {
  return useQuery({
    queryKey: LOCATION_QUERY_KEYS.syncedLocation,
    queryFn: getSyncedLocation,
    enabled,
    staleTime: 10 * 1000,
    refetchInterval: enabled ? 15 * 1000 : false,
    refetchOnWindowFocus: "always",
  })
}

export function useCreateAnchor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAnchorInput) => createAnchor(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.anchors })
    },
  })
}

export function useUpdateAnchor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAnchorInput }) =>
      updateAnchor(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.anchors })
    },
  })
}

export function useDeleteAnchor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAnchor(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATION_QUERY_KEYS.anchors })
    },
  })
}
