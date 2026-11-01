import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * Phase 1 Hardened E2E Suite.
 * Covers:
 *  - Dynamic, secure credential resolution (no plaintext passwords in source)
 *  - Fine-grained role & permission enforcement:
 *      * Normal User (is_staff=false, is_superuser=false)
 *      * Moderator (is_staff=true, is_superuser=false, photos.review_photosubmission)
 *      * Unprivileged Staff (is_staff=true, is_superuser=false, no moderation perm)
 *  - Verification that Moderator can access protected originals while Unprivileged Staff is denied
 *  - Deterministic Feed & Dedicated Media Root serving
 *  - API upload verification ensuring files land strictly in .local/e2e_media
 *  - End-to-end UI journey from Login to Discover Feed
 */

function getE2ECredentials() {
  const credPath = path.resolve(
    process.cwd(),
    "../.local/e2e_credentials.json",
  );
  if (fs.existsSync(credPath)) {
    try {
      return JSON.parse(fs.readFileSync(credPath, "utf-8"));
    } catch {
      // fallback
    }
  }
  return {
    user: {
      email: process.env.E2E_USER_EMAIL || "e2e-user@rendez.test",
      password: process.env.E2E_USER_PASSWORD || "",
    },
    moderator: {
      email: process.env.E2E_MODERATOR_EMAIL || "e2e-moderator@rendez.test",
      password:
        process.env.E2E_MODERATOR_PASSWORD ||
        process.env.E2E_ADMIN_PASSWORD ||
        "",
    },
    staff_unprivileged: {
      email:
        process.env.E2E_STAFF_UNPRIV_EMAIL || "e2e-staff-unpriv@rendez.test",
      password: process.env.E2E_STAFF_UNPRIVILEGED_PASSWORD || "",
    },
  };
}

const creds = getE2ECredentials();

