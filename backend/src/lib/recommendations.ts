import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { selectPlaces, toPlaceDto, type PlaceRow } from "./places"

const HISTORY_WINDOW_DAYS = 90

const CANDIDATE_MULTIPLIER = 3

export interface RecommendationActor {
  userId: string | null
  anonId: string | null
}

export interface RecommendedPlaces {
  items: ReturnType<typeof toPlaceDto>[]

  strategy: "affinity" | "cold-start"

  seedCount: number
}

interface SeedRow {
  place_id: string
  weight: number
}

interface RelatedJson {
  id: string
  score: number
}

interface CacheRow {
  place_id: string
  related: RelatedJson[]
}

function baseConditions(): Prisma.Sql[] {
  return [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.deleted_at IS NULL`,
    Prisma.sql`p.status <> 'closed'`,
  ]
}

async function affinityCandidates(
  actor: RecommendationActor,
  limit: number,
): Promise<{ ids: string[]; seedCount: number } | null> {
  const since = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const actorCondition = actor.userId
    ? Prisma.sql`user_id = ${actor.userId}::uuid`
    : Prisma.sql`anon_id = ${actor.anonId}`

  const seeds = await prisma.$queryRaw<SeedRow[]>(Prisma.sql`
    SELECT place_id, sum(weight)::int AS weight
    FROM interaction_events
    WHERE created_at >= ${since}
      AND place_id IS NOT NULL
      AND weight > 0
      AND ${actorCondition}
    GROUP BY place_id
    ORDER BY weight DESC, place_id ASC
    LIMIT 50
  `)
  if (seeds.length === 0) return null

  // Tổng weight seed để chuẩn hoá — seed nặng đóng góp nhiều hơn vào score.
  const totalWeight = seeds.reduce((sum, seed) => sum + seed.weight, 0)
  if (totalWeight <= 0) return null

  const seedIds = seeds.map((seed) => seed.place_id)
  const cacheRows = await prisma.$queryRaw<CacheRow[]>(Prisma.sql`
    SELECT place_id, related
    FROM affinity_cache
    WHERE place_id IN (${Prisma.join(seedIds)})
  `)

  const scores = new Map<string, number>()
  for (const seed of seeds) {
    const share = seed.weight / totalWeight
    const row = cacheRows.find((entry) => entry.place_id === seed.place_id)
    for (const item of row?.related ?? []) {
      if (item.score <= 0) continue
      scores.set(item.id, (scores.get(item.id) ?? 0) + share * item.score)
    }
  }

  // Loại place actor đã tương tác (mọi weight — đã ẩn/hủy thì không gợi ý lại).
  const seenRows = await prisma.$queryRaw<{ place_id: string }[]>(Prisma.sql`
    SELECT DISTINCT place_id
    FROM interaction_events
    WHERE created_at >= ${since}
      AND place_id IS NOT NULL
      AND ${actorCondition}
  `)
  const seen = new Set(seenRows.map((row) => row.place_id))

  const ranked = [...scores.entries()]
    .filter(([placeId]) => !seen.has(placeId))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit * CANDIDATE_MULTIPLIER)
    .map(([placeId]) => placeId)

  if (ranked.length === 0) return null
  return { ids: ranked, seedCount: seeds.length }
}

/** Nhánh cold start: phổ biến theo review_count trong số place công khai. */
async function coldStartCandidates(limit: number): Promise<string[]> {
  // `review_count` không phải cột của `places` — tính qua LATERAL như
  // `selectPlaces` (một nguồn duy nhất cho định nghĩa "phổ biến").
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id
    FROM places p
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS review_count
      FROM reviews rv
      WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
    ) r ON true
    WHERE ${Prisma.join(baseConditions(), " AND ")}
    ORDER BY COALESCE(r.review_count, 0) DESC, p.id ASC
    LIMIT ${limit * CANDIDATE_MULTIPLIER}
  `)
  return rows.map((row) => row.id)
}

/** Lấy dòng đầy đủ cho danh sách id, giữ đúng thứ tự đã xếp. */
async function fetchRows(ids: string[]): Promise<PlaceRow[]> {
  if (ids.length === 0) return []
  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces()}
    WHERE p.id IN (${Prisma.join(ids)})
      AND ${Prisma.join(baseConditions(), " AND ")}
    ORDER BY array_position(ARRAY[${Prisma.join(ids)}]::text[], p.id)
  `)
  return rows
}

/**
 * Gợi ý cho một actor. Luôn trả ít nhất cold-start khi DB có place — caller
 * không phải xử lý "rỗng hoàn toàn" trừ khi catalog trống.
 */
export async function getRecommendedPlaces(
  actor: RecommendationActor,
  limit: number,
): Promise<RecommendedPlaces> {
  const affinity = actor.userId || actor.anonId ? await affinityCandidates(actor, limit) : null

  if (affinity) {
    const rows = await fetchRows(affinity.ids.slice(0, limit))
    if (rows.length > 0) {
      return { items: rows.map(toPlaceDto), strategy: "affinity", seedCount: affinity.seedCount }
    }
  }

  const ids = await coldStartCandidates(limit)
  const rows = await fetchRows(ids.slice(0, limit))
  return { items: rows.map(toPlaceDto), strategy: "cold-start", seedCount: 0 }
}
