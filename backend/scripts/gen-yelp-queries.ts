/**
 * Sinh bộ query eval cho Yelp (track A — dataset chuẩn công cộng).
 *
 * QUY TRÌNH CHỐNG LỖI L-029 (selection bias) và L-028 (hallucination):
 * 1. Query viết TRƯỚC, không đụng lexicon tiếng Anh (chưa tồn tại) — tránh
 *    contamination kiểu v2 (92% query chứa cụm lexicon bắt trực tiếp).
 * 2. Ràng buộc NHIỀU CHIỀU (tag chính + thành phố hoặc + tag phụ), vì Yelp có
 *    10.5k venue — một chiều luôn cho hàng trăm kết quả.
 * 3. Tổ hợp được chọn theo QUY TẮC ĐỘ KHÓ ĐỊNH TRƯỚC: exact ∈ [5, 60].
 *    Tiêu chí này chỉ dùng metadata, KHÔNG dùng điểm search → không p-hacking.
 * 4. In phân bố trước khi freeze; chỉ ghi file khi đạt: median ∈ [10,40],
 *    tỉ lệ exact > 30 ≤ 25%, không có query 0 kết quả.
 *
 * Chạy: DATABASE_URL=<bench> bun run scripts/gen-yelp-queries.ts
 * Xuất: backend/data/eval/search-eval-yelp.json
 */
import { Prisma } from "../generated/prisma/client"
import { prisma } from "../src/lib/prisma"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

interface Constraints {
  category?: string[]
  tagsAll?: string[]
  tagsAny?: string[]
  city?: string[]
}

interface EvalQuery {
  id: string
  intent: string
  variant: string
  query: string
  constraints: Constraints
}

/** Cụm từ tự nhiên cho tag Yelp — người dùng KHÔNG gõ đúng tên tag. */
const PHRASE: Record<string, string> = {
  Pizza: "pizza",
  Mexican: "mexican food",
  Japanese: "japanese food",
  Vietnamese: "vietnamese food",
  Thai: "thai food",
  Indian: "indian food",
  Korean: "korean food",
  Chinese: "chinese food",
  Italian: "italian food",
  Seafood: "seafood",
  Steakhouses: "steak",
  Barbeque: "barbecue",
  Burgers: "burgers",
  "Chicken Wings": "chicken wings",
  Sandwiches: "sandwiches",
  Salad: "salad",
  Delis: "deli sandwiches",
  Ramen: "ramen",
  Noodles: "noodles",
  "Bubble Tea": "bubble tea",
  Cheesesteaks: "cheesesteak",
  "Food Trucks": "food truck",
  Vegetarian: "vegetarian food",
  Vegan: "vegan food",
  Desserts: "dessert",
  Bakeries: "bakery",
  Donuts: "donuts",
  "Ice Cream & Frozen Yogurt": "ice cream",
  "Breakfast & Brunch": "breakfast",
  "Coffee & Tea": "coffee",
  "Cocktail Bars": "cocktail bar",
  "Sports Bars": "sports bar",
  Pubs: "pub",
  Breweries: "brewery",
  "Wine Bars": "wine bar",
  "Dive Bars": "dive bar",
  "Fast Food": "fast food",
  Diners: "diner",
  Soup: "soup",
  Bagels: "bagels",
  "Hot Dogs": "hot dogs",
  "Gluten-Free": "gluten free food",
  "Juice Bars & Smoothies": "smoothie",
}

/** Modifier dạng tag phụ — thêm chiều thứ ba cho ràng buộc. */
const MODIFIERS: readonly { tag: string; phrase: string }[] = [
  { tag: "Takeout", phrase: "for takeout" },
  { tag: "Outdoor Seating", phrase: "with outdoor seating" },
  { tag: "Wifi", phrase: "with wifi" },
  { tag: "Good for Groups", phrase: "good for groups" },
  { tag: "Happy Hour", phrase: "with happy hour" },
  { tag: "Reservations", phrase: "taking reservations" },
  { tag: "Waiter Service", phrase: "with table service" },
  { tag: "Alcohol", phrase: "serving alcohol" },
]

const CITIES = ["Philadelphia", "Tucson"] as const

/** Ba cách diễn đạt cho cùng một ràng buộc — kiểm ổn định theo cách gõ. */
function variantsFor(mainPhrase: string, suffix: string, city: string | null): string[] {
  if (city) {
    return [`${mainPhrase} in ${city}`, `best ${mainPhrase} ${city}`, `${city} ${mainPhrase}`]
  }
  return [
    `${mainPhrase} ${suffix}`,
    `good ${mainPhrase} ${suffix}`,
    `where to get ${mainPhrase} ${suffix}`,
  ]
}

