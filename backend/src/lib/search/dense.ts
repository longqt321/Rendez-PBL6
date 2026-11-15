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
): Promise<DenseCandidate[] | null> {
  const vec = await embedQuery(query)
  if (!vec) return null
  const vecLiteral = vectorToLiteral(vec)
  try {
    const rows = await prisma.$queryRaw<{ place_id: string }[]>(Prisma.sql`
      SELECT pe.place_id
      FROM place_embeddings pe
      JOIN places p ON p.id = pe.place_id
      WHERE p.published_at IS NOT NULL AND p.status <> 'closed' AND p.deleted_at IS NULL
      ORDER BY pe.embedding <=> ${vecLiteral}::vector
      LIMIT ${limit}
    `)
    return rows.map((row) => ({ id: row.place_id }))
  } catch (err) {
    logger.warn({ err }, "dense search thất bại, fallback lexical")
    return null
  }
}
