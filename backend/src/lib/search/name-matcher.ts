import { Prisma } from "../../../generated/prisma/client"
import { prisma } from "../prisma"

export const NAME_HAYSTACK = Prisma.sql`immutable_search_normalize(p.name)`

export async function nameCandidates(
  normalizedQuery: string,
  attrConditions: Prisma.Sql[],
  poolLimit: number,
): Promise<{ exact: string[]; prefix: string[]; tokens: string[] }> {
  const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 0)
  const tokenConditions = queryTokens.map(
    (t) => Prisma.sql`${NAME_HAYSTACK} LIKE '%' || immutable_search_normalize(${t}) || '%'`,
  )

  const [exactRows, prefixRows, tokenRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM places p
      WHERE ${Prisma.join(attrConditions, " AND ")}
        AND ${NAME_HAYSTACK} = immutable_search_normalize(${normalizedQuery})
      LIMIT ${poolLimit}
    `),
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM places p
      WHERE ${Prisma.join(attrConditions, " AND ")}
        AND ${NAME_HAYSTACK} LIKE immutable_search_normalize(${normalizedQuery}) || '%'
        AND ${NAME_HAYSTACK} <> immutable_search_normalize(${normalizedQuery})
      ORDER BY length(${NAME_HAYSTACK}) ASC
      LIMIT ${poolLimit}
    `),
    queryTokens.length > 1
      ? prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT p.id
          FROM places p
          WHERE ${Prisma.join(attrConditions, " AND ")}
            AND ${Prisma.join(tokenConditions, " AND ")}
          ORDER BY abs(length(${NAME_HAYSTACK}) - length(immutable_search_normalize(${normalizedQuery}))) ASC
          LIMIT ${poolLimit}
        `)
      : Promise.resolve([]),
  ])

  return {
    exact: exactRows.map((r) => r.id),
    prefix: prefixRows.map((r) => r.id),
    tokens: tokenRows.map((r) => r.id),
  }
}
