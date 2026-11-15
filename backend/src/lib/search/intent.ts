import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"
import { detectIntentAttributes } from "../intent-lexicon"
import { logger } from "../logger"

export async function structuredCandidates(
  intent: ReturnType<typeof detectIntentAttributes>,
  attrConditions: Prisma.Sql[],
  limit: number,
): Promise<string[]> {
  const { tags, categories, districts, alwaysOpen } = intent
  if (tags.length === 0 && categories.length === 0 && districts.length === 0 && !alwaysOpen)
    return []

  const matches: Prisma.Sql[] = []
  if (categories.length > 0)
    matches.push(Prisma.sql`p.category::text IN (${Prisma.join(categories)})`)
  if (tags.length > 0) matches.push(Prisma.sql`p.tags && ARRAY[${Prisma.join(tags)}]::text[]`)
  if (districts.length > 0) matches.push(Prisma.sql`p.district IN (${Prisma.join(districts)})`)
  if (alwaysOpen) matches.push(Prisma.sql`p.opening_hours = '24/7'`)

  const tagOverlap =
    tags.length > 0
      ? Prisma.sql`(SELECT count(*) FROM unnest(p.tags) AS t(tag) WHERE t.tag = ANY(ARRAY[${Prisma.join(tags)}]::text[]))`
      : Prisma.sql`0`

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id, ${tagOverlap} AS overlap
      FROM places p
      WHERE ${Prisma.join(attrConditions, " AND ")}
        AND (${Prisma.join(matches, " OR ")})
      ORDER BY overlap DESC, p.published_at DESC NULLS LAST, p.id ASC
      LIMIT ${limit}
    `)
    return rows.map((row) => row.id)
  } catch (err) {
    logger.warn({ err }, "structured retrieval thất bại, bỏ nhánh này")
    return []
  }
}
