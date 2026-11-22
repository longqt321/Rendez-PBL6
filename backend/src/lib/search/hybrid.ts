import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { normalizeSearchText, synonymVariants } from "../search-synonyms"
import { detectIntentAttributes, extractMatchedPhrases } from "../intent-lexicon"
import { promotePlaceFilters } from "../places/query-promotion"
import { selectPlaces } from "../places/select"
import { toPlaceDto, type PlaceDto, type PlaceRow, type PlaceFilters } from "../places/types"
import { denseCandidates } from "./dense"
import { nameCandidates } from "./name-matcher"
import { structuredCandidates } from "./intent"
import { fieldBoostedLexicalRank, QUERY_STOPWORDS } from "./lexical"
import { fuseRrfScored, calculateEgrfK } from "./rrf"

export const HYBRID_POOL = 50
export const HYBRID_MAX_RESULTS = 30

function findResidualEntityTokens(normalizedQuery: string, matchedPhrases: string[]): string[] {
  if (!normalizedQuery) return []
  const chars = [...normalizedQuery]
  const masked = new Array<boolean>(chars.length).fill(false)

  for (const rawPhrase of matchedPhrases) {
    const phrase = normalizeSearchText(rawPhrase)
    if (!phrase) continue
    let from = 0
    for (;;) {
      const idx = normalizedQuery.indexOf(phrase, from)
      if (idx === -1) break
      const before = idx === 0 ? " " : (normalizedQuery[idx - 1] ?? " ")
      const after = normalizedQuery[idx + phrase.length] ?? " "
      if (before === " " && after === " ") {
        for (let i = idx; i < idx + phrase.length; i += 1) masked[i] = true
      }
      from = idx + 1
    }
  }

  const remaining = chars.map((ch, idx) => (masked[idx] ? " " : ch)).join("")
  return remaining.split(/\s+/).filter((token) => token.length >= 2 && !QUERY_STOPWORDS.has(token))
}

function bayesianQuality(row: PlaceRow): number {
  const count = Number(row.review_count)
  const ratio = Number(row.positive_ratio) / 20
  return (count * ratio + 10 * 3.8) / (count + 10)
}

