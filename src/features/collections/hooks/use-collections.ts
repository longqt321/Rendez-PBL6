import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createCollection, deleteCollection, setCollectionPlace } from "../api/collections"
import type { CreateCollectionInput } from "../api/collections"
import type { Collection, CollectionSummary } from "../types/collection"

/** Danh sách rút gọn của tôi — dùng ở tab Bộ sưu tập và menu "Lưu vào bộ sưu tập". */
export function collectionsQueryKey(placeId?: string) {
  return placeId ? (["collections", { placeId }] as const) : (["collections"] as const)
}

export function useCreateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCollectionInput) => createCollection(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey() })
    },
  })
}

export function useDeleteCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<CollectionSummary[]>(collectionsQueryKey(), (items) =>
        items?.filter((item) => item.id !== id),
      )
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey() })
    },
  })
}

/**
 * Thêm/bớt địa điểm khỏi một bộ sưu tập.
 *
 * Server trả về bản `Collection` đầy đủ — clientinvalidate cả danh sách rút gọn
 * (đếm số địa điểm trên thẻ thay đổi) và chi tiết bộ sưu tập nếu đang mở.
 */
export function useSetCollectionPlace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, placeId, member }: { id: string; placeId: string; member: boolean }) =>
      setCollectionPlace(id, placeId, member),
    onSuccess: (collection) => {
      queryClient.setQueryData<Collection>(["collections", collection.id], collection)
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey() })
    },
  })
}
