import { AxiosError, AxiosHeaders } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  ApiError,
  SESSION_CHANNEL,
  handleUnauthorizedResponse,
  isNotFoundError,
  isSessionEndingRequest,
  isSessionProbeRequest,
  noteSessionState,
  loginRedirectUrl,
  resetSessionExpiry,
  sessionRedirect,
  toApiError,
} from "./axios"

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

import { toast } from "sonner"

function axiosErrorWith(status: number, data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", {} as never, undefined, {
    data,
    status,
    statusText: "",
    headers: new AxiosHeaders(),
    config: {} as never,
  })
}

function axiosErrorFor(
  status: number,
  data: unknown,
  request: { url: string; method: string },
): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", request as never, undefined, {
    data,
    status,
    statusText: "",
    headers: new AxiosHeaders(),
    config: request as never,
  })
}

describe("toApiError", () => {
  it("đọc `message` từ body backend", () => {
    const error = toApiError(axiosErrorWith(400, { message: "Tên bộ sưu tập trống" }))
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect(error.message).toBe("Tên bộ sưu tập trống")
  })

  it("đọc `detail` (kiểu FastAPI) khi không có `message`", () => {
    const error = toApiError(axiosErrorWith(404, { detail: "Không tìm thấy địa điểm" }))
    expect(error.message).toBe("Không tìm thấy địa điểm")
    expect((error as ApiError).status).toBe(404)
  })

  it("lỗi mạng → status 0 và thông báo tiếng Việt", () => {
    const error = toApiError(new AxiosError("Network Error", "ERR_NETWORK"))
    expect((error as ApiError).status).toBe(0)
    expect(error.message).toContain("Không kết nối được máy chủ")
  })

  it("body không có thông điệp → thông báo chung theo status", () => {
    const error = toApiError(axiosErrorWith(500, {}))
    expect(error.message).toBe("Có lỗi từ máy chủ, vui lòng thử lại sau.")
  })

  it("lỗi không phải axios → giữ nguyên Error", () => {
    const original = new Error("lỗi khác")
    expect(toApiError(original)).toBe(original)
    expect(toApiError("chuỗi lạ").message).toBe("Lỗi không xác định")
  })
})

describe("isNotFoundError", () => {
  it("chỉ đúng với ApiError 404", () => {
    expect(isNotFoundError(toApiError(axiosErrorWith(404, { detail: "x" })))).toBe(true)
    expect(isNotFoundError(toApiError(axiosErrorWith(500, { detail: "x" })))).toBe(false)
    expect(isNotFoundError(toApiError(new AxiosError("Network Error", "ERR_NETWORK")))).toBe(false)
    expect(isNotFoundError(new Error("lỗi thường"))).toBe(false)
  })
})

