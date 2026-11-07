import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Post } from "@/features/social/types/post"
import type { ProfileTab } from "../types/profile"

/**
 * `GET /users/:handle/posts?cursor=&tab=` — bài đăng của người dùng theo tab.
 *
 * Server lọc; client chỉ gửi tham số và chuyền lại `cursor` của server.
 */
export async function getProfilePosts(
  handle: string,
  tab: ProfileTab,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Post>> {
  const { data } = await api.get<Page<Post>>(`/users/${handle}/posts`, {
    params: { tab, cursor: cursor ?? undefined },
    signal,
  })
  return data
}
