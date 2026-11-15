export interface Metrics {
  p5: number
  p10: number
  recall10: number
  ndcg10: number
  mrr: number
}

export function dcg(grades: number[]): number {
  return grades.reduce((sum, g, i) => sum + (2 ** g - 1) / Math.log2(i + 2), 0)
}

export function score(ids: string[], labels: Record<string, number>): Omit<Metrics, "zeroRate"> {
  const g = ids.slice(0, 10).map((id) => labels[id] ?? 0)
  const exact = Object.values(labels).filter((v) => v === 2).length
  const p5 = g.slice(0, 5).filter((v) => v >= 1).length / Math.max(1, Math.min(5, g.length))
  const p10 = g.filter((v) => v >= 1).length / Math.max(1, g.length)
  const recall10 =
    exact === 0 ? 0 : g.slice(0, 10).filter((v) => v === 2).length / Math.min(10, exact)
  const ndcg10 =
    exact === 0 ? 0 : dcg(g) / dcg(Array.from({ length: Math.min(10, exact) }, () => 2))
  const firstExact = g.findIndex((v) => v === 2)
  const mrr = firstExact === -1 ? 0 : 1 / (firstExact + 1)
  return { p5, p10, recall10, ndcg10, mrr }
}

export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return Math.round(sorted[idx] ?? 0)
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface BootstrapResult {
  meanDelta: number
  ciLow: number
  ciHigh: number

  pOneSided: number
}

export function pairedBootstrap(diffs: number[], iterations = 10_000, seed = 42): BootstrapResult {
  if (diffs.length === 0) return { meanDelta: 0, ciLow: 0, ciHigh: 0, pOneSided: 1 }
  const meanDelta = diffs.reduce((s, x) => s + x, 0) / diffs.length
  const rng = mulberry32(seed)
  const means: number[] = []
  for (let i = 0; i < iterations; i++) {
    let s = 0
    for (let j = 0; j < diffs.length; j++) s += diffs[Math.floor(rng() * diffs.length)] ?? 0
    means.push(s / diffs.length)
  }
  means.sort((a, b) => a - b)
  const geZero = means.filter((m) => m <= 0).length
  return {
    meanDelta,
    ciLow: means[Math.floor(iterations * 0.025)] ?? meanDelta,
    ciHigh: means[Math.floor(iterations * 0.975)] ?? meanDelta,
    pOneSided: geZero / iterations,
  }
}

export function holmCorrect(pValues: number[]): number[] {
  const order = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p)
  const m = pValues.length
  const adjusted: number[] = new Array(m).fill(0)
  let runningMax = 0
  order.forEach(({ p }, rank) => {
    const adj = Math.min(1, (m - rank) * p)
    runningMax = Math.max(runningMax, adj)
    const idx = order[rank]?.i ?? 0
    adjusted[idx] = runningMax
  })
  return adjusted
}
