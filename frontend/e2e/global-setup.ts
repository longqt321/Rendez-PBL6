import { mkdirSync, writeFileSync } from "node:fs"
import { request } from "@playwright/test"

/**
 * Chuẩn bị phiên đăng nhập cho project `backend`.
 *
 * Chỉ chạy khi có `E2E_BACKEND_URL` (project mock không cần). Tạo tài khoản demo
 * qua API thật rồi đăng nhập, lưu cookie phiên vào `e2e/.auth/backend.json` để
 * mọi spec chạy với trạng thái đã đăng nhập — đúng như mock tự bật phiên ở dev.
 *
 * Cookie của better-auth gắn theo host (không theo port), nên đăng nhập thẳng
 * vào API `:8000` vẫn dùng được cho app dev ở `:5199`.
 */
// Hậu tố theo thời điểm chạy: mỗi lần chạy là một user mới, tránh dữ liệu tồn
// tại từ lần trước (ví dụ báo cáo trùng địa điểm + lý do) làm spec fail oan.
const RUN_SUFFIX = Date.now().toString(36)

const DEMO_USER = {
  name: "Minh Anh",
  email: `demo-${RUN_SUFFIX}@rendez.local`,
  password: "rendez-demo-123",
  handle: `minhanh${RUN_SUFFIX}`,
}

export default async function globalSetup(): Promise<void> {
  const backendURL = process.env.E2E_BACKEND_URL
  if (!backendURL) return

  const context = await request.newContext({ baseURL: backendURL })
  try {
    const register = await context.post("/api/v1/register", { data: DEMO_USER })
    // 409 = tài khoản demo đã tồn tại từ lần chạy trước — không phải lỗi.
    if (!register.ok() && register.status() !== 409) {
      throw new Error(`Không tạo được tài khoản e2e: ${register.status()} ${await register.text()}`)
    }

    const login = await context.post("/api/v1/session", {
      data: { email: DEMO_USER.email, password: DEMO_USER.password },
    })
    if (!login.ok()) {
      throw new Error(`Không đăng nhập được tài khoản e2e: ${login.status()} ${await login.text()}`)
    }

    mkdirSync("e2e/.auth", { recursive: true })
    await context.storageState({ path: "e2e/.auth/backend.json" })
    // Spec đăng nhập bằng form (auth/logout) đọc tài khoản này thay vì
    // hardcode mật khẩu mock — mỗi lần chạy là user mới.
    writeFileSync("e2e/.auth/backend-account.json", JSON.stringify(DEMO_USER))
  } finally {
    await context.dispose()
  }
}
