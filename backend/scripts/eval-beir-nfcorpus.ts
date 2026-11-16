/**
 * Benchmark Thông tin Tìm kiếm trên BEIR NFCorpus (Nutrition Facts Corpus - Boleslavsky et al.).
 * Lĩnh vực: Y tế / Dinh dưỡng / Thực phẩm đời thực (3,633 tài liệu, 323 test queries).
 * Kiểm tra tính tổng quát của EGRF trên miền tài liệu dinh dưỡng đời sống.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { score } from "../src/lib/eval-metrics"

interface Doc {
  id: string
  title: string
  text: string
  tokens: string[]
}

interface Query {
  id: string
  text: string
  tokens: string[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

async function main() {
  const corpusPath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "beir",
    "nfcorpus",
    "corpus.jsonl",
  )
  const queriesPath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "beir",
    "nfcorpus",
    "queries.jsonl",
  )
  const qrelsPath = join(
    import.meta.dir,
    "..",
    "data",
    "external",
    "beir",
    "nfcorpus",
    "qrels",
    "test.tsv",
  )

  console.log("=== Đọc BEIR NFCorpus Dataset ===")
  const corpusLines = readFileSync(corpusPath, "utf-8").trim().split("\n")
  const docs = new Map<string, Doc>()
  const docFrequencies = new Map<string, number>()

  for (const line of corpusLines) {
    if (!line) continue
    const obj = JSON.parse(line)
    const tokens = tokenize(`${obj.title} ${obj.text}`)
    docs.set(obj._id, {
      id: obj._id,
      title: obj.title,
      text: obj.text,
      tokens,
    })
    const uniqueTokens = new Set(tokens)
    for (const t of uniqueTokens) {
      docFrequencies.set(t, (docFrequencies.get(t) ?? 0) + 1)
    }
  }

  const N = docs.size
  console.log(`  Corpus documents: ${N}`)

  // Qrels
  const qrels = new Map<string, Map<string, number>>()
  const qrelLines = readFileSync(qrelsPath, "utf-8").trim().split("\n")
  for (let i = 1; i < qrelLines.length; i++) {
    const line = qrelLines[i]!
    if (!line) continue
    const [qId, cId, sStr] = line.split("\t")
    if (!qId || !cId || !sStr) continue
    const s = parseInt(sStr, 10)
    if (s > 0) {
      let map = qrels.get(qId)
      if (!map) {
        map = new Map()
        qrels.set(qId, map)
      }
      map.set(cId, s)
    }
  }

  // Queries
  const queryLines = readFileSync(queriesPath, "utf-8").trim().split("\n")
  const evalQueries: Query[] = []
  for (const line of queryLines) {
    if (!line) continue
    const obj = JSON.parse(line)
    if (qrels.has(obj._id)) {
      evalQueries.push({
        id: obj._id,
        text: obj.text,
        tokens: tokenize(obj.text),
      })
    }
  }
  console.log(`  Queries test có ground-truth: ${evalQueries.length}`)

  const k1 = 1.2
  const b = 0.75
  let totalDocLen = 0
  for (const doc of docs.values()) totalDocLen += doc.tokens.length
  const avgDocLen = totalDocLen / N

  interface QueryEval {
    ndcg10: number
    recall10: number
    mrr: number
  }

  const results = {
    bm25: [] as QueryEval[],
    denseSim: [] as QueryEval[],
    standardRrf: [] as QueryEval[],
    egrf: [] as QueryEval[],
  }

  const docList = [...docs.values()]
  const dynamicK = Math.max(10, Math.floor(2 * Math.sqrt(N))) // k(3633) = 120

  for (const q of evalQueries) {
    const groundTruth = qrels.get(q.id)!
    const gtSet = new Set(groundTruth.keys())

    // 1. BM25
    const bm25Scores: { id: string; score: number }[] = []
    const qTokenSet = new Set(q.tokens)

    for (const doc of docList) {
      let scoreVal = 0
      const docLen = doc.tokens.length
      const termCounts = new Map<string, number>()
      for (const t of doc.tokens) {
        if (qTokenSet.has(t)) {
          termCounts.set(t, (termCounts.get(t) ?? 0) + 1)
        }
      }

      for (const [t, tf] of termCounts) {
        const df = docFrequencies.get(t) ?? 1
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0)
        const num = tf * (k1 + 1)
        const den = tf + k1 * (1 - b + b * (docLen / avgDocLen))
        scoreVal += idf * (num / den)
      }
      if (scoreVal > 0) {
        bm25Scores.push({ id: doc.id, score: scoreVal })
      }
    }

    bm25Scores.sort((a, b) => b.score - a.score)
    const bm25Ranked = bm25Scores.map((x) => x.id)

    // 2. Simulated Dense
    const denseScores: { id: string; score: number }[] = []
    for (const doc of docList) {
      let match = 0
      for (const t of q.tokens) {
        if (doc.tokens.includes(t)) match++
      }
      const sim = match / (q.tokens.length + doc.tokens.length * 0.05 + 1)
      if (sim > 0) {
        denseScores.push({ id: doc.id, score: sim })
      }
    }
    denseScores.sort((a, b) => b.score - a.score)
    const denseRanked = denseScores.map((x) => x.id)

    // 3. Standard RRF (k=60)
    const rrfScores = new Map<string, number>()
    bm25Ranked.slice(0, 100).forEach((id, rank) => {
      rrfScores.set(id, (rrfScores.get(id) ?? 0) + 1 / (60 + rank + 1))
    })
    denseRanked.slice(0, 100).forEach((id, rank) => {
      rrfScores.set(id, (rrfScores.get(id) ?? 0) + 1 / (60 + rank + 1))
    })
    const standardRrfRanked = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0])

    // 4. EGRF (Dynamic k(N) + Gating)
    const topBm25Score = bm25Scores[0]?.score ?? 0
    const wLexical = topBm25Score > 8.0 ? 1.4 : 1.0
    const wDense = topBm25Score > 8.0 ? 0.7 : 1.0

    const egrfScores = new Map<string, number>()
    bm25Ranked.slice(0, 100).forEach((id, rank) => {
      egrfScores.set(id, (egrfScores.get(id) ?? 0) + wLexical / (dynamicK + rank + 1))
    })
    denseRanked.slice(0, 100).forEach((id, rank) => {
      egrfScores.set(id, (egrfScores.get(id) ?? 0) + wDense / (dynamicK + rank + 1))
    })
    const egrfRanked = [...egrfScores.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0])

    const evalMethod = (ranked: string[]) => {
      const gObj: Record<string, number> = {}
      for (const [id] of groundTruth) gObj[id] = 2
      const m = score(ranked, gObj)
      const top10 = ranked.slice(0, 10)
      const hits = top10.filter((id) => gtSet.has(id)).length
      const recall10 = hits / Math.max(1, gtSet.size)
      return { ndcg10: m.ndcg10, recall10, mrr: m.mrr }
    }

    results.bm25.push(evalMethod(bm25Ranked))
    results.denseSim.push(evalMethod(denseRanked))
    results.standardRrf.push(evalMethod(standardRrfRanked))
    results.egrf.push(evalMethod(egrfRanked))
  }

  const methods = ["bm25", "denseSim", "standardRrf", "egrf"] as const
  console.log("\n=== BEIR NFCorpus Benchmark Results ===")
  console.log("  method          NDCG@10  Recall@10      MRR")
  for (const m of methods) {
    const list = results[m]
    const ndcg = mean(list.map((x) => x.ndcg10)).toFixed(3)
    const rec = mean(list.map((x) => x.recall10)).toFixed(3)
    const mrr = mean(list.map((x) => x.mrr)).toFixed(3)
    console.log(`  ${m.padEnd(14)}  ${ndcg.padStart(7)}  ${rec.padStart(9)}  ${mrr.padStart(7)}`)
  }

  const outPath = join(import.meta.dir, "..", "data", "eval", "search-eval-beir-nfcorpus.json")
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        benchmark: "BEIR NFCorpus Zero-Shot Retrieval",
        frozenAt: new Date().toISOString(),
        corpusSize: N,
        queriesCount: evalQueries.length,
        dynamicK,
        metrics: Object.fromEntries(
          methods.map((m) => [
            m,
            {
              ndcg10: mean(results[m].map((x) => x.ndcg10)),
              recall10: mean(results[m].map((x) => x.recall10)),
              mrr: mean(results[m].map((x) => x.mrr)),
            },
          ]),
        ),
      },
      null,
      2,
    ),
  )
  console.log(`\nĐã ghi báo cáo: ${outPath}`)
}

main().catch(console.error)
