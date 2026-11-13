/**
 * Đo Recall@5 của hybrid search so với baseline lexical thuần trên bộ
 * golden query tiếng Việt.
 *
 * Golden set: mỗi query có một "nhãn kỳ vọng" — tập địa điểm liên quan định
 * nghĩa bằng thuộc tính khách quan trong DB (tag/category), KHÔNG phải kết quả
 * search tự kiểm chứng chính nó. Recall@5 = |top5 ∩ expected| / min(5, |expected|).
 *
 * Baseline lexical: cùng trigram similarity trên HAYSTACK như nhánh lexical
 * trong `lib/places.ts` (trước khi có hybrid) — để so sánh công bằng.
 *
 * Chạy: bun run scripts/eval-golden.ts
 */
import { Prisma } from "../generated/prisma/client"
import { prisma } from "../src/lib/prisma"
import { listPlaces, parsePlaceFilters } from "../src/lib/places"
import { embedQuery } from "../src/lib/embeddings"

interface GoldenQuery {
  q: string
  /** Nhãn kỳ vọng: tag hoặc `category:<tên>`. */
  expect: string
}

const GOLDEN: GoldenQuery[] = [
  { q: "quán cà phê yên tĩnh để học bài", expect: "Làm việc" },
  { q: "chỗ ngồi làm việc với laptop", expect: "Làm việc" },
  { q: "địa điểm hẹn hò buổi tối", expect: "Ngoài trời" },
  { q: "chỗ vui chơi cùng bạn bè cuối tuần", expect: "Ngoài trời" },
  { q: "quán nhậu tối với đồng nghiệp", expect: "Nhậu nhẹt" },
  { q: "quán ăn chay thanh đạm", expect: "Chay" },
  { q: "quán cà phê mang đi nhanh", expect: "Mang đi" },
  { q: "quán cà phê có chỗ ngồi ngoài trời", expect: "Ngồi ngoài trời" },
  { q: "đồ ngọt tráng miệng ngon", expect: "category:dessert" },
  { q: "quán bánh mì bánh ngọt", expect: "category:bakery" },
  { q: "quán bia nhậu nhẹt tối", expect: "category:bar" },
  { q: "cà phê làm việc ở Hải Châu", expect: "Làm việc" },
  { q: "quán ngon rẻ gần đây", expect: "category:street-food" },
  { q: "cà phê view đẹp check in", expect: "Ngoài trời" },
  { q: "quán ăn vặt đường phố", expect: "category:street-food" },
  { q: "trà sữa bánh ngọt ngào", expect: "category:dessert" },
]

const HAYSTACK = Prisma.sql`immutable_search_normalize(p.name || ' ' || p.address || ' ' || p.city || ' ' || coalesce(p.district, '') || ' ' || immutable_array_to_string(p.tags, ' '))`

/** Tập địa điểm "đúng" theo nhãn — từ thuộc tính DB, không từ kết quả search. */
async function expectedSet(expect: string): Promise<Set<string>> {
  const rows = expect.startsWith("category:")
    ? await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT id FROM places
          WHERE published_at IS NOT NULL AND deleted_at IS NULL AND category::text = ${expect.slice(9)}`)
    : await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT id FROM places
          WHERE published_at IS NOT NULL AND deleted_at IS NULL AND tags @> ARRAY[${expect}]::text[]`)
  return new Set(rows.map((r) => r.id))
}

/** Baseline lexical: trigram similarity trên HAYSTACK (hành vi trước hybrid). */
async function lexicalTop(q: string, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id FROM places p
    WHERE p.published_at IS NOT NULL AND p.deleted_at IS NULL AND p.status <> 'closed'
    ORDER BY similarity(${HAYSTACK}, immutable_search_normalize(${q})) DESC, p.created_at DESC, p.id DESC
    LIMIT ${limit}`)
  return rows.map((r) => r.id)
}

/** Recall@5 = |top5 ∩ expected| / min(5, |expected|); 0 khi expected rỗng. */
function recallAt5(top: string[], expected: Set<string>): number {
  if (expected.size === 0) return 0
  const denom = Math.min(5, expected.size)
  let hits = 0
  for (const id of top.slice(0, 5)) if (expected.has(id)) hits++
  return hits / denom
}

async function main() {
  let lexicalSum = 0
  let hybridSum = 0
  let hybridWins = 0
  const details: string[] = []

  for (const g of GOLDEN) {
    const expected = await expectedSet(g.expect)
    const lexical = await lexicalTop(g.q, 5)
    // Hybrid qua API thật của lib — `next: null` là hợp đồng của trang hybrid.
    const page = await listPlaces(parsePlaceFilters({ q: g.q }), null, 5)
    const hybridIds = page.items.map((p) => p.id)
    const lr = recallAt5(lexical, expected)
    const hr = recallAt5(hybridIds, expected)
    lexicalSum += lr
    hybridSum += hr
    if (hr > lr) hybridWins++
    details.push(
      `${hr >= lr ? "✓" : "✗"} [${g.q}] lexical=${lr.toFixed(2)} hybrid=${hr.toFixed(2)} expected=${expected.size}`,
    )
  }

  // Dense khả dụng? (encoder lỗi thì hybrid = lexical, điểm bằng nhau).
  const vec = await embedQuery("kiểm tra encoder")
  console.log(`encoder: ${vec ? "OK" : "LỖI (hybrid = lexical)"}`)
  console.log(details.join("\n"))
  console.log(
    `\nRecall@5 trung bình: lexical=${(lexicalSum / GOLDEN.length).toFixed(3)} hybrid=${(hybridSum / GOLDEN.length).toFixed(3)} (hybrid thắng ${hybridWins}/${GOLDEN.length} query)`,
  )
  process.exit(0)
}

void main()
