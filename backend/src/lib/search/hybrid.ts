import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { normalizeSearchText, synonymVariants } from "../search-synonyms"
import { detectIntentAttributes } from "../intent-lexicon"
import { selectPlaces } from "../places/select"
import { toPlaceDto, type PlaceDto, type PlaceRow, type PlaceFilters } from "../places/types"
import { denseCandidates } from "./dense"
import { nameCandidates } from "./name-matcher"
import { structuredCandidates } from "./intent"
import { fieldBoostedLexicalRank } from "./lexical"
import { fuseRrf, calculateEgrfK } from "./rrf"

export const HYBRID_POOL = 50
export const HYBRID_MAX_RESULTS = 30

export async function hybridSearch(
  filters: PlaceFilters & { q: string },
  buildConditionsFn: (f: PlaceFilters) => Prisma.Sql[],
): Promise<{ items: PlaceDto[]; total: number } | null> {
  const attrConditions = buildConditionsFn({ ...filters, q: undefined })
  const lexicalConditions = buildConditionsFn(filters)
  const rankVariants = [filters.q, ...synonymVariants(normalizeSearchText(filters.q))]
  const lexicalRank = fieldBoostedLexicalRank(rankVariants)

  const intent = detectIntentAttributes(filters.q)
  const normalizedQuery = normalizeSearchText(filters.q)

  const [dense, lexicalRows, names, structuredRows, corpusCountRows] = await Promise.all([
    denseCandidates(filters.q, HYBRID_POOL),
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM places p
      WHERE ${Prisma.join(lexicalConditions, " AND ")}
      ORDER BY ${lexicalRank} DESC, p.created_at DESC, p.id DESC
      LIMIT ${HYBRID_POOL}
    `),
    nameCandidates(normalizedQuery, attrConditions, HYBRID_POOL),
    structuredCandidates(intent, attrConditions, HYBRID_POOL),
    prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM places p
      WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
    `),
  ])

  // Evidence Extraction theo đặc tả EGRF (Section 3.1 & 3.2):
  // Tín hiệu định danh thực thể: có quán khớp chính xác hoặc khớp tiền tố tên
  const hasExact = names.exact.length > 0
  const hasPrefix = names.prefix.length > 0
  const hasTokens = names.tokens.length > 0
  const hasIdentityEvidence = hasExact || hasPrefix

  // Gating Controller (Ma trận trọng số động W(q)):
  // 1. Khi có Identity Evidence (tên riêng): Triệt tiêu structured/attribute & dense branch
  //    để ngăn hiện tượng "Fusion Tax" làm tụt quán chính xác.
  // 2. Khi không có Identity Evidence:
  //    - Có Category / Structured intent: structuredWeight = 3.0, denseWeight = 1.0
  //    - Không có structured attribute (query trừu tượng/ngữ nghĩa): denseWeight = 2.5, structuredWeight = 1.0
  const lexicalWeight = 1.0
  let exactWeight = 0
  let prefixWeight = 0
  let tokenWeight = 0
  let denseWeight: number
  let structuredWeight: number

  if (hasIdentityEvidence || hasTokens) {
    exactWeight = hasExact ? 5.0 : 0
    prefixWeight = hasPrefix ? 3.0 : 0
    tokenWeight = hasTokens ? 4.0 : 0
    // Triệt tiêu nhánh thuộc tính khi truy vấn định danh tên riêng
    structuredWeight = 0.0
    denseWeight = 0.0
  } else {
    const hasCategoryAttr =
      intent.categories.length > 0 || intent.tags.length > 0 || intent.districts.length > 0
    if (hasCategoryAttr) {
      structuredWeight = 3.0
      denseWeight = 1.0
    } else {
      structuredWeight = 1.0
      denseWeight = 2.5
    }
  }

  const corpusSize = Number(corpusCountRows[0]?.count ?? 0)
  const egrfK = calculateEgrfK(corpusSize)

  const ranked = fuseRrf(
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
  if (ranked.length === 0) return { items: [], total: 0 }

  const rows = await prisma.$queryRaw<PlaceRow[]>(Prisma.sql`
    ${selectPlaces()}
    WHERE p.id IN (${Prisma.join(ranked.map((id) => Prisma.sql`${id}`))})
      AND ${Prisma.join(attrConditions, " AND ")}
    ORDER BY array_position(ARRAY[${Prisma.join(ranked.map((id) => Prisma.sql`${id}`))}]::text[], p.id)
  `)

  return { items: rows.map(toPlaceDto), total: rows.length }
}
