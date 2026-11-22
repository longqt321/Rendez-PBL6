import { subDays } from "date-fns"
import { chunk } from "es-toolkit"
import { db, sql } from "./kysely"

export interface AffinityEvent {
  userId: string | null
  anonId: string | null
  placeId: string
  weight: number
}

export interface AffinityItem {
  id: string

  score: number
}

export interface ComputeItemItemOptions {
  topK?: number
}

const DEFAULT_TOP_K = 20

const CACHE_WINDOW_DAYS = 90

const INSERT_CHUNK_SIZE = 500

function actorKey(event: AffinityEvent): string | null {
  if (event.userId) return event.userId
  if (event.anonId) return `anon:${event.anonId}`
  return null
}

/**
 * Tính item-item affinity THUẦN (không I/O) — dễ test và dùng lại cho eval.
 *
 * Trả về Map placeId → danh sách place liên quan (score giảm dần). Place không
 * đồng xuất hiện với place nào khác sẽ KHÔNG có mặt trong Map (không phải mảng
 * rỗng) — nơi đọc cache phải coi "không có khoá" là "không có gợi ý".
 */
export function computeItemItem(
  events: readonly AffinityEvent[],
  opts: ComputeItemItemOptions = {},
): Map<string, AffinityItem[]> {
  const topK = opts.topK ?? DEFAULT_TOP_K
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error(`topK phải là số nguyên dương, nhận ${topK}`)
  }

  // (1) Vector thô theo actor. Cùng một place lặp lại trong một actor thì cộng
  // dồn weight — "xem 3 lần" mạnh hơn "xem 1 lần" nhưng vẫn nằm trong 1 chiều.
  const rawVectors = new Map<string, Map<string, number>>()
  for (const event of events) {
    if (event.weight === 0) continue
    if (!Number.isFinite(event.weight)) continue
    const actor = actorKey(event)
    if (!actor) continue

    let vector = rawVectors.get(actor)
    if (!vector) {
      vector = new Map<string, number>()
      rawVectors.set(actor, vector)
    }
    vector.set(event.placeId, (vector.get(event.placeId) ?? 0) + event.weight)
  }

  // (2) Chuẩn hoá L2 từng vector actor. Vector toàn số 0 (weight dương và âm
  // triệt tiêu nhau) không mang hướng → bỏ, tránh chia cho 0.
  const normalizedVectors: Map<string, number>[] = []
  for (const vector of rawVectors.values()) {
    let sumSquares = 0
    for (const weight of vector.values()) sumSquares += weight * weight
    const norm = Math.sqrt(sumSquares)
    if (norm === 0) continue

    const normalized = new Map<string, number>()
    for (const [placeId, weight] of vector) normalized.set(placeId, weight / norm)
    normalizedVectors.push(normalized)
  }

  // (3) Tích vô hướng theo cặp place trong từng actor kèm tích luỹ bậc phổ biến từng place (itemNormSq).
  const accumulators = new Map<string, Map<string, number>>()
  const itemNormSq = new Map<string, number>()
  for (const vector of normalizedVectors) {
    const entries = [...vector]
    for (let i = 0; i < entries.length; i += 1) {
      const [placeA, weightA] = entries[i]!
      itemNormSq.set(placeA, (itemNormSq.get(placeA) ?? 0) + weightA * weightA)
      let row = accumulators.get(placeA)
      if (!row) {
        row = new Map<string, number>()
        accumulators.set(placeA, row)
      }
      for (let j = 0; j < entries.length; j += 1) {
        if (i === j) continue
        const [placeB, weightB] = entries[j]!
        row.set(placeB, (row.get(placeB) ?? 0) + weightA * weightB)
      }
    }
  }

  // (4) Item-Degree Cosine Damping (R-4): chia cho (norm(A) * norm(B))^0.5 để khử thiên kiến quán đại trà.
  // Lọc self + similarity không dương, sắp xếp giảm dần, cắt top-K.
  const result = new Map<string, AffinityItem[]>()
  for (const [placeId, row] of accumulators) {
    const normASq = itemNormSq.get(placeId) ?? 1
    const items: AffinityItem[] = []
    for (const [relatedId, rawScore] of row) {
      if (relatedId === placeId) continue
      if (rawScore <= 0) continue
      const normBSq = itemNormSq.get(relatedId) ?? 1
      const damped = rawScore / Math.sqrt(Math.sqrt(normASq * normBSq))
      items.push({ id: relatedId, score: damped })
    }
    if (items.length === 0) continue
    items.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    result.set(placeId, items.slice(0, topK))
  }

  return result
}

/**
 * Tính lại toàn bộ `affinity_cache` từ event 90 ngày gần nhất.
 *
 * Ghi theo kiểu "thay toàn bộ trong MỘT transaction": DELETE + INSERT nằm cùng
 * transaction nên reader (API gợi ý) không bao giờ thấy cache rỗng giữa chừng —
 * MVCC chỉ cho thấy dữ liệu cũ cho tới khi commit.
 *
 * Trả về số place đã ghi (place có ít nhất 1 place liên quan).
 */
export async function refreshAffinityCache(): Promise<number> {
  const since = subDays(new Date(), CACHE_WINDOW_DAYS)

  const rows = await db
    .selectFrom("interaction_events")
    .select([sql<string | null>`user_id::text`.as("user_id"), "anon_id", "place_id", "weight"])
    .where("created_at", ">=", since)
    .where("place_id", "is not", null)
    .where("weight", "!=", 0)
    .execute()

  const related = computeItemItem(
    rows
      .filter((row): row is typeof row & { place_id: string } => row.place_id !== null)
      .map((row) => ({
        userId: row.user_id,
        anonId: row.anon_id,
        placeId: row.place_id,
        weight: Number(row.weight),
      })),
  )

  const entries = [...related]
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("affinity_cache").execute()
    for (const batch of chunk(entries, INSERT_CHUNK_SIZE)) {
      await trx
        .insertInto("affinity_cache")
        .values(
          batch.map(([placeId, items]) => ({
            place_id: placeId,
            related: JSON.stringify(items),
            computed_at: new Date(),
          })),
        )
        .execute()
    }
  })

  return entries.length
}
