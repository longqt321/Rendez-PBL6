import { readFileSync } from "node:fs"

/**
 * Tài khoản dùng cho spec cần đăng nhập bằng form.
 *
 * - Project `mock`: tài khoản dev trong `src/mocks/server.ts`.
 * - Project `backend`: tài khoản demo do `global-setup.ts` tạo qua API thật và
 *   ghi ra `e2e/.auth/backend-account.json` (cùng lần chạy với storageState).
 *
 * Không hardcode mật khẩu backend trong spec: mỗi lần chạy là user mới.
 */
export interface E2eAccount {
  name: string
  email: string
  password: string
  handle: string
}

const MOCK_ACCOUNT: E2eAccount = {
  name: "Minh Anh",
  email: "me@rendez.test",
  password: "password123",
  handle: "minhanh",
}

export function e2eAccount(): E2eAccount {
  if (!process.env.E2E_BACKEND_URL) return MOCK_ACCOUNT
  const raw = readFileSync("e2e/.auth/backend-account.json", "utf8")
  return JSON.parse(raw) as E2eAccount
}
