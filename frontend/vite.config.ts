import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
const backendTarget = process.env.BACKEND_PROXY_URL || "http://127.0.0.1:8000";

export default defineConfig({
  envDir: "..",
  plugins: [react(), tailwind()],
  server: {
    proxy: Object.fromEntries(
      [
        "/api",
        "/admin",
        "/static",
        "/public-photo-media",
        "/public-post-media",
        "/private-photo-media",
        "/private-photo-original",
      ].map((path) => [path, backendTarget]),
    ),
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendor libs so the entry chunk stays small and the
        // vendor chunk keeps its hash across app-only updates.
        manualChunks: {
          vendor: [
            "react",
            "react-dom",
            "react-router",
            "@tanstack/react-query",
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
