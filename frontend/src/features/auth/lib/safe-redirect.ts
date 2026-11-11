/**
 * Đường đi sau đăng nhập từ tham số `?next=` — chống open redirect.
 *
 * `next` do route bảo vệ gắn khi đẩy người dùng về `/login` (F3). Chỉ chấp nhận
 * path relative bắt đầu bằng `/`: mọi URL tuyệt đối (`https://…`), path giao
 * thức-độc-lập (`//evil.com`) hay backslash (`/\evil.com`) đều bị từ chối để
 * không dẫn người dùng ra origin lạ sau khi đăng nhập.
 */

/** Các path auth — cho về lại chính nó là vòng lặp vô nghĩa. */
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
