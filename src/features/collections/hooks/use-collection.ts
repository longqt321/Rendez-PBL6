import { useQuery } from "@tanstack/react-query"
import { getCollection, getCollections } from "../api/collections"
import { collectionsQueryKey } from "./use-collections"

/** Danh sách rút gọn bộ sưu tập của tôi (tuỳ chọn kèm `placeId` để biết membership). */
export function useCollections(params?: { placeId?: string }) {
  return useQuery({
    queryKey: collectionsQueryKey(params?.placeId),
    queryFn: () => getCollections(params),
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
