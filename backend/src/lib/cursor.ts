import { ApiError } from "./errors"

export interface Cursor {
  createdAt: Date
  id: string
}

export type PlaceCursor =
  | { kind: "newest"; createdAt: Date; id: string }
  | { kind: "rating"; rating: number; reviewCount: number; createdAt: Date; id: string }
  | { kind: "distance"; distance: number | null; id: string }

export type PlaceSort = PlaceCursor["kind"]

export const SLUG_ID_RE = /^[A-Za-z0-9_-]{1,120}$/

export const UUID_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function requireUuid(value: string, message: string, status: 403 | 404 = 404): string {
  if (!UUID_ID_RE.test(value)) throw new ApiError(status, message)
  return value
}

function parseFiniteNumber(raw: string): number | null {
  if (raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, "utf8").toString("base64url")
}

export function decodeCursor(raw: string, idPattern: RegExp = SLUG_ID_RE): Cursor | null {
  let decoded: string
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8")
  } catch {
    return null
  }

  const separator = decoded.lastIndexOf("|")
  if (separator <= 0) return null

  const createdAt = new Date(decoded.slice(0, separator))
  const id = decoded.slice(separator + 1)
  if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null

  return { createdAt, id }
}

export function encodePlaceCursor(cursor: PlaceCursor): string {
  let payload: string
  switch (cursor.kind) {
    case "newest":
      payload = `newest|${cursor.createdAt.toISOString()}|${cursor.id}`
      break
    case "rating":
      payload = `rating|${cursor.rating}|${cursor.reviewCount}|${cursor.createdAt.toISOString()}|${cursor.id}`
      break
    case "distance":
      // Khoảng cách rỗng = dòng cuối trang thiếu toạ độ (NULL) — giữ nguyên
      // thông tin đó để trang sau biết phải lấy các dòng NULL có id lớn hơn.
      payload = `distance|${cursor.distance ?? ""}|${cursor.id}`
      break
  }
  return Buffer.from(payload, "utf8").toString("base64url")
}

function decodeNewest(parts: string[], idPattern: RegExp): PlaceCursor | null {
  if (parts.length !== 3) return null
  const createdAt = new Date(parts[1]!)
  const id = parts[2]!
  if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null
  return { kind: "newest", createdAt, id }
}

function decodeRating(parts: string[], idPattern: RegExp): PlaceCursor | null {
  if (parts.length !== 5) return null
  const rating = parseFiniteNumber(parts[1]!)
  const reviewCount = parseFiniteNumber(parts[2]!)
  const createdAt = new Date(parts[3]!)
  const id = parts[4]!
  if (rating === null || reviewCount === null) return null
  if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null
  return { kind: "rating", rating, reviewCount, createdAt, id }
}

function decodeDistance(parts: string[], idPattern: RegExp): PlaceCursor | null {
  if (parts.length !== 3) return null
  const id = parts[2]!
  if (!idPattern.test(id)) return null
  const distance = parseFiniteNumber(parts[1]!)
  // Chuỗi không rỗng nhưng không phải số → cursor hỏng.
  if (parts[1] !== "" && distance === null) return null
  return { kind: "distance", distance, id }
}

function decodeLegacy(decoded: string, idPattern: RegExp): PlaceCursor | null {
  const separator = decoded.lastIndexOf("|")
  if (separator <= 0) return null
  const createdAt = new Date(decoded.slice(0, separator))
  const id = decoded.slice(separator + 1)
  if (Number.isNaN(createdAt.getTime()) || !idPattern.test(id)) return null
  return { kind: "newest", createdAt, id }
}

export function decodePlaceCursor(raw: string, idPattern: RegExp = SLUG_ID_RE): PlaceCursor | null {
  let decoded: string
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8")
  } catch {
    return null
  }

  const parts = decoded.split("|")
  const tag = parts[0]

  if (tag === "newest") return decodeNewest(parts, idPattern)
  if (tag === "rating") return decodeRating(parts, idPattern)
  if (tag === "distance") return decodeDistance(parts, idPattern)

  return decodeLegacy(decoded, idPattern)
}
