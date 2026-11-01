import { test, expect } from "@playwright/test";

/**
 * Search pagination, failure recovery and filter round-trip.
 *
 * Synthetic, intercepted responses exercise the states without touching the DB.
 * The page is place-first: results are `.place-card` elements, the query string
 * is the single source of truth, and paging lives in `?page=`.
 */
test("search appends pages, recovers from failure and keeps filters in the URL", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/me/", (route) =>
    route.fulfill({
      json: {
        id: "test-user",
        email: "test@example.test",
        display_name: "Người dùng",
        is_staff: false,
      },
    }),
  );
  await page.route("**/api/v1/categories/", (route) =>
    route.fulfill({ json: [{ slug: "cafe", name: "Cà phê" }] }),
  );
  await page.route("**/api/v1/attributes/", (route) =>
    route.fulfill({ json: [] }),
  );

  let failNextPage = true;
  const place = (index: number) => ({
    id: `30000000-0000-0000-0000-00000000000${index}`,
    name: `Quán kiểm thử ${index}`,
    category: { slug: "cafe", name: "Cà phê" },
    address: "Dữ liệu kiểm thử, Đà Nẵng",
    latitude: 16.067,
    longitude: 108.22,
    cover_image_url: null,
    cover_media_url: null,
    cover_photo_id: null,
    is_saved: false,
    supporting_photo: null,
  });

  // Playwright globs treat `?` as a single-character wildcard, and the request
  // URL has no query string on the first page, so match the path broadly.
  await page.route("**/api/v1/places/**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get("page") === "2" && failNextPage) {
      return route.fulfill({
        status: 503,
        json: { message: "Ảnh tiếp theo chưa tải được." },
      });
    }
    const first = query.get("page") !== "2";
    return route.fulfill({
      json: {
        count: 8,
        next: first ? "/api/v1/places/?page=2" : null,
        previous: first ? null : "/api/v1/places/",
        results: Array.from({ length: 4 }, (_, n) =>
          place(n + (first ? 1 : 5)),
        ),
      },
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/search");

  // 1. First page renders four place cards, and paging is offered.
  await expect(page.locator(".place-card")).toHaveCount(4);
  const nextPage = page.getByRole("button", { name: "Trang sau" });
  await expect(nextPage).toBeEnabled();

  // 2. A failing page 2 shows the sanitized message, not the raw payload.
  await nextPage.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("alert")).toContainText(
    "Máy chủ hiện không phản hồi",
    { timeout: 15_000 },
  );
  await expect(page.getByText("Ảnh tiếp theo chưa tải được.")).toHaveCount(0);
  // A failed page must not be described as "no results".
  await expect(page.getByRole("alert")).not.toContainText(
    "Không có địa điểm khớp bộ lọc",
  );

  // 3. Retrying succeeds and renders page 2.
  failNextPage = false;
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.locator(".place-card").first()).toContainText(
    "Quán kiểm thử 5",
    { timeout: 15_000 },
  );

  // 4. Going back to page 1 removes the page parameter.
  await page.getByRole("button", { name: "Trang trước" }).click();
  await expect(page).not.toHaveURL(/page=/);
  await expect(page.locator(".place-card").first()).toContainText(
    "Quán kiểm thử 1",
  );

  // 5. Choosing a category resets paging and is reflected in the URL.
  await page.getByRole("button", { name: "Cà phê", exact: true }).click();
  await expect(page).toHaveURL(/category=cafe/);
  await expect(page).not.toHaveURL(/page=/);

  // 6. Typing debounces into the URL, and the map link carries both filters.
  await page
    .getByPlaceholder(
      "Tìm kiếm địa điểm, quán cà phê, không gian đẹp tại Đà Nẵng...",
    )
    .fill("góc quán");
  await expect(page).toHaveURL(/q=g%C3%B3c\+qu%C3%A1n/);
  await page.getByRole("link", { name: /trên bản đồ/ }).click();
  await expect(page).toHaveURL(/\/map\?/);
  const mapQuery = new URL(page.url()).searchParams;
  expect(mapQuery.get("category")).toBe("cafe");
  expect(mapQuery.get("q")).toBe("góc quán");
});
