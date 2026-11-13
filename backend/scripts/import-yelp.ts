/**
 * Import Yelp Open Dataset (JSON Lines) vào Postgres — phục vụ bench/nghiên cứu
 * (xem docs/RESEARCH-PROTOCOL.md mục 3b), KHÔNG dùng cho dữ liệu sản phẩm.
 *
 * Nguồn: `business.json` + `review.json` của Yelp Open Dataset, mỗi dòng một
 * object JSON. Thư mục dữ liệu lấy từ env `YELP_DATA_DIR` (mặc định
 * `backend/data/yelp`); có thể truyền đường dẫn file cụ thể qua tham số dòng
 * lệnh — tiện chạy thử với file mẫu:
 *
 *   bun run scripts/import-yelp.ts                       # business.json + review.json
 *   bun run scripts/import-yelp.ts data/yelp/sample.jsonl # file trộn cả 2 loại
 *
 * Phân loại dòng theo hình dạng record: có `review_id` → review; có
 * `business_id` (không có `review_id`) → business. Nhờ vậy một file trộn vẫn
 * đọc được, và thứ tự business-trước-review của dataset gốc được giữ nguyên.
 *
 * Quy ước map (chốt trong đề bài, không tự mở rộng):
 * - `business_id` → `places.id` với tiền tố `yelp-`.
 * - `categories` (chuỗi phân tách bằng ",") → `tags`; `attributes` (WiFi,
 *   OutdoorSeating, Takeout…) → thêm tag tiếng Anh tương ứng.
 * - `hours` → `opening_hours` dạng OSM rút gọn: `Mo 10:00-22:00; Tu …`.
 * - Category không khớp bảng map → BỎ QUA business (không đoán nhóm).
 * - Review chỉ lấy `stars >= 4`, ghi vào `interaction_events` với
 *   `event_type = 'review'` và trọng số lấy từ `INTERACTION_WEIGHTS` (một
 *   nguồn duy nhất, không hardcode số ở đây).
 *
 * Hai điểm cần biết khi đọc kết quả:
 * - `interaction_events.user_id` là FK tới `users`, còn `user_id` của Yelp
 *   không phải UUID. Script suy ra UUID tất định (sha256 → UUID v5) và tạo
 *   user đại diện `yelp-<hash>` để FK hợp lệ — đây là user giả lập phục vụ
 *   huấn luyện/đo, không phải người dùng thật của Rendez.
 * - `places.published_at` để NULL: bản import này không tự đưa dữ liệu Yelp
 *   vào danh sách công khai của app.
 *
 * Idempotent: places upsert theo `id`; review chống trùng bằng
 * `context->>'yelp_review_id'` (bảng `interaction_events` không có unique key
 * nghiệp vụ nên phải tự kiểm trước khi insert).
 *
 * Ghi theo lô 1000 dòng/lượt để không phình bộ nhớ với `review.json` (~5 GB).
 */
import { createHash } from "node:crypto"
import { createReadStream, existsSync } from "node:fs"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { Prisma } from "../generated/prisma/client"
import { INTERACTION_WEIGHTS } from "../src/lib/interaction-weights"
import { prisma } from "../src/lib/prisma"

const BATCH_SIZE = 1000

/** Giá trị enum `place_category` trong Postgres (Prisma map `street_food` → `street-food`). */
type DbPlaceCategory = "cafe" | "restaurant" | "street-food" | "bakery" | "bar"
type DbPlaceStatus = "open" | "closed" | "unknown"

/**
 * Bảng map category, xét theo thứ tự. `Food Stands`/`Street Vendors` phải đứng
 * TRƯỚC `Food` — nếu không, tiền tố "Food" sẽ nuốt mất nhóm street-food.
 */
const CATEGORY_RULES: readonly (readonly [string, DbPlaceCategory])[] = [
  ["Coffee", "cafe"],
  ["Restaurants", "restaurant"],
  ["Bars", "bar"],
  ["Bakeries", "bakery"],
  ["Street Vendors", "street-food"],
  ["Food Stands", "street-food"],
  ["Food", "restaurant"],
]

