import { api } from "@/lib/axios"
import type { UserProfile } from "../types/profile"

/** `GET /users/:handle` — hồ sơ công khai theo handle. */
export async function getProfile(handle: string): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(`/users/${handle}`)
  return data
}
