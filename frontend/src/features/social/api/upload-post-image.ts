import type { MediaUploadTicket } from "./request-media-upload"

/**
 * PUT file vào URL đã ký — fetch thuần, KHÔNG dùng axios instance.
 *
 * `uploadUrl` là URL tuyệt đối của R2; axios instance có `baseURL` `/api/v1`
 * sẽ phá URL đó (hoặc phải cấu hình riêng). `headers` do server ký (Content-Type)
 * nên gửi nguyên, cộng thêm đúng `Content-Type` của file.
 *
 * Mock dev tự chặn PUT tới storage giả bằng monkey-patch `fetch` trong
 * `src/mocks/` — code thật không biết gì về môi trường mock.
 */
export async function uploadPostImage(file: File, ticket: MediaUploadTicket): Promise<string> {
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
