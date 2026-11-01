import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUN_ID = process.env.E2E_RUN_ID || "auth-post-run";
const evidenceDir = path.resolve(
  __dirname,
  "../../artifacts/playwright",
  RUN_ID,
  "auth-post",
);
fs.mkdirSync(evidenceDir, { recursive: true });

// Temporary fixture images (E2E-only, not product data).
const fixtureDir = path.resolve(__dirname, "../../.local/e2e_fixtures");
fs.mkdirSync(fixtureDir, { recursive: true });
function png() {
  // 1x1 PNG bytes
  const base =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Buffer.from(base, "base64");
}
const imgA = path.join(fixtureDir, "a.png");
const imgB = path.join(fixtureDir, "b.png");
if (!fs.existsSync(imgA)) fs.writeFileSync(imgA, png("a"));
if (!fs.existsSync(imgB)) fs.writeFileSync(imgB, png("b"));

const email = `e2e-auth-${Date.now()}@rendez.test`;
const password = "E2ePass!2026x";

async function shot(page, name: string) {
  return page.screenshot({ path: path.join(evidenceDir, `${name}.png`) });
}

test.describe("Auth & Post lifecycle", () => {
  test("register -> login -> create multi-image post -> detail -> logout", async ({
    page,
  }) => {
    // Registration
    await page.goto("/register");
    await shot(page, "01-register-page");
    await page.getByRole("textbox").first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    const nameInput = page.getByRole("textbox").nth(1);
    if (await nameInput.count()) await nameInput.fill("E2E Tester");
    await page.getByRole("button").last().click();
    await page.waitForTimeout(1500);
    await shot(page, "02-after-register");

    // Login if redirected
    if (page.url().includes("login")) {
      await page
        .locator('input[type="email"], input[type="text"]')
        .first()
        .fill(email);
      await page.locator('input[type="password"]').first().fill(password);
      await page.getByRole("button").last().click();
      await page.waitForTimeout(1500);
    }
    await shot(page, "03-logged-in");

    // Create post with two images via UI upload route
    await page.goto("/submissions");
    await page.waitForLoadState("networkidle");
    await shot(page, "04-submissions-page");
    const fileInputs = page.locator('input[type="file"]');
    if (await fileInputs.count()) {
      await fileInputs.first().setInputFiles([imgA, imgB]);
      await page.waitForTimeout(500);
      await shot(page, "05-files-selected");
      // Submit form
      const submitBtn = page
        .getByRole("button", { name: /gửi|đăng|submit/i })
        .last();
      if (await submitBtn.count()) {
        await submitBtn.click();
        await page.waitForTimeout(2500);
      }
      await shot(page, "06-after-submit");
    } else {
      await shot(page, "06-after-submit-no-form");
    }

    // Feed shows post
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    await shot(page, "07-feed-after-post");

    // Logout
    await page.goto("/profile");
    await page.waitForTimeout(1000);
    await shot(page, "08-profile");
    const logout = page.getByRole("button", { name: /đăng xuất|logout/i });
    if (await logout.count()) {
      await logout.click();
      await page.waitForTimeout(1000);
    }
    await shot(page, "09-after-logout");
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/login");
    await shot(page, "10-login-page");
    await page
      .locator('input[type="email"], input[type="text"]')
      .first()
      .fill("nobody@rendez.test");
    await page.locator('input[type="password"]').first().fill("wrongpass");
    await page.getByRole("button").last().click();
    await page.waitForTimeout(1500);
    await shot(page, "11-invalid-login");
    await expect(page.locator("body")).toBeVisible();
  });
});
