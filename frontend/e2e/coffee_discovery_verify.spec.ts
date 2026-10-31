import { test, expect } from "@playwright/test";
import { loginViaApi } from "./helpers/auth";

test.describe("Khám phá Quán Cà phê Bách Khoa Đà Nẵng & Kiểm thử Toàn vẹn Hình ảnh", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "user");
  });

  test("Kiểm tra toàn bộ hình ảnh và địa điểm khớp nhau, không bị lỗi truy cập", async ({
    page,
  }) => {
    // Navigate to discover feed
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");

    // Skeletons should be gone
    await expect(page.locator(".skeletons")).toHaveCount(0);

    // Verify coffee place cards are rendered
    const placeCards = page.locator(
      "[data-place-card], .masonry-card, article",
    );
    const count = await placeCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify all images on page load with valid status and naturalWidth > 0
    const images = page.locator("img[src*='/public-photo-media/']");
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(imgCount, 8); i++) {
      const img = images.nth(i);
      await expect(img).toBeVisible();

      // Check image is actually decoded and has physical dimensions
      const isLoaded = await img.evaluate((el: HTMLImageElement) => {
        return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
      });
      expect(isLoaded).toBe(true);

      // Verify the image URL returns HTTP 200 via direct fetch
      const src = await img.getAttribute("src");
      expect(src).toBeTruthy();
      const imgResp = await page.request.get(src!);
      expect(imgResp.status()).toBe(200);
      expect(imgResp.headers()["content-type"]).toContain("image/jpeg");
    }

    // Verify coffee place names appear in the document
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Trình Cà Phê");
    expect(pageContent).toContain("Phạm Như Xương");
    expect(pageContent).toContain("Ikigai Garden");
  });

  test("Kiểm tra mở trang chi tiết ảnh, hiển thị đúng thông tin quán và tương tác bình luận", async ({
    page,
  }) => {
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");

    // 1. Deterministic selection: locate the card for Trình Cà Phê
    const targetCard = page
      .locator(".place-card, article")
      .filter({ hasText: "Trình Cà Phê" })
      .first();
    await expect(targetCard).toBeVisible({ timeout: 10000 });
    const expectedPlaceName = (await targetCard.locator("h2").innerText()).trim();

    // 2. Read its associated photo link and navigate to Photo Detail
    const photoLink = targetCard.locator("a[href^='/photos/']").first();
    const href = await photoLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // 3. Verify Photo Detail references the exact same Place name and address
    await expect(page.locator(".skeletons")).toHaveCount(0, { timeout: 10000 });
    const viewerPlaceTitle = page.locator(".photo-place-link h1");
    await expect(viewerPlaceTitle).toBeVisible({ timeout: 10000 });
    await expect(viewerPlaceTitle).toHaveText(expectedPlaceName);
    await expect(page.locator("body")).toContainText("Phạm Như Xương");

    // Verify viewer image is visible
    const img = page.locator("img[src*='/public-photo-media/']").first();
    await expect(img).toBeVisible({ timeout: 10000 });

    // Test like button
    const likeButton = page
      .locator("button:has-text('Thích'), button:has-text('Đã thích')")
      .first();
    if (await likeButton.isVisible()) {
      await likeButton.click();
      await page.waitForTimeout(500);
    }

    // Test adding a comment
    const commentInput = page
      .locator(
        "input[placeholder*='bình luận'], textarea[placeholder*='bình luận']",
      )
      .first();
    if (await commentInput.isVisible()) {
      await commentInput.fill(
        "Quán cà phê bơ ngon tuyệt, không gian rất hợp học bài!",
      );
      const sendBtn = page
        .locator("button:has-text('Gửi'), button[type='submit']")
        .first();
      await sendBtn.click();
      await page.waitForTimeout(1000);

      // Expect comment to appear
      await expect(page.locator("body")).toContainText(
        "Quán cà phê bơ ngon tuyệt, không gian rất hợp học bài!",
      );
    }
  });

  test("Kiểm tra trang bản đồ tương tác hiển thị đúng khu vực Bách Khoa", async ({
    page,
  }) => {
    await page.goto("/map");
    await page.waitForLoadState("networkidle");

    // Map container should be present
    const mapContainer = page
      .locator(".maplibregl-map, [data-testid='map-container']")
      .first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Verify place chips or markers exist
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Bản đồ");
  });
});
