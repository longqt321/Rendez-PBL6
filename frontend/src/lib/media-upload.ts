import {
  ConsecutiveBreaker,
  ExponentialBackoff,
  TimeoutStrategy,
  circuitBreaker,
  handleAll,
  retry,
  timeout,
  wrap,
} from "cockatiel"
import { api, ApiError } from "@/lib/axios"

export type MediaFolder = "posts" | "places" | "avatars" | "covers"

export interface MediaUploadTicket {
  uploadUrl: string
  publicUrl: string
  fallbackUploadUrl?: string
  fallbackPublicUrl?: string
  key: string
  expiresAt: string
  headers: Record<string, string>
}

const r2UploadPolicy = wrap(
  retry(handleAll, {
    maxAttempts: 2,
    backoff: new ExponentialBackoff({ initialDelay: 150, maxDelay: 800 }),
  }),
  circuitBreaker(handleAll, {
    halfOpenAfter: 30_000,
    breaker: new ConsecutiveBreaker(2),
  }),
  timeout(5_000, TimeoutStrategy.Aggressive),
)

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

async function putFile(
  url: string,
  file: File,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": file.type },
    body: file,
    signal,
  })
  if (!response.ok) {
    throw new Error(`Không tải được ảnh lên kho lưu trữ (HTTP ${response.status})`)
  }
}

export async function uploadMediaFile(file: File, ticket: MediaUploadTicket): Promise<string> {
  try {
    await r2UploadPolicy.execute(async ({ signal }) => {
      await putFile(ticket.uploadUrl, file, ticket.headers, signal)
    })
    return ticket.publicUrl
  } catch (primaryError) {
    if (ticket.fallbackUploadUrl && ticket.fallbackUploadUrl !== ticket.uploadUrl) {
      await putFile(ticket.fallbackUploadUrl, file, ticket.headers)
      return ticket.fallbackPublicUrl ?? ticket.publicUrl
    }
    throw primaryError
  }
}
