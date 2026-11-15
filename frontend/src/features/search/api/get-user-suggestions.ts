import { api } from "@/lib/axios"
import type { UserSuggestion } from "@rendez/schema"

export async function getUserSuggestions(signal?: AbortSignal): Promise<UserSuggestion[]> {
  const { data } = await api.get<{ items: UserSuggestion[] }>("/users/suggestions", { signal })
  return data.items
}
