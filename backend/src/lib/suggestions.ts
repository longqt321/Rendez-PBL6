import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { toApiCategory } from "./enums"
import type { RankCandidate } from "./ranking"
import { createTtlCache } from "./http-cache"

/**
 * Biểu thức chuẩn hoá — dùng CHÍNH hàm SQL `immutable_search_normalize` của
 * migration 20261111090000 (khớp `normalizeText` của mock). Trước đây file này
 * viết lại biểu thức riêng bằng `unaccent()` + regex: kết quả trùng hôm nay,
 * nhưng hai nguồn chuẩn hoá song song là một lỗi tiềm ẩn — sửa hàm SQL mà
 * quên bản này là gợi ý lệch với tìm kiếm.
 */
function norm(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`immutable_search_normalize(${column})`
}

interface CandidateRow {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  category: string
  lat: number | null
  lng: number | null
  image_url: string | null
  name_norm: string
  address_norm: string
  city_norm: string
  tags_norm: string[]
  rating: number
  review_count: number
}

/**
 * Lấy ứng viên để chấm điểm.
 *
 * @param publishedOnly `true` cho `GET /places/suggestions` (chỉ place công khai);
 *   `false` cho job phát hiện place chưa publish (A7.2).
 */
export async function fetchRankCandidates(publishedOnly: boolean): Promise<CandidateRow[]> {
  const visibility = publishedOnly
    ? Prisma.sql`p.published_at IS NOT NULL AND p.status <> 'closed'`
    : Prisma.sql`p.published_at IS NULL`

  return prisma.$queryRaw<CandidateRow[]>(Prisma.sql`
    SELECT p.id, p.name, p.address, p.city, p.district, p.category::text AS category, p.lat, p.lng,
           img.url AS image_url,
           ${norm(Prisma.sql`p.name`)} AS name_norm,
           ${norm(Prisma.sql`p.address`)} AS address_norm,
           ${norm(Prisma.sql`p.city`)} AS city_norm,
           COALESCE(
             (SELECT array_agg(${norm(Prisma.sql`t.tag`)})
              FROM unnest(p.tags) AS t(tag)),
             ARRAY[]::text[]
           ) AS tags_norm,
           COALESCE(r.rating, 0)::float8 AS rating,
           COALESCE(r.review_count, 0)::int AS review_count
    FROM places p
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(rv.rating)::numeric, 1) AS rating, COUNT(*) AS review_count
      FROM reviews rv
      WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT pi.url FROM place_images pi WHERE pi.place_id = p.id ORDER BY pi.position LIMIT 1
    ) img ON true
    WHERE ${visibility} AND p.deleted_at IS NULL
  `)
}

/**
 * Cache ứng viên đã publish cho gợi ý (G2).
 *
 * Query này quét toàn bộ place công khai + rating ảnh — đắt nhất trong route
 * gợi ý, và dữ liệu chỉ đổi khi có place mới publish hoặc review mới. TTL 60s
 * là mức đánh đổi đủ tươi cho demo; `invalidateSuggestionCache()` gọi ngay khi
 * publish place để không phải chờ hết TTL.
 */
const publishedCandidatesCache = createTtlCache<CandidateRow[]>({
  ttlMs: 60_000,
  maxEntries: 4,
})

/** Ứng viên đã publish (có cache + single-flight) — dùng cho `GET /places/suggestions`. */
export function fetchPublishedRankCandidates(): Promise<CandidateRow[]> {
  return publishedCandidatesCache.get("published", () => fetchRankCandidates(true))
}

/**
 * Như `fetchPublishedRankCandidates` nhưng báo `cacheHit` — route dùng để gắn
 * `meta.cacheHit` và đếm metrics mà không phải đoán.
 */
export function fetchPublishedRankCandidatesWithStatus(): Promise<{
  rows: CandidateRow[]
  cacheHit: boolean
}> {
  return publishedCandidatesCache
    .getWithStatus("published", () => fetchRankCandidates(true))
    .then(({ value, hit }) => ({ rows: value, cacheHit: hit }))
}

/** Xoá cache gợi ý — gọi khi dữ liệu place công khai thay đổi (publish). */
export function invalidateSuggestionCache(): void {
  publishedCandidatesCache.clear()
}

/** Chuẩn hoá caption bằng cùng biểu thức SQL — không tự viết lại NFD ở JS. */ export async function normalizeCaption(
  caption: string,
): Promise<string> {
  const rows = await prisma.$queryRaw<{ normalized: string }[]>(
    Prisma.sql`SELECT ${norm(Prisma.sql`${caption}::text`)} AS normalized`,
  )
  return rows[0]?.normalized ?? ""
}

export interface SuggestionCandidate extends RankCandidate {
  row: CandidateRow
}

export function toSuggestionCandidate(row: CandidateRow): SuggestionCandidate {
  return {
    id: row.id,
    category: toApiCategory(row.category),
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    city: row.city,
    nameNorm: row.name_norm,
    addressNorm: row.address_norm,
    cityNorm: row.city_norm,
    tagsNorm: row.tags_norm,
    row,
  }
}

export function toSuggestionPlaceSummary(row: CandidateRow, isPublished: boolean) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    ...(row.district ? { district: row.district } : {}),
    category: toApiCategory(row.category),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    isPublished,
    ...(row.lat !== null ? { lat: row.lat } : {}),
    ...(row.lng !== null ? { lng: row.lng } : {}),
  }
}
