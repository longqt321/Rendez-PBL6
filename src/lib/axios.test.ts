import { AxiosError, AxiosHeaders } from "axios"
import { describe, expect, it } from "vitest"
import { ApiError, toApiError } from "./axios"

/**
 * Lưu ý: import `./axios` ở môi trường test sẽ nạp cả mock adapter (dev) —
 * không gọi mạng, chỉ test hàm thuần `toApiError`.
 */

function axiosErrorWith(status: number, data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", {} as never, undefined, {
    data,
    status,
    statusText: "",
    headers: new AxiosHeaders(),
    config: {} as never,
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
    expect(error.message).toBe("Máy chủ trả lỗi — thử lại sau.")
  })

  it("lỗi không phải axios → giữ nguyên Error", () => {
    const original = new Error("lỗi khác")
    expect(toApiError(original)).toBe(original)
    expect(toApiError("chuỗi lạ").message).toBe("Lỗi không xác định")
  })
})
