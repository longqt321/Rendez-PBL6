import { api } from "@/lib/axios"
import type { Page } from "@/types/api"
import type { UserProfile } from "@/features/profile/types/profile"

/**
 * `GET /users?q=&cursor=` — tìm người dùng theo tên/handle.
 *
 * Server tự bỏ dấu + bỏ dấu câu khi khớp (`q` khớp không dấu), client chỉ gửi
 * tham số và chuyền lại `cursor` opaque của server.
 */
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
