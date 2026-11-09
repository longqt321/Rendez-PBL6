import { api } from "@/lib/axios"
import type { UpdateMeInput } from "../types/profile.schema"
import type { UserProfile } from "../types/profile"

/** `PATCH /me` — cập nhật hồ sơ người dùng đang đăng nhập. Server trả hồ sơ đã lưu. */
export async function updateMe(input: UpdateMeInput): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>("/me", input)
  return data
}
