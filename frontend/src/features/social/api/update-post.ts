import { postSchema, type Post, type UpdatePostInput } from "@rendez/schema"
import { api } from "@/lib/axios"

export async function updatePost(postId: string, input: UpdatePostInput): Promise<Post> {
  const { data } = await api.patch<unknown>(`/posts/${postId}`, input)
  return postSchema.parse(data)
}
