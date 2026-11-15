import { api } from "@/lib/axios"
import { idempotencyHeaders } from "@/lib/idempotency"
import type { CreatePostInput, Post } from "../types/post"

export async function createPost(input: CreatePostInput): Promise<Post> {
  const { data } = await api.post<Post>("/posts", input, { headers: idempotencyHeaders() })
  return data
}