describe("handleUnauthorizedResponse", () => {
  let redirect: ReturnType<typeof vi.fn<(url: string) => void>>

  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    redirect = vi.fn<(url: string) => void>()
    sessionRedirect.to = redirect
    resetSessionExpiry()
    sessionRedirect.delayMs = 0
    window.history.replaceState(null, "", "/")
  })

  it("401 từ mutation khi đang có phiên → báo hết hạn + điều hướng /login?next=", async () => {
    window.history.replaceState(null, "", "/social")
    noteSessionState(true)
    const error = axiosErrorFor(
      401,
      { message: "Chưa đăng nhập" },
      {
        url: "/posts/abc/like",
        method: "patch",
      },
    )

    const result = handleUnauthorizedResponse(error)
    expect(result).toBeInstanceOf(ApiError)
    expect((result as ApiError).status).toBe(401)
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Phiên đăng nhập đã hết hạn", {
      description: "Vui lòng đăng nhập lại để tiếp tục.",
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/social")}`)
  })

  it("401 từ mutation khi là khách → MỜI đăng nhập (V6-03), vẫn điều hướng", async () => {
    window.history.replaceState(null, "", "/u/quet_vong1")
    const error = axiosErrorFor(
      401,
      { message: "Chưa đăng nhập" },
      {
        url: "/users/quet_vong1/follow",
        method: "post",
      },
    )

    handleUnauthorizedResponse(error)
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Đăng nhập để tiếp tục", {
      description: "Bạn cần đăng nhập để thực hiện thao tác này.",
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/u/quet_vong1")}`)
  })

  it("401 từ GET /notifications (guest poll) → KHÔNG điều hướng, không toast", () => {
    window.history.replaceState(null, "", "/search?q=quet")
    const error = axiosErrorFor(
      401,
      { message: "Chưa đăng nhập" },
      {
        url: "/notifications?unread=true",
        method: "get",
      },
    )

    handleUnauthorizedResponse(error)
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("401 từ GET công khai khác (/posts, /places) → không điều hướng", () => {
    for (const url of ["/posts?filter=all", "/places", "/users/abc"]) {
      handleUnauthorizedResponse(axiosErrorFor(401, {}, { url, method: "get" }))
    }
    expect(redirect).not.toHaveBeenCalled()
  })

  it("GET có cờ authRequired (trang riêng tư) → vẫn coi là mất phiên", async () => {
    window.history.replaceState(null, "", "/profile")
    noteSessionState(true)
    const error = axiosErrorFor(401, {}, { url: "/saved", method: "get" })
    // `authRequired` là cờ tuỳ biến của axios config.
    ;(error.response?.config as { authRequired?: boolean }).authRequired = true

    handleUnauthorizedResponse(error)
    await new Promise((r) => setTimeout(r, 0))
    expect(redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/profile")}`)
  })

  it("401 từ POST /session (sai mật khẩu) → không toast, không điều hướng", () => {
    const error = axiosErrorFor(
      401,
      { message: "Email hoặc mật khẩu không đúng" },
      {
        url: "/session",
        method: "post",
      },
    )

    handleUnauthorizedResponse(error)
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("401 từ GET /me (khách dò phiên lúc mở app) → không điều hướng", () => {
    const error = axiosErrorFor(
      401,
      { message: "Chưa đăng nhập" },
      {
        url: "/me",
        method: "get",
      },
    )

    handleUnauthorizedResponse(error)
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("401 thứ hai trong cùng phiên không lặp toast/điều hướng", async () => {
    const error = axiosErrorFor(401, {}, { url: "/posts/abc/like", method: "patch" })

    handleUnauthorizedResponse(error)
    handleUnauthorizedResponse(error)
    await new Promise((r) => setTimeout(r, 0))
    expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledTimes(1)
  })

  it("lỗi khác 401 → chỉ reject, không đụng phiên", () => {
    const error = axiosErrorFor(
      500,
      { message: "Lỗi server" },
      {
        url: "/posts",
        method: "get",
      },
    )

    const result = handleUnauthorizedResponse(error)
    expect((result as ApiError).status).toBe(500)
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})

describe("loginRedirectUrl", () => {
  it("path nội bộ → giữ nguyên kèm next", () => {
    expect(loginRedirectUrl("/social")).toBe(`/login?next=${encodeURIComponent("/social")}`)
  })

  it("path rỗng/không hợp lệ → về trang chủ", () => {
    expect(loginRedirectUrl("")).toBe(`/login?next=${encodeURIComponent("/")}`)
  })

  it("chặn open redirect: //evil.com và URL tuyệt đối → về /", () => {
    expect(loginRedirectUrl("//evil.com")).toBe(`/login?next=${encodeURIComponent("/")}`)
    expect(loginRedirectUrl("https://evil.com")).toBe(`/login?next=${encodeURIComponent("/")}`)
  })
})

describe("isSessionProbeRequest", () => {
  it("endpoint đăng nhập → true (401 là kết quả nghiệp vụ)", () => {
    expect(isSessionProbeRequest({ url: "/session", method: "post" })).toBe(true)
    expect(isSessionProbeRequest({ url: "/register", method: "post" })).toBe(true)
    expect(isSessionProbeRequest({ url: "/auth/request-password-reset", method: "post" })).toBe(
      true,
    )
  })

  it("GET mặc định là phép dò → true (guest không bị đá khỏi trang công khai)", () => {
    expect(isSessionProbeRequest({ url: "/me", method: "get" })).toBe(true)
    expect(isSessionProbeRequest({ url: "/notifications?unread=true", method: "get" })).toBe(true)
    expect(isSessionProbeRequest({ url: "/saved", method: "get" })).toBe(true)
  })

  it("GET có authRequired tường minh → false", () => {
    expect(isSessionProbeRequest({ url: "/saved", method: "get", authRequired: true })).toBe(false)
  })

  it("mutation nghiệp vụ → false (401 nghĩa là mất phiên)", () => {
    expect(isSessionProbeRequest({ url: "/posts/1/like", method: "patch" })).toBe(false)
    expect(isSessionProbeRequest({ url: "/users/abc/follow", method: "post" })).toBe(false)
    expect(isSessionProbeRequest({ url: "/posts/1/comments", method: "post" })).toBe(false)
    expect(isSessionProbeRequest({ url: "/me", method: "delete" })).toBe(false)
  })
})

describe("isSessionEndingRequest", () => {
  it("DELETE /session và DELETE /me kết thúc phiên", () => {
    expect(isSessionEndingRequest({ url: "/session", method: "delete" })).toBe(true)
    expect(isSessionEndingRequest({ url: "/me", method: "delete" })).toBe(true)
  })

  it("method khác → false", () => {
    expect(isSessionEndingRequest({ url: "/session", method: "post" })).toBe(false)
    expect(isSessionEndingRequest({ url: "/posts/1", method: "delete" })).toBe(false)
  })
})

/** Đồng bộ đa tab (V8-07): tên kênh cố định để test/browser cùng dùng. */
describe("SESSION_CHANNEL", () => {
  it("tên kênh là hằng số rendez-session", () => {
    expect(SESSION_CHANNEL).toBe("rendez-session")
  })
})
