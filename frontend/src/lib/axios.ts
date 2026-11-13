import axios from "axios"
import { toast } from "sonner"
import { checkApiContract } from "@/lib/api-contracts"
import { env } from "@/lib/env"
import { getAnonId } from "@/lib/events"
import { safeRedirectPath } from "@/features/auth/lib/safe-redirect"

/**
 * Cờ tuỳ biến gắn vào request: request CẦN đăng nhập, nên 401 từ nó là dấu hiệu
 * mất phiên (interceptor điều hướng `/login?next=`). Mặc định không đặt → 401
 * của GET được coi là phép dò và bỏ qua im lặng.
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    authRequired?: boolean
  }
}

/**
 * Lỗi API đã chuẩn hoá — UI chỉ cần đọc `message`/`status`.
 *
 * Backend trả `{ message }` hoặc `{ detail }` (FastAPI) đều được nhận; lỗi mạng
 * (timeout, mất kết nối) có `status = 0`.
 */
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

/**
 * Lỗi 404 từ server — tài nguyên không tồn tại (khác lỗi mạng/5xx, nơi thử lại
 * có ích). Trang chi tiết dùng để chọn "không tìm thấy" hay "không tải được".
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * Lỗi 401 từ server — chưa đăng nhập. Không retry: phiên không tự khôi phục,
 * thử lại cũng chỉ 401; UI dùng để hiện trạng thái "chưa đăng nhập".
 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

/**
 * Chuyển mọi lỗi axios thành `ApiError` (hoặc giữ nguyên `Error` khác).
 * Tách khỏi interceptor để test được mà không cần gọi mạng.
 */
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

/**
 * Adapter mock chỉ nạp ở dev (`VITE_ENABLE_MOCKS !== "false"`). Điều kiện dùng
 * `import.meta.env.DEV` trực tiếp để Vite loại `src/mocks/` khỏi bundle production.
 */
const mockAdapter =
  import.meta.env.DEV && env.enableMocks ? (await import("@/mocks/server")).mockAdapter : undefined

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
  adapter: mockAdapter,
  /**
   * Cookie phiên + cookie guest token phòng (`rendez_room_<code>`) phải đi kèm.
   * Cùng origin qua proxy Vite thì trình duyệt tự gửi; bật `withCredentials` để
   * trường hợp `VITE_API_BASE_URL` là origin khác cũng hoạt động đúng.
   */
  withCredentials: true,
})

/**
 * Header `x-anon-id` — id ẩn danh của guest (cùng id BE dùng cho `POST /events`)
 * để BE ghi được tín hiệu search/detail-view của người CHƯA đăng nhập (P0).
 * Logic đọc/tạo id nằm ở `lib/events.ts` (một nguồn duy nhất); lỗi storage bị
 * nuốt trong đó — không bao giờ chặn request.
 */
api.interceptors.request.use((config) => {
  const id = getAnonId()
  if (id) config.headers.set("x-anon-id", id)
  return config
})

/** Tên kênh đồng bộ phiên giữa các tab (V8-07). */
export const SESSION_CHANNEL = "rendez-session"

interface SessionMessage {
  type: "logout"
}

/**
 * Điều hướng khi mất phiên. Tách thành object để test thay được (jsdom không
 * điều hướng thật) và để chỉnh độ trễ.
 *
 * Điều hướng CẢ TRANG thay vì SPA: cache query trong bộ nhớ bị xoá sạch nên
 * (a) không còn dữ liệu riêng tư của phiên cũ, (b) trang đăng nhập không thấy
 * `["me"]` cũ rồi đá ngược người dùng về trang cũ. `delayMs` để toast kịp hiện
 * trước khi trang tải lại — nếu điều hướng ngay, thông báo "Phiên đăng nhập đã
 * hết hạn" biến mất trước khi người dùng đọc được.
 */
export const sessionRedirect = {
  delayMs: 1_200,
  to(url: string): void {
    window.location.assign(url)
  },
}

