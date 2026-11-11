import { api, ApiError } from "@/lib/axios"

/**
 * Tải ảnh qua presigned URL của R2 — MỘT nơi dùng chung cho ảnh bài đăng và
 * ảnh hồ sơ (avatar/ảnh bìa), tránh hai bản logic lệch nhau.
 *
 * `POST /media` trả `{uploadUrl, publicUrl, key, expiresAt, headers}`; client
 * PUT file vào `uploadUrl` rồi dùng `publicUrl`. 503 = môi trường chưa cấu hình
 * R2 — UI ẩn/tắt nút upload thay vì báo lỗi khó hiểu.
 */

/** Thư mục hợp lệ — khớp whitelist `folder` của backend (`routes/media.ts`). */
export type MediaFolder = "posts" | "places" | "avatars" | "covers"

export interface MediaUploadTicket {
  uploadUrl: string
  publicUrl: string
  key: string
  expiresAt: string
  headers: Record<string, string>
}

/** 503 — tính năng ảnh chưa được cấu hình phía server. */
export function isMediaUnavailableError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503
}

export async function requestMediaUpload(
  folder: MediaFolder,
  contentType: string,
): Promise<MediaUploadTicket> {
  const { data } = await api.post<MediaUploadTicket>("/media", { folder, contentType })
  return data
}

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
export async function uploadMediaFile(file: File, ticket: MediaUploadTicket): Promise<string> {
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