/** Thuộc tính Yelp → tag tiếng Anh. Nhiều key cùng một tag thì dedup ở `buildTags`. */
const ATTRIBUTE_TAGS: readonly (readonly [string, string])[] = [
  ["WiFi", "Wifi"],
  ["OutdoorSeating", "Outdoor Seating"],
  ["RestaurantsTakeOut", "Takeout"],
  ["Takeout", "Takeout"],
]

const DAY_PREFIXES: readonly (readonly [string, string])[] = [
  ["Monday", "Mo"],
  ["Tuesday", "Tu"],
  ["Wednesday", "We"],
  ["Thursday", "Th"],
  ["Friday", "Fr"],
  ["Saturday", "Sa"],
  ["Sunday", "Su"],
]

interface PlaceRow {
  id: string
  name: string
  address: string
  city: string
  category: DbPlaceCategory
  tags: string[]
  lat: number | null
  lng: number | null
  openingHours: string | null
  status: DbPlaceStatus
  sources: string[]
}

interface ReviewRow {
  reviewId: string
  userId: string
  placeId: string
  stars: number
  createdAt: Date
}

interface ImportStats {
  businessRead: number
  placeUpserted: number
  placeSkippedCategory: number
  reviewRead: number
  reviewInserted: number
  reviewSkippedLowStars: number
  reviewSkippedUnknownPlace: number
  reviewSkippedDuplicate: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** Yelp ghi boolean dưới nhiều dạng: `true`, `"True"`, `"u'true'"`, `"free"`, `"no"`. */
function isAffirmative(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value !== "string") return false
  const normalized = value.trim().toLowerCase().replace(/^u'/, "").replace(/'$/, "")
  return !["", "false", "no", "none", "0", "closed"].includes(normalized)
}

function mapCategory(categories: string | null): DbPlaceCategory | null {
  if (!categories) return null
  for (const [needle, category] of CATEGORY_RULES) {
    if (categories.includes(needle)) return category
  }
  return null
}

