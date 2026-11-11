import { api } from "@/lib/axios"
import { idempotencyHeaders } from "@/lib/idempotency"
import type { Page } from "@/types/api"
import type { Collection, CollectionSummary } from "../types/collection"

/** `GET /collections` — bộ sưu tập của người dùng hiện tại, mới tạo trước. */
export async function getCollections(params?: { placeId?: string }): Promise<CollectionSummary[]> {
  const { data } = await api.get<Page<CollectionSummary>>("/collections", { params })
  return data.items
}

/**
 * `GET /users/:handle/collections` — bộ sưu tập công khai của một người.
 *
 * Server lo việc ẩn bộ sưu tập riêng tư; client chỉ render đúng những gì nhận được.
 */
export async function getUserCollections(handle: string): Promise<CollectionSummary[]> {
  const { data } = await api.get<Page<CollectionSummary>>(`/users/${handle}/collections`)
  return data.items
}

export interface CreateCollectionInput {
  name: string
  description?: string
  isPrivate?: boolean
}

/** `POST /collections` — tạo bộ sưu tập rỗng. */
export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const { data } = await api.post<Collection>("/collections", input, {
    headers: idempotencyHeaders(),
  })
  return data
}

export interface UpdateCollectionInput {
  name?: string
  description?: string
  isPrivate?: boolean
}

/** `PATCH /collections/:id` — sửa tên, mô tả, trạng thái công khai (chỉ chủ sở hữu). */
export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
): Promise<Collection> {
  const { data } = await api.patch<Collection>(`/collections/${id}`, input)
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

/** `POST /collections/:id/like` — thả tim bộ sưu tập công khai. */
export async function likeCollection(id: string): Promise<Collection> {
  const { data } = await api.post<Collection>(`/collections/${id}/like`)
  return data
}

/** `DELETE /collections/:id/like` — bỏ thả tim. */
export async function unlikeCollection(id: string): Promise<Collection> {
  const { data } = await api.delete<Collection>(`/collections/${id}/like`)
  return data
}
