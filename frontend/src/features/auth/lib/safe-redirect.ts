const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]

export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null
  // Ký tự điều khiển có thể bị trình duyệt cắt/hiểu khác — loại bỏ hẳn.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/u.test(raw)) return null
  if (
    AUTH_PATHS.some(
      (path) => raw === path || raw.startsWith(`${path}?`) || raw.startsWith(`${path}/`),
    )
  ) {
    return null
  }
  return raw
}
