import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { parseApiCategory, toApiCategory } from "./enums"
import { normalizeSearchText, synonymVariants } from "./search-synonyms"
import { embedQuery, vectorToLiteral } from "./embeddings"
import { detectIntentAttributes } from "./intent-lexicon"
import { logger } from "./logger"
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
 * Haystack ĐÃ BỎ TOÀN BỘ khoảng trắng. Vì sao cần: người dùng hay viết dính
 * ("caphe" thay vì "ca pê"/"ca phe") — LIKE cả chuỗi trên haystack có khoảng
 * trắng sẽ trượt. So trên bản không khoảng trắng thì "caphe" khớp
 * "Ca Phe Trung" (→ "caphetrung"). Chỉ là một `replace` trên chuỗi đã chuẩn hoá
 * nên chi phí thấp; dataset demo ~350 quán, không cần index riêng.
 */
const COMPACT_HAYSTACK = Prisma.sql`replace(${HAYSTACK}, ' ', '')`

/**
 * Điều kiện LIKE trên một haystack. Từ khoá được chuẩn hoá bằng chính hàm SQL
 * của haystack nên `?q=bánh xèo` khớp `Bánh xèo Bà Dương` (mock cũng vậy). Sau
 * chuẩn hoá từ khoá không còn `%`/`_` nên không thể thành wildcard.
 */
function likeCondition(haystack: Prisma.Sql, keyword: string): Prisma.Sql {
  return Prisma.sql`${haystack} LIKE ${Prisma.sql`'%' || immutable_search_normalize(${keyword}) || '%'`}`
}

/**
 * Một từ khoá khớp khi haystack chứa nó HOẶC chứa một biến thể đồng nghĩa
 * (mỗi biến thể là một mệnh đề OR — từ khoá gốc luôn nằm trong danh sách nên
 * hành vi cũ không mất). Dùng cho `includeKeyword`/`excludeKeyword` — giữ đúng
 * nghĩa "chứa từ khoá" trên haystack có khoảng trắng.
 */
function keywordCondition(keyword: string): Prisma.Sql {
  const variants = [keyword, ...synonymVariants(normalizeSearchText(keyword))]
  const unique = [...new Set(variants)]
  return Prisma.sql`(${Prisma.join(
    unique.map((variant) => likeCondition(HAYSTACK, variant)),
    " OR ",
  )})`
}

/**
 * Token của `?q=` — như `keywordCondition` và thêm nhánh haystack KHÔNG khoảng
 * trắng: người dùng hay viết dính ("caphe" thay vì "ca phe"), LIKE cả chuỗi
 * trên haystack có khoảng trắng sẽ trượt. So trên bản bỏ khoảng trắng thì
 * "caphe" khớp "Ca Phe Trung" (→ `caphetrung`). Chỉ là một `replace` trên chuỗi
 * đã chuẩn hoá; dataset demo ~350 quán nên không cần index riêng.
 */
function searchTokenCondition(token: string): Prisma.Sql {
  const variants = [token, ...synonymVariants(normalizeSearchText(token))]
  const unique = [...new Set(variants)]
  return Prisma.sql`(${Prisma.join(
    unique.map(
      (variant) =>
        Prisma.sql`(${likeCondition(HAYSTACK, variant)} OR ${likeCondition(COMPACT_HAYSTACK, variant)})`,
    ),
    " OR ",
  )})`
}

/**
 * Hư từ bị bỏ khỏi điều kiện AND của `?q=`.
 *
 * Vì sao cần: `searchCondition` yêu cầu venue chứa ĐỦ mọi token. Người dùng gõ
 * tự nhiên ("good pizza for takeout", "quán ăn ngon") nên hư từ và tính từ chất
 * lượng chung bị đem đi so khớp trên tên/địa chỉ/tag — gần như không venue nào
 * chứa "good"/"with", nên nhánh lexical rỗng dù ý định rõ ràng. Đo được trên bộ
 * Yelp: hybrid3 P@5 0.514 so với hybrid2 0.728 (xem docs/EVAL-PROTOCOL.md mục 8).
 *
 * Nguyên tắc chọn: chỉ nhận token KHÔNG BAO GIỜ là tên riêng/loại hình, và loại
 * hẳn từ mơ hồ giữa hai ngôn ngữ:
 * - "an" (mạo từ EN) trùng "ăn" (VN) → KHÔNG bỏ.
 * - "la" (mạo từ) trùng "La" trong tên quán → KHÔNG bỏ.
 * - "ban" (bạn/bán) mơ hồ → KHÔNG bỏ.
 * - "cua" (của) trùng "cua" (con cua) → KHÔNG bỏ.
 */
