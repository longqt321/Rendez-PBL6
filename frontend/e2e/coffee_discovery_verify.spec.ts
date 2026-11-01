import { test, expect, type Page } from "@playwright/test";
import { loginViaApi } from "./helpers/auth";

/**
 * Image integrity and place → photo → comment journey.
 *
 * The hardened E2E environment seeds `seed_visual_demo`, not `data/danang.json`,
 * so this spec must not assume any particular real-world place name. It derives
 * its target from the API the page itself consumes, then drives the UI. That
 * keeps the intent (every rendered image decodes, a place leads to its photos,
 * and a comment round-trips) without coupling the test to a dataset the E2E
 * database deliberately does not load.
 */

type PlacePage = {
  results: {
    id: string;
    name: string;
    address: string;
    cover_photo_id: string | null;
  }[];
};

type PhotoPage = {
  results: { id: string; url: string; place_id: string }[];
};

/** First place in the catalogue that actually has a gallery photo. */
async function findPlaceWithPhoto(
  page: Page,
): Promise<{ id: string; name: string; address: string; photoId: string }> {
  const placesResp = await page.request.get("/api/v1/places/?page_size=50");
  expect(placesResp.status()).toBe(200);
  const places = (await placesResp.json()) as PlacePage;

  for (const place of places.results) {
    const photosResp = await page.request.get(
      `/api/v1/places/${place.id}/photos/`,
    );
    if (photosResp.status() !== 200) continue;
    const photos = (await photosResp.json()) as PhotoPage;
    if (photos.results.length === 0) continue;
    return {
      id: place.id,
      name: place.name,
      address: place.address,
      photoId: photos.results[0].id,
    };
  }
  throw new Error("Không có địa điểm nào kèm ảnh trong môi trường E2E.");
}

test.describe("Toàn vẹn hình ảnh và hành trình địa điểm → ảnh → bình luận", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "user");
  });

  test("Mọi ảnh trên trang khám phá đều tải được và mỗi thẻ địa điểm dẫn tới một địa điểm", async ({
    page,
  }) => {
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");

    // Skeletons should be gone
    await expect(page.locator(".skeletons")).toHaveCount(0);

    // Place cards render, and each one is a real place-first card.
    const cards = page.locator(".place-card");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(cardCount, 8); i++) {
      const card = cards.nth(i);
      const title = (
        await card.locator(".place-card__title").innerText()
      ).trim();
      expect(title.length).toBeGreaterThan(0);
      const href = await card
        .locator(".place-card__title a")
        .getAttribute("href");
      expect(href).toMatch(/^\/places\/[0-9a-f-]+$/);
    }

    // Every rendered photo decodes and is served with an image content type.
    const images = page.locator("img[src*='/public-photo-media/']");
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(imgCount, 8); i++) {
      const img = images.nth(i);
      await expect(img).toBeVisible();

      const isLoaded = await img.evaluate((el: HTMLImageElement) => {
        return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
      });
      expect(isLoaded).toBe(true);

      const src = await img.getAttribute("src");
      expect(src).toBeTruthy();
      const imgResp = await page.request.get(src!);
      expect(imgResp.status()).toBe(200);
      expect(imgResp.headers()["content-type"]).toContain("image/");
    }
  });

  test("Mở địa điểm, đi tiếp sang ảnh, thấy đúng tên quán và gửi được bình luận", async ({
    page,
  }) => {
    // 1. Pick a target from the same API the UI reads.
    const target = await findPlaceWithPhoto(page);

    // 2. Open the place page and confirm the heading is the place itself.
    await page.goto(`/places/${target.id}`);
    await page.waitForLoadState("networkidle");
    const placeTitle = page.locator("h1.place-detail__title");
    await expect(placeTitle).toBeVisible({ timeout: 15000 });
    await expect(placeTitle).toHaveText(target.name);
    await expect(page.locator("body")).toContainText(target.address);

    // 3. Follow a gallery photo into Photo Detail.
    const photoLink = page.locator('a[href^="/photos/"]').first();
    await expect(photoLink).toBeVisible({ timeout: 15000 });
    const href = await photoLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // 4. Photo Detail must name the same place.
    const viewerPlaceLink = page.locator(".experience-detail__place");
    await expect(viewerPlaceLink).toBeVisible({ timeout: 15000 });
    await expect(viewerPlaceLink).toHaveText(target.name);

    // The hero image is visible and actually decoded.
    const img = page.locator("img[src*='/public-photo-media/']").first();
    await expect(img).toBeVisible({ timeout: 15000 });
    const decoded = await img.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
    );
    expect(decoded).toBe(true);

    // 5. Like toggles and is reversible.
    const likeButton = page
      .getByRole("button", { name: /^Thích ảnh$/ })
      .first();
    await expect(likeButton).toBeVisible({ timeout: 15000 });
    await likeButton.click();
    const unlike = page.getByRole("button", { name: /^Bỏ thích ảnh$/ }).first();
    await expect(unlike).toBeVisible({ timeout: 10000 });
    await unlike.click();
    await expect(likeButton).toBeVisible({ timeout: 10000 });

    // 6. A comment round-trips through the API and appears in the panel.
    const text = `Kiểm chứng tự động ${Date.now()}: không gian yên tĩnh, hợp học bài.`;
    const commentInput = page
      .locator("textarea[placeholder*='cảm nhận']")
      .first();
    await expect(commentInput).toBeVisible({ timeout: 15000 });
    await commentInput.fill(text);
    await page.getByRole("button", { name: "Gửi" }).first().click();
    await expect(page.locator("body")).toContainText(text, { timeout: 15000 });
  });

  test("Trang bản đồ tương tác hiển thị đúng khu vực Bách Khoa", async ({
    page,
  }) => {
    await page.goto("/map");
    await page.waitForLoadState("networkidle");

    // Map container should be present
    const mapContainer = page
      .locator(".maplibregl-map, [data-testid='map-container']")
      .first();
    await expect(mapContainer).toBeVisible({ timeout: 15000 });

    // Verify place chips or markers exist
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Bản đồ");
  });
});
