import { api } from "@/lib/axios"
import type { UserSuggestion } from "@rendez/schema"

/**
 * `GET /users/suggestions` — gợi ý người nên theo dõi (cần đăng nhập).
 *
 * Server trả tối đa 5 gợi ý kèm hồ sơ đầy đủ; rỗng là hợp lệ (đã follow hết /
 * corpus nghèo) — FE coi rỗng là thu gọn khối, không phải lỗi.
 */
export async function getUserSuggestions(signal?: AbortSignal): Promise<UserSuggestion[]> {
  const { data } = await api.get<{ items: UserSuggestion[] }>("/users/suggestions", { signal })
  return data.items
}
