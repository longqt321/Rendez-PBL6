import { api } from "@/lib/axios"
import type { UpdateMeInput } from "../types/profile.schema"
import type { UserProfile } from "../types/profile"

export async function updateMe(input: UpdateMeInput): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>("/me", input)
  return data
}
