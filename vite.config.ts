/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  // `loadEnv` đọc cả biến không có tiền tố VITE_ (cần cho proxy target ở dev).
  const env = loadEnv(mode, import.meta.dirname, "")
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8000"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      // Dev: trình duyệt gọi "/api/..." → Vite chuyển tiếp sang backend thật.
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      // Sourcemap "hidden": file .map vẫn sinh để upload lên dịch vụ lỗi sau này
      // nhưng không tham chiếu trong bundle → trình duyệt không tải/công khai mã nguồn.
      sourcemap: "hidden",
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  }
})
