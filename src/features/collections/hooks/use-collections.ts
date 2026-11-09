import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createCollection,
  deleteCollection,
  likeCollection,
  setCollectionPlace,
  unlikeCollection,
  updateCollection,
} from "../api/collections"
import type { CreateCollectionInput, UpdateCollectionInput } from "../api/collections"
import type { Collection, CollectionSummary } from "../types/collection"

/** Danh sách rút gọn của tôi — dùng ở tab Bộ sưu tập và menu "Lưu vào bộ sưu tập". */
export function collectionsQueryKey(placeId?: string) {
  return placeId ? (["collections", { placeId }] as const) : (["collections"] as const)
}

/** Bộ sưu tập công khai của một người — dùng ở tab Bộ sưu tập trang cá nhân. */
export function userCollectionsQueryKey(handle: string) {
  return ["users", handle, "collections"] as const
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

/**
 * Sửa tên / mô tả / trạng thái công khai.
 *
 * Server trả bản `Collection` đầy đủ nên cập nhật thẳng vào cache chi tiết, rồi
 * làm mới danh sách rút gọn (tên + badge Riêng tư thay đổi trên thẻ).
 */
export function useUpdateCollection(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCollectionInput) => updateCollection(id, input),
    onSuccess: (collection) => {
      queryClient.setQueryData<Collection>(["collections", collection.id], collection)
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey() })
      void queryClient.invalidateQueries({
        queryKey: userCollectionsQueryKey(collection.owner.handle),
      })
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
 * Server trả về bản `Collection` đầy đủ — client invalidate cả danh sách rút gọn
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
      // Thêm/bớt địa điểm khỏi bộ sưu tập đổi luôn tab "Địa điểm" ở /saved.
      void queryClient.invalidateQueries({ queryKey: ["places", "saved"] })
    },
  })
}

/**
 * Thả tim / bỏ thả tim bộ sưu tập.
 *
 * Optimistic trên cả chi tiết và danh sách rút gọn để số tim đổi ngay khi bấm;
 * rollback cả hai nếu server từ chối.
 */
export function useSetCollectionLike(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ liked }: { liked: boolean }) =>
      liked ? likeCollection(id) : unlikeCollection(id),
    onMutate: async ({ liked }) => {
      await queryClient.cancelQueries({ queryKey: ["collections", id] })
      const previousDetail = queryClient.getQueryData<Collection>(["collections", id])
      const previousList = queryClient.getQueryData<CollectionSummary[]>(collectionsQueryKey())

      const applyLike = <T extends { likeCount: number; likedByMe: boolean }>(item: T): T => ({
        ...item,
        likedByMe: liked,
        likeCount: item.likeCount + (liked ? 1 : -1),
      })

      if (previousDetail) {
        queryClient.setQueryData<Collection>(["collections", id], applyLike(previousDetail))
      }
      queryClient.setQueryData<CollectionSummary[]>(collectionsQueryKey(), (items) =>
        items?.map((item) => (item.id === id ? applyLike(item) : item)),
      )

      return { previousDetail, previousList }
    },
    onError: (_error, _vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(["collections", id], context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(collectionsQueryKey(), context.previousList)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections", id] })
    },
  })
}
