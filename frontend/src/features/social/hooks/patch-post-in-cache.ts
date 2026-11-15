import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import type { Page } from "@/types/api"
import type { Post } from "../types/post"

export function patchPostInCache(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post,
): void {
  queryClient.setQueriesData<InfiniteData<Page<Post>> | Post>({ queryKey: ["posts"] }, (data) => {
    if (!data) return data
    if ("pages" in data) {
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((post) => (post.id === postId ? updater(post) : post)),
        })),
      }
    }
    return data.id === postId ? updater(data) : data
  })
}
