/**
 * Benchmark RecSys trên MovieLens 100k Dataset chuẩn (GroupLens Research).
 * So sánh:
 * - random: Xáo trộn có seed
 * - popularity: Xếp hạng theo tần suất & điểm trung bình toàn cục
 * - item-item: Item-based Collaborative Filtering (Cosine similarity)
 * - des: Deterministic Exposure Scheduling (Bayesian Shrinkage m_i = m_0 * (1 + 0.5 * C_i) + Jitter hashing)
 *
 * Giao thức chuẩn RecSys Paper:
 * - Leave-one-out trên tương tác dương (rating >= 3.0).
 * - Item mới nhất của mỗi user làm Test, phần còn lại làm Train.
 * - Đánh giá: Recall@5, Recall@10, Recall@20, NDCG@10, MRR.
 * - Paired bootstrap test 10,000 iterations với 95% Confidence Interval.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { mulberry32, pairedBootstrap, score } from "../src/lib/eval-metrics"

interface Rating {
  userId: string
  itemId: string
  rating: number
  timestamp: number
}

interface ItemMeta {
  id: string
  title: string
  releaseDate: string
  genres: number[]
}

const MIN_RATINGS = 5
const BOOTSTRAP_ITERATIONS = 10_000
const SEED = 42

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function recallAt(ids: string[], relevant: string, k: number): number {
  return ids.slice(0, k).includes(relevant) ? 1 : 0
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.codePointAt(i) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i]!
    out[i] = out[j]!
    out[j] = swap
  }
  return out
}

function metricsFor(ranked: string[], relevant: string) {
  const graded = score(ranked, { [relevant]: 2 })
  return {
    recall5: recallAt(ranked, relevant, 5),
    recall10: recallAt(ranked, relevant, 10),
    recall20: recallAt(ranked, relevant, 20),
    ndcg10: graded.ndcg10,
    mrr: graded.mrr,
  }
}

function loadMovieLensData(dataPath: string): Rating[] {
  const rawData = readFileSync(dataPath, "utf-8")
  const lines = rawData.trim().split("\n")

  const ratings: Rating[] = []
  for (const line of lines) {
    const [userId, itemId, ratingStr, timestampStr] = line.split("\t")
    if (!userId || !itemId || !ratingStr || !timestampStr) continue
    const rating = Number.parseFloat(ratingStr)
    // Chỉ lấy rating >= 3.0 làm tương tác dương (implicit positive feedback)
    if (rating >= 3.0) {
      ratings.push({
        userId,
        itemId,
        rating,
        timestamp: Number.parseInt(timestampStr, 10),
      })
    }
  }
  return ratings
}

function loadMovieLensItems(itemPath: string): Map<string, ItemMeta> {
  const rawItems = readFileSync(itemPath, "latin1")
  const itemMap = new Map<string, ItemMeta>()
  for (const line of rawItems.trim().split("\n")) {
    const parts = line.split("|")
    if (parts.length >= 24) {
      const id = parts[0]!
      const title = parts[1]!
      const releaseDate = parts[2]!
      const genres = parts.slice(5, 24).map(Number)
      itemMap.set(id, { id, title, releaseDate, genres })
    }
  }
  return itemMap
}

function splitLeaveOneOut(ratings: Rating[]) {
  const byUser = new Map<string, Rating[]>()
  const universe = new Set<string>()
  for (const r of ratings) {
    universe.add(r.itemId)
    const list = byUser.get(r.userId)
    if (list) list.push(r)
    else byUser.set(r.userId, [r])
  }

  for (const list of byUser.values()) {
    list.sort((a, b) => a.timestamp - b.timestamp)
  }

  const trainRatings: Rating[] = []
  const testByUser = new Map<string, string>()
  const seenByUser = new Map<string, Set<string>>()

  for (const [userId, list] of byUser) {
    if (list.length < MIN_RATINGS) continue
    const test = list[list.length - 1]!
    const train = list.slice(0, -1)
    const seen = new Set(train.map((r) => r.itemId))
    if (seen.has(test.itemId)) continue

    testByUser.set(userId, test.itemId)
    seenByUser.set(userId, seen)
    trainRatings.push(...train)
  }

  const evalUsers = [...testByUser.keys()].sort((a, b) => a.localeCompare(b))
  const catalog = [...universe].sort((a, b) => a.localeCompare(b))

  return { trainRatings, testByUser, seenByUser, evalUsers, catalog }
}

function buildCooccurrence(trainRatings: Rating[]) {
  const itemCounts = new Map<string, number>()
  const itemRatingSum = new Map<string, number>()
  for (const r of trainRatings) {
    itemCounts.set(r.itemId, (itemCounts.get(r.itemId) ?? 0) + 1)
    itemRatingSum.set(r.itemId, (itemRatingSum.get(r.itemId) ?? 0) + r.rating)
  }
  const popularityRanked = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([itemId]) => itemId)

  const userItemsMap = new Map<string, Set<string>>()
  for (const r of trainRatings) {
    let s = userItemsMap.get(r.userId)
    if (!s) {
      s = new Set()
      userItemsMap.set(r.userId, s)
    }
    s.add(r.itemId)
  }

  const coOccur = new Map<string, Map<string, number>>()
  for (const [, items] of userItemsMap) {
    const arr = [...items]
    for (let i = 0; i < arr.length; i++) {
      const u = arr[i]!
      let mapU = coOccur.get(u)
      if (!mapU) {
        mapU = new Map()
        coOccur.set(u, mapU)
      }
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue
        const v = arr[j]!
        mapU.set(v, (mapU.get(v) ?? 0) + 1)
      }
    }
  }

  return { itemCounts, itemRatingSum, popularityRanked, coOccur }
}

function computeDesScores(
  catalog: string[],
  itemMap: Map<string, ItemMeta>,
  itemCounts: Map<string, number>,
  itemRatingSum: Map<string, number>,
): Map<string, number> {
  const mu0 = 3.5 // prior rating mean
  const m0 = 10.0 // prior weight
  const gamma = 0.5

  const desScores = new Map<string, number>()
  for (const itemId of catalog) {
    const meta = itemMap.get(itemId)
    const genreCount = meta ? meta.genres.reduce((a, b) => a + b, 0) : 0
    const hasDate = meta && meta.releaseDate ? 1.0 : 0.0
    const c_i = 0.5 * hasDate + 0.5 * Math.min(1.0, genreCount / 3.0)

    const v_i = itemCounts.get(itemId) ?? 0
    const sum_r = itemRatingSum.get(itemId) ?? 0
    const r_bar = v_i > 0 ? sum_r / v_i : mu0

    const m_i = m0 * (1.0 + gamma * c_i)
    const r_hat = (v_i * r_bar + m_i * mu0) / (v_i + m_i)

    // S_cold = 0.5 * r_hat + 0.3 * log(v_i + 1) + 0.2 * c_i
    const s_cold = 0.5 * (r_hat / 5.0) + 0.3 * (Math.log10(v_i + 1) / 3.0) + 0.2 * c_i
    desScores.set(itemId, s_cold)
  }
  return desScores
}

async function main() {
  const dataPath = join(import.meta.dir, "..", "data", "external", "movielens", "ml-100k", "u.data")
  const itemPath = join(import.meta.dir, "..", "data", "external", "movielens", "ml-100k", "u.item")

  console.log("=== Đọc MovieLens 100k Dataset ===")
  const ratings = loadMovieLensData(dataPath)
  const itemMap = loadMovieLensItems(itemPath)

  const { trainRatings, testByUser, seenByUser, evalUsers, catalog } = splitLeaveOneOut(ratings)

  console.log(`  Tổng rating dương (>=3.0) : ${ratings.length}`)
  console.log(`  Users đủ điều kiện eval    : ${evalUsers.length}`)
  console.log(`  Catalog items              : ${catalog.length}`)
  console.log(`  Train interactions         : ${trainRatings.length}`)
  console.log(`  Test interactions          : ${testByUser.size}`)

  // 1 & 2. Baselines (Popularity, Item-Item CF)
  const { itemCounts, itemRatingSum, popularityRanked, coOccur } = buildCooccurrence(trainRatings)

  // 3. DES Model: Completeness-Conditioned Bayesian Quality Scorer + Jitter
  const beta = 0.05
  const desScores = computeDesScores(catalog, itemMap, itemCounts, itemRatingSum)

  // Chạy đánh giá
  interface UserResult {
    recall5: number
    recall10: number
    recall20: number
    ndcg10: number
    mrr: number
  }

  const results = {
    random: new Map<string, UserResult>(),
    popularity: new Map<string, UserResult>(),
    "item-item": new Map<string, UserResult>(),
    des: new Map<string, UserResult>(),
    "des-hybrid": new Map<string, UserResult>(), // Kết hợp Item-Item + DES Bayesian
  }

  for (const userId of evalUsers) {
    const relevant = testByUser.get(userId)!
    const seen = seenByUser.get(userId)!

    // Random
    const randRng = mulberry32(SEED + fnv1a(userId))
    const randRanked = seededShuffle(
      catalog.filter((id) => !seen.has(id)),
      randRng,
    )
    results.random.set(userId, metricsFor(randRanked, relevant))

    // Popularity
    const popRanked = popularityRanked.filter((id) => !seen.has(id))
    results.popularity.set(userId, metricsFor(popRanked, relevant))

    // Item-Item CF
    const cfScores = new Map<string, number>()
    for (const item of seen) {
      const neighbors = coOccur.get(item)
      if (!neighbors) continue
      const countU = itemCounts.get(item) ?? 1
      for (const [cand, co] of neighbors) {
        if (seen.has(cand)) continue
        const countV = itemCounts.get(cand) ?? 1
        const cosine = co / Math.sqrt(countU * countV)
        cfScores.set(cand, (cfScores.get(cand) ?? 0) + cosine)
      }
    }
    const cfRanked = [...cfScores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    // Fallback sang popularity nếu ít gợi ý
    const cfWithFallback = [...cfRanked, ...popRanked.filter((id) => !cfScores.has(id))]
    results["item-item"].set(userId, metricsFor(cfWithFallback, relevant))

    // DES độc lập (Content + Bayesian Shrinkage + Jitter)
    const userSeed = fnv1a(`${userId}_bucket`)
    const desRanked = catalog
      .filter((id) => !seen.has(id))
      .map((id) => {
        const hashVal = (fnv1a(`${id}_${userSeed}`) % 1000) / 1000.0
        const finalScore = (desScores.get(id) ?? 0) + beta * hashVal
        return { id, score: finalScore }
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.id)
    results.des.set(userId, metricsFor(desRanked, relevant))

    // DES-Hybrid (Reranking kết hợp CF relevance + DES Bayesian Shrinkage)
    // S_hybrid(u, i) = S_CF(u, i) + 0.3 * S_DES(i)
    const hybridScores = new Map<string, number>()
    for (const cand of catalog) {
      if (seen.has(cand)) continue
      const s_cf = cfScores.get(cand) ?? 0
      const s_des = desScores.get(cand) ?? 0
      hybridScores.set(cand, s_cf + 0.35 * s_des)
    }
    const hybridRanked = [...hybridScores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    results["des-hybrid"].set(userId, metricsFor(hybridRanked, relevant))
  }

  // Bảng kết quả
  const methods = ["random", "popularity", "des", "item-item", "des-hybrid"] as const
  console.log("\n=== MovieLens 100k Benchmark Results ===")
  console.log("  method          R@5     R@10    R@20  NDCG@10     MRR")
  for (const m of methods) {
    const map = results[m]
    const r5 = mean(evalUsers.map((u) => map.get(u)!.recall5)).toFixed(3)
    const r10 = mean(evalUsers.map((u) => map.get(u)!.recall10)).toFixed(3)
    const r20 = mean(evalUsers.map((u) => map.get(u)!.recall20)).toFixed(3)
    const ndcg = mean(evalUsers.map((u) => map.get(u)!.ndcg10)).toFixed(3)
    const mrr = mean(evalUsers.map((u) => map.get(u)!.mrr)).toFixed(3)
    console.log(
      `  ${m.padEnd(12)}  ${r5.padStart(6)}  ${r10.padStart(6)}  ${r20.padStart(6)}  ${ndcg.padStart(7)}  ${mrr.padStart(6)}`,
    )
  }

  // Paired bootstrap DES-Hybrid vs Item-Item
  console.log("\n=== Paired Bootstrap Test: DES-Hybrid vs Item-Item (NDCG@10) ===")
  const diffs = evalUsers.map(
    (u) => results["des-hybrid"].get(u)!.ndcg10 - results["item-item"].get(u)!.ndcg10,
  )
  const boot = pairedBootstrap(diffs, BOOTSTRAP_ITERATIONS, SEED)
  console.log(`  Mean Delta: ${boot.meanDelta.toFixed(4)}`)
  console.log(`  95% CI    : [${boot.ciLow.toFixed(4)}, ${boot.ciHigh.toFixed(4)}]`)
  console.log(`  p-value   : ${boot.pOneSided.toFixed(4)}`)

  // Ghi kết quả ra file
  const outPath = join(import.meta.dir, "..", "data", "eval", "rec-eval-movielens.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        dataset: "MovieLens 100k",
        frozenAt: new Date().toISOString(),
        users: evalUsers.length,
        items: catalog.length,
        metrics: Object.fromEntries(
          methods.map((m) => [
            m,
            {
              recall5: mean(evalUsers.map((u) => results[m].get(u)!.recall5)),
              recall10: mean(evalUsers.map((u) => results[m].get(u)!.recall10)),
              recall20: mean(evalUsers.map((u) => results[m].get(u)!.recall20)),
              ndcg10: mean(evalUsers.map((u) => results[m].get(u)!.ndcg10)),
              mrr: mean(evalUsers.map((u) => results[m].get(u)!.mrr)),
            },
          ]),
        ),
        bootstrap: {
          comparison: "des-hybrid vs item-item",
          meanDelta: boot.meanDelta,
          ci95: [boot.ciLow, boot.ciHigh],
          p: boot.pOneSided,
        },
      },
      null,
      2,
    ),
  )
  console.log(`\nĐã ghi báo cáo: ${outPath}`)
}

await main()
