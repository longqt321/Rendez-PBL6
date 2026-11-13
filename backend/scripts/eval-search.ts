/**
 * Đánh giá search trên bộ test ĐÓNG BĂNG `data/eval/search-eval-v1.json`.
 *
 * Hai chế độ:
 *   bun run scripts/eval-search.ts --freeze   # chốt nhãn + checksum (chạy MỘT lần)
 *   bun run scripts/eval-search.ts            # chấm điểm, checksum phải khớp
 *
 * Nguyên tắc đóng băng: nhãn (tập id kỳ vọng cho từng query) được CHỐT vào
 * `search-eval-v1-labels.json` tại thời điểm freeze. Về sau dữ liệu venue có
 * đổi thì nhãn KHÔNG đổi — nhờ vậy các lượt cải tiến so sánh được với nhau.
 * Checksum của cả hai file được ghi vào `search-eval-v1.sha256`; script từ chối
 * chạy nếu file bị sửa. Muốn bộ mới → tạo `search-eval-v2.json` (xem
 * docs/EVAL-PROTOCOL.md).
 *
 * Nhãn suy ra từ thuộc tính DB, không từ kết quả search:
 *   grade 2 = thoả toàn bộ ràng buộc; grade 1 = chỉ thoả loại hình (category)
 *   khi query có ràng buộc category; grade 0 = còn lại.
 */
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Prisma } from "../generated/prisma/client"
import { prisma } from "../src/lib/prisma"
import { denseCandidates, fuseRrf, listPlaces, parsePlaceFilters } from "../src/lib/places"
import {
  holmCorrect,
  pairedBootstrap,
  percentile,
  score,
  type Metrics,
} from "../src/lib/eval-metrics"

const EVAL_DIR = join(import.meta.dir, "..", "data", "eval")

/** Phiên bản bộ test: `--set 2` dùng search-eval-v2.json. Mặc định 1. */
const SET = (() => {
  const idx = process.argv.indexOf("--set")
  const value = idx >= 0 ? Number(process.argv[idx + 1]) : 1
  return Number.isInteger(value) && value >= 1 ? value : 1
})()
/**
 * `--file <tên>.json` dùng bộ tuỳ ý (ví dụ bộ Yelp) — file labels/checksum/baseline
 * lấy cùng tên. Mặc định theo `--set` như trước, không ảnh hưởng v1/v2.
 */
const FILE_BASE = (() => {
  const idx = process.argv.indexOf("--file")
  if (idx >= 0) {
    const raw = process.argv[idx + 1]
    if (raw) return raw.replace(/\.json$/, "")
  }
  return null
})()
const BASE = FILE_BASE ?? `search-eval-v${SET}`
const QUERIES_FILE = join(EVAL_DIR, `${BASE}.json`)
const LABELS_FILE = join(EVAL_DIR, `${BASE}-labels.json`)
const CHECKSUM_FILE = join(EVAL_DIR, `${BASE}.sha256`)
const RESULT_FILE = join(EVAL_DIR, `${BASE}-baseline.json`)

interface Constraints {
  category?: string[]
  tagsAll?: string[]
  tagsAny?: string[]
  district?: string[]
  /** Thành phố — dùng cho bộ Yelp (dataset không có district). */
  city?: string[]
  /** Venue mở 24/7 (`opening_hours = '24/7'`). */
  alwaysOpen?: boolean
}

interface EvalQuery {
  id: string
  /** v1 dùng `group`, v2 dùng `intent` — cùng nghĩa. */
  group?: string
  intent?: string
  variant?: string
  query: string
  constraints: Constraints
}

interface Labels {
  version: number
  frozenAt: string
  /** id → grade (2 = thoả toàn bộ, 1 = thoả loại hình). */
  grades: Record<string, Record<string, number>>
}

const HAYSTACK = Prisma.sql`immutable_search_normalize(p.name || ' ' || p.address || ' ' || p.city || ' ' || coalesce(p.district, '') || ' ' || immutable_array_to_string(p.tags, ' '))`

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

function loadQueries(): EvalQuery[] {
  const parsed = JSON.parse(readFileSync(QUERIES_FILE, "utf8")) as { queries: EvalQuery[] }
  return parsed.queries
}

