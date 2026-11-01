import fs from "node:fs";
import path from "node:path";
import {
  type APIRequestContext,
  type Browser,
  type Page,
  expect,
} from "@playwright/test";

export interface E2ECredentials {
  user: { email: string; password: string };
  moderator: { email: string; password: string };
  staff_unprivileged: { email: string; password: string };
}

export function getE2ECredentials(): E2ECredentials {
  const credPath = path.resolve(
    process.cwd(),
    "../.local/e2e_credentials.json",
  );
  if (fs.existsSync(credPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, "utf-8"));
      return {
        user: parsed.user || {
          email: process.env.E2E_USER_EMAIL || "e2e-user@rendez.test",
          password: process.env.E2E_USER_PASSWORD || "",
        },
        moderator: parsed.moderator || {
          email: process.env.E2E_MODERATOR_EMAIL || "e2e-moderator@rendez.test",
          password: process.env.E2E_MODERATOR_PASSWORD || "",
        },
        staff_unprivileged: parsed.staff_unprivileged || {
          email:
            process.env.E2E_STAFF_UNPRIVILEGED_EMAIL ||
            "e2e-staff-unpriv@rendez.test",
          password: process.env.E2E_STAFF_UNPRIVILEGED_PASSWORD || "",
        },
      };
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
      password: process.env.E2E_MODERATOR_PASSWORD || "",
    },
    staff_unprivileged: {
      email:
        process.env.E2E_STAFF_UNPRIVILEGED_EMAIL ||
        "e2e-staff-unpriv@rendez.test",
      password: process.env.E2E_STAFF_UNPRIVILEGED_PASSWORD || "",
    },
  };
}

const cookieCache: Record<string, { name: string; value: string }[]> = {};
const csrfCache: Record<string, string> = {};

export async function loginViaApi(
  target: Page | APIRequestContext,
  role: keyof E2ECredentials = "user",
  options?: { forceFresh?: boolean },
) {
  const isPage = "context" in target;
  const creds = getE2ECredentials()[role];

  if (!options?.forceFresh && isPage && cookieCache[role]) {
    await target.context().addCookies(cookieCache[role]);
    return { csrfToken: csrfCache[role], creds };
  }

  const request = isPage ? target.request : target;

  const csrfRes = await request.get("/api/v1/auth/csrf/");
  expect(csrfRes.status()).toBe(200);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await request.post("/api/v1/auth/login/", {
    headers: { "X-CSRFToken": csrfToken },
    data: {
      email: creds.email,
      password: creds.password,
    },
  });
  expect(loginRes.status()).toBe(200);

  if (isPage) {
    const cookies = await target.context().cookies();
    cookieCache[role] = cookies;
    csrfCache[role] = csrfToken;
  }

  return { csrfToken, creds };
}

export async function getOrCreateStorageState(
  browser: Browser,
  role: keyof E2ECredentials = "user",
): Promise<string> {
  const authDir = path.resolve(process.cwd(), ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  const statePath = path.join(authDir, `${role}_state.json`);

  const context = await browser.newContext();
  await loginViaApi(context.request, role);
  await context.storageState({ path: statePath });
  await context.close();

  return statePath;
}
