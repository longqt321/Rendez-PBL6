import { defineConfig, devices } from "@playwright/test"

/**
 * Cấu hình E2E Playwright (D-041).
 *
 * Hiện chỉ có project `mock` (mock bật mặc định ở dev). Khi backend thật sẵn sàng,
 * thêm project mới chỉ bằng env — ví dụ:
 *
 *   E2E_BACKEND_URL=http://localhost:8000 bun run e2e --project=backend
 *
 * mà không phải sửa file này (xem `E2E_BACKEND_URL` dưới).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5199"
const backendURL = process.env.E2E_BACKEND_URL

export default defineConfig({
  testDir: "./e2e",
  // Dev: không retry để thấy lỗi thật ngay.
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "vi-VN",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "mock",
      use: { ...devices["Desktop Chrome"] },
    },
    // Project backend chỉ tạo khi có env — backend chưa có nên để trống.
    ...(backendURL
      ? [
          {
            name: "backend",
            use: { ...devices["Desktop Chrome"], baseURL: backendURL },
          },
        ]
      : []),
  ],
})
