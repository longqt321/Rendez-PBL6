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
import { fuseRrf } from "./rrf"

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

  const [dense, lexicalRows, names, structuredRows] = await Promise.all([
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
  ])

  const nameMatched = names.exact.length > 0 || names.prefix.length > 0 || names.tokens.length > 0
  const structuredWeight = nameMatched ? 0 : 2

  const ranked = fuseRrf(
    { ids: lexicalRows.map((row) => row.id) },
    ...(dense ? [{ ids: dense.map((candidate) => candidate.id) }] : []),
    { ids: names.exact, weight: 5 },
    { ids: names.prefix, weight: 3 },
    { ids: names.tokens, weight: 4 },
    { ids: structuredRows, weight: structuredWeight },
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