const QUERY_STOPWORDS = new Set([
  // --- Tiếng Anh: hư từ ---
  "a",
  "the",
  "in",
  "at",
  "near",
  "me",
  "my",
  "with",
  "for",
  "of",
  "to",
  "and",
  "or",
  "is",
  "are",
  "be",
  "on",
  "by",
  "from",
  "where",
  "what",
  "get",
  "some",
  "something",
  // --- Tiếng Anh: tính từ chất lượng chung (không phải tên riêng) ---
  "good",
  "best",
  "great",
  "nice",
  "top",
  "cheap",
  "place",
  "places",
  "spot",
  "spots",
  "tonight",
  "dinner",
  "lunch",
  // --- Tiếng Việt: hư từ (đã bỏ dấu) ---
  "o",
  "tai",
  "gan",
  "nao",
  "gi",
  "khong",
  "va",
  "voi",
  "de",
  "thi",
  "mot",
  "nhung",
  "cac",
  "toi",
  "minh",
  "rat",
  "cung",
  "hay",
  // --- Tiếng Việt: tính từ chất lượng chung + danh từ chung ---
  // "ngon" (tasty) và "quan" (quán = eatery) là từ chung, đúng loại hư từ giống
  // "good"/"place" của tiếng Anh: gần như mọi venue đều có thể chứa "quán" trong
  // tên, còn "ngon" thì không venue nào — bắt buộc khớp cả hai chỉ làm rỗng nhánh
  // lexical. Đo trên bộ v2: bỏ 2 token này khỏi điều kiện AND giữ P@5 0.875 thay
  // vì 0.870. Test `quan ngon` vẫn khớp "Nhà Hàng Bà Bè" nhờ nhánh biến thể đồng
  // nghĩa ("nha hang") + xếp hạng lexical theo GREATEST similarity trên biến thể.
  "ngon",
  "quan",
  "tot",
])

/**
 * Điều kiện cho `?q=` — tách thành các token và yêu cầu ĐỦ (AND), để
 * `?q=caphe trung` khớp "Cà phê Trung" (trước đây LIKE cả chuỗi nên trượt khi
 * thứ tự/từ dư khác). Cụm nguyên bản có trong map đồng nghĩa thì OR thêm nhánh
 * "khớp một biến thể cụm" (ví dụ "quan ngon" → "quan an"/"nha hang"/"quan nhau").
 */
