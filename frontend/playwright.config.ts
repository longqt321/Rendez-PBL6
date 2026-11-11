import { defineConfig, devices } from "@playwright/test"

/**
 * Cấu hình E2E Playwright (D-041).
 *
 * Project `mock` chạy mặc định (mock in-memory bật ở dev). Khi backend thật
 * sẵn sàng, thêm project `backend` bằng env — không phải sửa file này:
 *
 *   E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend
 *
 * `E2E_BACKEND_URL` bật ba thứ: webServer chạy với `VITE_ENABLE_MOCKS=false`
 * (gọi API thật qua proxy Vite), `globalSetup` đăng nhập tài khoản demo, và
 * project `backend` dùng cookie phiên đó.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5199"
const backendURL = process.env.E2E_BACKEND_URL

export default defineConfig({
  testDir: "./e2e",
  // Dev: không retry để thấy lỗi thật ngay.
  retries: 0,
  reporter: [["list"]],
  globalSetup: backendURL ? "./e2e/global-setup.ts" : undefined,
  // Dọn tài khoản + bài kiểm thử khỏi DB dev sau khi chạy project backend.
  globalTeardown: backendURL ? "./e2e/global-teardown.ts" : undefined,
  use: {
    baseURL,
    locale: "vi-VN",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev --port 5199 --strictPort",
    url: baseURL,
    // Project mock tận dụng server đang chạy; project backend phải khởi động
    // server riêng với mock tắt — không dùng lại server mock đang chạy.
    reuseExistingServer: !backendURL,
    timeout: 60_000,
    env: backendURL ? { VITE_ENABLE_MOCKS: "false", VITE_PROXY_TARGET: backendURL } : {},
  },
  projects: [
    {
      name: "mock",
      use: { ...devices["Desktop Chrome"] },
    },
    // Project backend: app vẫn ở baseURL (5199), chỉ API trỏ về :8000 qua proxy.
    ...(backendURL
      ? [
          {
            name: "backend",
            use: {
              ...devices["Desktop Chrome"],
              storageState: "e2e/.auth/backend.json",
            },
            // FE đã có form đăng nhập email+password (G1) — mọi spec chạy được.
          },
        ]
      : []),
  ],
})
