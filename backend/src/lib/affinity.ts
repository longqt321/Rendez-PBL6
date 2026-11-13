import { Prisma } from "../../generated/prisma/client"
import { prisma } from "./prisma"

/**
 * Item-item collaborative filtering từ `interaction_events` (P1 — rec cold-start).
 *
 * Ý tưởng: mỗi actor (user đã đăng nhập hoặc khách có `anon_id`) là một vector
 * thưa trên không gian place, giá trị = tổng weight của các event trên place đó.
 * Chuẩn hoá L2 từng vector rồi lấy tích vô hướng giữa hai place trên cùng actor
 * — chính là cosine similarity giữa hai item trong không gian actor.
 *
 * Vì sao cosine trên vector actor chứ không phải cosine trên vector item:
 * - Actor "nặng" (nhiều event) không được phép lấn át actor chỉ có 1 event.
 * - Không cần thư viện ML: dữ liệu ở quy mô hiện tại (vài chục nghìn event)
 *   tính trong bộ nhớ là đủ; ALS/embedding để dành khi số event lớn hơn.
 *
 * Quy ước tín hiệu (xem `interaction-weights.ts`): weight dương = quan tâm,
 * weight âm = loại trừ. Event `weight = 0` (ví dụ `onboarding_skipped`) không
 * mang tín hiệu sở thích nên bị bỏ hoàn toàn.
 */

/** Một dòng event đã chuẩn hoá — khớp cột của `interaction_events`. */
export interface AffinityEvent {
  userId: string | null
  anonId: string | null
  placeId: string
  weight: number
}

/** Một place liên quan tới place đang xét. */
export interface AffinityItem {
  id: string
  /** Cosine similarity trong khoảng (0, 1] — chỉ giữ giá trị dương. */
  score: number
}

export interface ComputeItemItemOptions {
  /** Số place liên quan tối đa cho mỗi place. Mặc định 20. */
  topK?: number
}

/** Top-K mặc định khi ghi cache — đủ cho "quán tương tự" + rec theo affinity. */
const DEFAULT_TOP_K = 20

/** Cửa sổ dữ liệu của cache: 90 ngày gần nhất (sở thích cũ không còn đại diện). */
const CACHE_WINDOW_DAYS = 90

/** Số dòng mỗi câu INSERT — tránh câu SQL quá dài với hàng nghìn place. */
const INSERT_CHUNK_SIZE = 500

/**
 * Khoá actor của một event: user đã đăng nhập ưu tiên `userId`, khách dùng
 * `anon:${anonId}` (tiền tố để không đụng id user thật). Không có cả hai → bỏ.
 */
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

  // (3) Tích vô hướng theo cặp place trong từng actor: O(Σ |vector_actor|²).
  const accumulators = new Map<string, Map<string, number>>()
  for (const vector of normalizedVectors) {
    const entries = [...vector]
    for (let i = 0; i < entries.length; i += 1) {
      const [placeA, weightA] = entries[i]!
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

  // (4) Lọc self + similarity không dương (tín hiệu loại trừ làm score ≤ 0,
  // không phải gợi ý), sắp xếp giảm dần, cắt top-K. Tie-break theo id để kết
  // quả tất định giữa các lần chạy.
  const result = new Map<string, AffinityItem[]>()
  for (const [placeId, row] of accumulators) {
    const items: AffinityItem[] = []
    for (const [relatedId, score] of row) {
      if (relatedId === placeId) continue
      if (score <= 0) continue
      items.push({ id: relatedId, score })
    }
    if (items.length === 0) continue
    items.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    result.set(placeId, items.slice(0, topK))
  }

  return result
}

interface AffinityEventRow {
  user_id: string | null
  anon_id: string | null
  place_id: string
  weight: number
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
  const since = new Date(Date.now() - CACHE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  // Đọc bằng raw SQL: `interaction_events` là bảng partitioned, và chỉ cần 4 cột
  // (không kéo `context`/`query` về bộ nhớ).
  const rows = await prisma.$queryRaw<AffinityEventRow[]>`
    SELECT user_id::text AS user_id, anon_id, place_id, weight
    FROM interaction_events
    WHERE created_at >= ${since}
      AND place_id IS NOT NULL
      AND weight <> 0
  `

  const related = computeItemItem(
    rows.map((row) => ({
      userId: row.user_id,
      anonId: row.anon_id,
      placeId: row.place_id,
      weight: row.weight,
    })),
  )

  const entries = [...related]
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM affinity_cache`
    for (let offset = 0; offset < entries.length; offset += INSERT_CHUNK_SIZE) {
      const chunk = entries.slice(offset, offset + INSERT_CHUNK_SIZE)
      const values = chunk.map(
        ([placeId, items]) => Prisma.sql`(${placeId}, ${JSON.stringify(items)}::jsonb, now())`,
      )
      await tx.$executeRaw`
        INSERT INTO affinity_cache (place_id, related, computed_at)
        VALUES ${Prisma.join(values)}
      `
    }
  })

  return entries.length
}