function searchCondition(query: string): Prisma.Sql {
  const normalized = normalizeSearchText(query)
  const allTokens = normalized.split(" ").filter((token) => token.length > 0)
  // Query chỉ toàn ký tự đặc biệt ("!!!") chuẩn hoá xong rỗng — không có điều
  // kiện nào hợp lệ. `Prisma.join([])` ném TypeError nên phải trả TRUE thay vì
  // gọi join trên mảng rỗng (regression đã bị bắt bởi audit).
  if (allTokens.length === 0) return Prisma.sql`TRUE`
  const meaningful = allTokens.filter((token) => !QUERY_STOPWORDS.has(token))
  // Query toàn hư từ ("good place") → giữ token gốc: bỏ hết thì điều kiện thành
  // TRUE và trả cả bảng, tệ hơn hẳn việc giữ điều kiện cũ.
  const tokens = meaningful.length > 0 ? meaningful : allTokens
  const tokenConds = tokens.map(searchTokenCondition)
  const base = Prisma.sql`(${Prisma.join(tokenConds, " AND ")})`

  const phraseVariants = synonymVariants(normalized)
  if (phraseVariants.length === 0) return base

  const alternatives = phraseVariants.map((variant) => {
    const variantTokens = variant
      .split(" ")
      .filter((token) => token.length > 0 && !QUERY_STOPWORDS.has(token))
    if (variantTokens.length === 0) return null
    return Prisma.sql`(${Prisma.join(variantTokens.map(searchTokenCondition), " AND ")})`
  })
  const validAlternatives = alternatives.filter((item): item is Prisma.Sql => item !== null)
  if (validAlternatives.length === 0) return base
  return Prisma.sql`(${base} OR ${Prisma.join(validAlternatives, " OR ")})`
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
    conditions.push(searchCondition(filters.q))
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
export interface PlaceRow {
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
  opening_hours: string | null
  /** Ngày duyệt lên /discover — FE dùng cho badge "Mới" (≤14 ngày). */
  published_at: Date | null
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
export function selectPlaces(extra: Prisma.Sql = Prisma.empty): Prisma.Sql {
  return Prisma.sql`
  SELECT p.id, p.name, p.address, p.city, p.district, p.category::text AS category, p.tags,
         p.price_level, p.lat, p.lng, p.status::text AS status, p.opening_hours, p.created_at, p.published_at,
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
    ...(row.opening_hours ? { openingHours: row.opening_hours } : {}),
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
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

// ---------------------------------------------------------------------------
// Hybrid search (P1): lexical (pg_trgm LIKE) + dense (pgvector cosine) fused
// bằng RRF k=60. Chỉ bật khi có `?q=` và không có cursor (trang đầu) — cursor
// keyset hiện tại không mang được thứ tự RRF, các trang sau vẫn đi lexical.
// ---------------------------------------------------------------------------

/** Số ứng viên mỗi nhánh (lexical/dense) đưa vào fusion. */
const HYBRID_POOL = 50
/**
 * Số kết quả hybrid tối đa trả về một lần (trang đầu, không có trang sau).
 * Chọn 30 = 3 trang FE gộp lại — đủ cho nhu cầu khám phá, không phình response.
 */
const HYBRID_MAX_RESULTS = 30
/** Hằng số RRF chuẩn — k lớn làm dịu chênh lệch hạng giữa hai nhánh. */
const RRF_K = 60

interface DenseCandidate {
  id: string
}

/**
 * Top-K ứng viên dense theo cosine trên `place_embeddings`. Trả `null` khi
 * encoder lỗi/không khả dụng — caller fallback thuần lexical, KHÔNG throw.
 * Export cho eval script đo chế độ dense-only / hybrid 2 nhánh.
 */
export async function denseCandidates(
  query: string,
  limit: number,
): Promise<DenseCandidate[] | null> {
  const vec = await embedQuery(query)
  if (!vec) return null
  const vecLiteral = vectorToLiteral(vec)
  try {
    const rows = await prisma.$queryRaw<{ place_id: string }[]>(Prisma.sql`
      SELECT pe.place_id
      FROM place_embeddings pe
      JOIN places p ON p.id = pe.place_id
      WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
      ORDER BY pe.embedding <=> ${vecLiteral}::vector
      LIMIT ${limit}
    `)
    return rows.map((row) => ({ id: row.place_id }))
  } catch (err) {
    logger.warn({ err }, "dense search thất bại, fallback lexical")
    return null
  }
}

/**
 * Ứng viên từ thuộc tính có cấu trúc do `detectIntentAttributes` trích ra.
 * Trả mảng rỗng khi query không nêu thuộc tính nào — RRF giữ nguyên 2 nhánh.
 */
async function structuredCandidates(
  intent: ReturnType<typeof detectIntentAttributes>,
  attrConditions: Prisma.Sql[],
  limit: number,
): Promise<string[]> {
  const { tags, categories, districts, alwaysOpen } = intent
  if (tags.length === 0 && categories.length === 0 && districts.length === 0 && !alwaysOpen)
    return []

  const matches: Prisma.Sql[] = []
  if (categories.length > 0)
    matches.push(Prisma.sql`p.category::text IN (${Prisma.join(categories)})`)
  if (tags.length > 0) matches.push(Prisma.sql`p.tags && ARRAY[${Prisma.join(tags)}]::text[]`)
  if (districts.length > 0) matches.push(Prisma.sql`p.district IN (${Prisma.join(districts)})`)
  // "Mở 24/7" là thuộc tính nhị phân đọc thẳng từ dữ liệu, không phải suy đoán
  // ngữ nghĩa — nếu thiếu nó ở đây thì query "quán mở 24/7" không có nhánh nào
  // ưu tiên venue thật sự mở cả ngày.
  if (alwaysOpen) matches.push(Prisma.sql`p.opening_hours = '24/7'`)

  // Xếp theo số tag khớp (nhiều thuộc tính đúng = sát ý hơn), rồi độ mới.
  // Biểu thức phải nằm trong SELECT với alias — ORDER BY tham số trực tiếp bị
  // Postgres hiểu là ordinal cột (`ORDER BY position 0 is not in select list`).
  const tagOverlap =
    tags.length > 0
      ? Prisma.sql`(SELECT count(*) FROM unnest(p.tags) AS t(tag) WHERE t.tag = ANY(ARRAY[${Prisma.join(tags)}]::text[]))`
      : Prisma.sql`0`

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id, ${tagOverlap} AS overlap
      FROM places p
      WHERE ${Prisma.join(attrConditions, " AND ")}
        AND (${Prisma.join(matches, " OR ")})
      ORDER BY overlap DESC, p.published_at DESC NULLS LAST, p.id ASC
      LIMIT ${limit}
    `)
    return rows.map((row) => row.id)
  } catch (err) {
    logger.warn({ err }, "structured retrieval thất bại, bỏ nhánh này")
    return []
  }
}

