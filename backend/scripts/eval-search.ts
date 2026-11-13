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
import { listPlaces, parsePlaceFilters } from "../src/lib/places"

const EVAL_DIR = join(import.meta.dir, "..", "data", "eval")

/** Phiên bản bộ test: `--set 2` dùng search-eval-v2.json. Mặc định 1. */
const SET = (() => {
  const idx = process.argv.indexOf("--set")
  const value = idx >= 0 ? Number(process.argv[idx + 1]) : 1
  return Number.isInteger(value) && value >= 1 ? value : 1
})()
const QUERIES_FILE = join(EVAL_DIR, `search-eval-v${SET}.json`)
const LABELS_FILE = join(EVAL_DIR, `search-eval-v${SET}-labels.json`)
const CHECKSUM_FILE = join(EVAL_DIR, `search-eval-v${SET}.sha256`)
const RESULT_FILE = join(EVAL_DIR, `search-eval-v${SET}-baseline.json`)

interface Constraints {
  category?: string[]
  tagsAll?: string[]
  tagsAny?: string[]
  district?: string[]
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
    `# search-eval-v1 — ĐÓNG BĂNG. Không sửa 2 file json; tạo v2 nếu cần bộ mới.\n${checksum}\n`,
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

function dcg(grades: number[]): number {
  return grades.reduce((sum, g, i) => sum + (2 ** g - 1) / Math.log2(i + 2), 0)
}

interface Metrics {
  p5: number
  p10: number
  recall10: number
  ndcg10: number
  mrr: number
  zeroRate: number
}

function score(ids: string[], labels: Record<string, number>): Omit<Metrics, "zeroRate"> {
  const g = ids.slice(0, 10).map((id) => labels[id] ?? 0)
  const exact = Object.values(labels).filter((v) => v === 2).length
  const p5 = g.slice(0, 5).filter((v) => v >= 1).length / Math.max(1, Math.min(5, g.length))
  const p10 = g.filter((v) => v >= 1).length / Math.max(1, g.length)
  const recall10 =
    exact === 0 ? 0 : g.slice(0, 10).filter((v) => v === 2).length / Math.min(10, exact)
  // Query không có venue nào thoả đủ ràng buộc → không có ideal DCG. Phải trả 0:
  // nếu chia cho `Math.max(1e-9, 0)` thì mọi kết quả grade 1 sẽ cho nDCG khổng lồ.
  const ndcg10 =
    exact === 0 ? 0 : dcg(g) / dcg(Array.from({ length: Math.min(10, exact) }, () => 2))
  const firstExact = g.findIndex((v) => v === 2)
  const mrr = firstExact === -1 ? 0 : 1 / (firstExact + 1)
  return { p5, p10, recall10, ndcg10, mrr }
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return Math.round(sorted[idx] ?? 0)
}

async function evaluate(): Promise<void> {
  const labels = verifyFrozen()
  const queries = loadQueries()

  const totals = {
    lexical: { p5: 0, p10: 0, recall10: 0, ndcg10: 0, mrr: 0, zero: 0 },
    hybrid: { p5: 0, p10: 0, recall10: 0, ndcg10: 0, mrr: 0, zero: 0 },
  }
  const lexicalLatency: number[] = []
  const hybridLatency: number[] = []
  const perQuery: {
    id: string
    group: string
    variant?: string
    query: string
    lexical: Metrics
    hybrid: Metrics
  }[] = []

  for (const q of queries) {
    const qLabels = labels.grades[q.id] ?? {}

    const t0 = performance.now()
    const lexIds = await lexicalTop(q.query, 10)
    lexicalLatency.push(performance.now() - t0)
    const lex = score(lexIds, qLabels)

    const t1 = performance.now()
    const page = await listPlaces(parsePlaceFilters({ q: q.query }), null, 10)
    hybridLatency.push(performance.now() - t1)
    const hyb = score(
      page.items.map((p) => p.id),
      qLabels,
    )

    for (const key of ["p5", "p10", "recall10", "ndcg10", "mrr"] as const) {
      totals.lexical[key] += lex[key]
      totals.hybrid[key] += hyb[key]
    }
    if (lexIds.length === 0) totals.lexical.zero++
    if (page.items.length === 0) totals.hybrid.zero++

    perQuery.push({
      id: q.id,
      group: q.intent ?? q.group ?? "?",
      variant: q.variant,
      query: q.query,
      lexical: { ...lex, zeroRate: lexIds.length === 0 ? 1 : 0 },
      hybrid: { ...hyb, zeroRate: page.items.length === 0 ? 1 : 0 },
    })
  }

  const n = queries.length
  const avg = (v: number) => Number((v / n).toFixed(3))
  const summary = {
    frozenAt: labels.frozenAt,
    queries: n,
    lexical: {
      p5: avg(totals.lexical.p5),
      p10: avg(totals.lexical.p10),
      recall10: avg(totals.lexical.recall10),
      ndcg10: avg(totals.lexical.ndcg10),
      mrr: avg(totals.lexical.mrr),
      zeroRate: Number((totals.lexical.zero / n).toFixed(3)),
      latencyP50Ms: percentile(lexicalLatency, 50),
      latencyP95Ms: percentile(lexicalLatency, 95),
    },
    hybrid: {
      p5: avg(totals.hybrid.p5),
      p10: avg(totals.hybrid.p10),
      recall10: avg(totals.hybrid.recall10),
      ndcg10: avg(totals.hybrid.ndcg10),
      mrr: avg(totals.hybrid.mrr),
      zeroRate: Number((totals.hybrid.zero / n).toFixed(3)),
      latencyP50Ms: percentile(hybridLatency, 50),
      latencyP95Ms: percentile(hybridLatency, 95),
    },
  }

  const byGroup: Record<string, { lexicalP5: number; hybridP5: number; n: number }> = {}
  for (const row of perQuery) {
    const g = (byGroup[row.group] ??= { lexicalP5: 0, hybridP5: 0, n: 0 })
    g.lexicalP5 += row.lexical.p5
    g.hybridP5 += row.hybrid.p5
    g.n++
  }
  for (const g of Object.values(byGroup)) {
    g.lexicalP5 = Number((g.lexicalP5 / g.n).toFixed(3))
    g.hybridP5 = Number((g.hybridP5 / g.n).toFixed(3))
  }

  // Theo kiểu diễn đạt — đo độ bền khi người dùng diễn đạt khác cùng ý định.
  const byVariant: Record<string, { lexicalP5: number; hybridP5: number; n: number }> = {}
  for (const row of perQuery) {
    if (!row.variant) continue
    const v = (byVariant[row.variant] ??= { lexicalP5: 0, hybridP5: 0, n: 0 })
    v.lexicalP5 += row.lexical.p5
    v.hybridP5 += row.hybrid.p5
    v.n++
  }
  for (const v of Object.values(byVariant)) {
    v.lexicalP5 = Number((v.lexicalP5 / v.n).toFixed(3))
    v.hybridP5 = Number((v.hybridP5 / v.n).toFixed(3))
  }

  console.log(`Bộ test đóng băng v${SET} — ${n} query (freeze ${labels.frozenAt})`)
  console.log("\nChỉ số tổng (trung bình/query):")
  console.table(summary)
  console.log("P@5 theo ý định:")
  console.table(byGroup)
  if (Object.keys(byVariant).length > 0) {
    console.log("P@5 theo kiểu diễn đạt (cùng ý định, cách ghi khác nhau):")
    console.table(byVariant)
  }

  writeFileSync(RESULT_FILE, `${JSON.stringify({ summary, byGroup, perQuery }, null, 2)}\n`)
  console.log(`\nĐã ghi ${RESULT_FILE}`)
  process.exit(0)
}

if (process.argv.includes("--freeze")) {
  void freeze()
} else {
  void evaluate()
}