/** `categories` tách bằng "," + tag từ `attributes`, giữ thứ tự, bỏ trùng. */
function buildTags(
  categories: string | null,
  attributes: Record<string, unknown> | null,
): string[] {
  const tags: string[] = []
  for (const raw of (categories ?? "").split(",")) {
    const tag = raw.trim()
    if (tag.length > 0 && !tags.includes(tag)) tags.push(tag)
  }
  for (const [key, tag] of ATTRIBUTE_TAGS) {
    if (attributes && isAffirmative(attributes[key]) && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

/** `7:0-17:0` → `07:00-17:00`; `0:0-0:0` (đóng cửa) → `off`; sai định dạng → null. */
function formatTimeRange(range: string): string | null {
  const match = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(range.trim())
  if (!match) return null
  const [, openHour, openMinute, closeHour, closeMinute] = match
  if (openHour === undefined || openMinute === undefined) return null
  if (closeHour === undefined || closeMinute === undefined) return null
  const open = `${openHour.padStart(2, "0")}:${openMinute}`
  const close = `${closeHour.padStart(2, "0")}:${closeMinute}`
  if (open === "00:00" && close === "00:00") return "off"
  return `${open}-${close}`
}

/** `hours` của Yelp → chuỗi OSM rút gọn `Mo 10:00-22:00; Tu 10:00-22:00`. */
function formatHours(hours: Record<string, unknown> | null): string | null {
  if (!hours) return null
  const parts: string[] = []
  for (const [day, prefix] of DAY_PREFIXES) {
    const raw = hours[day]
    if (typeof raw !== "string" || raw.length === 0) continue
    const ranges = raw
      .split(",")
      .map(formatTimeRange)
      .filter((range): range is string => range !== null)
    if (ranges.length === 0) continue
    parts.push(`${prefix} ${ranges.join(",")}`)
  }
  return parts.length > 0 ? parts.join("; ") : null
}

/** `user_id` của Yelp → UUID tất định (sha256, dạng UUID v5) để làm FK `users.id`. */
function yelpUserToUuid(yelpUserId: string): string {
  const hex = createHash("sha256").update(`yelp:user:${yelpUserId}`).digest("hex")
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-")
}

function toPlaceRow(record: Record<string, unknown>): PlaceRow | null {
  const businessId = asString(record["business_id"])
  const name = asString(record["name"])
  if (!businessId || !name) return null

  const category = mapCategory(asString(record["categories"]))
  // Không khớp nhóm nào → bỏ, không đoán (dữ liệu rác làm hỏng eval).
  if (!category) return null

  const attributes = isRecord(record["attributes"]) ? record["attributes"] : null
  const hours = isRecord(record["hours"]) ? record["hours"] : null
  const isOpen = record["is_open"]

  return {
    id: `yelp-${businessId}`,
    name,
    address: asString(record["address"]) ?? "",
    city: asString(record["city"]) ?? "",
    category,
    tags: buildTags(asString(record["categories"]), attributes),
    lat: asNumber(record["latitude"]),
    lng: asNumber(record["longitude"]),
    openingHours: formatHours(hours),
    status: isOpen === 0 ? "closed" : isOpen === 1 ? "open" : "unknown",
    sources: ["yelp"],
  }
}

function toReviewRow(
  record: Record<string, unknown>,
  importedPlaces: Set<string>,
): ReviewRow | null {
  const reviewId = asString(record["review_id"])
  const yelpUserId = asString(record["user_id"])
  const businessId = asString(record["business_id"])
  const stars = asNumber(record["stars"])
  if (!reviewId || !yelpUserId || !businessId || stars === null) return null

  const placeId = `yelp-${businessId}`
  if (!importedPlaces.has(placeId)) return null

  const rawDate = asString(record["date"])
  const parsed = rawDate ? new Date(rawDate) : null
  const createdAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()

  return { reviewId, userId: yelpUserToUuid(yelpUserId), placeId, stars, createdAt }
}

async function* readJsonLines(path: string): AsyncGenerator<Record<string, unknown>> {
  const stream = createReadStream(path, { encoding: "utf8" })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    const parsed: unknown = JSON.parse(trimmed)
    if (isRecord(parsed)) yield parsed
  }
}

function resolveInputFiles(): string[] {
  const explicit = process.argv.slice(2)
  if (explicit.length > 0) {
    return explicit.map((path) => {
      if (!existsSync(path)) throw new Error(`Không thấy file: ${path}`)
      return path
    })
  }
  const dir = process.env["YELP_DATA_DIR"] ?? join(import.meta.dir, "..", "data", "yelp")
  const files = ["business.json", "review.json"].map((name) => join(dir, name))
  for (const file of files) {
    if (!existsSync(file)) {
      throw new Error(
        `Không thấy ${file} — tải Yelp Open Dataset vào ${dir} hoặc đặt YELP_DATA_DIR`,
      )
    }
  }
  return files
}

async function main() {
  const files = resolveInputFiles()
  const stats: ImportStats = {
    businessRead: 0,
    placeUpserted: 0,
    placeSkippedCategory: 0,
    reviewRead: 0,
    reviewInserted: 0,
    reviewSkippedLowStars: 0,
    reviewSkippedUnknownPlace: 0,
    reviewSkippedDuplicate: 0,
  }

  const importedPlaces = new Set<string>()
  let placeBatch: PlaceRow[] = []
  let reviewBatch: ReviewRow[] = []

  async function flushPlaces(): Promise<void> {
    if (placeBatch.length === 0) return
    const batch = placeBatch
    placeBatch = []

    const values = batch.map(
      (place) => Prisma.sql`(
        ${place.id}, ${place.name}, ${place.address}, ${place.city},
        ${place.category}::place_category, ${place.tags}::text[],
        ${place.lat}, ${place.lng}, ${place.openingHours},
        ${place.status}::place_status, ${place.sources}::text[], now()
      )`,
    )
    await prisma.$executeRaw`
      INSERT INTO places
        (id, name, address, city, category, tags, lat, lng, opening_hours, status, sources,
         updated_at)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        opening_hours = EXCLUDED.opening_hours,
        status = EXCLUDED.status,
        sources = EXCLUDED.sources,
        updated_at = now()
    `
    stats.placeUpserted += batch.length
  }

  async function flushReviews(): Promise<void> {
    // Place phải vào DB trước: `interaction_events.place_id` là FK thật.
    await flushPlaces()
    if (reviewBatch.length === 0) return
    const batch = reviewBatch
    reviewBatch = []

    const ids = batch.map((review) => review.reviewId)
    const existing = await prisma.$queryRaw<{ review_id: string }[]>(Prisma.sql`
      SELECT context->>'yelp_review_id' AS review_id
      FROM interaction_events
      WHERE event_type = 'review'
        AND context->>'yelp_review_id' IN (${Prisma.join(ids)})
    `)
    const seen = new Set(existing.map((row) => row.review_id))
    const fresh = batch.filter((review) => !seen.has(review.reviewId))
    stats.reviewSkippedDuplicate += batch.length - fresh.length
    if (fresh.length === 0) return

    // User đại diện cho tác giả review — FK `interaction_events.user_id` → `users.id`.
    const users = new Map<string, { id: string; name: string; handle: string; email: string }>()
    for (const review of fresh) {
      if (users.has(review.userId)) continue
      const short = review.userId.replace(/-/g, "").slice(0, 12)
      users.set(review.userId, {
        id: review.userId,
        name: `Yelp reviewer ${short.slice(0, 8)}`,
        handle: `yelp-${short}`,
        email: `yelp-${short}@yelp-import.invalid`,
      })
    }
    const userValues = [...users.values()].map(
      (user) => Prisma.sql`(${user.id}::uuid, ${user.name}, ${user.handle}, ${user.email}, now())`,
    )
    await prisma.$executeRaw`
      INSERT INTO users (id, name, handle, email, updated_at)
      VALUES ${Prisma.join(userValues)}
      ON CONFLICT (id) DO NOTHING
    `

    const eventValues = fresh.map(
      (review) => Prisma.sql`(
        ${review.userId}::uuid,
        'review',
        ${review.placeId},
        ${INTERACTION_WEIGHTS.review},
        ${JSON.stringify({ yelp_review_id: review.reviewId, stars: review.stars })}::jsonb,
        ${review.createdAt}
      )`,
    )
    await prisma.$executeRaw`
      INSERT INTO interaction_events (user_id, event_type, place_id, weight, context, created_at)
      VALUES ${Prisma.join(eventValues)}
    `
    stats.reviewInserted += fresh.length
  }

  for (const file of files) {
    console.log(`Đọc ${file}`)
    for await (const record of readJsonLines(file)) {
      if (asString(record["review_id"])) {
        stats.reviewRead++
        const stars = asNumber(record["stars"])
        if (stars === null || stars < 4) {
          stats.reviewSkippedLowStars++
          continue
        }
        const review = toReviewRow(record, importedPlaces)
        if (!review) {
          stats.reviewSkippedUnknownPlace++
          continue
        }
        reviewBatch.push(review)
        if (reviewBatch.length >= BATCH_SIZE) await flushReviews()
        continue
      }

      if (asString(record["business_id"])) {
        stats.businessRead++
        const place = toPlaceRow(record)
        if (!place) {
          stats.placeSkippedCategory++
          continue
        }
        importedPlaces.add(place.id)
        placeBatch.push(place)
        if (placeBatch.length >= BATCH_SIZE) await flushPlaces()
      }
    }
  }

  await flushPlaces()
  await flushReviews()

  console.log(
    [
      `business đọc: ${stats.businessRead} (upsert ${stats.placeUpserted}, bỏ ${stats.placeSkippedCategory} do category không khớp)`,
      `review đọc: ${stats.reviewRead} (insert ${stats.reviewInserted}, bỏ ${stats.reviewSkippedLowStars} stars<4, ` +
        `${stats.reviewSkippedUnknownPlace} place không import, ${stats.reviewSkippedDuplicate} đã có)`,
    ].join("\n"),
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
