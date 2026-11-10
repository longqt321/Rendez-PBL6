import { api } from "@/lib/axios"
import type { UserProfile } from "../types/profile"

/** `GET /me` — hồ sơ người dùng đang đăng nhập (`isMe: true`). */
export async function getMe(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>("/me")
  return data
}
