import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { parseApiCategory, toApiCategory } from "./enums"
import type { Cursor, PlaceCursor, PlaceSort } from "./cursor"
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
  /**
   * Kiểu sắp xếp kết quả (`GET /places`). `distance` cần `lat`/`lng` của người
   * dùng; thiếu toạ độ hợp lệ thì parse đã rơi về `newest` (không lỗi).
   */
  sort: PlaceSort
  /** Toạ độ người dùng cho `sort=distance` — chỉ có nghĩa khi `sort` là distance. */
  lat?: number
  lng?: number
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

  // `sort` lạ/thiếu → `newest` (cùng phong cách: giá trị lạ bị bỏ qua, không 400).
  const rawSort = query.sort
  const requestedSort: PlaceSort =
    rawSort === "rating" || rawSort === "distance" ? rawSort : "newest"

  // Toạ độ phải hữu hạn và đúng miền; thiếu/sai → không có toạ độ.
  const latRaw = Number(query.lat)
  const lngRaw = Number(query.lng)
  const hasCoords =
    query.lat !== undefined &&
    query.lng !== undefined &&
    Number.isFinite(latRaw) &&
    Number.isFinite(lngRaw) &&
    latRaw >= -90 &&
    latRaw <= 90 &&
    lngRaw >= -180 &&
    lngRaw <= 180
  // `sort=distance` mà không có toạ độ dùng được → rơi về `newest`, không lỗi.
  const sort: PlaceSort = requestedSort === "distance" && !hasCoords ? "newest" : requestedSort

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
    sort,
    ...(sort === "distance" ? { lat: latRaw, lng: lngRaw } : {}),
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
  // `sort=distance` KHÔNG dùng bbox (thiết kế mục 3.1): bbox lọc theo khung nhìn
  // bản đồ, distance sắp theo vị trí người dùng — hai khái niệm khác nhau.
  // (Hiện chỉ `/places/map` gửi bbox và map bỏ qua sort nên không va chạm.)
  if (filters.bbox && filters.sort !== "distance") {
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
  /** Chỉ có khi `sort=distance` — khoảng cách Haversine tới người dùng (km). */
  distance_km?: number | null
}

/**
 * Danh sách cột dùng chung. `extra` phải nằm TRONG mệnh đề SELECT (trước
 * `FROM`) — nối sau `FROM` sẽ bị Postgres hiểu là một FROM item thứ hai và báo
 * lỗi cú pháp.
 */