/**
 * Reciprocal Rank Fusion: score = Σ 1/(k + hạng). Hạng bắt đầu từ 1 ở cả hai
 * nhánh; venue xuất hiện ở cả hai nhánh được cộng dồn. Tie-break bằng id để
 * thứ tự ổn định giữa các request. Export cho eval script đo từng chế độ.
 */
export function fuseRrf(...branches: { ids: string[]; weight?: number }[]): string[] {
  const scores = new Map<string, number>()
  const add = ({ ids, weight = 1 }: { ids: string[]; weight?: number }) => {
    ids.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + weight / (RRF_K + index + 1))
    })
  }
  for (const branch of branches) add(branch)
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
}

/**
 * Chạy hybrid cho một bộ filter có `q`. Trả `null` khi dense không khả dụng
 * (encoder lỗi) — caller dùng luồng lexical thuần. Filter thuộc tính
 * (district/category/price/keyword/bbox…) áp SAU fusion trên pool ứng viên.
 *
 * `total` = số kết quả hybrid sau lọc thuộc tính — pool bị chặn ở
 * `HYBRID_POOL` ứng viên mỗi nhánh nên con số này là "số khớp trong pool",
 * không phải tổng toàn tập như lexical (đánh đổi đã ghi ở `listPlaces`).
 */
