import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto"
import { env } from "../env"

const KEY_INFO = Buffer.from("rendez-user-location-v1", "utf8")
const KEY_SALT = Buffer.from("rendez-hkdf-salt", "utf8")
const CIPHER_ALGO = "aes-256-gcm"
const IV_BYTES = 12
const VERSION_PREFIX = "v1"

let cachedKey: Buffer | null = null

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey
  const derived = hkdfSync("sha256", env.BETTER_AUTH_SECRET, KEY_SALT, KEY_INFO, 32)
  cachedKey = Buffer.from(derived)
  return cachedKey
}

/**
 * Hash 1 chiều có khóa (HMAC-SHA256) dùng cho Redis key / định danh log,
 * không thể dịch ngược về userId gốc.
 */
export function hmacIdentifier(namespace: string, value: string): string {
  return createHmac("sha256", getEncryptionKey())
    .update(`${namespace}:${value}`, "utf8")
    .digest("hex")
}

/**
 * Mã hóa JSON bằng AES-256-GCM kèm AAD gắn chặt với `userId`.
 * Nếu dữ liệu bị tráo sang `userId` khác hoặc chỉnh sửa, giải mã sẽ thất bại.
 */
export function encryptJsonForUser(userId: string, payload: unknown): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(CIPHER_ALGO, getEncryptionKey(), iv)
  cipher.setAAD(Buffer.from(userId, "utf8"))

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    VERSION_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

/** Giải mã chuỗi AES-256-GCM; trả về `null` nếu sai khóa, sai `userId` hoặc dữ liệu hỏng. */
export function decryptJsonForUser<T>(userId: string, token: string): T | null {
  const parts = token.split(".")
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) return null

  try {
    const iv = Buffer.from(parts[1]!, "base64url")
    const tag = Buffer.from(parts[2]!, "base64url")
    const ciphertext = Buffer.from(parts[3]!, "base64url")
    if (iv.length !== IV_BYTES || tag.length !== 16) return null

    const decipher = createDecipheriv(CIPHER_ALGO, getEncryptionKey(), iv)
    decipher.setAAD(Buffer.from(userId, "utf8"))
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return JSON.parse(decrypted.toString("utf8")) as T
  } catch {
    return null
  }
}