/** Điều kiện SQL cho một ràng buộc — dùng chung cho lúc freeze nhãn. */
function constraintSql(c: Constraints): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.deleted_at IS NULL`,
    Prisma.sql`p.status <> 'closed'`,
  ]
  if (c.category?.length) {
    parts.push(Prisma.sql`p.category::text IN (${Prisma.join(c.category)})`)
  }
  if (c.tagsAll?.length) {
    parts.push(Prisma.sql`p.tags @> ARRAY[${Prisma.join(c.tagsAll)}]::text[]`)
  }
  if (c.tagsAny?.length) {
    parts.push(Prisma.sql`p.tags && ARRAY[${Prisma.join(c.tagsAny)}]::text[]`)
  }
  if (c.district?.length) {
    parts.push(Prisma.sql`p.district IN (${Prisma.join(c.district)})`)
  }
  if (c.city?.length) {
    parts.push(Prisma.sql`p.city IN (${Prisma.join(c.city)})`)
  }
  if (c.alwaysOpen) {
    parts.push(Prisma.sql`p.opening_hours = '24/7'`)
  }
  return Prisma.join(parts, " AND ")
}

async function resolveGrades(q: EvalQuery): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id FROM places p WHERE ${constraintSql(q.constraints)}`)
  const grades: Record<string, number> = {}
  for (const row of rows) grades[row.id] = 2

  // grade 1: chỉ thoả loại hình (khi query có category) — "gần đúng" một phần.
  if (q.constraints.category?.length) {
    const rows1 = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id FROM places p
      WHERE p.published_at IS NOT NULL AND p.deleted_at IS NULL AND p.status <> 'closed'
        AND p.category::text IN (${Prisma.join(q.constraints.category)})
        AND NOT (${constraintSql(q.constraints)})`)
    for (const row of rows1) grades[row.id] = 1
  }
  return grades
}

async function freeze(): Promise<void> {
  const queries = loadQueries()
  const grades: Labels["grades"] = {}
  const counts: string[] = []
  for (const q of queries) {
    const g = await resolveGrades(q)
    grades[q.id] = g
    const exact = Object.values(g).filter((v) => v === 2).length
    const partial = Object.values(g).filter((v) => v === 1).length
    counts.push(
      `${q.id} ${(q.intent ?? q.group ?? "?").padEnd(8)} exact=${String(exact).padStart(3)} partial=${String(partial).padStart(3)}  ${q.query}`,
    )
  }
  const labels: Labels = { version: SET, frozenAt: new Date().toISOString(), grades }
  writeFileSync(LABELS_FILE, `${JSON.stringify(labels, null, 2)}\n`)

  const checksum = sha256(readFileSync(QUERIES_FILE, "utf8") + readFileSync(LABELS_FILE, "utf8"))
  writeFileSync(
    CHECKSUM_FILE,
    `# search-eval-v${SET} — ĐÓNG BĂNG. Không sửa 2 file json; tạo v${SET + 1} nếu cần bộ mới.\n${checksum}\n`,
  )
  console.log(counts.join("\n"))
  console.log(`\nĐã freeze: ${LABELS_FILE}\nchecksum: ${checksum}`)
  process.exit(0)
}

/** Kiểm checksum — nếu lệch thì dừng, KHÔNG chấm điểm trên bộ đã bị sửa. */
function verifyFrozen(): Labels {
  if (!existsSync(LABELS_FILE) || !existsSync(CHECKSUM_FILE)) {
    console.error("Chưa freeze. Chạy: bun run scripts/eval-search.ts --freeze")
    process.exit(1)
  }
  const expected = readFileSync(CHECKSUM_FILE, "utf8")
    .split("\n")
    .find((line) => /^[0-9a-f]{64}$/.test(line.trim()))
  const actual = sha256(readFileSync(QUERIES_FILE, "utf8") + readFileSync(LABELS_FILE, "utf8"))
  if (!expected || expected.trim() !== actual) {
    console.error(
      "Bộ test đã bị sửa (checksum lệch). KHÔNG chấm điểm trên bộ đã đổi — tạo search-eval-v2.json thay vì sửa v1.",
    )
    process.exit(1)
  }
  return JSON.parse(readFileSync(LABELS_FILE, "utf8")) as Labels
}

