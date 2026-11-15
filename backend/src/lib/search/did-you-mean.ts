import { normalizeSearchText } from "../search-synonyms"
import { prisma } from "../prisma"
import { Prisma } from "../../../generated/prisma/client"

export async function findDidYouMean(query: string): Promise<string | null> {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.replace(/ /g, "").length < 5) return null
  const rows = await prisma.$queryRaw<{ name: string }[]>(Prisma.sql`
    SELECT p.name
    FROM places p
    WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
      AND immutable_search_normalize(p.name) <> ${normalizedQuery}
      AND similarity(
            immutable_search_normalize(p.name),
            immutable_search_normalize(${query})
          ) >= 0.45
    ORDER BY similarity(
               immutable_search_normalize(p.name),
               immutable_search_normalize(${query})
             ) DESC, p.id ASC
    LIMIT 1
  `)
  return rows[0]?.name ?? null
}
