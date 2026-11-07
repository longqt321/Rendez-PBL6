import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Post, PostFeedFilter } from "../types/post"

/**
 * `GET /posts?filter=...` — feed cộng đồng.
 *
 * Server quyết định bài nào thuộc bộ lọc nào; client chỉ gửi tham số.
 */
export async function getPosts(filter: PostFeedFilter, signal?: AbortSignal): Promise<Page<Post>> {
  const { data } = await api.get<Page<Post>>("/posts", {
    params: { filter },
    signal,
  })
  return data
}
