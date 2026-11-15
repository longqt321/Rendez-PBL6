import axios from "axios"
import { toast } from "sonner"
import { checkApiContract } from "@/lib/api-contracts"
import { env } from "@/lib/env"
import { getAnonId } from "@/lib/events"
import { safeRedirectPath } from "@/features/auth/lib/safe-redirect"

declare module "axios" {
  export interface AxiosRequestConfig {
    authRequired?: boolean
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export function toApiError(error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error("Lỗi không xác định")
  }

  const status = error.response?.status ?? 0
  const body = error.response?.data as
    { message?: unknown; detail?: unknown; code?: unknown } | undefined
  const serverMessage = [body?.message, body?.detail].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  )
  const message =
    serverMessage ??
    (status === 0
      ? "Không kết nối được máy chủ — kiểm tra mạng rồi thử lại."
      : "Máy chủ trả lỗi — thử lại sau.")
  const code = typeof body?.code === "string" ? body.code : undefined
  return new ApiError(message, status, code)
}

const mockAdapter =
  import.meta.env.DEV && env.enableMocks ? (await import("@/mocks/server")).mockAdapter : undefined

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
  adapter: mockAdapter,

  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const id = getAnonId()
  if (id) config.headers.set("x-anon-id", id)
  return config
})

export const SESSION_CHANNEL = "rendez-session"

interface SessionMessage {
  type: "logout"
}

export const sessionRedirect = {
  delayMs: 1_200,
  to(url: string): void {
    window.location.assign(url)
  },
}

export function loginRedirectUrl(currentPath: string): string {
  const safe = safeRedirectPath(currentPath) ?? "/"
  return `/login?next=${encodeURIComponent(safe)}`
}

/**
 * Request mà 401 KHÔNG có nghĩa "phiên hết hạn" — không được điều hướng.
 *
 * Nguyên tắc: **mặc định KHÔNG điều hướng**. Chỉ request do người dùng chủ động
 * gây ra (mutation) hoặc GET được đánh dấu tường minh `authRequired: true` mới
 * bị coi là dấu hiệu mất phiên. Lý do: trang công khai bắn nhiều GET có thể trả
 * 401 với khách (poll `/notifications`, `/saved`, `/me`…); điều hướng theo các
 * 401 đó sẽ đá khách khỏi `/discover`, `/search`, `/collections` — đúng lỗi F3
 * phát hiện sau bản đầu của interceptor.
 *
 * - `/auth/*`, `/register`, `/session`: 401 là kết quả nghiệp vụ (sai mật khẩu,
 *   token sai) — điều hướng sẽ tạo vòng lặp ngay trên trang đăng nhập.
 * - GET/HEAD không có cờ `authRequired`: phép DÒ dữ liệu; khách nhận 401 là
 *   bình thường (badge thông báo ẩn, danh sách rỗng) — bỏ qua im lặng.
 */
export function isSessionProbeRequest(config: {
  url?: string
  method?: string
  authRequired?: boolean
}): boolean {
  const path = (config.url ?? "").split("?")[0] ?? ""
  const method = (config.method ?? "get").toLowerCase()
  if (path.startsWith("/auth/") || path === "/register" || path === "/session") return true
  if (method === "get" || method === "head") return config.authRequired !== true
  return false
}

export function isSessionEndingRequest(config: { url?: string; method?: string }): boolean {
  const path = (config.url ?? "").split("?")[0] ?? ""
  const method = (config.method ?? "").toLowerCase()
  return method === "delete" && (path === "/session" || path === "/me")
}

let sessionExpiryHandled = false

let sessionActive = false

export function noteSessionState(active: boolean): void {
  sessionActive = active
}

let sessionChannel: BroadcastChannel | null = null

function getSessionChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null
  sessionChannel ??= new BroadcastChannel(SESSION_CHANNEL)
  return sessionChannel
}

function clearSessionAndRedirect(notice: { title: string; description: string }) {
  toast.error(notice.title, { description: notice.description })

  const current = window.location.pathname + window.location.search
  if (window.location.pathname.startsWith("/login")) return
  const target = loginRedirectUrl(current)
  // Trễ để toast kịp đọc; điều hướng cả trang xoá cache query của phiên cũ.
  window.setTimeout(() => sessionRedirect.to(target), sessionRedirect.delayMs)
}

function handleRemoteLogout() {
  clearSessionAndRedirect({
    title: "Bạn đã đăng xuất ở tab khác",
    description: "Đăng nhập lại để tiếp tục tương tác.",
  })
}

getSessionChannel()?.addEventListener("message", (event: MessageEvent) => {
  if ((event.data as SessionMessage | null | undefined)?.type !== "logout") return
  handleRemoteLogout()
})

function isMeProbe(config: { url?: string; method?: string }): boolean {
  return (
    (config.url ?? "").split("?")[0] === "/me" && (config.method ?? "get").toLowerCase() === "get"
  )
}

export function handleUnauthorizedResponse(error: unknown): Error {
  const apiError = toApiError(error)
  const config = axios.isAxiosError(error) ? error.config : undefined
  if (config && isMeProbe(config)) noteSessionState(false)
  if (
    apiError instanceof ApiError &&
    apiError.status === 401 &&
    config &&
    !isSessionProbeRequest(config) &&
    !sessionExpiryHandled
  ) {
    sessionExpiryHandled = true
    clearSessionAndRedirect(
      sessionActive
        ? {
            title: "Phiên đăng nhập đã hết hạn",
            description: "Vui lòng đăng nhập lại để tiếp tục.",
          }
        : {
            title: "Đăng nhập để tiếp tục",
            description: "Bạn cần đăng nhập để thực hiện thao tác này.",
          },
    )
    sessionActive = false
  }
  return apiError
}

export function resetSessionExpiry(): void {
  sessionExpiryHandled = false
  sessionActive = false
}

api.interceptors.response.use(
  (response) => {
    const config = response.config
    if (isMeProbe(config)) noteSessionState(true)
    if (
      (config.url ?? "").split("?")[0] === "/session" &&
      (config.method ?? "").toLowerCase() === "post"
    ) {
      resetSessionExpiry()
    }
    // Đăng xuất / xoá tài khoản thành công → báo các tab còn mở.
    if (isSessionEndingRequest(config)) {
      noteSessionState(false)
      getSessionChannel()?.postMessage({ type: "logout" } satisfies SessionMessage)
    }
    return response
  },
  (error: unknown) => Promise.reject(handleUnauthorizedResponse(error)),
)

if (env.enableMocks) {
  api.interceptors.response.use((response) => {
    const method = (response.config.method ?? "get").toUpperCase()
    const url = response.config.url ?? ""
    const message = checkApiContract(method, url, response.data)
    if (message) {
      console.error(`[API contract] ${method} ${url.split("?")[0]}: ${message}`)
    }
    return response
  })
}
