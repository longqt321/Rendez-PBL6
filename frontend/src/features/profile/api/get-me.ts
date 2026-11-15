import { api } from "@/lib/axios"
import type { UserProfile } from "../types/profile"

export async function getMe(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>("/me")
  return data
}
