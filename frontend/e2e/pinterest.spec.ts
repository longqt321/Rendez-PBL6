import { test, expect } from "@playwright/test";

// Synthetic, intercepted responses exercise pagination without changing the DB.
test("photo feed appends, retries and resets on category change", async ({
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
  const item = (index: number) => ({
    photo: {
      id: `photo-${index}`,
      url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="${index % 2 ? 450 : 200}"><rect width="100%" height="100%" fill="#e1e6dc"/></svg>`)}`,
      width: 300,
      height: index % 2 ? 450 : 200,
      alt_text: `Ảnh kiểm thử ${index}`,
      attributes: [],
      matched_attribute_codes: [],
    },
    place: {
      id: `place-${index}`,
      name: `Quán kiểm thử ${index}`,
      address: "Dữ liệu kiểm thử",
      category: { slug: "cafe", name: "Cà phê" },
      latitude: 16.067,
      longitude: 108.22,
      is_saved: false,
    },
  });
  await page.route("**/api/v1/feed/?*", (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get("page") === "2" && failNextPage)
      return route.fulfill({
        status: 503,
        json: { message: "Ảnh tiếp theo chưa tải được." },
      });
    const first = query.get("page") !== "2";
    return route.fulfill({
      json: {
        count: 8,
        next: first ? "/api/v1/feed/?page=2" : null,
        previous: null,
        results: Array.from({ length: 4 }, (_, n) => item(n + (first ? 0 : 4))),
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/discover");
  await expect(page.locator(".photo-card")).toHaveCount(4);
  await expect
    .poll(() =>
      page
        .locator(".photo-card")
        .evaluateAll((cards) =>
          cards.every((card) => card.style.gridRowEnd.startsWith("span")),
        ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Xem thêm ảnh" }).click();
  // 1 & 2. Verify sanitized generic error message is displayed
  await expect(
    page.getByText("Máy chủ hiện không phản hồi. Vui lòng thử lại sau."),
  ).toBeVisible({
    timeout: 15_000,
  });
  // 3. Raw 503 server error payload must NOT be exposed to the user
  await expect(page.getByText("Ảnh tiếp theo chưa tải được.")).toHaveCount(0);
  // 4. Failed request does not leave UI stuck in loading state
  await expect(
    page.getByRole("button", { name: "Xem thêm ảnh" }),
  ).toBeEnabled();
  await expect(page.locator(".photo-card")).toHaveCount(4);

  // 5. Retry action triggers subsequent successful request
  failNextPage = false;
  await page.getByRole("button", { name: "Xem thêm ảnh" }).click();

  // 6. Feed recovers and displays expected content after retry
  await expect(page.locator(".photo-card")).toHaveCount(8);
  await expect(page.getByRole("button", { name: "Xem thêm ảnh" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Cà phê", exact: true }).click();
  await expect(page).toHaveURL(/category=cafe/);
  await expect(page.locator(".photo-card")).toHaveCount(4);
  await page.locator(".global-search input").fill("góc quán");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).toHaveURL(/category=cafe.*q=/);
  await page
    .getByRole("link", { name: "Bản đồ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/map\?/);
  const mapQuery = new URL(page.url()).searchParams;
  expect(mapQuery.get("category")).toBe("cafe");
  expect(mapQuery.get("q")).toBe("góc quán");
});