/** Baseline lexical: xếp theo trigram similarity, không lọc thuộc tính (hành vi trước hybrid). */
async function lexicalTop(q: string, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id FROM places p
    WHERE p.published_at IS NOT NULL AND p.deleted_at IS NULL AND p.status <> 'closed'
    ORDER BY similarity(${HAYSTACK}, immutable_search_normalize(${q})) DESC, p.created_at DESC, p.id DESC
    LIMIT ${limit}`)
  return rows.map((r) => r.id)
}

/** Số ứng viên mỗi nhánh khi fuse — khớp `HYBRID_POOL` của `lib/places.ts`. */
const POOL = 50

type ModeName = "lexical" | "dense" | "hybrid2" | "hybrid3"

/** Metrics + zeroRate (tỉ lệ query trả rỗng) — chỉ dùng trong script này. */
type ModeMetrics = Metrics & { zeroRate: number }

const MODES: ModeName[] = ["lexical", "dense", "hybrid2", "hybrid3"]

async function evaluate(): Promise<void> {
  const labels = verifyFrozen()
  const queries = loadQueries()

  const totals: Record<
    ModeName,
    { p5: number; p10: number; recall10: number; ndcg10: number; mrr: number; zero: number }
  > = {
    lexical: { p5: 0, p10: 0, recall10: 0, ndcg10: 0, mrr: 0, zero: 0 },
    dense: { p5: 0, p10: 0, recall10: 0, ndcg10: 0, mrr: 0, zero: 0 },
    hybrid2: { p5: 0, p10: 0, recall10: 0, ndcg10: 0, mrr: 0, zero: 0 },
    hybrid3: { p5: 0, p10: 0, recall10: 0, ndcg10: 0, mrr: 0, zero: 0 },
  }
  const latency: Record<ModeName, number[]> = { lexical: [], dense: [], hybrid2: [], hybrid3: [] }
  const perQuery: {
    id: string
    group: string
    variant?: string
    query: string
    lexical: ModeMetrics
    dense: ModeMetrics
    hybrid2: ModeMetrics
    hybrid3: ModeMetrics
  }[] = []

  for (const q of queries) {
    const qLabels = labels.grades[q.id] ?? {}

    // Nhánh lexical: lấy pool 50 để hybrid2 fuse được, 10 đầu dùng cho chế độ lexical.
    const t0 = performance.now()
    const lexPool = await lexicalTop(q.query, POOL)
    latency.lexical.push(performance.now() - t0)

    // Nhánh dense: cùng hàm production, không nhân bản SQL.
    const t1 = performance.now()
    const densePool = (await denseCandidates(q.query, POOL))?.map((c) => c.id) ?? []
    latency.dense.push(performance.now() - t1)

    // Hybrid 2 nhánh = RRF(lexical, dense) — hành vi trước khi có nhánh structured.
    // Độ trễ tính từ `t0`: gồm cả hai nhánh (chạy tuần tự) + fuse trong RAM.
    const fused2 = fuseRrf({ ids: lexPool }, { ids: densePool }).slice(0, 10)
    latency.hybrid2.push(performance.now() - t0)

    // Hybrid 3 nhánh = đúng đường production (`listPlaces` có nhánh structured).
    const t3 = performance.now()
    const page = await listPlaces(parsePlaceFilters({ q: q.query }), null, 10)
    latency.hybrid3.push(performance.now() - t3)

    const results: Record<ModeName, string[]> = {
      lexical: lexPool.slice(0, 10),
      dense: densePool.slice(0, 10),
      hybrid2: fused2,
      hybrid3: page.items.map((p) => p.id),
    }
    const scored = {} as Record<ModeName, ModeMetrics>
    for (const mode of MODES) {
      const ids = results[mode]
      const m = score(ids, qLabels)
      scored[mode] = { ...m, zeroRate: ids.length === 0 ? 1 : 0 }
      for (const key of ["p5", "p10", "recall10", "ndcg10", "mrr"] as const) {
        totals[mode][key] += m[key]
      }
      if (ids.length === 0) totals[mode].zero++
    }

    perQuery.push({
      id: q.id,
      group: q.intent ?? q.group ?? "?",
      variant: q.variant,
      query: q.query,
      ...scored,
    })
  }

  const n = queries.length
  const avg = (v: number) => Number((v / n).toFixed(3))
  const summary: Record<string, unknown> = { frozenAt: labels.frozenAt, queries: n }
  for (const mode of MODES) {
    const t = totals[mode]
    summary[mode] = {
      p5: avg(t.p5),
      p10: avg(t.p10),
      recall10: avg(t.recall10),
      ndcg10: avg(t.ndcg10),
      mrr: avg(t.mrr),
      zeroRate: Number((t.zero / n).toFixed(3)),
      latencyP50Ms: percentile(latency[mode], 50),
      latencyP95Ms: percentile(latency[mode], 95),
    }
  }

  type GroupAgg = Record<string, Record<string, number>>
  const agg = (keyOf: (row: (typeof perQuery)[number]) => string | undefined) => {
    const out: GroupAgg = {}
    for (const row of perQuery) {
      const key = keyOf(row)
      if (!key) continue
      const g = (out[key] ??= { n: 0 })
      g.n = (g.n ?? 0) + 1
      for (const mode of MODES) g[`${mode}P5`] = (g[`${mode}P5`] ?? 0) + row[mode].p5
    }
    for (const g of Object.values(out)) {
      for (const mode of MODES)
        g[`${mode}P5`] = Number(((g[`${mode}P5`] ?? 0) / (g.n ?? 1)).toFixed(3))
    }
    return out
  }
  const byGroup = agg((row) => row.group)
  const byVariant = agg((row) => row.variant)

  // Kiểm định thống kê: paired bootstrap trên P@5 per-query (cùng query nên paired),
  // hiệu chỉnh Holm cho đa so sánh. Seeded nên tái lập được giữa các lượt chạy.
  const comparisons: { label: string; diffs: number[] }[] = [
    { label: "hybrid3 - hybrid2", diffs: perQuery.map((r) => r.hybrid3.p5 - r.hybrid2.p5) },
    { label: "hybrid3 - dense", diffs: perQuery.map((r) => r.hybrid3.p5 - r.dense.p5) },
    { label: "hybrid3 - lexical", diffs: perQuery.map((r) => r.hybrid3.p5 - r.lexical.p5) },
    { label: "dense - lexical", diffs: perQuery.map((r) => r.dense.p5 - r.lexical.p5) },
    { label: "hybrid2 - dense", diffs: perQuery.map((r) => r.hybrid2.p5 - r.dense.p5) },
  ]
  const boot = comparisons.map((c) => pairedBootstrap(c.diffs))
  const holm = holmCorrect(boot.map((b) => b.pOneSided))
  const stats = comparisons.map((c, i) => ({
    comparison: c.label,
    meanDelta: Number((boot[i]?.meanDelta ?? 0).toFixed(3)),
    ci95: `[${(boot[i]?.ciLow ?? 0).toFixed(3)}, ${(boot[i]?.ciHigh ?? 0).toFixed(3)}]`,
    pRaw: Number((boot[i]?.pOneSided ?? 1).toFixed(4)),
    pHolm: Number((holm[i] ?? 1).toFixed(4)),
  }))

  console.log(`Bộ test đóng băng v${SET} — ${n} query (freeze ${labels.frozenAt})`)
  console.log("\nChỉ số tổng (trung bình/query):")
  console.table(summary)
  console.log("P@5 theo ý định:")
  console.table(byGroup)
  if (Object.keys(byVariant).length > 0) {
    console.log("P@5 theo kiểu diễn đạt (cùng ý định, cách ghi khác nhau):")
    console.table(byVariant)
  }
  console.log("Kiểm định thống kê trên P@5 (paired bootstrap 10k, Holm-corrected):")
  console.table(stats)

  writeFileSync(
    RESULT_FILE,
    `${JSON.stringify({ summary, byGroup, byVariant, significance: stats, perQuery }, null, 2)}\n`,
  )
  console.log(`\nĐã ghi ${RESULT_FILE}`)
  process.exit(0)
}

if (process.argv.includes("--freeze")) {
  void freeze()
} else {
  void evaluate()
}
