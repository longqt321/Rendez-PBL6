import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Guest user E2E flows. No authentication performed.
 * Evidence screenshots saved to artifacts/playwright/<runId>/guest/.
 */

const RUN_ID = process.env.E2E_RUN_ID || "local-run";
const evidenceDir = path.resolve(
  __dirname,
  "../../artifacts/playwright",
  RUN_ID,
  "guest",
);
fs.mkdirSync(evidenceDir, { recursive: true });

async function shot(page, name: string) {
  const file = path.join(evidenceDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

test.describe("Guest flows", () => {
  test("guest can browse feed, search, place, post and map", async ({
    page,
  }) => {
    await page.goto("/");
    await shot(page, "01-home");

    // Discover feed
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    await shot(page, "02-discover-feed");

    // Search keyword (Vietnamese with diacritics)
    const search = page.getByRole("textbox").first();
    if (await search.count()) {
      await search.fill("cà phê");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1500);
      await shot(page, "03-search-diacritics");
      await search.fill("ca phe");
      await page.waitForTimeout(1500);
      await shot(page, "04-search-ascii");
      await search.fill("");
    }

    // Map
    await page.goto("/map");
    await page.waitForLoadState("networkidle");
    await shot(page, "05-map");

    // Place detail via links on discover
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    const placeLink = page.locator('a[href*="/places/"]').first();
    if (await placeLink.count()) {
      await placeLink.click();
      await page.waitForLoadState("networkidle");
      await shot(page, "06-place-detail");
    }

    // Post detail via /photos/<id> legacy route
    const photoLink = page.locator('a[href*="/photos/"]').first();
    if (await photoLink.count()) {
      await photoLink.click();
      await page.waitForLoadState("networkidle");
      await shot(page, "07-post-detail");
      await page.goBack();
    }

    // Reload public page
    await page.reload();
    await shot(page, "08-reloaded");
  });

  test("guest mutation attempt requires login", async ({ page }) => {
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    // Guest should not see upload affordance; direct upload route redirects to login.
    await page.goto("/submissions");
    await page.waitForTimeout(1000);
    await shot(page, "09-guest-upload-redirect");
    const url = page.url();
    expect(url).not.toMatch(/submissions/);
  });
});