async function runHybridPass(params: {
  effectiveFilters: PlaceFilters & { q: string }
  attrFilters: PlaceFilters
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[]
  precomputedNames?: { exact: string[]; prefix: string[]; tokens: string[] }
  poolLimit: number
  corpusSize: number
}): Promise<{ items: PlaceDto[]; total: number }> {
  const {
    effectiveFilters,
    attrFilters,
    buildConditionsFn,
    precomputedNames,
    poolLimit,
    corpusSize,
  } = params

  const attrConditions = buildConditionsFn({ ...attrFilters, q: undefined })
  const lexicalConditions = buildConditionsFn({ ...attrFilters, q: effectiveFilters.q })
  const rankVariants = [
    effectiveFilters.q,
    ...synonymVariants(normalizeSearchText(effectiveFilters.q)),
  ]
  const lexicalRank = fieldBoostedLexicalRank(rankVariants)

  const intent = detectIntentAttributes(effectiveFilters.q)
  const matchedPhrases = extractMatchedPhrases(effectiveFilters.q)
  const normalizedQuery = normalizeSearchText(effectiveFilters.q)
  const residualEntityTokens = findResidualEntityTokens(normalizedQuery, matchedPhrases)
  const isPureIntentQuery = matchedPhrases.length > 0 && residualEntityTokens.length === 0

  const [dense, lexicalRows, names, structuredRows] = await Promise.all([
    denseCandidates(effectiveFilters.q, poolLimit, attrConditions),
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM places p
      WHERE ${Prisma.join(lexicalConditions, " AND ")}
      ORDER BY ${lexicalRank} DESC, p.created_at DESC, p.id DESC
      LIMIT ${poolLimit}
    `),
    precomputedNames ?? nameCandidates(normalizedQuery, attrConditions, poolLimit),
    structuredCandidates(intent, attrConditions, poolLimit),
  ])

  // Evidence Extraction + Gating Controller (hiệu chỉnh S-5):
  // - Chỉ triệt tiêu nhánh semantic/structured khi khớp CHÍNH XÁC tên quán (`hasExact`).
  // - Khi chỉ khớp prefix hoặc 1-2 token tên quán (VD: "cà phê muối"), giữ nhánh ngữ nghĩa
  //   & thuộc tính với trọng số cân bằng để không làm mất các quán có món trong tags/mô tả.
  const hasExact = names.exact.length > 0
  const hasPrefix = names.prefix.length > 0
  const hasTokens = names.tokens.length > 0

  const lexicalWeight = 1.0
  let exactWeight = 0
  let prefixWeight = 0
  let tokenWeight = 0
  let denseWeight: number
  let structuredWeight: number

  if (hasExact && !isPureIntentQuery) {
    exactWeight = 6.0
    prefixWeight = hasPrefix ? 3.0 : 0
    tokenWeight = hasTokens ? 2.0 : 0
    structuredWeight = 0.0
    denseWeight = 0.0
  } else if (!isPureIntentQuery && (hasPrefix || hasTokens)) {
    prefixWeight = hasPrefix ? 3.0 : 0
    tokenWeight = hasTokens ? 2.5 : 0
    structuredWeight = 1.5
    denseWeight = 1.2
  } else {
    const hasCategoryAttr =
      intent.categories.length > 0 ||
      intent.tags.length > 0 ||
      intent.districts.length > 0 ||
      intent.alwaysOpen
    if (hasCategoryAttr) {
      structuredWeight = 3.0
      denseWeight = 1.2
      exactWeight = hasExact ? 2.0 : 0
      prefixWeight = hasPrefix ? 0.75 : 0
      tokenWeight = hasTokens ? 0.75 : 0
    } else {
      structuredWeight = 1.0
      denseWeight = 2.5
    }
  }

  const egrfK = calculateEgrfK(corpusSize)
  const scored = fuseRrfScored(
    [
      { ids: lexicalRows.map((row) => row.id), weight: lexicalWeight },
      ...(dense ? [{ ids: dense.map((candidate) => candidate.id), weight: denseWeight }] : []),
      { ids: names.exact, weight: exactWeight },
      { ids: names.prefix, weight: prefixWeight },
      { ids: names.tokens, weight: tokenWeight },
      { ids: structuredRows, weight: structuredWeight },
    ],
    egrfK,
  )
  if (scored.length === 0) return { items: [], total: 0 }

  const scoreById = new Map(scored.map((entry) => [entry.id, entry.score]))
  const rankedIds = scored.map((entry) => entry.id)

  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces()}
    WHERE p.id IN (${Prisma.join(rankedIds.map((id) => Prisma.sql`${id}`))})
      AND ${Prisma.join(attrConditions, " AND ")}
  `)

  // Quality-Aware RRF Tie-Breaking (S-6):
  // Nhóm điểm RRF gần bằng nhau (1e-4) được phân định bằng ảnh thật & Bayesian rating thay vì ID.
  rows.sort((a, b) => {
    const scoreA = scoreById.get(a.id) ?? 0
    const scoreB = scoreById.get(b.id) ?? 0
    const bucketDiff = Math.round(scoreB * 10_000) - Math.round(scoreA * 10_000)
    if (bucketDiff !== 0) return bucketDiff

    const imgDiff = (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0)
    if (imgDiff !== 0) return imgDiff

    const qualDiff = bayesianQuality(b) - bayesianQuality(a)
    if (Math.abs(qualDiff) > 1e-4) return qualDiff

    if (scoreB !== scoreA) return scoreB - scoreA
    return a.id.localeCompare(b.id)
  })

  return { items: rows.map(toPlaceDto), total: rows.length }
}

export async function hybridSearch(
  filters: PlaceFilters & { q: string },
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
  poolLimit: number = HYBRID_POOL,
): Promise<{ items: PlaceDto[]; total: number; relaxedFilters?: boolean } | null> {
  const baseAttrConditions = buildConditionsFn({ ...filters, q: undefined })
  const normalizedFullQuery = normalizeSearchText(filters.q)
  const promotion = promotePlaceFilters(filters)

  const [guardNames, corpusCountRows] = await Promise.all([
    nameCandidates(normalizedFullQuery, baseAttrConditions, poolLimit),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM places p
      WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
    `),
  ])
  const corpusSize = Number(corpusCountRows[0]?.count ?? 0)

  // Entity Guard (S-1): nếu không khớp chính xác tên riêng 1 quán, promote bộ lọc cứng từ query
  // và truyền phần text dư `residualQuery` vào bước chấm điểm vector/lexical (S-4).
  const canPromote = guardNames.exact.length === 0 && promotion.hasPromotedConstraints

  if (canPromote) {
    const residualText = promotion.promotedFilters.q ?? filters.q
    const promotedResult = await runHybridPass({
      effectiveFilters: { ...promotion.promotedFilters, q: residualText },
      attrFilters: promotion.promotedFilters,
      buildConditionsFn,
      poolLimit,
      corpusSize,
    })

    if (promotedResult.items.length > 0) {
      return promotedResult
    }

    // Auto-Relaxation: nếu lọc cứng trả về 0 (vd tên quán chứa chữ quận nhưng nằm quận khác),
    // tự động nới lỏng về điều kiện gốc và gắn cờ `relaxedFilters: true`.
    const fallbackResult = await runHybridPass({
      effectiveFilters: filters,
      attrFilters: filters,
      buildConditionsFn,
      precomputedNames: guardNames,
      poolLimit,
      corpusSize,
    })
    return fallbackResult.items.length > 0
      ? { ...fallbackResult, relaxedFilters: true }
      : fallbackResult
  }

  return runHybridPass({
    effectiveFilters: filters,
    attrFilters: filters,
    buildConditionsFn,
    precomputedNames: guardNames,
    poolLimit,
    corpusSize,
  })
}
