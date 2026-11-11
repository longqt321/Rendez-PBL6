import { api } from "@/lib/axios"
import type { UserProfile } from "@/features/profile/types/profile"

/**
 * API xác thực (Phase G1 — vòng đời tài khoản).
 *
 * - `POST /session` — đăng nhập email + password, trả hồ sơ + Set-Cookie.
 * - `POST /register` — đăng ký, trả hồ sơ + Set-Cookie (201).
 * - `POST /auth/request-password-reset` — luôn trả `{status:true}` (không lộ
 *   email tồn tại); token reset được gửi qua email (dev: log ở backend).
 * - `POST /auth/reset-password` — đặt lại mật khẩu bằng token.
 * - `DELETE /me` — xoá tài khoản (xoá mềm ở backend) rồi đăng xuất.
 */

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  handle: string
}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export async function login(input: LoginInput): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>("/session", input)
  return data
}

export async function register(input: RegisterInput): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>("/register", input)
  return data
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/request-password-reset", {
    email,
    redirectTo: `${window.location.origin}/reset-password`,
  })
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await api.post("/auth/reset-password", input)
}

/** Xoá tài khoản — server xoá mềm + thu hồi phiên; client xoá cache. */
export async function deleteAccount(): Promise<void> {
  await api.delete("/me")
}

/** `DELETE /session` — đăng xuất. */
export async function logout(): Promise<void> {
  await api.delete("/session")
}
