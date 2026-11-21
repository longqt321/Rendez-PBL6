import { createHmac, timingSafeEqual } from "node:crypto"
import { join } from "node:path"
import { createStorage } from "unstorage"
import fsLiteDriver from "unstorage/drivers/fs-lite"
import { env } from "../env"

const UPLOAD_ROOT = join(import.meta.dir, "../../data/uploads")

const localMediaStorage = createStorage({
  driver: fsLiteDriver({ base: UPLOAD_ROOT }),
})

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
}

function toStorageKey(key: string): string {
  return key.replaceAll("/", ":")
}

function signPayload(key: string, contentType: string, expiresAtSec: number): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${key}|${contentType}|${expiresAtSec}`, "utf8")
    .digest("hex")
}

export function isLocalMediaFallbackEnabled(): boolean {
  return (
    process.env.MEDIA_LOCAL_FALLBACK === "true" ||
    (process.env.NODE_ENV !== "test" && process.env.MEDIA_LOCAL_FALLBACK !== "false")
  )
}

export function localMediaBaseUrl(): string {
  return `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/v1/media/files`
}

export function signLocalUploadUrl(params: {
  key: string
  contentType: string
  expiresInSeconds: number
}): { uploadUrl: string; publicUrl: string; expiresAt: string } {
  const expiresMs = Date.now() + params.expiresInSeconds * 1000
  const expiresSec = Math.floor(expiresMs / 1000)
  const sig = signPayload(params.key, params.contentType, expiresSec)
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "")
  const query = new URLSearchParams({
    expires: String(expiresSec),
    contentType: params.contentType,
    sig,
  })
  return {
    uploadUrl: `${base}/api/v1/media/upload/${params.key}?${query.toString()}`,
    publicUrl: `${localMediaBaseUrl()}/${params.key}`,
    expiresAt: new Date(expiresMs).toISOString(),
  }
}

export function verifyLocalUploadSignature(params: {
  key: string
  contentType: string
  expires: string | undefined
  sig: string | undefined
}): boolean {
  if (!params.expires || !params.sig) return false
  const expiresSec = Number(params.expires)
  if (!Number.isFinite(expiresSec) || expiresSec < Math.floor(Date.now() / 1000)) {
    return false
  }
  const expected = signPayload(params.key, params.contentType, expiresSec)
  const expectedBuf = Buffer.from(expected, "utf8")
  const actualBuf = Buffer.from(params.sig, "utf8")
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

export async function saveLocalMedia(key: string, data: Uint8Array): Promise<void> {
  await localMediaStorage.setItemRaw(toStorageKey(key), Buffer.from(data))
}

export async function readLocalMedia(key: string): Promise<Uint8Array | null> {
  try {
    const storageKey = toStorageKey(key)
    const exists = await localMediaStorage.hasItem(storageKey)
    if (!exists) return null
    const raw = await localMediaStorage.getItemRaw<Uint8Array | Buffer | null>(storageKey)
    if (!raw) return null
    return new Uint8Array(raw)
  } catch {
    return null
  }
}

export function contentTypeForFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream"
}
