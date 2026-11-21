import { embedQuery, vectorToLiteral } from "../embeddings"
import { prisma } from "../prisma"
import { logger } from "../logger"
import { Prisma } from "../../../generated/prisma/client"

export interface DenseCandidate {
  id: string
}

export async function denseCandidates(
  query: string,
  limit: number,
  attrConditions?: Prisma.Sql[],
): Promise<DenseCandidate[] | null> {
  const vec = await embedQuery(query)
  if (!vec) return null
  const vecLiteral = vectorToLiteral(vec)
  const conditions =
    attrConditions && attrConditions.length > 0
      ? attrConditions
      : [
          Prisma.sql`p.published_at IS NOT NULL`,
          Prisma.sql`p.status <> 'closed'`,
          Prisma.sql`p.deleted_at IS NULL`,
        ]
  try {
    const rows = await prisma.$queryRaw<{ place_id: string }[]>(Prisma.sql`
      SELECT pe.place_id
      FROM place_embeddings pe
      JOIN places p ON p.id = pe.place_id
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY pe.embedding <=> ${vecLiteral}::vector
      LIMIT ${limit}
    `)
    return rows.map((row) => ({ id: row.place_id }))
  } catch (err) {
    logger.warn({ err }, "dense search thất bại, fallback lexical")
    return null
  }
}
