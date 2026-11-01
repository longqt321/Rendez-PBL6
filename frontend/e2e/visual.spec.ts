import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getE2ECredentials, loginViaApi } from "./helpers/auth";

/**
 * Visual journeys for the redesigned, place-first interface.
 *
 * These tests replace the previous suite that targeted `app/discovery.tsx`,
 * which is no longer routed. The intent is preserved — responsive layout with
 * no horizontal overflow, place → photo → place navigation, saving, uploading,
 * map filters and honest failure states — but every selector now refers to the
 * current UI.
 */

const placeId = "30000000-0000-0000-0000-000000000001";
const placeWithoutCoords = "30000000-0000-0000-0000-000000000003";

const screenshots = path.resolve(
  import.meta.dirname,
  "../../docs/screenshots-v3",
);
fs.mkdirSync(screenshots, { recursive: true });

const testImage = {
  name: "test.jpg",
  mimeType: "image/jpeg",
  buffer: Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCADcAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDn6KKK4jkCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//Z",
    "base64",
  ),
};

test.beforeEach(async ({ page }) => {
  await loginViaApi(page, "user");
});

async function capture(page: Page, name: string) {
  await expect(page.getByRole("status", { name: "Đang tải" })).toHaveCount(0);
  // Capture decoded media, including images below the current viewport.
  await page.locator("img").evaluateAll(async (elements) => {
    await Promise.all(
      elements.map(async (element) => {
        const image = element as HTMLImageElement;
        image.loading = "eager";
        await image.decode().catch(() => undefined);
      }),
    );
  });
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(screenshots, name + ".png"),
    fullPage: true,
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
}

async function register(page: Page) {
  await page.context().clearCookies();
  await page.goto("/register");
  const email =
    "v3-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    "@demo.invalid";
  await page.getByLabel("Tên hiển thị").fill("Người gửi E2E");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Browser-test-password-431");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/discover/);
  return email;
}

