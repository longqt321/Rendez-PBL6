import type { PlaceCategory } from "@rendez/schema"
import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import type { RankCandidate } from "./ranking"

/**
 * Gợi ý địa điểm cho nội dung đang soạn (T2.4) — phần SQL của A7.1.
 *
 * Chuẩn hoá chuỗi bằng `unaccent()` + regex của Postgres để ranking chỉ so
 * khớp trên chuỗi đã chuẩn hoá (một nguồn duy nhất).
 */

/** Biểu thức chuẩn hoá — khớp `normalizeText` của mock: bỏ dấu, lowercase, gộp space. */
function norm(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`trim(regexp_replace(lower(unaccent(${column})), '[^a-z0-9]+', ' ', 'g'))`
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

function toApiCategory(value: string): string {
  return value.replace(/_/g, "-")
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

/** Chuẩn hoá caption bằng cùng biểu thức SQL — không tự viết lại NFD ở JS. */
export async function normalizeCaption(caption: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ normalized: string }[]>(
    Prisma.sql`SELECT ${norm(Prisma.sql`${caption}::text`)} AS normalized`,
  )
  return rows[0]?.normalized ?? ""
}

/** Ứng viên ranking kèm dòng thô để dựng `PlaceSummary` sau khi chấm điểm. */
export interface SuggestionCandidate extends RankCandidate {
  row: CandidateRow
}

export function toSuggestionCandidate(row: CandidateRow): SuggestionCandidate {
  return {
    id: row.id,
    category: toApiCategory(row.category) as PlaceCategory,
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
