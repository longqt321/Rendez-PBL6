/**
 * Benchmark RecSys trên Yelp Challenge Dataset (Reviews + Businesses).
 * So sánh:
 * - random: Uniform random
 * - popularity: Tần suất ghé thăm & điểm sao
 * - item-item: Item-Item Cosine CF
 * - des: Deterministic Exposure Scheduling (Bayesian Shrinkage m_i = m_0*(1+0.5*C_i) + Time Jitter)
 * - des-hybrid: Kết hợp CF relevance + DES Quality Prior
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { mulberry32, pairedBootstrap, score } from "../src/lib/eval-metrics"

interface Review {
  userId: string
  businessId: string
  stars: number
  date: string
}

interface BusinessMeta {
  id: string
  name: string
  city: string
  stars: number
  reviewCount: number
  categories: string[]
  hasHours: boolean
  isVerified: boolean
}

const MIN_REVIEWS = 5
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

function loadYelpBusinesses(bizPath: string): Map<string, BusinessMeta> {
  const rawBiz = readFileSync(bizPath, "utf-8").trim().split("\n")
  const bizMap = new Map<string, BusinessMeta>()
  for (const line of rawBiz) {
    if (!line) continue
    try {
      const b = JSON.parse(line)
      bizMap.set(b.business_id, {
        id: b.business_id,
        name: b.name,
        city: b.city,
        stars: b.stars ?? 0,
        reviewCount: b.review_count ?? 0,
        categories: (b.categories ?? "").split(",").map((c: string) => c.trim()),
        hasHours: !!b.hours,
        isVerified: true,
      })
    } catch {}
  }
  return bizMap
}

function loadYelpReviews(reviewPath: string, bizMap: Map<string, BusinessMeta>): Review[] {
  const rawReviews = readFileSync(reviewPath, "utf-8").trim().split("\n")
  const reviews: Review[] = []
  for (const line of rawReviews) {
    if (!line) continue
    try {
      const r = JSON.parse(line)
      // Positive feedback: stars >= 3.5
      if (r.stars >= 3.5 && bizMap.has(r.business_id)) {
        reviews.push({
          userId: r.user_id,
          businessId: r.business_id,
          stars: r.stars,
          date: r.date,
        })
      }
    } catch {}
  }
  return reviews
}

function splitYelpLeaveOneOut(reviews: Review[]) {
  const byUser = new Map<string, Review[]>()
  const universe = new Set<string>()
  for (const r of reviews) {
    universe.add(r.businessId)
    const list = byUser.get(r.userId)
    if (list) list.push(r)
    else byUser.set(r.userId, [r])
  }

  for (const list of byUser.values()) {
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const trainReviews: Review[] = []
  const testByUser = new Map<string, string>()
  const seenByUser = new Map<string, Set<string>>()

  for (const [userId, list] of byUser) {
    if (list.length < MIN_REVIEWS) continue
    const test = list[list.length - 1]!
    const train = list.slice(0, -1)
    const seen = new Set(train.map((r) => r.businessId))
    if (seen.has(test.businessId)) continue

    testByUser.set(userId, test.businessId)
    seenByUser.set(userId, seen)
    trainReviews.push(...train)
  }

  const evalUsers = [...testByUser.keys()].sort((a, b) => a.localeCompare(b))
  const catalog = [...universe].sort((a, b) => a.localeCompare(b))

  return { trainReviews, testByUser, seenByUser, evalUsers, catalog }
}

function buildYelpCooccurrence(trainReviews: Review[]) {
  const bizCounts = new Map<string, number>()
  const bizStarSum = new Map<string, number>()
  for (const r of trainReviews) {
    bizCounts.set(r.businessId, (bizCounts.get(r.businessId) ?? 0) + 1)
    bizStarSum.set(r.businessId, (bizStarSum.get(r.businessId) ?? 0) + r.stars)
  }
  const popularityRanked = [...bizCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)

  const userItemsMap = new Map<string, Set<string>>()
  for (const r of trainReviews) {
    let s = userItemsMap.get(r.userId)
    if (!s) {
      s = new Set()
      userItemsMap.set(r.userId, s)
    }
    s.add(r.businessId)
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

  return { bizCounts, bizStarSum, popularityRanked, coOccur }
}

function computeYelpDesScores(
  catalog: string[],
  bizMap: Map<string, BusinessMeta>,
  bizCounts: Map<string, number>,
  bizStarSum: Map<string, number>,
): Map<string, number> {
  const mu0 = 3.8
  const m0 = 10.0
  const gamma = 0.5

  const desScores = new Map<string, number>()
  for (const bId of catalog) {
    const meta = bizMap.get(bId)
    const catCount = meta ? meta.categories.length : 0
    const hasHours = meta && meta.hasHours ? 1.0 : 0.0
    // C_i metadata completeness
    const c_i =
      0.4 * hasHours + 0.3 * Math.min(1.0, catCount / 3.0) + 0.3 * (meta?.isVerified ? 1.0 : 0.5)

    const v_i = bizCounts.get(bId) ?? 0
    const sum_r = bizStarSum.get(bId) ?? 0
    const r_bar = v_i > 0 ? sum_r / v_i : (meta?.stars ?? mu0)

    const m_i = m0 * (1.0 + gamma * c_i)
    const r_hat = (v_i * r_bar + m_i * mu0) / (v_i + m_i)

    const s_cold = 0.45 * (r_hat / 5.0) + 0.35 * (Math.log10(v_i + 1) / 3.0) + 0.2 * c_i
    desScores.set(bId, s_cold)
  }
  return desScores
}

async function main() {
  const reviewPath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "yelp-sample",
    "yelp_academic_dataset_review.json",
  )
  const bizPath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "yelp-sample",
    "yelp_academic_dataset_business.json",
  )

  console.log("=== Đọc Yelp Dataset Reviews & Businesses ===")
  const bizMap = loadYelpBusinesses(bizPath)
  const reviews = loadYelpReviews(reviewPath, bizMap)

  const { trainReviews, testByUser, seenByUser, evalUsers, catalog } = splitYelpLeaveOneOut(reviews)

  console.log(`  Reviews tích cực (>=3.5*)  : ${reviews.length}`)
  console.log(`  Users đủ điều kiện eval    : ${evalUsers.length}`)
  console.log(`  Catalog địa điểm           : ${catalog.length}`)
  console.log(`  Train reviews              : ${trainReviews.length}`)
  console.log(`  Test reviews               : ${testByUser.size}`)

  // 1 & 2. Baselines (Popularity, Item-Item CF)
  const { bizCounts, bizStarSum, popularityRanked, coOccur } = buildYelpCooccurrence(trainReviews)

  // 3. DES Model: Completeness-Conditioned Bayesian Quality Scorer
  const beta = 0.05
  const desScores = computeYelpDesScores(catalog, bizMap, bizCounts, bizStarSum)

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
      const countU = bizCounts.get(item) ?? 1
      for (const [cand, co] of neighbors) {
        if (seen.has(cand)) continue
        const countV = bizCounts.get(cand) ?? 1
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
  console.log("\n=== Yelp RecSys Benchmark Results ===")
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

  const outPath = join(import.meta.dir, "..", "data", "eval", "rec-eval-yelp.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        dataset: "Yelp Rec Challenge Sample",
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
