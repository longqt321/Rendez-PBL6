/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

/** Route tĩnh của SPA — route động sinh theo dữ liệu nên không liệt kê. */
const STATIC_ROUTES = ["", "/discover", "/map", "/login", "/register"]

/**
 * Thay token `__APP_ORIGIN__` trong index.html và sinh `robots.txt` + `sitemap.xml`
 * theo origin thật lúc build. Trước đây domain bị hardcode `rendez.example` nên
 * prod công bố canonical/sitemap sai (audit M-04).
 *
 * Dùng token riêng thay vì cú pháp `%VITE_APP_ORIGIN%` của Vite: khi biến rỗng,
 * Vite để nguyên chuỗi `%…%` rồi cố resolve nó như đường dẫn asset → build chết
 * (`EISDIR`). Token riêng do plugin tự thay nên rỗng vẫn ra URL tương đối.
 */
function seoOriginPlugin(origin: string): Plugin {
  const escapeXml = (value: string) =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

  return {
    name: "rendez-seo-origin",
    // Dev cũng thay để HTML dev có canonical/og đúng origin đang chạy.
    transformIndexHtml(html) {
      return html.replaceAll("__APP_ORIGIN__", origin)
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
      })
      const urls = STATIC_ROUTES.map((route) => {
        const loc = escapeXml(origin + route)
        return `  <url><loc>${loc}</loc></url>`
      }).join("\n")
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
  let appOrigin = env.VITE_APP_ORIGIN || "http://localhost:5173"
  while (appOrigin.endsWith("/")) {
    appOrigin = appOrigin.slice(0, -1)
  }

  const isTest = mode === "test"

  return {
    plugins: [
      react(),
      tailwindcss(),
      seoOriginPlugin(appOrigin),
      ...(isTest
        ? []
        : [
            VitePWA({
              registerType: "autoUpdate",
              manifest: false,
              workbox: {
                globPatterns: ["**/*.{js,css,html,svg,woff2}"],
                // Không precache toàn bộ ảnh cold-start để tránh phình SW; cache lúc runtime
                globIgnores: ["**/data/cold-start/**"],
                runtimeCaching: [
                  {
                    urlPattern: /^\/api\/v1\/tiles\/.*/i,
                    handler: "CacheFirst",
                    options: {
                      cacheName: "rendez-map-tiles-cache",
                      expiration: {
                        maxEntries: 2000,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                      },
                      cacheableResponse: {
                        statuses: [0, 200],
                      },
                    },
                  },
                  {
                    urlPattern:
                      /^https:\/\/[abcd]\.(tile\.openstreetmap\.org|basemaps\.cartocdn\.com)\/.*/i,
                    handler: "CacheFirst",
                    options: {
                      cacheName: "external-map-tiles-cache",
                      expiration: {
                        maxEntries: 2000,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                      },
                      cacheableResponse: {
                        statuses: [0, 200],
                      },
                    },
                  },
                ],
              },
            }),
          ]),
    ],
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