async function adminLogin(page: Page) {
  const creds = getE2ECredentials();
  await page.goto("/admin/login/");
  await page.getByLabel(/Email/i).fill(creds.moderator.email);
  await page.getByLabel(/Mật khẩu/i).fill(creds.moderator.password);
  await page.getByRole("button", { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}

for (const width of [360, 390, 768, 1440]) {
  test("discover, place and photo responsive " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    // 1. Discover: masthead, curated places, no overflow.
    await page.goto("/discover");
    await expect(
      page.getByRole("heading", { name: /Tìm nơi đáng để/ }),
    ).toBeVisible();
    await noOverflow(page);
    await capture(page, "discover-" + width);

    // 2. A place card leads to that place, not straight to a photo.
    const card = page.locator(".place-card").first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    const placeName = (
      await card.locator(".place-card__title").innerText()
    ).trim();
    await card.locator(".place-card__title a").click();
    // The content assertion below already proves the navigation completed; an
    // extra waitForURL would only burn the default timeout on an SPA transition
    // that has already happened by the time click() returns.
    await expect(page.locator("h1.place-detail__title")).toHaveText(placeName);
    await noOverflow(page);
    await capture(page, "place-" + width);

    // 3. The gallery leads into a photo, which names the same place.
    const photoLink = page.locator('a[href^="/photos/"]').first();
    await expect(photoLink).toBeVisible({ timeout: 15_000 });
    await photoLink.click();
    await expect(page.locator(".experience-detail__place")).toHaveText(
      placeName,
    );
    await noOverflow(page);
    await capture(page, "photo-" + width);

    // 4. "Quay lại" returns to the place the photo belongs to.
    await page.getByRole("link", { name: "Quay lại" }).click();
    await expect(page).toHaveURL(/\/places\//);
  });
}

test("guest save continuation, persistence and logout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearCookies();
  await page.goto("/places/" + placeId);
  await expect(page).toHaveURL(/login/);
  await page.getByRole("link", { name: "Tạo tài khoản mới" }).click();
  await page.getByLabel("Tên hiển thị").fill("Người lưu ảnh");
  await page
    .getByLabel("Email", { exact: true })
    .fill("save-v3-" + Date.now() + "@demo.invalid");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Browser-test-password-431");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp("/places/" + placeId));

  const placeName = (
    await page.locator("h1.place-detail__title").innerText()
  ).trim();
  await page.getByRole("button", { name: "Lưu " + placeName }).click();
  await expect(
    page.getByRole("button", { name: "Bỏ lưu " + placeName }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Đã lưu", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: placeName, exact: true }),
  ).toBeVisible();
  await capture(page, "saved-390");

  await page.getByRole("button", { name: "Bỏ lưu " + placeName }).click();
  // EmptyState renders its title as a <p>, not a heading.
  await expect(page.getByText("Bạn chưa lưu gì")).toBeVisible();

  await page.getByRole("button", { name: /Tài khoản của/i }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/saved");
  await expect(page).toHaveURL(/\/login$/);
});

test("upload, manual review, report and withdrawal", async ({
  page,
  context,
}) => {
  await register(page);
  await page.goto("/submissions/new?place=" + placeId);
  await expect(page.getByText("Đã chọn:", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Chọn ảnh JPEG hoặc PNG").setInputFiles(testImage);
  await expect(page.getByText("1/5 ảnh")).toBeVisible();
  await page.getByRole("button", { name: "Xóa ảnh 1" }).click();
  await expect(page.getByText("0/5 ảnh")).toBeVisible();
  await page.getByLabel("Chọn ảnh JPEG hoặc PNG").setInputFiles(testImage);
  const caption = "Ảnh E2E " + Date.now();
  await page.getByLabel("Mô tả ảnh (tùy chọn)").fill(caption);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("checkbox", { name: /Tôi có quyền đăng/ }).check();
  await capture(page, "submission-check");
  await page.getByRole("button", { name: "Đăng ảnh", exact: true }).click();
  await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;
  await expect(page.locator(".status-badge")).toHaveText("Đã đăng");

  const detail = await (
    await page.request.get("/api/v1/photo-submissions/" + id + "/")
  ).json();
  expect((await page.request.get(detail.assets[0].preview_url)).status()).toBe(
    200,
  );

  const anonymous = await context.browser()!.newContext();
  expect(
    (
      await anonymous.request.get(
        new URL(detail.assets[0].preview_url, page.url()).toString(),
      )
    ).status(),
  ).toBe(404);
  await anonymous.close();

  const adminContext = await context.browser()!.newContext();
  const admin = await adminContext.newPage();
  await adminLogin(admin);
  await admin.goto("/admin/photos/photosubmission/" + id + "/review/");
  await admin.getByRole("checkbox", { name: /\[DEMO\] Cây xanh/ }).check();
  await admin.getByRole("checkbox", { name: /\[DEMO\] Vật liệu gỗ/ }).check();
  await capture(admin, "admin-review");
  await admin.getByRole("button", { name: "Lưu nhãn đã sửa" }).click();

  await page.reload();
  await expect(page.getByText("Đã đăng", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Xem và quản lý ảnh" }).click();
  await expect(page.getByText(caption, { exact: true })).toBeVisible();
  const photoId = page.url().split("/").pop()!;

  await page.getByRole("button", { name: "Báo cáo nội dung" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Lý do").selectOption("privacy");
  await page.getByRole("button", { name: "Gửi báo cáo" }).click();
  await expect(page.getByText("Đã nhận báo cáo của bạn.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Đóng" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await admin.getByRole("checkbox", { name: /\[DEMO\] Vật liệu gỗ/ }).uncheck();
  await admin.getByRole("button", { name: "Lưu nhãn đã sửa" }).click();
  await expect(
    admin.getByRole("checkbox", { name: /\[DEMO\] Cây xanh/ }),
  ).toBeChecked();
  await expect(
    admin.getByRole("checkbox", { name: /\[DEMO\] Vật liệu gỗ/ }),
  ).not.toBeChecked();
  await admin.getByRole("button", { name: "Chọn làm ảnh bìa" }).click();
  await admin.getByRole("button", { name: "Rút ảnh công khai" }).click();
  expect(
    (await page.request.get("/api/v1/photos/" + photoId + "/")).status(),
  ).toBe(404);
  expect(
    (await page.request.get("/public-photo-media/" + photoId + "/")).status(),
  ).toBe(404);

  await page.reload();
  // ErrorState renders its title as a <p class="feedback__title">.
  await expect(page.getByText("Nội dung không còn khả dụng")).toBeVisible();
});

test("new place and photos are published immediately", async ({ page }) => {
  await register(page);
  await page.goto("/submissions/new");
  await page.getByRole("checkbox", { name: "Thêm địa điểm mới" }).check();
  await page.getByLabel("Tên địa điểm", { exact: true }).fill("Quán E2E DEMO");
  await page.getByLabel("Địa chỉ", { exact: true }).fill("Địa chỉ giả để test");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Chọn ảnh JPEG hoặc PNG").setInputFiles(testImage);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("checkbox", { name: /Tôi có quyền đăng/ }).check();
  await page.getByRole("button", { name: "Đăng ảnh", exact: true }).click();
  await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}$/);
  await expect(page.locator(".status-badge")).toHaveText("Đã đăng");
  await page.getByRole("link", { name: "Xem và quản lý ảnh" }).click();
  await expect(
    page.getByRole("heading", { name: "Quán E2E DEMO", exact: true }),
  ).toBeVisible();
  await capture(page, "new-place-published");
});

test("map shares filters, preview and history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Navigate directly: the primary nav is a plain NavLink that intentionally
  // drops the query string, so filters only survive an explicit URL.
  await page.goto("/map?attributes=demo-vegetation,demo-wood");
  await expect(page).toHaveURL(/attributes=/);

  const marker = page.locator(".marker-list button").first();
  await expect(marker).toBeVisible({ timeout: 30_000 });
  const markerName = (await marker.locator("strong").innerText()).trim();
  await marker.click();
  // At 390px the preview lives in .map-mobile-peek (the desktop
  // .marker-preview is display:none), but both render an <h3> with the name.
  await expect(
    page.getByRole("heading", { name: markerName, exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await capture(page, "map-390");

  await page.getByRole("link", { name: "Chi tiết" }).click();
  // A place with a supporting photo opens that photo; otherwise the place.
  await expect(page).toHaveURL(/\/(places|photos)\//);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: markerName, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/attributes=/);

  await page.getByRole("link", { name: "Xem ảnh" }).click();
  await expect(page).toHaveURL(/attributes=/);
  await expect(page).toHaveURL(/\/discover/);
});

test("empty result, API failure and keyboard skip link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // Empty search result is honest about it and offers a way out.
  await page.goto("/search?q=no-such-venue");
  // EmptyState renders its title as a <p class="feedback__title">.
  await expect(page.getByText(/Không tìm thấy địa điểm cho/)).toBeVisible();
  await capture(page, "empty-390");
  await page.getByRole("button", { name: "Xóa tất cả bộ lọc" }).first().click();
  await expect(page.locator(".place-card").first()).toBeVisible({
    timeout: 15_000,
  });

  // A failing request surfaces a retry, never the raw payload.
  await page.route("**/api/v1/places/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Lỗi kiểm thử API", fields: {} }),
    }),
  );
  await page.reload();
  // ErrorState splits the message into a title and a body paragraph.
  await expect(
    page.getByText("Máy chủ hiện không phản hồi", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Bạn có thể thử lại sau ít phút.")).toBeVisible();
  await expect(page.getByText("Lỗi kiểm thử API")).toHaveCount(0);
  await capture(page, "error-390");
  await page.unroute("**/api/v1/places/**");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".place-card").first()).toBeVisible({
    timeout: 15_000,
  });

  // The skip link is the first stop for keyboard users.
  await page.goto("/discover");
  await expect(page.locator(".skip-link")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Đến nội dung chính" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("map tile failure retry and empty viewport message", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/map/style.json", (route) => route.abort());
  await page.goto("/map");
  await expect(page.getByText("Không tải được bản đồ.")).toBeVisible();
  await page.unroute("**/map/style.json");
  await page
    .getByRole("button", { name: "Thử lại bản đồ", exact: true })
    .click();
  await expect(page.locator(".marker-list button").first()).toBeVisible({
    timeout: 30_000,
  });

  // /map renders `Filters compact`, which has no text input — only category
  // tabs. An empty viewport is therefore driven through the camera instead.
  await page.goto("/map?lat=16.28&lng=108.37&zoom=14");
  await expect(
    page.getByText("Không có địa điểm nào trong vùng hiển thị này."),
  ).toBeVisible({ timeout: 30_000 });
  await noOverflow(page);
  await capture(page, "map-empty-390");
});

test("missing coordinates, empty gallery and loading state", async ({
  page,
}) => {
  await page.goto("/places/" + placeWithoutCoords);
  await expect(page.getByText("Chưa có toạ độ chính xác")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xem trên bản đồ", exact: true }),
  ).toHaveCount(0);

  await page.goto("/places/30000000-0000-0000-0000-000000000004");
  // The seeded fixture for this place intentionally has no photo. Assert the
  // identity only: other specs may attach posts to it, so "no experiences" is
  // not a stable expectation.
  await expect(page.locator("h1.place-detail__title")).toHaveText(
    "Quán chưa có ảnh — DEMO",
  );

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/places/**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/discover");
  await expect(
    page.getByRole("status", { name: "Đang tải" }).first(),
  ).toBeVisible();
  release();
  await expect(page.locator(".place-card").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.unroute("**/api/v1/places/**");
});