async function countExact(c: Constraints): Promise<number> {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p.published_at IS NOT NULL`,
    Prisma.sql`p.deleted_at IS NULL`,
    Prisma.sql`p.status <> 'closed'`,
  ]
  if (c.category?.length) parts.push(Prisma.sql`p.category::text IN (${Prisma.join(c.category)})`)
  if (c.tagsAll?.length) parts.push(Prisma.sql`p.tags @> ARRAY[${Prisma.join(c.tagsAll)}]::text[]`)
  if (c.tagsAny?.length) parts.push(Prisma.sql`p.tags && ARRAY[${Prisma.join(c.tagsAny)}]::text[]`)
  if (c.city?.length) parts.push(Prisma.sql`p.city IN (${Prisma.join(c.city)})`)
  const rows = await prisma.$queryRaw<{ n: bigint }[]>(
    Prisma.sql`SELECT count(*)::bigint AS n FROM places p WHERE ${Prisma.join(parts, " AND ")}`,
  )
  return Number(rows[0]?.n ?? 0)
}

/** Quy tắc độ khó định trước — chỉ dùng metadata, không dùng điểm search.
 *  MAX_EXACT = 30 nghĩa là mọi query có ≤30 venue thoả → "dễ chạm trần" chỉ còn
 *  ở mức nhỏ, buộc hệ thống phải xếp hạng thật trong top-5/top-10. */
const MIN_EXACT = 5
const MAX_EXACT = 30

async function main(): Promise<void> {
  const candidates: { intent: string; constraints: Constraints }[] = []
  const seen = new Set<string>()

  const push = (intent: string, c: Constraints, exact: number): void => {
    const key = JSON.stringify(c)
    if (seen.has(key)) return
    if (exact < MIN_EXACT || exact > MAX_EXACT) return
    seen.add(key)
    candidates.push({ intent, constraints: c })
  }

  // Nhóm 1: tag chính + thành phố (2 chiều).
  for (const tag of Object.keys(PHRASE)) {
    for (const city of CITIES) {
      const c: Constraints = { tagsAll: [tag], city: [city] }
      const exact = await countExact(c)
      push(`${tag.toLowerCase()}-${city.toLowerCase()}`, c, exact)
    }
  }

  // Nhóm 2: tag chính + modifier tag phụ (2 chiều, phủ ý định thuộc tính).
  for (const [tag] of Object.entries(PHRASE)) {
    for (const mod of MODIFIERS) {
      const c: Constraints = { tagsAll: [tag, mod.tag] }
      const exact = await countExact(c)
      push(`${tag.toLowerCase()}-${mod.tag.toLowerCase().replace(/\s+/g, "-")}`, c, exact)
    }
  }

  // Nhóm 3: category + modifier (kiểm nhánh structured theo category).
  for (const category of ["cafe", "bar", "bakery", "restaurant"] as const) {
    for (const mod of MODIFIERS) {
      const c: Constraints = { category: [category], tagsAll: [mod.tag] }
      const exact = await countExact(c)
      push(`${category}-${mod.tag.toLowerCase().replace(/\s+/g, "-")}`, c, exact)
    }
  }

  // Sinh 2 variant diễn đạt cho mỗi tổ hợp đã chọn (cùng ràng buộc, cách gõ khác).
  const withVariants: EvalQuery[] = []
  for (const cand of candidates) {
    const tag = cand.constraints.tagsAll?.[0] ?? ""
    const category = cand.constraints.category?.[0]
    // Nhóm 3 (category + modifier) không có tag chính trong PHRASE → dùng tên category.
    const phrase = PHRASE[tag] ?? category ?? tag
    const city = cand.constraints.city?.[0] ?? null
    const modTag = cand.constraints.tagsAll?.[1]
    const modPhrase = MODIFIERS.find((m) => m.tag === modTag)?.phrase ?? ""
    const all = variantsFor(phrase, modPhrase, city).map((q) => q.replace(/\s+/g, " ").trim())
    for (const [i, query] of all.slice(0, 2).entries()) {
      withVariants.push({
        id: `yelp-${withVariants.length + 1}`,
        intent: cand.intent,
        variant: `v${i + 1}`,
        query,
        constraints: cand.constraints,
      })
    }
  }

  // Kiểm phân bố TRƯỚC khi freeze (L-029).
  const counts: string[] = []
  const exactCounts: number[] = []
  for (const q of withVariants) {
    const n = await countExact(q.constraints)
    exactCounts.push(n)
    counts.push(`${q.id} ${q.intent.padEnd(28)} exact=${String(n).padStart(4)}  ${q.query}`)
  }
  const sorted = [...exactCounts].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const over30 = exactCounts.filter((n) => n > 30).length
  const zero = exactCounts.filter((n) => n === 0).length

  console.log(counts.join("\n"))
  console.log(
    `\nTổng ${withVariants.length} query | median=${median} | >30: ${over30} (${Math.round((over30 / withVariants.length) * 100)}%) | zero=${zero}`,
  )
  const pass = median >= 10 && median <= 40 && over30 / withVariants.length <= 0.25 && zero === 0
  console.log(`Kiểm phân bố: ${pass ? "ĐẠT" : "KHÔNG ĐẠT"}`)

  if (pass) {
    const out = join(import.meta.dir, "..", "data", "eval", "search-eval-yelp.json")
    writeFileSync(out, `${JSON.stringify({ version: "yelp-1", queries: withVariants }, null, 2)}\n`)
    console.log(`\nĐã ghi ${out} (${withVariants.length} query)`)
  } else {
    console.log("\nKHÔNG ghi file — phải thiết kế lại ràng buộc.")
  }
  process.exit(pass ? 0 : 2)
}

void main()
