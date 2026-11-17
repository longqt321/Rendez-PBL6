import { createHash, createHmac } from "node:crypto"
import { IMAGE_CONTENT_TYPES } from "@rendez/schema"

const ALGORITHM = "AWS4-HMAC-SHA256"
const SERVICE = "s3"

const REGION = "auto"
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD"

function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
  )
}

/** Mã hoá từng đoạn path nhưng giữ `/` — R2 lưu key có thư mục. */
function encodePath(path: string): string {
  return path.split("/").map(awsUriEncode).join("/")
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest()
}

/** `YYYYMMDDTHHMMSSZ` — định dạng bắt buộc của `X-Amz-Date`. */
function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "")
}

/** Cấu hình R2 — truyền vào hàm để test được mà không cần biến môi trường thật. */
export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  /** Domain công khai đọc ảnh; rỗng thì dùng chính URL đã ký (bỏ query). */
  publicBaseUrl: string
}

export interface PresignPutParams {
  key: string
  expiresInSeconds: number
  /** Thời điểm ký — tham số để test tất định. */
  now?: Date
  contentType?: string
  contentLength?: number
}

export interface PresignedUpload {
  url: string
  /** URL công khai để đọc lại ảnh (nếu bucket có public domain). */
  publicUrl: string
  key: string
  expiresAt: string
  headers: Record<string, string>
}

/**
 * Dựng URL PUT đã ký cho `key`.
 *
 * @throws Error khi chưa cấu hình R2 — route bắt lỗi này và trả 503.
 */
export function presignPut(config: R2Config, params: PresignPutParams): PresignedUpload {
  const now = params.now ?? new Date()
  const dateStamp = amzDate(now).slice(0, 8)
  const timestamp = amzDate(now)
  const host = `${config.accountId}.r2.cloudflarestorage.com`
  const canonicalUri = encodePath(`/${config.bucket}/${params.key}`)
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`

  // Có contentType / contentLength thì ký luôn vào signed headers — client
  // không thể đổi kiểu file hay size sau khi đã xin URL (chặn lạm dụng dung lượng & format).
  const headersToSign: Record<string, string> = { host }
  if (params.contentType) headersToSign["content-type"] = params.contentType
  if (params.contentLength !== undefined)
    headersToSign["content-length"] = String(params.contentLength)

  const sortedHeaderNames = Object.keys(headersToSign).sort((a, b) => a.localeCompare(b))
  const signedHeaders = sortedHeaderNames.join(";")
  const canonicalHeaders = sortedHeaderNames
    .map((name) => `${name}:${headersToSign[name]}\n`)
    .join("")

  const query: Record<string, string> = {
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(params.expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  }
  const canonicalQuery = Object.keys(query)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `${awsUriEncode(name)}=${awsUriEncode(query[name]!)}`)
    .join("&")

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join("\n")

  const stringToSign = [ALGORITHM, timestamp, scope, sha256Hex(canonicalRequest)].join("\n")

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), REGION), SERVICE),
    "aws4_request",
  )
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex")

  const url = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
  const publicBase = config.publicBaseUrl.replace(/\/$/, "")

  const headers: Record<string, string> = {}
  if (params.contentType) headers["Content-Type"] = params.contentType
  if (params.contentLength !== undefined) headers["Content-Length"] = String(params.contentLength)

  return {
    url,
    publicUrl: publicBase ? `${publicBase}/${params.key}` : url.split("?")[0]!,
    key: params.key,
    expiresAt: new Date(now.getTime() + params.expiresInSeconds * 1000).toISOString(),
    headers,
  }
}

/** Đuôi file theo Content-Type — danh sách loại ảnh dùng chung `@rendez/schema`. */
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

export function extensionForContentType(contentType: string): string | null {
  if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) return null
  return IMAGE_EXTENSIONS[contentType] ?? null
}

/** Khoá lưu ảnh: `<thư mục>/<userId>/<uuid>.<ext>` — không dùng tên client gửi. */
export function buildObjectKey(folder: string, userId: string, extension: string): string {
  return `${folder}/${userId}/${crypto.randomUUID()}.${extension}`
}