async function hybridSearch(
  filters: PlaceFilters & { q: string },
): Promise<{ items: PlaceDto[]; total: number } | null> {
  const attrConditions = buildConditions({ ...filters, q: undefined })
  const lexicalConditions = buildConditions(filters)
  // Xếp hạng lexical phải dùng CÙNG ngữ nghĩa với điều kiện: điều kiện OR cả
  // biến thể đồng nghĩa cụm ("quan ngon" → "nha hang") nhưng nếu chỉ đo
  // similarity với chuỗi gốc thì venue khớp biến thể bị điểm trigram rất thấp,
  // chìm dưới đống venue chỉ khớp một token chung ("quan" trong "Quảng Nam")
  // và bị cắt khỏi pool 50. GREATEST similarity trên (q + biến thể) = venue nào
  // khớp tốt nhất MỘT cách diễn đạt của người dùng thì đứng cao nhất.
  const rankVariants = [filters.q, ...synonymVariants(normalizeSearchText(filters.q))]
  const lexicalRank = Prisma.sql`GREATEST(${Prisma.join(
    rankVariants.map(
      (variant) => Prisma.sql`similarity(${HAYSTACK}, immutable_search_normalize(${variant}))`,
    ),
    ", ",
  )})`

  const intent = detectIntentAttributes(filters.q)

  const [dense, lexicalRows, structuredRows] = await Promise.all([
    denseCandidates(filters.q, HYBRID_POOL),
    // Nhánh lexical: cùng điều kiện với luồng thường, xếp hạng bằng trigram
    // similarity (dataset ~350 quán nên quét toàn bảng vẫn rẻ).
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM places p
      WHERE ${Prisma.join(lexicalConditions, " AND ")}
      ORDER BY ${lexicalRank} DESC, p.created_at DESC, p.id DESC
      LIMIT ${HYBRID_POOL}
    `),
    // Nhánh structured: người dùng nêu đúng thuộc tính có trong dữ liệu ("quán
    // chay", "hải sản", "ở Sơn Trà") → lấy venue khớp tag/category/district,
    // xếp theo SỐ thuộc tính khớp rồi mới tới độ mới. Không hard filter: nhận
    // sai từ khoá cũng chỉ làm nhánh này rỗng, không đẩy kết quả về 0.
    structuredCandidates(intent, attrConditions, HYBRID_POOL),
  ])
  if (!dense) return null

  // Nhánh structured có độ chính xác cao (khớp đúng thuộc tính người dùng nêu)
  // nên nhân trọng số 2 — vẫn là RRF, không phải cộng điểm thủ công; cần thiết
  // vì nhóm thuộc tính hiếm (hải sản 7 venue, bar 7 venue) nếu để trọng số 1 sẽ
  // bị danh sách lexical 50 dòng lấn át.
  const ranked = fuseRrf(
    { ids: lexicalRows.map((row) => row.id) },
    { ids: dense.map((candidate) => candidate.id) },
    { ids: structuredRows, weight: 2 },
  )
  if (ranked.length === 0) return { items: [], total: 0 }

  // Lấy dòng đầy đủ cho pool đã fuse, giữ đúng thứ tự RRF bằng array_position.
  // Filter thuộc tính áp ở đây (SAU fusion) nên dense có thể đưa venue khớp
  // ngữ nghĩa vào kết quả kể cả khi lexical trượt từ khoá.
  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces()}
    WHERE p.id IN (${Prisma.join(ranked.map((id) => Prisma.sql`${id}`))})
      AND ${Prisma.join(attrConditions, " AND ")}
    ORDER BY array_position(ARRAY[${Prisma.join(ranked.map((id) => Prisma.sql`${id}`))}]::text[], p.id)
  `)

  return { items: rows.map(toPlaceDto), total: rows.length }
}

/** Một trang địa điểm theo keyset giảm dần `(created_at, id)` (D2) hoặc keyset theo `sort`. */
export async function listPlaces(
  filters: PlaceFilters,
  cursor: PlaceCursor | null,
  pageSize: number,
): Promise<{ items: PlaceDto[]; next: PlaceCursor | null; total: number }> {
  // Hybrid chỉ cho trang đầu (cursor null) VÀ sort mặc định (`newest`): thứ tự
  // RRF không keyset được, và tôn trọng sort người dùng (rating/distance) quan
  // trọng hơn lợi điểm hybrid — trang 2+ và sort khác quay về lexical thuần.
  // `next = null` để không trùng/sót giữa trang hybrid và trang lexical — kết
  // quả tìm kiếm có `q` bị chặn ở pool HYBRID_POOL ứng viên.
  if (filters.q && !cursor && filters.sort === "newest") {
    const hybrid = await hybridSearch(filters as PlaceFilters & { q: string })
    if (hybrid) {
      // `total = items.length` (không phải tổng pool): FE hiển thị "N địa điểm"
      // từ totalResults và không có trang sau (RRF không keyset được) — con số
      // phải khớp đúng số card người dùng xem được, không báo số ảo.
      const items = hybrid.items.slice(0, HYBRID_MAX_RESULTS)
      return { items, next: null, total: items.length }
    }
    // encoder lỗi → rơi xuống lexical thuần bên dưới.
  }

  const baseConditions = buildConditions(filters)
  // Bản sao cho query trang — keyset chỉ áp dụng cho trang hiện tại, COUNT tổng
  // phải dùng điều kiện gốc để `totalResults` đúng nghĩa "tổng số khớp".
  const conditions = [...baseConditions]
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

  // Count dùng điều kiện GỐC (không keyset) — `totalResults` là tổng số khớp bộ
  // lọc, không phải số item của trang này. Chạy song song với query trang.
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
      ${selectPlaces(extraSelect)}
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY ${orderBy}
      LIMIT ${pageSize + 1}
    `),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM places p
      WHERE ${Prisma.join(baseConditions, " AND ")}
    `),
  ])

  const page = rows.slice(0, pageSize)
  const last = page.at(-1)
  const next = rows.length > pageSize && last ? cursorForSort(filters.sort, last) : null

  return { items: page.map(toPlaceDto), next, total: Number(countRows[0]?.count ?? 0) }
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
  // Map cũng dùng hybrid khi có `q` (không phân trang nên không vướng cursor).
  if (filters.q) {
    const hybrid = await hybridSearch(filters as PlaceFilters & { q: string })
    if (hybrid) return { items: hybrid.items.slice(0, limit), total: hybrid.total }
  }

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

