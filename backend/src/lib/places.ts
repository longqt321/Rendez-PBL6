import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import type { Cursor } from "./cursor"

/**
 * Truy vấn địa điểm dùng chung cho `GET /places` và `GET /places/map` (A7.9).
 *
 * Viết bằng SQL tham số hoá vì cần `unaccent()` (Postgres) để "banh xeo" khớp
 * "Bánh Xèo" — Prisma query builder không gọi được hàm này. Mọi giá trị đều
 * truyền qua `Prisma.sql` (không nối chuỗi) nên không có SQL injection.
 *
 * Đếm `rating`/`reviewCount` bằng aggregate trên `reviews` (D3), ảnh lấy từ
 * `place_images` bằng LATERAL — một query, không N+1.
 */

export interface PlaceFilters {
  q?: string
  categories: string[]
  districts: string[]
  priceMax?: number
  excludeCategories: string[]
  excludeDistricts: string[]
  includeKeywords: string[]
  excludeKeywords: string[]
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number }
}

/** Tách danh sách phân tách dấu phẩy, bỏ rỗng và "all" (mock: "all" = không lọc). */
function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== "all")
}

/**
 * Đọc query string thành bộ lọc — giữ đúng hành vi mock:
 * `priceMax` ngoài 1–3 hoặc không phải số thì BỎ lọc (không lỗi),
 * `bbox` phải đủ 4 số hữu hạn mới có hiệu lực.
 */
export function parsePlaceFilters(query: Record<string, string | undefined>): PlaceFilters {
  const priceMaxRaw = Number(query.priceMax)
  const priceMax =
    query.priceMax && Number.isFinite(priceMaxRaw) && priceMaxRaw >= 1 && priceMaxRaw <= 3
      ? priceMaxRaw
      : undefined

  const bboxParts = (query.bbox ?? "").split(",").map(Number)
  const bbox =
    bboxParts.length === 4 && bboxParts.every((value) => Number.isFinite(value))
      ? {
          minLng: bboxParts[0]!,
          minLat: bboxParts[1]!,
          maxLng: bboxParts[2]!,
          maxLat: bboxParts[3]!,
        }
      : undefined

  return {
    q: query.q?.trim() || undefined,
    categories: splitList(query.category),
    districts: splitList(query.district),
    priceMax,
    excludeCategories: splitList(query.excludeCategory),
    excludeDistricts: splitList(query.excludeDistrict),
    includeKeywords: splitList(query.includeKeyword),
    excludeKeywords: splitList(query.excludeKeyword),
    bbox,
  }
}

/** Haystack tìm kiếm — khớp mock: name + address + city + district + tags. */
const HAYSTACK = Prisma.sql`unaccent(lower(concat_ws(' ', p.name, p.address, p.city, coalesce(p.district, ''), array_to_string(p.tags, ' '))))`

/** Escape ký tự đặc biệt của LIKE để từ khoá người dùng không thành wildcard. */
function likePattern(keyword: string): string {
  return `%${keyword.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

function keywordCondition(keyword: string): Prisma.Sql {
  return Prisma.sql`${HAYSTACK} LIKE ${likePattern(keyword.toLowerCase())}`
}

function buildConditions(filters: PlaceFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.status <> 'closed'`,
    Prisma.sql`p.deleted_at IS NULL`,
  ]

  if (filters.categories.length > 0) {
    conditions.push(
      Prisma.sql`p.category IN (${Prisma.join(
        filters.categories.map((value) => Prisma.sql`${value}::place_category`),
      )})`,
    )
  }
  if (filters.districts.length > 0) {
    conditions.push(Prisma.sql`p.district IN (${Prisma.join(filters.districts)})`)
  }
  if (filters.priceMax !== undefined) {
    conditions.push(Prisma.sql`p.price_level <= ${filters.priceMax}`)
  }
  if (filters.excludeCategories.length > 0) {
    conditions.push(
      Prisma.sql`p.category NOT IN (${Prisma.join(
        filters.excludeCategories.map((value) => Prisma.sql`${value}::place_category`),
      )})`,
    )
  }
  if (filters.excludeDistricts.length > 0) {
    conditions.push(
      Prisma.sql`(p.district IS NULL OR p.district NOT IN (${Prisma.join(filters.excludeDistricts)}))`,
    )
  }
  // Nhiều includeKeyword = phải có ĐỦ (AND); excludeKeyword = bất kỳ là loại.
  for (const keyword of filters.includeKeywords) {
    conditions.push(keywordCondition(keyword))
  }
  if (filters.excludeKeywords.length > 0) {
    conditions.push(
      Prisma.sql`NOT (${Prisma.join(filters.excludeKeywords.map(keywordCondition), " OR ")})`,
    )
  }
  if (filters.q) {
    conditions.push(keywordCondition(filters.q))
  }
  if (filters.bbox) {
    conditions.push(
      Prisma.sql`p.lat IS NOT NULL AND p.lng IS NOT NULL
        AND p.lng BETWEEN ${filters.bbox.minLng} AND ${filters.bbox.maxLng}
        AND p.lat BETWEEN ${filters.bbox.minLat} AND ${filters.bbox.maxLat}`,
    )
  }

  return conditions
}

