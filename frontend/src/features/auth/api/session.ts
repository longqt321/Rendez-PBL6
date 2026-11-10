import { api } from "@/lib/axios"
import type { UserProfile } from "@/features/profile/types/profile"

/**
 * `DELETE /session` — đăng xuất.
 *
 * Server xoá phiên hiện tại; client xoá cache và các trang đọc `GET /me` sẽ về
 * trạng thái chưa đăng nhập (401).
 */
export async function logout(): Promise<void> {
  await api.delete("/session")
}

/** `POST /session` — đăng nhập lại phiên mock ở dev. Server trả hồ sơ vừa đăng nhập. */
export async function login(): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>("/session")
  return data
}
