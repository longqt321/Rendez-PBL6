/**
 * Offline eval cho recommendation — leave-one-out trên `interaction_events`.
 *
 * Giao thức:
 * - Actor = `user_id` nếu đã đăng nhập, ngược lại `anon:${anon_id}` (cùng quy
 *   ước với `src/lib/affinity.ts` để eval đo đúng thứ recommender học).
 * - Chỉ xét event DƯƠNG (`weight > 0`): event âm là tín hiệu loại trừ, không
 *   phải "món người dùng thích" nên không thể làm nhãn test.
 * - Actor có ≥ 5 event dương: event MỚI NHẤT (`created_at`, tie-break `id`) là
 *   test, phần còn lại là train. Actor ít hơn → bỏ (không đủ lịch sử).
 * - Actor mà place test đã xuất hiện trong train → BỎ: gợi ý lại một quán đã
 *   tương tác không đo được năng lực khám phá, và mọi baseline đều "đúng" một
 *   cách vô nghĩa.
 *
 * Baselines:
 * - `random`      — xáo trộn có seed trên toàn bộ place trong log (sàn tham chiếu).
 * - `popularity`  — tổng weight toàn cục trên train (baseline không cá nhân hoá).
 * - `item-item`   — affinity từ `computeItemItem` trên train, cộng dồn score của
 *                   các place user đã tương tác, loại place đã thấy.
 *
 * Metrics: Recall@5/@10/@20, NDCG@10, MRR — NDCG/MRR lấy từ `eval-metrics.ts`
 * (một nguồn duy nhất); Recall@k tính tại đây vì `eval-metrics` không có hàm
 * recall theo k tuỳ ý (nhãn ở đây chỉ có 1 item đúng/actor).
 *
 * Chạy: `cd backend && bun run scripts/eval-rec.ts`
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { computeItemItem, type AffinityEvent, type AffinityItem } from "../src/lib/affinity"
import { mulberry32, pairedBootstrap, score } from "../src/lib/eval-metrics"
import { prisma } from "../src/lib/prisma"

/** Ngưỡng tối thiểu để một actor vào tập eval (leave-one-out cần lịch sử). */
const MIN_POSITIVE_EVENTS = 5

/** Lấy top tối đa bằng Recall@k lớn nhất — một lần tính cho cả 3 mốc k. */
const MAX_K = 20

/** Số vòng bootstrap + seed: cố định để kết quả tái lập giữa các lượt chạy. */
const BOOTSTRAP_ITERATIONS = 10_000
const SEED = 42

interface EventRow {
  actor: string
  place_id: string
  weight: number
  created_at: Date
}

interface UserMetrics {
  recall5: number
  recall10: number
  recall20: number
  ndcg10: number
  mrr: number
}

interface MethodResult {
  name: string
  /** actor → metric của actor đó (paired bootstrap cần ghép theo actor). */
  perUser: Map<string, UserMetrics>
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Recall@k với đúng 1 item liên quan → 1 nếu item nằm trong top-k, ngược lại 0. */
function recallAt(ids: string[], relevant: string, k: number): number {
  return ids.slice(0, k).includes(relevant) ? 1 : 0
}

/** FNV-1a — seed RNG theo actor để baseline `random` tái lập được. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Fisher–Yates với RNG seeded (không dùng `Math.random` — phải tái lập). */
function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i]!
    out[i] = out[j]!
    out[j] = swap
  }
  return out
}

/** actor → event của affinity (tách lại `anon:` thành `anonId`). */
function toAffinityEvent(actor: string, placeId: string, weight: number): AffinityEvent {
  return actor.startsWith("anon:")
    ? { userId: null, anonId: actor.slice("anon:".length), placeId, weight }
    : { userId: actor, anonId: null, placeId, weight }
}

function metricsFor(ranked: string[], relevant: string): UserMetrics {
  // `score` của eval-metrics nhận nhãn dạng grade; 1 item đúng duy nhất = grade 2
  // (thoả đủ) để NDCG/MRR tính đúng thứ hạng của nó.
  const graded = score(ranked, { [relevant]: 2 })
  return {
    recall5: recallAt(ranked, relevant, 5),
    recall10: recallAt(ranked, relevant, 10),
    recall20: recallAt(ranked, relevant, 20),
    ndcg10: graded.ndcg10,
    mrr: graded.mrr,
  }
}

