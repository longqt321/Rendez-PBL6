import { api, ApiError } from "@/lib/axios"

export type MediaFolder = "posts" | "places" | "avatars" | "covers"

export interface MediaUploadTicket {
  uploadUrl: string
  publicUrl: string
  key: string
  expiresAt: string
  headers: Record<string, string>
}

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
