import { useMutation } from "@tanstack/react-query"
import { register, type RegisterInput, type RegisterResult } from "../api/session"

/**
 * Đăng ký tài khoản.
 *
 * Từ 2026-11-12 bắt buộc xác thực email: đăng ký thành công KHÔNG tạo phiên —
 * backend trả `{requiresVerification: true}` và gửi mail xác thực. UI hiện
 * trạng thái "kiểm tra email" thay vì đưa vào app.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput): Promise<RegisterResult> => register(input),
  })
}
