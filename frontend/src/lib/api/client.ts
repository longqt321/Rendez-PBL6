import type { components } from "./generated";
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
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? "GET";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const bootstrap = await fetch("/api/v1/auth/csrf/", {
      credentials: "same-origin",
    });
    if (!bootstrap.ok)
      throw new ApiError(
        bootstrap.status,
        {},
        "Không xác nhận được phiên truy cập. Tải lại trang rồi thử lại.",
      );
    csrfToken = (await bootstrap.json()).csrfToken;
  }
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (csrfToken) headers.set("X-CSRFToken", csrfToken);
  const timeout = AbortSignal.timeout(20_000);
  const response = await fetch("/api/v1/" + path, {
    ...options,
    signal: options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("auth/"))
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
