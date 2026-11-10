import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Post } from "@/features/social/types/post"
import type { Place } from "../types/place"

/** `GET /places/:id` — chi tiết địa điểm (server chỉ trả địa điểm đã publish). */
export async function getPlace(id: string, signal?: AbortSignal): Promise<Place> {
  const { data } = await api.get<Place>(`/places/${id}`, { signal })
  return data
}

/** `GET /places/:id/posts` — bài đăng gắn địa điểm, do server lọc. */
export async function getPlacePosts(
  id: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Post>> {
  const { data } = await api.get<Page<Post>>(`/places/${id}/posts`, {
    params: { cursor: cursor ?? undefined },
    signal,
  })
  return data
}
