import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"
import { selectPlaces, toPlaceDto, type PlaceRow } from "./places"

/** Số place tối đa mỗi ngành hàng trong danh sách cold-start. */
export const COLD_START_CAP_PER_CATEGORY = 3

export const HISTORY_WINDOW_DAYS = 90

export const AFFINITY_HALF_LIFE_DAYS = 30

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

/** Một place kèm điểm gợi ý đã chuẩn hoá. */
export interface ScoredPlace {
  id: string
  score: number
}

/** Kết quả chấm điểm nhánh affinity cho một actor. */
export interface AffinityScoreSet {
  /** Place ứng viên (đã loại place actor từng tương tác), xếp giảm dần theo score. */
  ranked: ScoredPlace[]
  /** Place actor đã tương tác trong cửa sổ lịch sử — không gợi ý lại. */
  seen: Set<string>
  seedCount: number
}

/** Một place kèm điểm DES (cold-start) và hạng trong nhóm ngành hàng. */
export interface ColdStartScore {
  id: string
  category: string
  score: number
  categoryRank: number
}

/**
 * Chấm điểm affinity cho một actor: lan truyền weight từ seed sang place liên
 * quan qua `affinity_cache`, chuẩn hoá theo tổng weight seed.
 * Trả null khi actor chưa có tương tác dương nào.
 */
