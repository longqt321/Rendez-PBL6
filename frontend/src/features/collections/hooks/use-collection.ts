import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getCollection,
  getCollections,
  getLikedCollections,
  getUserCollections,
  updateCollectionPlaceNote,
} from "../api/collections"
import { collectionsQueryKey, userCollectionsQueryKey } from "./use-collections"

export function useLikedCollections() {
  return useQuery({
    queryKey: ["collections", "liked"],
    queryFn: () => getLikedCollections(),
    placeholderData: keepPreviousData,
  })
}

export function useCollections(params?: { placeId?: string; enabled?: boolean }) {
  return useQuery({
    queryKey: collectionsQueryKey(params?.placeId),
    queryFn: () => getCollections(params?.placeId ? { placeId: params.placeId } : undefined),
    placeholderData: keepPreviousData,
    enabled: params?.enabled ?? true,
  })
}

export function useUserCollections(handle: string) {
  return useQuery({
    queryKey: userCollectionsQueryKey(handle),
    queryFn: () => getUserCollections(handle),
    placeholderData: keepPreviousData,
    enabled: handle.length > 0,
  })
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => getCollection(id),
    enabled: id.length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useUpdateCollectionPlaceNote(collectionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ placeId, note }: { placeId: string; note: string | null }) =>
      updateCollectionPlaceNote(collectionId, placeId, note),
    onSuccess: () => {
      toast.success("Đã lưu ghi chú địa điểm")
      void queryClient.invalidateQueries({ queryKey: ["collections", collectionId] })
    },
    onError: () => {
      toast.error("Không thể lưu ghi chú")
    },
  })
}
