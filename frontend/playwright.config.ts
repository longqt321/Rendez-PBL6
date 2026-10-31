import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: [
    {
      command:
        "uv run --project ../backend python ../scripts/e2e_manager.py run-backend --port 8001",
      url: "http://127.0.0.1:8001/api/v1/auth/csrf/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command:
        "BACKEND_PROXY_URL=http://127.0.0.1:8001 node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});