/** Dòng thô trả từ Postgres — tên cột snake_case như SELECT. */
interface PlaceRow {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  category: string
  tags: string[]
  price_level: number
  lat: number | null
  lng: number | null
  status: string
  rating: number
  review_count: number
  image_url: string | null
  image_height: number | null
  created_at: Date
}

const SELECT_PLACES = Prisma.sql`
  SELECT p.id, p.name, p.address, p.city, p.district, p.category::text AS category, p.tags,
         p.price_level, p.lat, p.lng, p.status::text AS status, p.created_at,
         COALESCE(r.rating, 0)::float8 AS rating,
         COALESCE(r.review_count, 0)::int AS review_count,
         img.url AS image_url, img.height AS image_height
  FROM places p
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(rv.rating)::numeric, 1) AS rating, COUNT(*) AS review_count
    FROM reviews rv
    WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT pi.url, pi.height
    FROM place_images pi
    WHERE pi.place_id = p.id
    ORDER BY pi.position
    LIMIT 1
  ) img ON true
`

/** Enum Prisma dùng `street_food`, API dùng `street-food` (khớp `@rendez/schema`). */
function toApiCategory(value: string): string {
  return value.replace(/_/g, "-")
}

/** Chuyển dòng thô thành `Place` đúng `placeSchema` (bỏ trường null thay vì gửi null). */
export function toPlaceDto(row: PlaceRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    ...(row.district ? { district: row.district } : {}),
    category: toApiCategory(row.category),
    tags: row.tags,
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    priceLevel: Math.min(3, Math.max(1, row.price_level)),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    imageHeight: row.image_height ?? 320,
    ...(row.lat !== null ? { lat: row.lat } : {}),
    ...(row.lng !== null ? { lng: row.lng } : {}),
    status: row.status,
  }
}

export type PlaceDto = ReturnType<typeof toPlaceDto>

/** Một trang địa điểm theo keyset `(created_at, id)` giảm dần (D2). */
export async function listPlaces(
  filters: PlaceFilters,
  cursor: Cursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: Cursor | null }> {
  const conditions = buildConditions(filters)
  if (cursor) {
    conditions.push(
      Prisma.sql`(p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
    )
  }

  // Lấy dư 1 dòng để biết còn trang sau — không COUNT toàn bộ (đắt, không cần).
  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${SELECT_PLACES}
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${pageSize + 1}
  `)

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? { createdAt: last.created_at, id: last.id } : null

  return { items: page.map(toPlaceDto), next }
}

/** Địa điểm trong khung nhìn — không phân trang, chặn trên `limit` (A7.9). */
export async function listPlacesInMap(
  filters: PlaceFilters,
  limit: number,
): Promise<{ items: PlaceDto[]; total: number }> {
  const conditions = buildConditions(filters)

  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${SELECT_PLACES}
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY p.created_at DESC, p.id DESC
  `)

  return { items: rows.slice(0, limit).map(toPlaceDto), total: rows.length }
}

/** Một địa điểm công khai — `null` khi chưa publish/đã xoá (route trả 404). */
export async function findPublicPlace(id: string): Promise<PlaceDto | null> {
  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${SELECT_PLACES}
    WHERE p.id = ${id} AND p.published_at IS NOT NULL AND p.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? toPlaceDto(row) : null
}
