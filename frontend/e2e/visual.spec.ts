import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const placeId = "30000000-0000-0000-0000-000000000001";
const name = "Quán mẫu — DEMO";
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
  const csrf = await (await page.request.get("/api/v1/auth/csrf/")).json();
  const response = await page.request.post("/api/v1/auth/login/", {
    headers: { "X-CSRFToken": csrf.csrfToken },
    data: {
      email: "e2e-admin@demo.invalid",
      password: process.env.E2E_ADMIN_PASSWORD,
    },
  });
  expect(response.status()).toBe(200);
});
async function capture(page: Page, name: string) {
  await expect(page.locator(".skeletons")).toHaveCount(0);
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
  await expect(page.locator(".skeletons")).toHaveCount(0);
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
  await page.goto("/admin/login/");
  await page.getByLabel(/Email/i).fill("e2e-admin@demo.invalid");
  await page.getByLabel(/Mật khẩu/i).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /Đăng nhập/i }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
}
for (const width of [360, 390, 768, 1440]) {
  test("photo discovery and evidence responsive " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/discover");
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await capture(page, "discover-" + width);
    await page.locator(".filter-drawer > summary").click();
    await page.getByText("Lọc đặc điểm trong ảnh", { exact: true }).click();
    await page.getByRole("checkbox", { name: /\[DEMO\] Cây xanh/ }).check();
    await page.getByRole("checkbox", { name: /\[DEMO\] Vật liệu gỗ/ }).check();
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect(page).toHaveURL(/attributes=/);
    await expect(
      page.getByRole("heading", { name: "Không gian mẫu — DEMO", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "Xem ảnh của " + name, exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Đặc điểm trong ảnh" }),
    ).toBeVisible();
    await noOverflow(page);
    await capture(page, "viewer-" + width);
    await page.getByRole("link", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Ảnh khớp bộ lọc" }),
    ).toBeVisible();
    await expect(page.getByText("Chưa có thông tin giờ mở cửa.")).toBeVisible();
    await noOverflow(page);
    await capture(page, "detail-" + width);
    await page.getByRole("link", { name: "Xem tất cả ảnh" }).click();
    await expect(page).not.toHaveURL(/attributes=/);
    await page
      .getByRole("link", { name: /Xem ảnh .*DEMO/i })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Đặc điểm trong ảnh" }),
    ).toBeVisible();
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
  await page.getByRole("button", { name: "Lưu " + name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Bỏ lưu " + name, exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Đã lưu", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await capture(page, "saved-390");
  await page
    .getByRole("button", { name: "Bỏ lưu " + name, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bạn chưa lưu quán nào" }),
  ).toBeVisible();
  await page.goto("/profile");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Đăng xuất" }).click();
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
  await page.getByRole("link", { name: "Xem ảnh công khai" }).click();
  await expect(page.getByText(caption, { exact: true })).toBeVisible();
  const photoId = page.url().split("/").pop()!;
  await page.getByRole("button", { name: "Báo cáo nội dung" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Lý do").selectOption("privacy");
  await page.getByRole("button", { name: "Gửi báo cáo" }).click();
  await expect(page.getByText("Đã nhận báo cáo.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Báo cáo nội dung" }),
  ).toBeFocused();
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
  await expect(
    page.getByRole("heading", { name: "Nội dung không còn khả dụng" }),
  ).toBeVisible();
});
test("new place and photos are published immediately", async ({ page }) => {
  await register(page);
  await page.goto("/submissions/new");
  await page.getByRole("checkbox", { name: "Thêm quán mới" }).check();
  await page.getByLabel("Tên quán", { exact: true }).fill("Quán E2E DEMO");
  await page.getByLabel("Địa chỉ", { exact: true }).fill("Địa chỉ giả để test");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Chọn ảnh JPEG hoặc PNG").setInputFiles(testImage);
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("checkbox", { name: /Tôi có quyền đăng/ }).check();
  await page.getByRole("button", { name: "Đăng ảnh", exact: true }).click();
  await expect(page).toHaveURL(/\/submissions\/[0-9a-f-]{36}$/);
  await expect(page.locator(".status-badge")).toHaveText("Đã đăng");
  await page.getByRole("link", { name: "Xem ảnh công khai" }).click();
  await expect(
    page.getByRole("heading", { name: "Quán E2E DEMO", exact: true }),
  ).toBeVisible();
  await capture(page, "new-place-published");
});
test("map shares visual filters, preview and history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover?attributes=demo-vegetation,demo-wood");
  await page.getByRole("link", { name: "Bản đồ", exact: true }).click();
  await expect(page).toHaveURL(/attributes=/);
  await expect(
    page.getByRole("button", { name: "Xem " + name, exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Xem " + name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await noOverflow(page);
  await capture(page, "map-390");
  await page.getByRole("link", { name: "Xem chi tiết", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ảnh khớp bộ lọc" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đóng xem trước" }).click();
  await page.getByRole("link", { name: "Khám phá", exact: true }).click();
  await expect(page).toHaveURL(/attributes=/);
});
test("empty, API failure, invalid tag and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover?q=no-such-venue");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy ảnh phù hợp" }),
  ).toBeVisible();
  await capture(page, "empty-390");
  await page.locator(".filter-drawer > summary").click();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.goto("/discover?attributes=unsupported");
  await expect(page.getByText(/Đặc điểm không được hỗ trợ/)).toBeVisible();
  await page.locator(".filter-drawer > summary").click();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page.route("**/api/v1/feed/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Lỗi kiểm thử API", fields: {} }),
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Không thể tải trang" }),
  ).toBeVisible();
  await capture(page, "error-390");
  await page.unroute("**/api/v1/feed/**");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.goto("/discover?sort=recent");
  await expect(page.locator(".skip-link")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Đến nội dung chính" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("real map tiles, GPS opt-in and tile error retry", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) =>
    route.abort(),
  );
  await page.goto("/map");
  await expect(page.getByText("Không tải được bản đồ.")).toBeVisible();
  await page.unroute("https://tiles.openfreemap.org/styles/liberty");
  await page
    .getByRole("button", { name: "Thử lại bản đồ", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xem " + name, exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 16.067, longitude: 108.22 });
  await page
    .getByRole("button", { name: "Vị trí của tôi", exact: true })
    .click();
  await expect(page).toHaveURL(/lat=/);
  await page.getByLabel("Tìm tên hoặc địa chỉ").fill("missing-venue");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    page.getByText("Không có quán khớp bộ lọc trong vùng này."),
  ).toBeVisible();
  await noOverflow(page);
  await capture(page, "map-empty-390");
});
test("missing coordinates, empty gallery and loading state", async ({
  page,
}) => {
  await page.goto("/places/30000000-0000-0000-0000-000000000003");
  await expect(
    page.getByText("Chưa có vị trí chính xác trên bản đồ."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chỉ đường", exact: true }),
  ).toHaveCount(0);
  await page.goto("/places/30000000-0000-0000-0000-000000000004");
  await expect(
    page.getByRole("heading", { name: "Chưa có ảnh công khai", exact: true }),
  ).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/feed/**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/discover");
  await expect(page.getByRole("status", { name: "Đang tải" })).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.unroute("**/api/v1/feed/**");
});
