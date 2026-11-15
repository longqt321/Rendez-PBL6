import { api } from "@/lib/axios"
import type { UserProfile } from "../types/profile"

export async function getProfile(handle: string): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(`/users/${handle}`)
  return data
}
