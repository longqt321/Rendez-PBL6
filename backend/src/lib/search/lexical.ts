import { Prisma } from "../../../generated/prisma/client"
import { normalizeSearchText, synonymVariants } from "../search-synonyms"
import { NAME_HAYSTACK } from "./name-matcher"

export const HAYSTACK = Prisma.sql`immutable_search_normalize(p.name || ' ' || p.address || ' ' || p.city || ' ' || coalesce(p.district, '') || ' ' || coalesce((SELECT string_agg(t.name, ' ' ORDER BY pt.position) FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = p.id), ''))`
export const COMPACT_HAYSTACK = Prisma.sql`replace(${HAYSTACK}, ' ', '')`

export const QUERY_STOPWORDS = new Set([
  "a",
  "the",
  "in",
  "at",
  "near",
  "me",
  "my",
  "with",
  "for",
  "of",
  "to",
  "and",
  "or",
  "is",
  "are",
  "be",
  "on",
  "by",
  "from",
  "where",
  "what",
  "get",
  "some",
  "something",
  "good",
  "best",
  "great",
  "nice",
  "top",
  "cheap",
  "place",
  "places",
  "spot",
  "spots",
  "tonight",
  "dinner",
  "lunch",
  "o",
  "tai",
  "gan",
  "nao",
  "gi",
  "khong",
  "va",
  "voi",
  "de",
  "thi",
  "mot",
  "nhung",
  "cac",
  "toi",
  "minh",
  "rat",
  "cung",
  "hay",
  "ngon",
  "quan",
  "tot",
])

export function likeCondition(haystack: Prisma.Sql, keyword: string): Prisma.Sql {
  const pattern = Prisma.sql`'%' || immutable_search_normalize(${keyword}) || '%'`
  return Prisma.sql`${haystack} LIKE ${pattern}`
}

export function keywordCondition(keyword: string): Prisma.Sql {
  const variants = [keyword, ...synonymVariants(normalizeSearchText(keyword))]
  const unique = [...new Set(variants)]
  return Prisma.sql`(${Prisma.join(
    unique.map((variant) => likeCondition(HAYSTACK, variant)),
    " OR ",
  )})`
}

export function searchTokenCondition(token: string): Prisma.Sql {
  const variants = [token, ...synonymVariants(normalizeSearchText(token))]
  const unique = [...new Set(variants)]
  return Prisma.sql`(${Prisma.join(
    unique.map(
      (variant) =>
        Prisma.sql`(${likeCondition(HAYSTACK, variant)} OR ${likeCondition(COMPACT_HAYSTACK, variant)})`,
    ),
    " OR ",
  )})`
}

export function searchCondition(query: string): Prisma.Sql {
  const normalized = normalizeSearchText(query)
  const allTokens = normalized.split(" ").filter((token) => token.length > 0)
  if (allTokens.length === 0) return Prisma.sql`TRUE`
  const meaningful = allTokens.filter((token) => !QUERY_STOPWORDS.has(token))
  const tokens = meaningful.length > 0 ? meaningful : allTokens
  const tokenConds = tokens.map(searchTokenCondition)
  const base = Prisma.sql`(${Prisma.join(tokenConds, " AND ")})`

  const phraseVariants = synonymVariants(normalized)
  if (phraseVariants.length === 0) return base

  const alternatives = phraseVariants.map((variant) => {
    const variantTokens = variant
      .split(" ")
      .filter((token) => token.length > 0 && !QUERY_STOPWORDS.has(token))
    if (variantTokens.length === 0) return null
    return Prisma.sql`(${Prisma.join(variantTokens.map(searchTokenCondition), " AND ")})`
  })
  const validAlternatives = alternatives.filter((item): item is Prisma.Sql => item !== null)
  if (validAlternatives.length === 0) return base
  return Prisma.sql`(${base} OR ${Prisma.join(validAlternatives, " OR ")})`
}

export function fieldBoostedLexicalRank(variants: string[]): Prisma.Sql {
  const nameScores = variants.map(
    (v) => Prisma.sql`similarity(${NAME_HAYSTACK}, immutable_search_normalize(${v})) * 3`,
  )
  const haystackScores = variants.map(
    (v) => Prisma.sql`similarity(${HAYSTACK}, immutable_search_normalize(${v}))`,
  )
  return Prisma.sql`GREATEST(${Prisma.join([...nameScores, ...haystackScores], ", ")})`
}
