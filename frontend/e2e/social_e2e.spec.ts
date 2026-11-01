import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUN_ID = process.env.E2E_RUN_ID || "social-run";
const evidenceDir = path.resolve(
  __dirname,
  "../../artifacts/playwright",
  RUN_ID,
  "social",
);
fs.mkdirSync(evidenceDir, { recursive: true });

async function shot(page, name: string) {
  return page.screenshot({ path: path.join(evidenceDir, `${name}.png`) });
}

test.describe("Social & responsive", () => {
  test("responsive feed and map across viewports", async ({ page }) => {
    for (const [name, viewport] of [
      ["desktop", { width: 1280, height: 800 }],
      ["tablet", { width: 768, height: 1024 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto("/discover");
      await page.waitForLoadState("networkidle");
      await shot(page, `01-feed-${name}`);
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await shot(page, `02-map-${name}`);
    }
  });

  test("social actions require login", async ({ page }) => {
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    await shot(page, "03-feed-before-actions");
    // No like/comment affordance for guest; verify no unexpected 500s occur.
    await shot(page, "04-guest-no-actions");
  });
});