/** Xếp hạng theo affinity: cộng dồn score của mọi place user đã tương tác. */
function rankByAffinity(seen: ReadonlySet<string>, related: Map<string, AffinityItem[]>): string[] {
  const scores = new Map<string, number>()
  for (const placeId of seen) {
    for (const item of related.get(placeId) ?? []) {
      if (seen.has(item.id)) continue
      scores.set(item.id, (scores.get(item.id) ?? 0) + item.score)
    }
  }
  return [...scores]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_K)
    .map(([id]) => id)
}

/** Độ rộng cột — NDCG@10 rộng hơn vì tiêu đề dài hơn 7 ký tự. */
const COLUMN_WIDTHS = [8, 8, 8, 9, 8] as const

function formatRow(name: string, values: number[]): string {
  const cells = values.map((value, index) => value.toFixed(3).padStart(COLUMN_WIDTHS[index] ?? 8))
  return `  ${name.padEnd(12)}${cells.join("")}`
}

function formatHeader(labels: readonly string[]): string {
  const cells = labels.map((label, index) => label.padStart(COLUMN_WIDTHS[index] ?? 8))
  return `  ${"method".padEnd(12)}${cells.join("")}`
}

async function main(): Promise<void> {
  const rows = await prisma.$queryRaw<EventRow[]>`
    SELECT coalesce(user_id::text, 'anon:' || anon_id) AS actor,
           place_id,
           weight,
           created_at
    FROM interaction_events
    WHERE place_id IS NOT NULL
      AND weight > 0
      AND (user_id IS NOT NULL OR anon_id IS NOT NULL)
    ORDER BY actor, created_at, id
  `

  const byActor = new Map<string, EventRow[]>()
  const universe = new Set<string>()
  for (const row of rows) {
    universe.add(row.place_id)
    const list = byActor.get(row.actor)
    if (list) list.push(row)
    else byActor.set(row.actor, [row])
  }

  // ---- Split leave-one-out -------------------------------------------------
  const trainEvents: AffinityEvent[] = []
  const testByActor = new Map<string, string>()
  const seenByActor = new Map<string, Set<string>>()
  let identified = 0
  let anonymous = 0
  let skippedSeen = 0

  for (const [actor, events] of byActor) {
    if (events.length < MIN_POSITIVE_EVENTS) continue
    // ORDER BY created_at, id → phần tử cuối là event mới nhất.
    const test = events[events.length - 1]!
    const train = events.slice(0, -1)
    const seen = new Set(train.map((event) => event.place_id))
    if (seen.has(test.place_id)) {
      skippedSeen += 1
      continue
    }

    testByActor.set(actor, test.place_id)
    seenByActor.set(actor, seen)
    for (const event of train) {
      trainEvents.push(toAffinityEvent(actor, event.place_id, event.weight))
    }
    if (actor.startsWith("anon:")) anonymous += 1
    else identified += 1
  }

  const evalActors = [...testByActor.keys()].sort()
  const catalog = [...universe].sort()

  console.log("=== Split leave-one-out ===")
  console.log(`  event dương đọc từ DB : ${rows.length}`)
  console.log(`  actor trong log       : ${byActor.size}`)
  console.log(
    `  actor vào tập eval    : ${evalActors.length} (định danh ${identified}, ẩn danh ${anonymous})`,
  )
  console.log(`  actor bị bỏ (test đã có trong train): ${skippedSeen}`)
  console.log(`  place trong catalog   : ${catalog.length}`)
  console.log(`  event train           : ${trainEvents.length}`)
  console.log(`  event test            : ${testByActor.size}`)

  if (evalActors.length === 0) {
    console.log(
      `\nCẢNH BÁO: chưa có actor nào đạt ≥ ${MIN_POSITIVE_EVENTS} event dương — bảng dưới đây toàn 0.`,
    )
  }

  // ---- Baselines -----------------------------------------------------------
  const popularityScore = new Map<string, number>()
  for (const event of trainEvents) {
    popularityScore.set(event.placeId, (popularityScore.get(event.placeId) ?? 0) + event.weight)
  }
  const popularityRanked = [...popularityScore]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([placeId]) => placeId)

  const related = computeItemItem(trainEvents, { topK: MAX_K })

  const randomResult: MethodResult = { name: "random", perUser: new Map() }
  const popularityResult: MethodResult = { name: "popularity", perUser: new Map() }
  const itemItemResult: MethodResult = { name: "item-item", perUser: new Map() }

  const results = [randomResult, popularityResult, itemItemResult]

  for (const actor of evalActors) {
    const relevant = testByActor.get(actor)!
    const seen = seenByActor.get(actor)!

    const randomRanked = seededShuffle(
      catalog.filter((placeId) => !seen.has(placeId)),
      mulberry32(SEED + fnv1a(actor)),
    )
    randomResult.perUser.set(actor, metricsFor(randomRanked, relevant))

    const popularRanked = popularityRanked.filter((placeId) => !seen.has(placeId))
    popularityResult.perUser.set(actor, metricsFor(popularRanked, relevant))

    itemItemResult.perUser.set(actor, metricsFor(rankByAffinity(seen, related), relevant))
  }

  // ---- Bảng so sánh --------------------------------------------------------
  const metricKeys: (keyof UserMetrics)[] = ["recall5", "recall10", "recall20", "ndcg10", "mrr"]
  console.log("\n=== So sánh (trung bình trên actor) ===")
  console.log(formatHeader(["R@5", "R@10", "R@20", "NDCG@10", "MRR"]))
  for (const result of results) {
    const values = metricKeys.map((key) =>
      mean(evalActors.map((actor) => result.perUser.get(actor)![key])),
    )
    console.log(formatRow(result.name, values))
  }

  // ---- Paired bootstrap so với item-item -----------------------------------
  console.log(
    `\n=== Paired bootstrap vs item-item (NDCG@10, ${BOOTSTRAP_ITERATIONS} vòng, seed ${SEED}) ===`,
  )
  console.log(
    `  ${"baseline".padEnd(12)}${"Δ mean".padStart(9)}${"CI95".padStart(20)}${"p".padStart(9)}`,
  )
  const significance: { baseline: string; meanDelta: number; ci95: string; p: number }[] = []
  for (const baseline of [randomResult, popularityResult]) {
    const diffs = evalActors.map(
      (actor) => itemItemResult.perUser.get(actor)!.ndcg10 - baseline.perUser.get(actor)!.ndcg10,
    )
    const bootstrap = pairedBootstrap(diffs, BOOTSTRAP_ITERATIONS, SEED)
    const ci = `[${bootstrap.ciLow.toFixed(3)}, ${bootstrap.ciHigh.toFixed(3)}]`
    console.log(
      `  ${baseline.name.padEnd(12)}${bootstrap.meanDelta.toFixed(3).padStart(9)}${ci.padStart(20)}${bootstrap.pOneSided.toFixed(3).padStart(9)}`,
    )
    significance.push({
      baseline: baseline.name,
      meanDelta: Number(bootstrap.meanDelta.toFixed(4)),
      ci95: ci,
      p: Number(bootstrap.pOneSided.toFixed(4)),
    })
  }

  // ---- Lưu baseline JSON để tái lập và so sánh sau này ----------------------
  const summary = Object.fromEntries(
    results.map((result) => {
      const avg = (f: (m: UserMetrics) => number): number =>
        Number(mean(evalActors.map((actor) => f(result.perUser.get(actor)!))).toFixed(4))
      return [
        result.name,
        {
          recall5: avg((m) => m.recall5),
          recall10: avg((m) => m.recall10),
          recall20: avg((m) => m.recall20),
          ndcg10: avg((m) => m.ndcg10),
          mrr: avg((m) => m.mrr),
        },
      ]
    }),
  )
  const baselineOut = {
    runAt: new Date().toISOString(),
    dataset: process.env["EVAL_DATASET_LABEL"] ?? "db",
    split: {
      evalActors: evalActors.length,
      trainEvents: trainEvents.length,
      catalog: catalog.length,
    },
    methods: summary,
    significance,
  }
  const outFile = join(import.meta.dir, "..", "data", "eval", "rec-eval-baseline.json")
  writeFileSync(outFile, `${JSON.stringify(baselineOut, null, 2)}\n`)
  console.log(`\nĐã ghi ${outFile}`)
}

main()
  .catch((error: unknown) => {
    console.error("eval-rec lỗi:", error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
