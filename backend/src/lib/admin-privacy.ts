import { isIPv4, isIPv6 } from "node:net"
import type { AdminRuntimeEnv } from "@rendez/schema"
import { maskEmail2 } from "maskdata"
import { env } from "../env"

const EMAIL_MASK_OPTIONS = {
  maskWith: "*",
  unmaskedStartCharactersBeforeAt: 2,
  unmaskedEndCharactersAfterAt: 257,
  maskAtTheRate: false,
} as const

const IPV4_UNMASKED_OCTETS = 3
const IPV6_UNMASKED_GROUPS = 3
const MAX_OBSERVABILITY_MESSAGE_LEN = 160
const ELLIPSIS = "..."

/**
 * Xác định môi trường vận hành hiển thị cho Admin Portal.
 * Ưu tiên `APP_ENV` nếu đặt tường minh (hỗ trợ `staging`), ngược lại suy từ `NODE_ENV`.
 */
export function resolveAdminRuntimeEnv(
  nodeEnv: string = process.env.NODE_ENV ?? env.NODE_ENV,
  appEnv: string | undefined = process.env.APP_ENV,
): AdminRuntimeEnv {
  const normalizedApp = appEnv?.trim().toLowerCase()
  if (
    normalizedApp === "production" ||
    normalizedApp === "staging" ||
    normalizedApp === "development"
  ) {
    return normalizedApp
  }
  if (nodeEnv === "production") return "production"
  return "development"
}

export function shouldMaskAdminPii(
  runtimeEnv: AdminRuntimeEnv = resolveAdminRuntimeEnv(),
): boolean {
  return runtimeEnv !== "development"
}

/** Che phần định danh của email bằng `maskdata` khi chạy ở staging/production. */
export function maskEmailForAdmin(email: string, mask: boolean): string {
  if (!mask) return email
  if (!email.includes("@")) return "***"
  return maskEmail2(email, EMAIL_MASK_OPTIONS)
}

/** Che phần định danh cuối của địa chỉ IP (dùng `node:net` kiểm chuẩn IPv4/IPv6). */
export function maskIpForAdmin(ip: string | null, mask: boolean): string | null {
  if (!ip || !mask) return ip
  if (isIPv4(ip)) {
    return `${ip.split(".").slice(0, IPV4_UNMASKED_OCTETS).join(".")}.***`
  }
  if (isIPv6(ip)) {
    const groups = ip.split(":").filter(Boolean)
    if (groups.length >= IPV6_UNMASKED_GROUPS) {
      return `${groups.slice(0, IPV6_UNMASKED_GROUPS).join(":")}:****`
    }
  }
  return "***"
}

/** Loại bỏ stack trace và đường dẫn nội bộ khi trả log lỗi về Admin trên staging/production. */
export function sanitizeObservabilityMessage(
  message: string | undefined,
  mask: boolean,
): string | undefined {
  if (!message || !mask) return message
  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? ""
  const withoutPaths = firstLine
    .replace(/(?:\/[a-zA-Z0-9._-]+){2,}(?::\d+(?::\d+)?)?/g, "[internal-path]")
    .replace(/[A-Za-z]:\\[^\s]+/g, "[internal-path]")
  if (withoutPaths.length <= MAX_OBSERVABILITY_MESSAGE_LEN) return withoutPaths
  return `${withoutPaths.slice(0, MAX_OBSERVABILITY_MESSAGE_LEN - ELLIPSIS.length)}${ELLIPSIS}`
}