export async function scoreAffinity(actor: RecommendationActor): Promise<AffinityScoreSet | null> {
  const since = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const actorCondition = actor.userId
    ? Prisma.sql`user_id = ${actor.userId}::uuid`
    : Prisma.sql`anon_id = ${actor.anonId}`

  const seeds = await prisma.$queryRaw<SeedRow[]>(Prisma.sql`
    SELECT place_id,
           SUM(
             weight * EXP(-LN(2) * GREATEST(0, EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0) / ${AFFINITY_HALF_LIFE_DAYS})
           )::float8 AS weight
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
  const cacheByPlace = new Map(cacheRows.map((entry) => [entry.place_id, entry.related]))

  const scores = new Map<string, number>()
  for (const seed of seeds) {
    const share = seed.weight / totalWeight
    const related = cacheByPlace.get(seed.place_id) ?? []
    for (const item of related) {
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
    .map(([id, score]) => ({ id, score }))

  if (ranked.length === 0) return null
  return { ranked, seen, seedCount: seeds.length }
}

/**
 * Áp giới hạn `cap` quán mỗi ngành hàng ở vòng 1 để đa dạng danh sách;
 * nếu vòng 1 vẫn thiếu `< limit` thì bổ sung từ overflow theo đúng thứ tự điểm.
 */
export function applyCategoryCap(
  rows: PlaceRow[],
  limit: number,
  cap: number = COLD_START_CAP_PER_CATEGORY,
): PlaceRow[] {
  const counts = new Map<string, number>()
  const { picked, overflow } = selectWithCap(rows, limit, cap, counts)
  for (const row of overflow) {
    if (picked.length >= limit) break
    picked.push(row)
  }
  return picked
}

function selectWithCap(
  rows: PlaceRow[],
  limit: number,
  cap: number,
  counts: Map<string, number>,
): { picked: PlaceRow[]; overflow: PlaceRow[] } {
  const picked: PlaceRow[] = []
  const overflow: PlaceRow[] = []
  for (const row of rows) {
    if (picked.length >= limit) break
    const count = counts.get(row.category) ?? 0
    if (count < cap) {
      picked.push(row)
      counts.set(row.category, count + 1)
    } else {
      overflow.push(row)
    }
  }
  return { picked, overflow }
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
export async function scoreColdStart(): Promise<ColdStartScore[]> {
  const currentHourBucket = Math.floor(Date.now() / 3_600_000)

  const rows = await prisma.$queryRaw<
    { id: string; cat: string; des_score: number; cat_rank: number }[]
  >(Prisma.sql`
    WITH candidate_metrics AS (
      SELECT 
        p.id,
        p.category::text AS cat,
        p.created_at,
        p.verified,
        COALESCE(r.review_count, 0) AS v_i,
        COALESCE(r.rating, 0.0) AS r_bar,
        (
          0.35 * CASE WHEN EXISTS (SELECT 1 FROM place_images pi WHERE pi.place_id = p.id) THEN 1.0 ELSE 0.0 END +
          0.20 * CASE WHEN p.description IS NOT NULL AND length(p.description) > 10 THEN 1.0 ELSE 0.0 END +
          0.20 * CASE WHEN p.opening_hours IS NOT NULL THEN 1.0 ELSE 0.0 END +
          0.15 * CASE WHEN array_length(p.tags, 1) > 0 THEN 1.0 ELSE 0.0 END +
          0.10 * CASE WHEN p.phone IS NOT NULL THEN 1.0 ELSE 0.0 END
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
          -- Bayes Rating Score với Completeness-Modulated Cold-Start Prior (w_r = 0.45):
          -- Khi v_i = 0, prior mu_0(i) = 3.4 + 1.0 * c_i giúp phân tách địa điểm có ảnh thật/đủ metadata
          -- thay vì đồng phẳng 4.0; khi v_i tăng dần sẽ hội tụ mượt về r_bar thực tế.
          0.45 * (
            (m.v_i * m.r_bar + 10.0 * (3.4 + 1.0 * m.c_i)) /
            (m.v_i + 10.0)
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
    SELECT rbc.id, rbc.cat, rbc.des_score, rbc.cat_rank
    FROM ranked_by_cat rbc
  `)
  return rows.map((row) => ({
    id: row.id,
    category: row.cat,
    score: Number(row.des_score),
    categoryRank: row.cat_rank,
  }))
}

/** Bọc `scoreColdStart` cho luồng gợi ý: áp category cap, xếp hạng và cắt limit. */
async function coldStartCandidates(
  limit: number,
  capPerCategory: number = COLD_START_CAP_PER_CATEGORY,
  excludeIds?: Set<string>,
): Promise<string[]> {
  const scored = await scoreColdStart()
  return scored
    .filter((row) => row.categoryRank <= capPerCategory && (!excludeIds || !excludeIds.has(row.id)))
    .sort(
      (a, b) => a.categoryRank - b.categoryRank || b.score - a.score || a.id.localeCompare(b.id),
    )
    .slice(0, limit * CANDIDATE_MULTIPLIER)
    .map((row) => row.id)
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
  const affinity = actor.userId || actor.anonId ? await scoreAffinity(actor) : null

  if (affinity) {
    const candidateIds = affinity.ranked
      .slice(0, limit * CANDIDATE_MULTIPLIER)
      .map((item) => item.id)
    const affinityRows = await fetchRows(candidateIds)
    const categoryCounts = new Map<string, number>()
    const { picked, overflow: affinityOverflow } = selectWithCap(
      affinityRows,
      limit,
      COLD_START_CAP_PER_CATEGORY,
      categoryCounts,
    )
    const hasAffinityMatch = picked.length > 0

    let coldOverflow: PlaceRow[] = []
    if (picked.length < limit) {
      const exclude = new Set<string>(affinity.seen)
      for (const row of picked) exclude.add(row.id)
      const backfillIds = await coldStartCandidates(
        limit - picked.length,
        COLD_START_CAP_PER_CATEGORY,
        exclude,
      )
      const backfillRows = await fetchRows(backfillIds)
      const extra = selectWithCap(
        backfillRows,
        limit - picked.length,
        COLD_START_CAP_PER_CATEGORY,
        categoryCounts,
      )
      picked.push(...extra.picked)
      coldOverflow = extra.overflow
    }

    if (picked.length < limit) {
      const seenPicked = new Set(picked.map((row) => row.id))
      for (const row of [...affinityOverflow, ...coldOverflow]) {
        if (picked.length >= limit) break
        if (!seenPicked.has(row.id)) {
          picked.push(row)
          seenPicked.add(row.id)
        }
      }
    }

    if (picked.length > 0) {
      return {
        items: picked.map(toPlaceDto),
        strategy: hasAffinityMatch ? "affinity" : "cold-start",
        seedCount: hasAffinityMatch ? affinity.seedCount : 0,
      }
    }
  }

  const ids = await coldStartCandidates(limit)
  const rows = await fetchRows(ids)
  return { items: rows.slice(0, limit).map(toPlaceDto), strategy: "cold-start", seedCount: 0 }
}
