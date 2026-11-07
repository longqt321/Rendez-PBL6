import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Collection, CollectionSummary } from "../types/collection"

/** `GET /collections` — bộ sưu tập của người dùng hiện tại, mới tạo trước. */
export async function getCollections(params?: { placeId?: string }): Promise<CollectionSummary[]> {
  const { data } = await api.get<Page<CollectionSummary>>("/collections", { params })
  return data.items
}

export interface CreateCollectionInput {
  name: string
  description?: string
  isPrivate?: boolean
}

/** `POST /collections` — tạo bộ sưu tập rỗng. */
export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const { data } = await api.post<Collection>("/collections", input)
  return data
}

/** `GET /collections/:id` — chi tiết bộ sưu tập (kèm thứ tự địa điểm). */
export async function getCollection(id: string): Promise<Collection> {
  const { data } = await api.get<Collection>(`/collections/${id}`)
  return data
}

/** `DELETE /collections/:id` — xoá bộ sưu tập (chỉ chủ sở hữu). */
export async function deleteCollection(id: string): Promise<void> {
  await api.delete(`/collections/${id}`)
}

/** `PATCH /collections/:id/places` — thêm (`member: true`) hoặc bớt địa điểm. */
export async function setCollectionPlace(
  id: string,
  placeId: string,
  member: boolean,
): Promise<Collection> {
  const { data } = await api.patch<Collection>(`/collections/${id}/places`, {
    placeId,
    member,
  })
  return data
}
