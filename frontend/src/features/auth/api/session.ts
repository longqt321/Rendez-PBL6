import { api } from "@/lib/axios"
import type { UserProfile } from "@/features/profile/types/profile"

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

export interface RegisterResult {
  requiresVerification: true
}

export async function login(input: LoginInput): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>("/session", input)
  return data
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const { data } = await api.post<RegisterResult>("/register", input)
  return data
}

export async function sendVerificationEmail(email: string): Promise<void> {
  await api.post("/auth/send-verification-email", {
    email,
    callbackURL: `${window.location.origin}/verify-email?verified=1`,
  })
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
