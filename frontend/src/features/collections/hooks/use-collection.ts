import { useQuery } from "@tanstack/react-query"
import { getCollection, getCollections, getUserCollections } from "../api/collections"
import { collectionsQueryKey, userCollectionsQueryKey } from "./use-collections"

/** Danh sách rút gọn bộ sưu tập của tôi (tuỳ chọn kèm `placeId` để biết membership). */
export function useCollections(params?: { placeId?: string }) {
  return useQuery({
    queryKey: collectionsQueryKey(params?.placeId),
    queryFn: () => getCollections(params),
  })
}

/** Bộ sưu tập công khai của một người — tab "Bộ sưu tập" ở trang cá nhân. */
export function useUserCollections(handle: string) {
  return useQuery({
    queryKey: userCollectionsQueryKey(handle),
    queryFn: () => getUserCollections(handle),
    enabled: handle.length > 0,
  })
}

/** Chi tiết một bộ sưu tập (kèm `placeIds` theo thứ tự thêm). */
export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => getCollection(id),
    enabled: id.length > 0,
    placeholderData: (previous) => previous,
  })
}