test.describe("Phase 1: Hardened Dedicated E2E Environment Suite", () => {
  test("1. Backend Health & CSRF Token Acquisition", async ({ request }) => {
    const res = await request.get("/api/v1/auth/csrf/");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("csrfToken");
    expect(typeof data.csrfToken).toBe("string");
    expect(data.csrfToken.length).toBeGreaterThan(10);
  });

  test("2. Role Verification: Normal User, Moderator & Staff Unprivileged", async ({
    request,
  }) => {
    // A. Normal user login (is_staff=false, is_superuser=false)
    const csrf1 = await (await request.get("/api/v1/auth/csrf/")).json();
    const userRes = await request.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": csrf1.csrfToken },
      data: {
        email: creds.user.email,
        password: creds.user.password,
      },
    });
    expect(userRes.status()).toBe(200);
    const userData = await userRes.json();
    expect(userData.email).toBe(creds.user.email);
    expect(userData.is_staff).toBe(false);

    // B. Moderator login (is_staff=true, is_superuser=false)
    const csrf2 = await (await request.get("/api/v1/auth/csrf/")).json();
    const modRes = await request.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": csrf2.csrfToken },
      data: {
        email: creds.moderator.email,
        password: creds.moderator.password,
      },
    });
    expect(modRes.status()).toBe(200);
    const modData = await modRes.json();
    expect(modData.email).toBe(creds.moderator.email);
    expect(modData.is_staff).toBe(true);

    // C. Staff unprivileged login (is_staff=true, is_superuser=false)
    const csrf3 = await (await request.get("/api/v1/auth/csrf/")).json();
    const staffRes = await request.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": csrf3.csrfToken },
      data: {
        email: creds.staff_unprivileged.email,
        password: creds.staff_unprivileged.password,
      },
    });
    expect(staffRes.status()).toBe(200);
    const staffData = await staffRes.json();
    expect(staffData.email).toBe(creds.staff_unprivileged.email);
    expect(staffData.is_staff).toBe(true);
  });

  test("3. Permission Enforcement: Moderator Authorized vs Unprivileged Staff Denied", async ({
    playwright,
  }) => {
    // 1. User context: query own submissions to get asset ID
    const userContext = await playwright.request.newContext();
    const userCsrf = await (await userContext.get("/api/v1/auth/csrf/")).json();
    const userLogin = await userContext.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": userCsrf.csrfToken },
      data: { email: creds.user.email, password: creds.user.password },
    });
    expect(userLogin.status()).toBe(200);

    const userSubRes = await userContext.get("/api/v1/photo-submissions/");
    expect(userSubRes.status()).toBe(200);
    const userSubData = await userSubRes.json();
    expect(userSubData.results.length).toBeGreaterThan(0);
    const assetId = userSubData.results[0].assets[0].id;
    expect(assetId).toBeTruthy();

    // 2. Moderator context: Access protected original photo -> must return 200
    const modContext = await playwright.request.newContext();
    const modCsrf = await (await modContext.get("/api/v1/auth/csrf/")).json();
    const modLogin = await modContext.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": modCsrf.csrfToken },
      data: {
        email: creds.moderator.email,
        password: creds.moderator.password,
      },
    });
    expect(modLogin.status()).toBe(200);

    const modAccess = await modContext.get(
      `/private-photo-original/${assetId}/`,
    );
    expect(modAccess.status()).toBe(200);
    expect(modAccess.headers()["content-type"]).toContain(
      "application/octet-stream",
    );

    // 3. Unprivileged Staff context: Access protected original -> must be denied (404/hidden)
    const staffContext = await playwright.request.newContext();
    const staffCsrf = await (
      await staffContext.get("/api/v1/auth/csrf/")
    ).json();
    const staffLogin = await staffContext.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": staffCsrf.csrfToken },
      data: {
        email: creds.staff_unprivileged.email,
        password: creds.staff_unprivileged.password,
      },
    });
    expect(staffLogin.status()).toBe(200);

    const staffAccess = await staffContext.get(
      `/private-photo-original/${assetId}/`,
    );
    expect(staffAccess.status()).toBe(404);

    // 4. Normal user attempts to access original -> must also be denied (404)
    const userAccess = await userContext.get(
      `/private-photo-original/${assetId}/`,
    );
    expect(userAccess.status()).toBe(404);
  });

  test("4. Deterministic Feed & Dedicated Media Serving", async ({
    request,
  }) => {
    // 1. Authenticate as normal user
    const csrf = await (await request.get("/api/v1/auth/csrf/")).json();
    const loginRes = await request.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": csrf.csrfToken },
      data: { email: creds.user.email, password: creds.user.password },
    });
    expect(loginRes.status()).toBe(200);

    // 2. Query Feed
    const feedRes = await request.get("/api/v1/feed/");
    expect(feedRes.status()).toBe(200);
    const feed = await feedRes.json();

    expect(feed.results).toBeInstanceOf(Array);
    expect(feed.results.length).toBeGreaterThan(0);

    const item = feed.results[0];
    expect(item).toHaveProperty("place");
    expect(item.place).toHaveProperty("name");
    expect(item).toHaveProperty("photo");
    expect(item.photo).toHaveProperty("url");

    // 3. Media delivery returns HTTP 200
    const mediaRes = await request.get(item.photo.url);
    expect(mediaRes.status()).toBe(200);
    expect(mediaRes.headers()["content-type"]).toContain("image/");
    const imageBytes = await mediaRes.body();
    expect(imageBytes.length).toBeGreaterThan(500);
  });

  test("5. Media Isolation Verification: Upload API writes to E2E root and never to dev media", async ({
    request,
  }) => {
    // 1. Authenticate as normal user
    const preCsrf = await (await request.get("/api/v1/auth/csrf/")).json();
    await request.post("/api/v1/auth/login/", {
      headers: { "X-CSRFToken": preCsrf.csrfToken },
      data: { email: creds.user.email, password: creds.user.password },
    });

    // Obtain fresh CSRF token post-authentication
    const postCsrf = await (await request.get("/api/v1/auth/csrf/")).json();

    // 2. Get first place ID from places endpoint
    const placesRes = await request.get("/api/v1/places/");
    expect(placesRes.status()).toBe(200);
    const placesData = await placesRes.json();
    const targetPlaceId = placesData.results[0].id;

    // 3. Valid JPEG binary for upload (120x120 px to meet dimension validation)
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAB4AHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDWooor5c8wKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA/9k=",
      "base64",
    );

    const idempotencyKey = `e2e-upload-${Date.now()}`;
    const uploadRes = await request.post("/api/v1/photo-submissions/", {
      headers: {
        "X-CSRFToken": postCsrf.csrfToken,
        "Idempotency-Key": idempotencyKey,
      },
      multipart: {
        place_id: targetPlaceId,
        consent: "true",
        consent_version: "photo-rights-v2",
        images: {
          name: "test-e2e-upload.jpg",
          mimeType: "image/jpeg",
          buffer: jpegBuffer,
        },
      },
    });

    expect(uploadRes.status()).toBe(201);
    const uploadData = await uploadRes.json();
    expect(uploadData).toHaveProperty("assets");
    expect(uploadData.assets.length).toBe(1);

    // 4. Verify on local disk that file is in .local/e2e_media and NOT in .local/media
    const e2eMediaRoot = path.resolve(process.cwd(), "../.local/e2e_media");
    const devMediaRoot = path.resolve(process.cwd(), "../.local/media");

    const e2eFiles = fs.readdirSync(
      path.join(e2eMediaRoot, "visual", "derivatives"),
    );
    expect(e2eFiles.length).toBeGreaterThan(0);

    // Verify dev media was NOT touched
    const devBaselinePath = path.resolve(
      process.cwd(),
      "../.local/e2e_dev_snapshot.json",
    );
    if (fs.existsSync(devBaselinePath)) {
      const baseline = JSON.parse(fs.readFileSync(devBaselinePath, "utf-8"));
      let currentDevCount = 0;
      function countFiles(dir: string) {
        for (const item of fs.readdirSync(dir)) {
          const full = path.join(dir, item);
          if (fs.statSync(full).isDirectory()) countFiles(full);
          else currentDevCount++;
        }
      }
      countFiles(devMediaRoot);
      expect(currentDevCount).toBe(baseline.media_file_count);
    }
  });

  test("6. Frontend UI Integration — Login to Discover Feed Journey", async ({
    page,
  }) => {
    // 1. Visit login
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Đăng nhập", exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    // 2. Perform UI login with normal user credentials from store
    await page.getByLabel("Email", { exact: true }).fill(creds.user.email);
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill(creds.user.password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    // 3. Confirm transition to /discover
    await page.waitForURL("**/discover", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/discover$/);

    // 4. Verify cards and images appear
    const cardLocator = page.locator(
      "[data-place-card], .masonry-card, article",
    );
    await expect(cardLocator.first()).toBeVisible({ timeout: 15_000 });

    const images = page.locator("img[src*='/public-photo-media/']");
    await expect(images.first()).toBeVisible({ timeout: 15_000 });

    const isFirstImageLoaded = await images
      .first()
      .evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
      });
    expect(isFirstImageLoaded).toBe(true);

    // 5. Verify the deterministic Da Nang dataset is reachable through the UI.
    //    Asserting it on /discover would be order-dependent: that page shows
    //    only the 8 most recent places, and other specs create places as they
    //    run. Search is the stable way to prove the dataset was imported.
    await page.goto("/search?q=" + encodeURIComponent("Trình Cà Phê"));
    await expect(
      page.getByText("Trình Cà Phê · Phạm Như Xương").first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
