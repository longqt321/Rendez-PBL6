/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

/** Route tĩnh của SPA — route động sinh theo dữ liệu nên không liệt kê. */
const STATIC_ROUTES = ["", "/discover", "/map", "/login", "/register"]

/**
 * Thay `%VITE_APP_ORIGIN%` trong index.html và sinh `robots.txt` + `sitemap.xml`
 * theo origin thật lúc build. Trước đây domain bị hardcode `rendez.example` nên
 * prod công bố canonical/sitemap sai (audit M-04).
 */
function seoOriginPlugin(origin: string): Plugin {
  const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  return {
    name: "rendez-seo-origin",
    apply: "build",
    transformIndexHtml(html) {
      return html.replaceAll("%VITE_APP_ORIGIN%", origin)
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
      })
      const urls = STATIC_ROUTES.map(
        (route) => `  <url><loc>${escapeXml(`${origin}${route}`)}</loc></url>`,
      ).join("\n")
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<!-- Sinh lúc build từ VITE_APP_ORIGIN (frontend/vite.config.ts). -->\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // `loadEnv` đọc cả biến không có tiền tố VITE_ (cần cho proxy target ở dev).
  const env = loadEnv(mode, import.meta.dirname, "")
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8000"
  // Dev không cần domain thật; build prod phải đặt VITE_APP_ORIGIN.
  const appOrigin = (env.VITE_APP_ORIGIN || "http://localhost:5173").replace(/\/+$/, "")

  return {
    plugins: [react(), tailwindcss(), seoOriginPlugin(appOrigin)],
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
