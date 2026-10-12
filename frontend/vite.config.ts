import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
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
        "/private-photo-media",
        "/private-photo-original",
      ].map((path) => [path, "http://127.0.0.1:8000"]),
    ),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
