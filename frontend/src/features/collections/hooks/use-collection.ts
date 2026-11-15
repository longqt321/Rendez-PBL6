import { useQuery } from "@tanstack/react-query"
import { getCollection, getCollections, getUserCollections } from "../api/collections"
import { collectionsQueryKey, userCollectionsQueryKey } from "./use-collections"

export function useCollections(params?: { placeId?: string }) {
  return useQuery({
    queryKey: collectionsQueryKey(params?.placeId),
    queryFn: () => getCollections(params),
  })
}

export function useUserCollections(handle: string) {
  return useQuery({
    queryKey: userCollectionsQueryKey(handle),
    queryFn: () => getUserCollections(handle),
    enabled: handle.length > 0,
  })
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => getCollection(id),
    enabled: id.length > 0,
    placeholderData: (previous) => previous,
  })
}
