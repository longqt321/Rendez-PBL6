import { useQuery } from "@tanstack/react-query"
import { getPost } from "../api/get-post"

export function postQueryKey(postId: string) {
  return ["posts", "detail", postId] as const
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: postQueryKey(postId),
    queryFn: ({ signal }) => getPost(postId, signal),
    enabled: postId.length > 0,
  })
}