/**
 * Như `findPublicPlace` nhưng kèm `updatedAt` — dùng cho OG preview cần gắn
 * `?v=` vào URL ảnh để bust cache khi dữ liệu đổi. Một query duy nhất thay vì
 * gọi `findPublicPlace` rồi `findUnique` lần nữa.
 */
export async function findPublicPlaceWithVersion(
  id: string,
): Promise<{ place: PlaceDto; updatedAt: Date } | null> {
  const rows = await prisma.$queryRaw<Array<PlaceRow & { updated_at: Date }>>(Prisma.sql`
    ${selectPlaces(Prisma.sql`, p.updated_at`)}
    WHERE p.id = ${id} AND p.published_at IS NOT NULL AND p.deleted_at IS NULL
    LIMIT 1
  `)
  const row = rows[0]
  return row ? { place: toPlaceDto(row), updatedAt: row.updated_at } : null
}

/**
 * Gợi ý "ý bạn là…" khi tìm kiếm không có kết quả: dùng `similarity()` của
 * pg_trgm trên tên đã chuẩn hoá, lấy ứng viên gần nhất.
 *
 * Chỉ so tên (`p.name`) — địa chỉ/tag quá đa dạng, trigram trên tên mới phản
 * ánh "người dùng định gõ tên quán". Trả `null` khi không có ứng viên đủ gần.
 *
 * Hai chặn để không gợi ý vô nghĩa:
 * - Bỏ ứng viên mà tên chuẩn hoá BẰNG chính query (similarity = 1 nhưng kết
 *   quả tìm kiếm rỗng là do filter khác, gợi ý lại chính từ người dùng vừa gõ
 *   là lừa người dùng).
 * - Ngưỡng 0.45 và tên ≥ 5 ký tự chuẩn hoá: tên ngắn dễ đạt 0.3 một cách
 *   ngẫu nhiên, gợi ý rác còn tệ hơn không gợi ý.
 */
export async function findDidYouMean(query: string): Promise<string | null> {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.replace(/ /g, "").length < 5) return null
  const rows = await prisma.$queryRaw<{ name: string }[]>(Prisma.sql`
    SELECT p.name
    FROM places p
    WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
      AND immutable_search_normalize(p.name) <> ${normalizedQuery}
      AND similarity(
            immutable_search_normalize(p.name),
            immutable_search_normalize(${query})
          ) >= 0.45
    ORDER BY similarity(
               immutable_search_normalize(p.name),
               immutable_search_normalize(${query})
             ) DESC, p.id ASC
    LIMIT 1
  `)
  return rows[0]?.name ?? null
}
