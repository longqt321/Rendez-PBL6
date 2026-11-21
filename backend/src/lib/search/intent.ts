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

  const tagOverlap =
    tags.length > 0
      ? Prisma.sql`(SELECT count(*) FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = p.id AND t.name = ANY(ARRAY[${Prisma.join(tags)}]::text[]))`
      : Prisma.sql`0`

  const matches: Prisma.Sql[] = []
  const scoreParts: Prisma.Sql[] = [tagOverlap]

  if (categories.length > 0) {
    const cond = Prisma.sql`p.category::text IN (${Prisma.join(categories)})`
    matches.push(cond)
    scoreParts.push(Prisma.sql`CASE WHEN ${cond} THEN 2 ELSE 0 END`)
  }
  if (tags.length > 0) {
    matches.push(
      Prisma.sql`EXISTS (SELECT 1 FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = p.id AND t.name = ANY(ARRAY[${Prisma.join(tags)}]::text[]))`,
    )
  }
  if (districts.length > 0) {
    const cond = Prisma.sql`p.district IN (${Prisma.join(districts)})`
    matches.push(cond)
    scoreParts.push(Prisma.sql`CASE WHEN ${cond} THEN 2 ELSE 0 END`)
  }
  if (alwaysOpen) {
    const cond = Prisma.sql`p.opening_hours = '24/7'`
    matches.push(cond)
    scoreParts.push(Prisma.sql`CASE WHEN ${cond} THEN 2 ELSE 0 END`)
  }
  if (matches.length >= 2) {
    scoreParts.push(Prisma.sql`CASE WHEN (${Prisma.join(matches, " AND ")}) THEN 10 ELSE 0 END`)
  }

  const totalScore = Prisma.join(scoreParts, " + ")

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id, (${totalScore}) AS overlap
      FROM places p
      WHERE ${Prisma.join(attrConditions, " AND ")}
        AND (${Prisma.join(matches, " OR ")})
      ORDER BY (${totalScore}) DESC, p.published_at DESC NULLS LAST, p.id ASC
      LIMIT ${limit}
    `)
    return rows.map((row) => row.id)
  } catch (err) {
    logger.warn({ err }, "structured retrieval thất bại, bỏ nhánh này")
    return []
  }
}
