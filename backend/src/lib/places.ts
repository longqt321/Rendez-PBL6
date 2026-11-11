import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { parseApiCategory, toApiCategory } from "./enums"
import type { Cursor } from "./cursor"
import type { PlaceCategory } from "@rendez/schema"

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
  /** Đã chuẩn hoá về tên API — trùng đúng literal của enum trong DB. */
  categories: PlaceCategory[]
  /** Query có `category` nhưng toàn giá trị lạ → không địa điểm nào khớp. */
  categoriesMatchNothing: boolean
  districts: string[]
  priceMax?: number
  excludeCategories: PlaceCategory[]
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
 * Danh sách loại hình từ query — bỏ giá trị lạ thay vì để Postgres báo lỗi
 * cast `::place_category`. Mock coi giá trị lạ là "không khớp": nếu danh sách
 * chỉ toàn giá trị lạ thì kết quả phải RỖNG, không phải bỏ lọc.
 */
function parseCategoryList(raw: string | undefined): {
  categories: PlaceCategory[]
  unmatchedOnly: boolean
} {
  const rawValues = splitList(raw)
  const categories: PlaceCategory[] = []
  for (const value of rawValues) {
    const category = parseApiCategory(value)
    if (category) categories.push(category)
  }
  return { categories, unmatchedOnly: rawValues.length > 0 && categories.length === 0 }
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

  const category = parseCategoryList(query.category)

  return {
    q: query.q?.trim() || undefined,
    categories: category.categories,
    categoriesMatchNothing: category.unmatchedOnly,
    districts: splitList(query.district),
    priceMax,
    excludeCategories: parseCategoryList(query.excludeCategory).categories,
    excludeDistricts: splitList(query.excludeDistrict),
    includeKeywords: splitList(query.includeKeyword),
    excludeKeywords: splitList(query.excludeKeyword),
    bbox,
  }
}

/** Haystack tìm kiếm — khớp mock: name + address + city + district + tags.
 * Dùng `immutable_search_normalize` (migration 20261111090000) — cùng quy tắc
 * với `normalizeText()` của mock (bỏ dấu, lowercase, dấu câu → khoảng trắng) và
 * trùng khít biểu thức GIN index `pg_trgm` (T2.5) để planner khớp index. */
const HAYSTACK = Prisma.sql`immutable_search_normalize(p.name || ' ' || p.address || ' ' || p.city || ' ' || coalesce(p.district, '') || ' ' || immutable_array_to_string(p.tags, ' '))`

/**
 * Điều kiện LIKE trên haystack. Từ khoá được chuẩn hoá bằng chính hàm SQL của
 * haystack nên `?q=bánh xèo` khớp `Bánh xèo Bà Dương` (mock cũng vậy). Sau
 * chuẩn hoá từ khoá không còn `%`/`_` nên không thể thành wildcard.
 */
function keywordCondition(keyword: string): Prisma.Sql {
  return Prisma.sql`${HAYSTACK} LIKE ${Prisma.sql`'%' || immutable_search_normalize(${keyword}) || '%'`}`
}

function buildConditions(filters: PlaceFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.status <> 'closed'`,
    Prisma.sql`p.deleted_at IS NULL`,
  ]

  if (filters.categoriesMatchNothing) conditions.push(Prisma.sql`FALSE`)
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

  // `total` = tổng số khớp (mock trả `items.length` trước khi cắt 300), nên đếm
  // riêng thay vì kéo cả dataset về RAM rồi `slice`.
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
      ${SELECT_PLACES}
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${limit}
    `),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM places p
      WHERE ${Prisma.join(conditions, " AND ")}
    `),
  ])

  return { items: rows.map(toPlaceDto), total: Number(countRows[0]?.count ?? 0) }
}

/**
 * Địa điểm "đã lưu" của viewer = nằm trong ít nhất một bộ sưu tập của chính mình
 * (khớp mock `GET /places/saved`): gộp + loại trùng, chỉ place công khai,
 * keyset `(created_at, id)` như `listPlaces`.
 */
export async function listSavedPlaces(
  userId: string,
  cursor: Cursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: Cursor | null }> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.status <> 'closed'`,
    Prisma.sql`p.deleted_at IS NULL`,
    Prisma.sql`EXISTS (
      SELECT 1 FROM collection_places cp
      JOIN collections col ON col.id = cp.collection_id
      WHERE cp.place_id = p.id AND col.owner_id = ${userId}::uuid AND col.deleted_at IS NULL
    )`,
  ]
  if (cursor) {
    conditions.push(
      Prisma.sql`(p.created_at, p.id) < (${cursor.createdAt}::timestamptz, ${cursor.id})`,
    )
  }

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
