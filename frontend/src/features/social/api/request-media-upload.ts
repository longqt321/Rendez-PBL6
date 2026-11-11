import { api, ApiError } from "@/lib/axios"

/**
 * `POST /media` — xin URL PUT đã ký để tải ảnh thẳng lên R2.
 *
 * Server trả `{uploadUrl, publicUrl, key, expiresAt, headers}`; client PUT file
 * vào `uploadUrl` rồi dùng `publicUrl` trong bài đăng. 503 = môi trường chưa
 * cấu hình R2 — UI ẩn nút upload thay vì báo lỗi khó hiểu.
 */

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
  folder: "posts" | "places",
  contentType: string,
): Promise<MediaUploadTicket> {
  const { data } = await api.post<MediaUploadTicket>("/media", { folder, contentType })
  return data
}
