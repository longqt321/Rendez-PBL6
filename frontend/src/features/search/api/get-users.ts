import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { UserProfile } from "@/features/profile/types/profile"

export async function getUsers(
  q: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<UserProfile>> {
  const { data } = await api.get<Page<UserProfile>>("/users", {
    params: { q, cursor: cursor ?? undefined },
    signal,
  })
  return data
}
