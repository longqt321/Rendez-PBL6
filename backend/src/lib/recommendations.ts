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

/**
 * Nhánh cold-start theo thuật toán DES (Deterministic Exposure Scheduling):
 * 1. Completeness-Conditioned Bayesian Quality Scorer:
 *    m_i = m_0 * (1 + gamma * C(i)) với m_0 = 10, gamma = 0.5, mu_0 = 4.0
 *    R_hat(i) = (v_i * r_bar_i + m_i * mu_0) / (v_i + m_i)
 * 2. Điểm cơ sở chất lượng nội dung:
 *    S_cold(i) = 0.45 * R_hat(i) + 0.20 * V(i) + 0.20 * C(i) + 0.15 * T(i)
 * 3. Động lực khám phá tất định (Time-bucket Jitter Hashing):
 *    Score(i, b) = S_cold(i) + beta * h(i, b) với beta = 0.05
 * 4. Đa dạng hoá ngành hàng:
 *    Giới hạn tối đa capPerCategory trên mỗi nhóm ngành hàng để trang chủ đa dạng.
 */
async function coldStartCandidates(limit: number, capPerCategory: number = 3): Promise<string[]> {
  const currentHourBucket = Math.floor(Date.now() / 3_600_000)

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH candidate_metrics AS (
      SELECT 
        p.id,
        p.category::text AS cat,
        p.created_at,
        p.verified,
        COALESCE(r.review_count, 0) AS v_i,
        COALESCE(r.rating, 0.0) AS r_bar,
        (
          0.30 * CASE WHEN EXISTS (SELECT 1 FROM place_images pi WHERE pi.place_id = p.id) THEN 1.0 ELSE 0.0 END +
          0.20 * CASE WHEN p.description IS NOT NULL AND length(p.description) > 10 THEN 1.0 ELSE 0.0 END +
          0.20 * CASE WHEN p.opening_hours IS NOT NULL THEN 1.0 ELSE 0.0 END +
          0.15 * CASE WHEN array_length(p.tags, 1) > 0 THEN 1.0 ELSE 0.0 END +
          0.15 * CASE WHEN p.phone IS NOT NULL THEN 1.0 ELSE 0.0 END
        ) AS c_i
      FROM places p
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS review_count, COALESCE(AVG(rv.rating)::float8, 0.0) AS rating
        FROM reviews rv
        WHERE rv.place_id = p.id AND rv.deleted_at IS NULL
      ) r ON true
      WHERE ${Prisma.join(baseConditions(), " AND ")}
    ),
    scored AS (
      SELECT
        m.id,
        m.cat,
        (
          -- Bayes Rating Score (w_r = 0.45)
          0.45 * (
            (m.v_i * m.r_bar + (10.0 * (1.0 + 0.5 * m.c_i) * 4.0)) /
            (m.v_i + (10.0 * (1.0 + 0.5 * m.c_i)))
          ) +
          -- Verification Score (w_v = 0.20)
          0.20 * (CASE WHEN m.verified THEN 1.0 ELSE 0.5 END) +
          -- Metadata Completeness Score (w_c = 0.20)
          0.20 * m.c_i +
          -- Recency Score (w_t = 0.15)
          0.15 * GREATEST(0.0, 1.0 - (EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 86400.0) / 365.0) +
          -- Deterministic Jitter Hash (beta = 0.05)
          0.05 * (('x' || substr(md5(m.id || ${currentHourBucket.toString()}), 1, 8))::bit(32)::bigint / 4294967296.0)
        ) AS des_score
      FROM candidate_metrics m
    ),
    ranked_by_cat AS (
      SELECT
        s.id,
        s.cat,
        s.des_score,
        ROW_NUMBER() OVER (PARTITION BY s.cat ORDER BY s.des_score DESC)::int AS cat_rank
      FROM scored s
    )
    SELECT rbc.id
    FROM ranked_by_cat rbc
    WHERE rbc.cat_rank <= ${capPerCategory}
    ORDER BY rbc.cat_rank ASC, rbc.des_score DESC
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
