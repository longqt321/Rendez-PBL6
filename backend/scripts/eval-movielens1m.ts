/**
 * Benchmark RecSys trên MovieLens 1M Dataset chuẩn (GroupLens Research).
 * 1 triệu đánh giá từ 6,040 người dùng trên 3,900 bộ phim.
 *
 * Kiểm tra tính tổng quát (Generalization Test) của DES ngoài Yelp và MovieLens 100k.
 * So sánh:
 * - random: Uniform random sàn tham chiếu
 * - popularity: Tần suất và điểm toàn cục
 * - des: Deterministic Exposure Scheduling (Bayesian Shrinkage m_i = m_0*(1+0.5*C_i) + Jitter)
 * - item-item: Item-Item Cosine CF
 * - des-hybrid: Kết hợp CF relevance + DES Bayesian Shrinkage
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

interface MovieMeta {
  id: string
  title: string
  genres: string[]
}

const MIN_RATINGS = 10
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

function loadRatings1M(dataPath: string): Rating[] {
  const rawData = readFileSync(dataPath, "utf-8")
  const lines = rawData.trim().split("\n")

  const ratings: Rating[] = []
  for (const line of lines) {
    if (!line) continue
    const [userId, itemId, ratingStr, timestampStr] = line.split("::")
    if (!userId || !itemId || !ratingStr || !timestampStr) continue
    const rating = Number.parseFloat(ratingStr)
    // Tương tác tích cực: rating >= 4.0 (chuẩn khắt khe của RecSys paper trên ML-1M)
    if (rating >= 4.0) {
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

function loadMovies1M(moviePath: string): Map<string, MovieMeta> {
  const rawMovies = readFileSync(moviePath, "latin1")
  const movieMap = new Map<string, MovieMeta>()
  for (const line of rawMovies.trim().split("\n")) {
    if (!line) continue
    const [id, title, genresStr] = line.split("::")
    if (id && title && genresStr) {
      movieMap.set(id, { id, title, genres: genresStr.split("|") })
    }
  }
  return movieMap
}

function splitLeaveOneOut1M(ratings: Rating[]) {
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

  const allUsers = [...testByUser.keys()].sort((a, b) => a.localeCompare(b))
  const rngUsers = mulberry32(SEED)
  const evalUsers = seededShuffle(allUsers, rngUsers).slice(0, 2000)
  const catalog = [...universe].sort((a, b) => a.localeCompare(b))

  return { trainRatings, testByUser, seenByUser, allUsers, evalUsers, catalog }
}

function buildCooccurrence1M(trainRatings: Rating[]) {
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

function computeDesScores1M(
  catalog: string[],
  movieMap: Map<string, MovieMeta>,
  itemCounts: Map<string, number>,
  itemRatingSum: Map<string, number>,
): Map<string, number> {
  const mu0 = 4.0
  const m0 = 10.0
  const gamma = 0.5

  const desScores = new Map<string, number>()
  for (const itemId of catalog) {
    const meta = movieMap.get(itemId)
    const genreCount = meta ? meta.genres.length : 0
    // C_i: hoàn thiện thông tin thể loại & metadata
    const c_i = Math.min(1.0, genreCount / 3.0)

    const v_i = itemCounts.get(itemId) ?? 0
    const sum_r = itemRatingSum.get(itemId) ?? 0
    const r_bar = v_i > 0 ? sum_r / v_i : mu0

    const m_i = m0 * (1.0 + gamma * c_i)
    const r_hat = (v_i * r_bar + m_i * mu0) / (v_i + m_i)

    const s_cold = 0.5 * (r_hat / 5.0) + 0.3 * (Math.log10(v_i + 1) / 4.0) + 0.2 * c_i
    desScores.set(itemId, s_cold)
  }
  return desScores
}

async function main() {
  const dataPath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "movielens1m",
    "ml-1m",
    "ratings.dat",
  )
  const moviePath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "movielens1m",
    "ml-1m",
    "movies.dat",
  )

  console.log("=== Đọc MovieLens 1M Dataset (1,000,209 ratings) ===")
  const ratings = loadRatings1M(dataPath)
  const movieMap = loadMovies1M(moviePath)

  const { trainRatings, testByUser, seenByUser, allUsers, evalUsers, catalog } =
    splitLeaveOneOut1M(ratings)

  console.log(`  Ratings dương (>=4.0)     : ${ratings.length}`)
  console.log(`  Users đủ điều kiện        : ${allUsers.length}`)
  console.log(`  Users lấy mẫu đánh giá    : ${evalUsers.length}`)
  console.log(`  Catalog items              : ${catalog.length}`)
  console.log(`  Train ratings              : ${trainRatings.length}`)

  // 1 & 2. Baselines (Popularity, Item-Item CF)
  const { itemCounts, itemRatingSum, popularityRanked, coOccur } = buildCooccurrence1M(trainRatings)

  // 3. DES Model: Completeness-Conditioned Bayesian Quality Scorer
  const beta = 0.05
  const desScores = computeDesScores1M(catalog, movieMap, itemCounts, itemRatingSum)

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
    des: new Map<string, UserResult>(),
    "item-item": new Map<string, UserResult>(),
    "des-hybrid": new Map<string, UserResult>(),
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
    const cfWithFallback = [...cfRanked, ...popRanked.filter((id) => !cfScores.has(id))]
    results["item-item"].set(userId, metricsFor(cfWithFallback, relevant))

    // DES độc lập
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

    // DES-Hybrid
    const hybridScores = new Map<string, number>()
    for (const cand of catalog) {
      if (seen.has(cand)) continue
      const s_cf = cfScores.get(cand) ?? 0
      const s_des = desScores.get(cand) ?? 0
      hybridScores.set(cand, s_cf + 0.3 * s_des)
    }
    const hybridRanked = [...hybridScores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    results["des-hybrid"].set(userId, metricsFor(hybridRanked, relevant))
  }

  const methods = ["random", "popularity", "des", "item-item", "des-hybrid"] as const
  console.log("\n=== MovieLens 1M RecSys Benchmark Results ===")
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

  const outPath = join(import.meta.dir, "..", "data", "eval", "rec-eval-movielens1m.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        dataset: "MovieLens 1M",
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
