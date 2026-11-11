import type { Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { createHmac, randomBytes } from "node:crypto"
import { env } from "../env"

/**
 * Transport của guest token phòng lọc nhóm — TÁCH MỘT CHỖ.
 *
 * Token gốc (32 byte ngẫu nhiên, base64url) nằm trong cookie HttpOnly theo
 * phòng; DB chỉ lưu HMAC-SHA256(token, BETTER_AUTH_SECRET). Nhờ vậy:
 * - `memberId` công khai trong DTO không thể dùng làm credential (hết IDOR).
 * - Cookie HttpOnly không đọc được từ JS (XSS không lấy được token).
 * - `Path=/api/v1/rooms/<code>` giới hạn cookie đúng phòng, không gửi kèm
 *   request của phòng khác.
 *
 * Muốn đổi sang header `x-room-token` sau này chỉ sửa file này.
 */

/** TTL 24h — khớp Max-Age của cookie và mốc dọn `last_seen_at`. */
export const ROOM_TOKEN_TTL_SECONDS = 24 * 60 * 60

export function roomCookieName(code: string): string {
  return `rendez_room_${code}`
}

function roomCookiePath(code: string): string {
  return `/api/v1/rooms/${code}`
}

/** Sinh token gốc mới — chỉ trả về client đúng một lần. */
export function issueRoomToken(): string {
  return randomBytes(32).toString("base64url")
}

/** Hash để lưu DB / so khớp — HMAC có secret nên lộ DB cũng không dựng lại token. */
export function hashRoomToken(rawToken: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(rawToken).digest("hex")
}

/** Đọc token gốc từ cookie của đúng phòng. */
export function readRoomToken(c: Context, code: string): string | undefined {
  return getCookie(c, roomCookieName(code))
}

/** Gắn cookie token cho phòng (HttpOnly, SameSite=Lax, Secure ở production). */
export function setRoomTokenCookie(c: Context, code: string, rawToken: string): void {
  setCookie(c, roomCookieName(code), rawToken, {
    httpOnly: true,
    sameSite: "Lax",
    path: roomCookiePath(code),
    maxAge: ROOM_TOKEN_TTL_SECONDS,
    secure: env.NODE_ENV === "production",
  })
}

/** Xoá cookie khi thành viên rời phòng. */
export function clearRoomTokenCookie(c: Context, code: string): void {
  deleteCookie(c, roomCookieName(code), { path: roomCookiePath(code) })
}
