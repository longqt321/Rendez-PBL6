import { api } from "@/lib/axios"
import type { UserProfile } from "../types/profile"

/** `POST /users/:handle/follow` — theo dõi. */
export async function followUser(handle: string): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>(`/users/${handle}/follow`)
  return data
}

/** `DELETE /users/:handle/follow` — bỏ theo dõi. */
export async function unfollowUser(handle: string): Promise<UserProfile> {
  const { data } = await api.delete<UserProfile>(`/users/${handle}/follow`)
  return data
}
