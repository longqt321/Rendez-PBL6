import type { MediaUploadTicket } from "./request-media-upload"

/**
 * PUT file vào URL đã ký — fetch thuần, KHÔNG dùng axios instance.
 *
 * `uploadUrl` là URL tuyệt đối của R2; axios instance có `baseURL` `/api/v1`
 * sẽ phá URL đó (hoặc phải cấu hình riêng). `headers` do server ký (Content-Type)
 * nên gửi nguyên, cộng thêm đúng `Content-Type` của file.
 *
 * Mock dev không có storage thật: `POST /media` của mock trả `uploadUrl` trên
 * host `mock-r2.test` mà fetch sẽ thất bại — bỏ qua bước PUT và dùng `publicUrl`
 * luôn (mock coi như upload thành công).
 */

const MOCK_UPLOAD_HOST = "mock-r2.test"

export async function uploadPostImage(file: File, ticket: MediaUploadTicket): Promise<string> {
  if (new URL(ticket.uploadUrl).host === MOCK_UPLOAD_HOST) {
    // Mock: không có server thật để PUT — server giả coi file đã đến nơi.
    return ticket.publicUrl
  }

  const response = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: { ...ticket.headers, "Content-Type": file.type },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Không tải được ảnh lên kho lưu trữ (HTTP ${response.status})`)
  }
  return ticket.publicUrl
}
