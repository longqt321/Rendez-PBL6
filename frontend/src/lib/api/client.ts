import createClient, { type Middleware } from "openapi-fetch";
import type { paths, components } from "./generated";
import { mockResponse } from "./mock";

export type Profile = components["schemas"]["Profile"];
export type Category = components["schemas"]["Category"];
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export class ApiError extends Error {
  constructor(
    public status: number,
    public fields: Record<string, string[]>,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken = "";
let csrfBootstrap: Promise<string> | null = null;

async function loadCsrfToken(): Promise<string> {
  // Django CSRF tokens are stable for the lifetime of the session cookie, so
  // bootstrap once and reuse; a 403 CSRF rejection triggers a single refresh
  // below instead of paying an extra round trip before every mutation.
  if (!csrfBootstrap) {
    csrfBootstrap = (async () => {
      const bootstrap = await fetch("/api/v1/auth/csrf/", {
        credentials: "same-origin",
      });
      if (!bootstrap.ok)
        throw new ApiError(
          bootstrap.status,
          {},
          "Không xác nhận được phiên truy cập. Tải lại trang rồi thử lại.",
        );
      const data = (await bootstrap.json()) as { csrfToken: string };
      csrfToken = data.csrfToken;
      return csrfToken;
    })().catch((error) => {
      csrfBootstrap = null; // allow retrying the bootstrap on next call
      throw error;
    });
  }
  return csrfBootstrap;
}

/**
 * Modern Type-safe OpenAPI Fetch client
 */
export const openapi = createClient<paths>({
  baseUrl: "",
  credentials: "same-origin",
});

const csrfMiddleware: Middleware = {
  async onRequest({ request, schemaPath }) {
    const method = request.method;
    const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
    if (needsCsrf && !csrfToken) {
      await loadCsrfToken();
    }
    if (csrfToken) {
      request.headers.set("X-CSRFToken", csrfToken);
    }
    return request;
  },
  async onResponse({ response, request }) {
    if (response.status === 401) {
      const url = new URL(request.url);
      const pathname = url.pathname;
      if (
        ![
          "/api/v1/auth/login/",
          "/api/v1/auth/register/",
          "/api/v1/auth/csrf/",
          "/api/v1/auth/logout/",
          "/api/v1/auth/me/",
        ].includes(pathname)
      ) {
        window.dispatchEvent(new Event("rendez:session-expired"));
      }
    }
    return response;
  },
};

openapi.use(csrfMiddleware);

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (needsCsrf && !csrfToken) await loadCsrfToken();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (csrfToken) headers.set("X-CSRFToken", csrfToken);
  const timeout = AbortSignal.timeout(20_000);
  let response: Response;
  try {
    response = await fetch("/api/v1/" + path, {
      ...options,
      signal: options.signal
        ? AbortSignal.any([options.signal, timeout])
        : timeout,
      headers,
      credentials: "same-origin",
    });
  } catch (error) {
    // Fetch thất bại hoàn toàn (mạng chết, API không chạy): GET đọc-đọc rơi
    // về mock để giao diện vẫn xem được khi backend không có. Mutation không
    // mock — thao tác chưa thành công thì không được báo thành công.
    if (
      error instanceof TypeError &&
      !needsCsrf &&
      !options.signal &&
      mockResponse(path) !== null
    ) {
      return mockResponse(path) as T;
    }
    throw error;
  }
  if (
    needsCsrf &&
    response.status === 403 &&
    csrfToken &&
    !new Headers(options.headers).get("X-CSRFToken-Retry")
  ) {
    // Stale or missing CSRF token (e.g. session cookie rotated): refresh once
    // and replay the mutation instead of surfacing an error to the user.
    csrfBootstrap = null;
    csrfToken = "";
    const retryHeaders = new Headers(options.headers);
    retryHeaders.set("X-CSRFToken-Retry", "1");
    return api<T>(path, {
      ...options,
      headers: retryHeaders,
    });
  }
  if (!response.ok) {
    // Backend chết/quá tải (5xx) hoặc chưa đăng nhập (401 trên endpoint đọc):
    // GET rơi về mock để giao diện vẫn xem được không cần backend. Mutation
    // không mock — thao tác chưa thành công thì không được báo thành công.
    if (!needsCsrf && response.status >= 500) {
      const mock = mockResponse(path);
      if (mock !== null) return mock as T;
    }
    if (
      response.status === 401 &&
      ![
        "auth/login/",
        "auth/register/",
        "auth/csrf/",
        "auth/logout/",
        "auth/me/",
      ].includes(path.split("?")[0])
    )
      window.dispatchEvent(new Event("rendez:session-expired"));
    const error = await response
      .json()
      .catch(() => ({ message: "Không tải được nội dung." }));
    throw new ApiError(
      response.status,
      error.fields ?? {},
      error.message ?? "Không tải được nội dung.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const currency = (value: number | null | undefined) =>
  value == null
    ? "Chưa có dữ liệu giá"
    : new Intl.NumberFormat("vi-VN").format(value) + " đ";
export const date = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export function discoveryQuery(params: URLSearchParams) {
  const query = new URLSearchParams();
  for (const key of ["q", "category", "attributes", "sort", "page"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return query;
}