/**
 * URL trang đăng nhập kèm `?next=` để quay lại đúng chỗ sau khi đăng nhập.
 *
 * Dùng lại `safeRedirectPath()` (nguồn duy nhất cho logic chống open redirect —
 * chặn cả `/\evil.com` lẫn ký tự điều khiển) thay vì tự viết bộ lọc yếu hơn.
 */
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

/** Request kết thúc phiên (đăng xuất / xoá tài khoản) — cần báo các tab khác. */
export function isSessionEndingRequest(config: { url?: string; method?: string }): boolean {
  const path = (config.url ?? "").split("?")[0] ?? ""
  const method = (config.method ?? "").toLowerCase()
  return method === "delete" && (path === "/session" || path === "/me")
}

/** Đã xử lý mất phiên trong tab này chưa — tránh toast/điều hướng lặp. */
let sessionExpiryHandled = false

/**
 * Tab này có phiên đăng nhập đang hoạt động hay không — cập nhật từ kết quả
 * `GET /me` (200 → có; 401 → không). Dùng để chọn đúng thông điệp khi mutation
 * nhận 401: khách chưa đăng nhập cần lời MỜI, người dùng hết hạn cần lời BÁO.
 */
let sessionActive = false

/** Ghi nhận trạng thái phiên sau một phép dò `GET /me`. */
export function noteSessionState(active: boolean): void {
  sessionActive = active
}

/**
 * Kênh BroadcastChannel dùng chung; `null` khi môi trường không hỗ trợ
 * (trình duyệt cũ, jsdom bản không có) — khi đó chỉ mất tính năng đồng bộ tab.
 */
let sessionChannel: BroadcastChannel | null = null

function getSessionChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null
  sessionChannel ??= new BroadcastChannel(SESSION_CHANNEL)
  return sessionChannel
}

/**
 * Báo mất phiên rồi đưa người dùng về trang đăng nhập (giữ đường quay lại).
 *
 * Đang ở trang đăng nhập rồi thì không điều hướng nữa (tránh vòng lặp).
 */
function clearSessionAndRedirect(notice: { title: string; description: string }) {
  toast.error(notice.title, { description: notice.description })

  const current = window.location.pathname + window.location.search
  if (window.location.pathname.startsWith("/login")) return
  const target = loginRedirectUrl(current)
  // Trễ để toast kịp đọc; điều hướng cả trang xoá cache query của phiên cũ.
  window.setTimeout(() => sessionRedirect.to(target), sessionRedirect.delayMs)
}

/**
 * Tab khác vừa đăng xuất → tab này cũng mất phiên (cookie dùng chung). Không
 * làm gì thì UI vẫn hiện đang đăng nhập và mọi thao tác 401 im lặng (V8-07).
 */
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

/** `GET /me` — phép dò phiên; kết quả của nó cập nhật `sessionActive`. */
function isMeProbe(config: { url?: string; method?: string }): boolean {
  return (
    (config.url ?? "").split("?")[0] === "/me" && (config.method ?? "get").toLowerCase() === "get"
  )
}

/**
 * 401 từ một request người dùng chủ động (like/follow/comment…) → không có
 * phiên hợp lệ. Trước đây lỗi bị nuốt: nút like bật lại mà không nói gì, người
 * dùng tưởng app hỏng (V6-02, V8-07).
 *
 * Thông điệp chia hai trường hợp: khách chưa đăng nhập được MỜI đăng nhập
 * (V6-03), người dùng vừa mất phiên được BÁO hết hạn.
 *
 * Trả về `ApiError` đã chuẩn hoá để interceptor reject tiếp — nhờ vậy hàm này
 * test được trực tiếp, không phải giả lập mạng.
 */
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

/** Đăng nhập lại thành công → cho phép bắt lỗi 401 của phiên mới. */
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

/**
 * Contract test response khi mock bật: đối chiếu `response.data` với schema zod
 * của endpoint. Lệch hợp đồng chỉ `console.error` — không throw, không làm vỡ UI.
 * Chỉ đăng ký khi mock bật (dev) để production không chịu chi phí kiểm tra.
 */
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
