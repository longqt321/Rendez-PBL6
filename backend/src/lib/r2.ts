import { createHash, createHmac } from "node:crypto"
import { IMAGE_CONTENT_TYPES } from "@rendez/schema"

/**
 * Presigned PUT cho Cloudflare R2 (S3-compatible) — T7.1.
 *
 * Tự cài SigV4 bằng `node:crypto` thay vì kéo `@aws-sdk/*` (không nằm trong
 * danh sách dependency đã chốt). Chỉ ký đúng một thứ cần thiết: URL PUT có hạn
 * để client tải ảnh thẳng lên R2, server không nhận file.
 *
 * Chưa xác minh với bucket thật (chưa có credentials) — xem REPORT.md mục
 * "CHƯA XÁC MINH". Thuật toán theo tài liệu AWS SigV4 cho presigned URL.
 */

const ALGORITHM = "AWS4-HMAC-SHA256"
const SERVICE = "s3"
/** R2 dùng region `auto` cho mọi bucket. */
const REGION = "auto"
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD"

/** Mã hoá theo chuẩn AWS: encodeURIComponent + các ký tự `!'()*` phải mã hoá. */
function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
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

  // Có contentType thì ký luôn `content-type` — client không thể đổi kiểu file
  // sau khi đã xin URL (chặn đẩy nội dung khác loại vào đúng object ảnh).
  const signedHeaders = params.contentType ? "content-type;host" : "host"
  const canonicalHeaders = params.contentType
    ? `content-type:${params.contentType}\nhost:${host}\n`
    : `host:${host}\n`

  const query: Record<string, string> = {
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(params.expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  }
  const canonicalQuery = Object.keys(query)
    .sort()
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

  return {
    url,
    publicUrl: publicBase ? `${publicBase}/${params.key}` : url.split("?")[0]!,
    key: params.key,
    expiresAt: new Date(now.getTime() + params.expiresInSeconds * 1000).toISOString(),
    headers: params.contentType ? { "Content-Type": params.contentType } : {},
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
