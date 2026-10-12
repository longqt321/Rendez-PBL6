import { test, expect } from "@playwright/test";

test("direct internal URLs and API requests require login", async ({
  page,
}) => {
  for (const path of [
    "/discover",
    "/map?category=cafe",
    "/saved",
    "/profile",
    "/places/00000000-0000-0000-0000-000000000001",
    "/photos/00000000-0000-0000-0000-000000000001",
    "/submissions",
    "/submissions/new",
    "/contributions/new",
    "/unknown",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).toHaveCount(0);
  }
  for (const path of [
    "feed/",
    "categories/",
    "attributes/",
    "places/",
    "places/map/",
    "favorites/",
    "photo-submissions/",
  ]) {
    expect((await page.request.get("/api/v1/" + path)).status()).toBe(401);
  }
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Tạo tài khoản", exact: true }),
  ).toBeVisible();
});

test("password visibility uses an accessible eye button", async ({ page }) => {
  for (const path of ["/login", "/register"]) {
    await page.goto(path);
    const password = page.getByLabel("Mật khẩu", { exact: true });
    await password.fill("Test-password-914");
    const show = page.getByRole("button", {
      name: "Hiện mật khẩu",
      exact: true,
    });
    await expect(show).toHaveText("");
    await show.click();
    await expect(password).toHaveAttribute("type", "text");
    const hide = page.getByRole("button", { name: "Ẩn mật khẩu", exact: true });
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await hide.click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("Test-password-914");
  }
});
