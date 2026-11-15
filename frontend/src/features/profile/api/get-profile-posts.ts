import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { Post } from "@/features/social/types/post"
import type { ProfileTab } from "../types/profile"

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