function selectPlaces(extra: Prisma.Sql = Prisma.empty): Prisma.Sql {
  return Prisma.sql`
  SELECT p.id, p.name, p.address, p.city, p.district, p.category::text AS category, p.tags,
         p.price_level, p.lat, p.lng, p.status::text AS status, p.created_at,
         COALESCE(r.rating, 0)::float8 AS rating,
         COALESCE(r.review_count, 0)::int AS review_count,
         img.url AS image_url, img.height AS image_height${extra}
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
    priceLevel: row.price_level,
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    imageHeight: row.image_height ?? 320,
    ...(row.lat !== null ? { lat: row.lat } : {}),
    ...(row.lng !== null ? { lng: row.lng } : {}),
    status: row.status,
  }
}

export type PlaceDto = ReturnType<typeof toPlaceDto>

/**
 * Biểu thức Haversine (km) tới vị trí người dùng — MỘT biểu thức duy nhất dùng
 * cho cả SELECT, ORDER BY lẫn điều kiện keyset: ba chỗ phải giống hệt nhau,
 * nếu khác là trùng/sót dòng ở biên phân trang.
 *
 * Hằng số 6371 (km) khớp `calculateDistanceKm` phía client; công thức acos và
 * atan2 là hai dạng Haversine tương đương (chênh ~1e-9 km, dưới ngưỡng test
 * 0,01 km). Toạ độ truyền qua `Prisma.sql` (không nối chuỗi).
 */
function distanceSql(lat: number, lng: number): Prisma.Sql {
  return Prisma.sql`(6371 * acos(least(1, greatest(-1,
    cos(radians(${lat})) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(p.lat))
  ))))`
}

/** Một trang địa điểm theo keyset giảm dần `(created_at, id)` (D2) hoặc keyset theo `sort`. */
export async function listPlaces(
  filters: PlaceFilters,
  cursor: PlaceCursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: PlaceCursor | null }> {
  const conditions = buildConditions(filters)

  // Cursor decode đúng nhưng `kind` khác kiểu sắp xếp hiện tại (người dùng đổi
  // sort, link cũ) → coi như không có cursor, trả trang đầu — xem comment của
  // `cursor.ts` cho ngoại lệ này.
  const matchingCursor = cursor && cursor.kind === filters.sort ? cursor : null

  let orderBy: Prisma.Sql
  let extraSelect: Prisma.Sql = Prisma.empty
  let keyset: Prisma.Sql | null = null

  switch (filters.sort) {
    case "rating": {
      // Biểu thức ORDER BY và keyset phải giống hệt (`COALESCE(r.rating, 0)`).
      orderBy = Prisma.sql`COALESCE(r.rating, 0) DESC, r.review_count DESC, p.created_at DESC, p.id DESC`
      if (matchingCursor?.kind === "rating") {
        keyset = Prisma.sql`(COALESCE(r.rating, 0), r.review_count, p.created_at, p.id)
          < (${matchingCursor.rating}::float8, ${matchingCursor.reviewCount}::int, ${matchingCursor.createdAt}::timestamptz, ${matchingCursor.id})`
      }
      break
    }
    case "distance": {
      // `filters.lat/lng` luôn có khi sort là distance (parse đã rơi về newest).
      const dist = distanceSql(filters.lat!, filters.lng!)
      extraSelect = Prisma.sql`, ${dist} AS distance_km`
      // Quán thiếu toạ độ (NULL) xếp cuối — giống logic client hiện tại.
      orderBy = Prisma.sql`${dist} ASC NULLS LAST, p.id ASC`
      if (matchingCursor?.kind === "distance") {
        // Bẫy SQL: `(distance, id) > (…)` với `distance = NULL` cho kết quả NULL
        // → WHERE coi là FALSE → quán thiếu toạ độ bị mất ở trang 2+. Phải tách
        // nhánh: dòng cuối trang trước CÓ toạ độ thì mọi dòng NULL đều thuộc
        // trang sau (NULL xếp sau tất cả); dòng cuối THIẾU toạ độ thì lấy các
        // dòng NULL có id lớn hơn (tiebreak trong nhóm NULL là `p.id ASC`).
        keyset =
          matchingCursor.distance === null
            ? Prisma.sql`(${dist} IS NULL AND p.id > ${matchingCursor.id})`
            : Prisma.sql`((${dist} IS NOT NULL AND (${dist}, p.id) > (${matchingCursor.distance}::float8, ${matchingCursor.id}))
              OR ${dist} IS NULL)`
      }
      break
    }
    default: {
      orderBy = Prisma.sql`p.created_at DESC, p.id DESC`
      if (matchingCursor?.kind === "newest") {
        keyset = Prisma.sql`(p.created_at, p.id) < (${matchingCursor.createdAt}::timestamptz, ${matchingCursor.id})`
      }
    }
  }

  if (keyset) conditions.push(keyset)

  // Lấy dư 1 dòng để biết còn trang sau — không COUNT toàn bộ (đắt, không cần).
  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces(extraSelect)}
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY ${orderBy}
    LIMIT ${pageSize + 1}
  `)

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? cursorForSort(filters.sort, last) : null

  return { items: page.map(toPlaceDto), next }
}

/** Cursor của dòng cuối trang, đúng `kind` theo kiểu sắp xếp đang dùng. */
function cursorForSort(sort: PlaceSort, row: PlaceRow): PlaceCursor {
  switch (sort) {
    case "rating":
      return {
        kind: "rating",
        rating: Number(row.rating),
        reviewCount: Number(row.review_count),
        createdAt: row.created_at,
        id: row.id,
      }
    case "distance":
      return { kind: "distance", distance: row.distance_km ?? null, id: row.id }
    default:
      return { kind: "newest", createdAt: row.created_at, id: row.id }
  }
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
      ${selectPlaces()}
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
    ${selectPlaces()}
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
    ${selectPlaces()}
    WHERE p.id = ${id} AND p.published_at IS NOT NULL AND p.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? toPlaceDto(row) : null
}
