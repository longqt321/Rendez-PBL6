import { api } from "@/lib/axios"
import type { Post } from "@/features/social/types/post"

export async function seedPosts(count: number, captionPrefix = "Bài test"): Promise<Post[]> {
  const results = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      api.post<Post>("/posts", { caption: `${captionPrefix} ${index + 1}` }).then((r) => r.data),
    ),
  )
  return results
}
