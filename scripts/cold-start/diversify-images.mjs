#!/usr/bin/env node
/**
 * Pha D — đa dạng hoá ảnh món đại diện từ Wikimedia Commons (giấy phép mở).
 *
 * Hiện trạng: 929/939 quán cafe dùng chung 1 file `cafe.jpg`. Script tải ảnh
 * theo từng phân loại (mỗi phân loại nhiều query), lưu vào `images/dishes/`,
 * rồi gán theo vòng tròn — mỗi ảnh dùng tối đa MAX_REUSE lần. Không bịa ảnh
 * quán: vẫn là `imageKind: "dish"`, CREDITS ghi nguồn Commons.
 *
 * Openverse bị quá tải (504) nên dùng Commons API — ổn định và giấy phép rõ.
 * Chạy: node scripts/cold-start/diversify-images.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const dishDir = join(dataDir, "images/dishes")
const cacheFile = join(dataDir, ".cache/commons-images.json")
/**
 * Từ khoá bắt buộc có trong TIÊU ĐỀ file Commons để ảnh được coi là đúng nhóm.
 * Audit thị giác 2026-11-10 cho thấy query trả về ảnh lệch nhóm (pizza cho quán
 * phở, bánh quy cho bún…) — lọc theo tiêu đề loại bỏ phần lớn lệch này.
 */
const CATEGORY_KEYWORDS = {
  cafe: /coffee|cafe|cappuccino|latte|espresso|tea|smoothie|juice|drink|beverage|matcha|bubble/i,
  "quan-an": /rice|meal|plate|restaurant|com tam|food|dish|pork|chicken|beef|noodle/i,
  "an-vat": /snack|banh mi|sandwich|spring roll|roll|skewer|dumpling|fried|grill/i,
  "hai-san": /seafood|shrimp|prawn|crab|squid|clam|oyster|fish|mussel|scallop|lobster/i,
  banh: /cake|banh|crepe|pancake|dessert|pastry|bun|steamed/i,
  pho: /pho|noodle soup|beef noodle|noodle/i,
  "mi-quang": /mi quang|turmeric|noodle/i,
  bun: /vermicelli|bun|noodle|rice noodle/i,
  com: /chicken rice|rice plate|broken rice|com ga|rice/i,
  chay: /vegetarian|vegan|tofu|vegetable/i,
  "banh-mi": /banh mi|baguette|sandwich/i,
  "banh-ngot": /dessert|sweet|che |pudding|cake/i,
  han: /korean|bibimbap|kimchi|barbecue|bbq/i,
  y: /pasta|pizza|spaghetti|lasagna|italian/i,
  "viet-nam": /vietnamese|rice|noodle|dish|meal/i,
  khac: /food|dish|plate|meal|noodle|rice/i,
  "banh-xeo": /banh xeo|crepe|pancake/i,
  "bun-cha-ca": /fish cake|fish ball|noodle|bun/i,
  "banh-trang-thit-heo": /rice paper|roll|pork/i,
  "bun-mam-nem": /bun mam|vermicelli|fish sauce|noodle/i,
}

/** Pool ảnh chung (món Á/đĩa ăn) — chỉ dùng khi nhóm không có ảnh nào đạt. */
const GENERIC_CATEGORY = "khac"

const MAX_REUSE = 6
const IMAGES_PER_QUERY = 6
const CONCURRENT_DOWNLOADS = 6

/**
 * Chặn ảnh rác ngay từ nguồn theo tiêu đề file Commons. Audit thị giác
 * 2026-11-10 cho thấy query "coffee shop" trả về biển hiệu, logo, bưu thiếp,
 * nội thất, tranh vẽ, panorama — không dùng làm ảnh món được.
 */
const BAD_TITLE_RE =
  /(sign|logo|neon|postcard|poster|interior|exterior|storefront|facade|building|menu|map|painting|drawing|still life|panoram|panorama|360|stamp|label|bottle|vintage|1900|19[0-5]\d|advertis|brochure|book|page[ _-]1|djvu|scanned|archive|soldier|war|street view|entrance|bar counter|diner|kiosk|souvenir|gift shop)/i

/** Query ảnh theo phân loại — mỗi phân loại nhiều query để đa dạng. */
const QUERIES_BY_CATEGORY = {
  cafe: ["vietnamese iced coffee", "egg coffee vietnam", "cappuccino cup", "latte art", "coffee cup drink", "iced coffee glass", "espresso cup", "milk coffee glass", "iced tea lemon", "smoothie glass", "matcha latte", "bubble tea"],
  "quan-an": ["vietnamese restaurant food", "vietnamese street food", "com tam", "vietnamese rice dish", "vietnamese meal table", "rice plate egg", "grilled pork rice"],
  "an-vat": ["vietnamese street snack", "banh mi", "vietnamese snack food", "spring rolls vietnam", "fried spring rolls plate", "vietnamese dumpling", "grilled skewer"],
  "hai-san": ["seafood grill", "grilled shrimp dish", "seafood plate", "clams dish", "steamed crab plate", "grilled squid dish", "oyster dish", "seafood hotpot"],
  banh: ["vietnamese cake", "banh bao", "vietnamese dessert", "banh xeo", "vietnamese crepe", "steamed rice cake"],
  pho: ["pho bowl", "vietnamese noodle soup", "beef noodle soup bowl", "pho ga"],
  "mi-quang": ["mi quang", "vietnamese noodles turmeric", "turmeric noodle bowl"],
  bun: ["bun bo hue", "vermicelli bowl vietnam", "rice vermicelli salad", "bun rieu"],
  com: ["com ga", "chicken rice plate", "broken rice plate"],
  chay: ["vegetarian vietnamese food", "tofu dish", "vegetarian noodle bowl", "vegan asian dish"],
  "banh-mi": ["banh mi sandwich", "banh mi", "vietnamese baguette sandwich"],
  "banh-ngot": ["vietnamese dessert", "che vietnamese", "sweet soup dessert", "vietnamese pudding"],
  han: ["korean food", "korean barbecue", "bibimbap bowl", "korean fried chicken"],
  y: ["pasta dish", "italian pizza", "spaghetti plate", "lasagna dish"],
  "viet-nam": ["vietnamese food plate", "vietnamese meal", "vietnamese home cooking", "vietnamese stir fry"],
  khac: ["restaurant food plate", "asian food dish", "noodle bowl asian", "rice dish asian"],
  "banh-xeo": ["banh xeo", "vietnamese pancake", "crispy vietnamese crepe"],
  "bun-cha-ca": ["bun cha ca", "fish cake noodle vietnam", "fish ball soup noodle"],
  "banh-trang-thit-heo": ["vietnamese pork rolls", "rice paper rolls", "vietnamese rice paper pork"],
  "bun-mam-nem": ["bun mam", "vietnamese fermented fish noodle", "vermicelli fish sauce bowl"],
}

const cache = existsSync(cacheFile) ? JSON.parse(await readFile(cacheFile, "utf8")) : {}

/** URL ảnh rác đã audit — không tải lại (clean-images.mjs ghi vào đây). */
const blocklistPath = join(dataDir, ".cache/image-blocklist.json")
const blocklist = new Set(
  existsSync(blocklistPath) ? JSON.parse(await readFile(blocklistPath, "utf8")) : [],
)

/** Lấy ảnh từ Commons cho 1 query; trả [{url, title, pageUrl}]. */
async function fetchCommons(query) {
  if (cache[query]) return cache[query]
  const url = new URL("https://commons.wikimedia.org/w/api.php")
  url.searchParams.set("action", "query")
  url.searchParams.set("generator", "search")
  url.searchParams.set("gsrsearch", query)
  url.searchParams.set("gsrnamespace", "6")
  url.searchParams.set("gsrlimit", String(IMAGES_PER_QUERY * 2))
  url.searchParams.set("prop", "imageinfo")
  url.searchParams.set("iiprop", "url|extmetadata|mime")
  url.searchParams.set("iiurlwidth", "800")
  url.searchParams.set("format", "json")
  const res = await fetch(url, {
    headers: { "User-Agent": "danang-food-map/1.0 (cold-start data pipeline)" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Commons HTTP ${res.status}`)
  const json = await res.json()
  const images = Object.values(json.query?.pages ?? {})
    .map((page) => {
      const info = page.imageinfo?.[0]
      if (!info) return null
      // Chỉ nhận ảnh tĩnh; bỏ SVG/PDF và ảnh có tiêu đề rác (biển hiệu, logo…).
      if (!info.mime?.startsWith("image/") || info.mime === "image/svg+xml") return null
      if (BAD_TITLE_RE.test(page.title)) return null
      return {
        url: info.thumburl ?? info.url,
        title: page.title,
        pageUrl: info.descriptionurl,
      }
    })
    .filter(Boolean)
    .slice(0, IMAGES_PER_QUERY)
  cache[query] = images
  // Commons giới hạn tốc độ (429 nếu dày hơn ~1 req/s).
  await new Promise((resolve) => setTimeout(resolve, 1100))
  return images
}

/**
 * Kiểm chất lượng file ảnh bằng ImageMagick (đã có sẵn trên hệ thống):
 * loại ảnh quá nhỏ, tỉ lệ dẹt (panorama/scan) hoặc gần trắng/trơn.
 */
function imageQualityOk(file) {
  try {
    const out = execFileSync(
      "identify",
      ["-quiet", "-format", "%w %h %[fx:standard_deviation]", file],
      { timeout: 10_000 },
    ).toString()
    const [w, h, std] = out.trim().split(/\s+/).map(Number)
    if (w < 300 || h < 300) return false
    const aspect = w / h
    if (aspect > 1.8 || aspect < 0.55) return false
    if (std < 0.05) return false
    return true
  } catch {
    return false
  }
}

// 1. Tải metadata cho từng phân loại.
const poolByCategory = {}
for (const [category, queries] of Object.entries(QUERIES_BY_CATEGORY)) {
  const pool = []
  for (const query of queries) {
    try {
      pool.push(...(await fetchCommons(query)))
    } catch (error) {
      console.error(`  Lỗi query "${query}": ${error.message}`)
    }
  }
  // Chỉ giữ ảnh có tiêu đề khớp nhóm và chưa bị đánh dấu rác.
  const keyword = CATEGORY_KEYWORDS[category]
  const filtered = pool.filter(
    (img) => !blocklist.has(img.pageUrl) && (!keyword || keyword.test(img.title)),
  )
  poolByCategory[category] = filtered
  console.log(`${category}: ${filtered.length}/${pool.length} ảnh khớp nhóm`)
}

// 2. Tải file ảnh về đĩa (idempotent), tải song song có giới hạn.
await mkdir(dishDir, { recursive: true })
const allUrls = [...new Set(Object.values(poolByCategory).flat().map((img) => img.url))]
const downloaded = {}
let done = 0
async function download(url) {
  // Tên file theo hash URL — định danh ổn định giữa các lần chạy, giúp danh sách
  // audit/blocklist không bị lệch khi số lượng URL thay đổi.
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 12)
  const file = `images/dishes/dish-${hash}.jpg`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "danang-food-map/1.0 (cold-start data pipeline)" },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 5_000) throw new Error("file quá nhỏ")
    const { writeFile: wf } = await import("node:fs/promises")
    const target = join(dataDir, file)
    await wf(target, buf)
    if (!imageQualityOk(target)) {
      const { unlink } = await import("node:fs/promises")
      await unlink(target)
      throw new Error("chất lượng ảnh không đạt (kích thước/tỉ lệ/độ tương phản)")
    }
    downloaded[url] = { file, url }
  } catch (error) {
    console.error(`  Lỗi tải ${url}: ${error.message}`)
  }
  done++
  if (done % 20 === 0) console.log(`  đã tải ${done}/${allUrls.length}`)
}
for (let i = 0; i < allUrls.length; i += CONCURRENT_DOWNLOADS) {
  await Promise.all(allUrls.slice(i, i + CONCURRENT_DOWNLOADS).map(download))
}
console.log(`Đã tải ${Object.keys(downloaded).length}/${allUrls.length} ảnh vào images/dishes/`)

// 3. Gán ảnh theo vòng tròn, tối đa MAX_REUSE lần/ảnh.
const places = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))
/** Pool chung — chỉ món Á/đĩa ăn (nhóm `khac`), chấp nhận được cho mọi quán. */
const genericPool = poolByCategory[GENERIC_CATEGORY] ?? []
const useCount = {}
const assignments = []
// `--rebalance`: gán lại toàn bộ ảnh món từ pool đầy đủ (sau khi bổ sung ảnh mới)
// để tận dụng hết ảnh distinct thay vì giữ ảnh đã gán ở lần chạy trước.
const REBALANCE = process.argv.includes("--rebalance")
if (REBALANCE) {
  for (const p of places.places) {
    if (p.image?.startsWith("images/dishes/")) {
      p.image = null
      p.imageKind = null
    }
  }
}
for (const p of places.places) {
  // Giữ ảnh thật của quán (venues/) và ảnh món đã đa dạng hoá (dishes/); mọi ảnh
  // cũ dùng chung theo nhóm (images/cafe.jpg, images/pho.jpg…) đều thay lại.
  if (p.image?.startsWith("images/venues/") || p.image?.startsWith("images/dishes/")) continue
  // Ưu tiên pool đúng nhóm; nhóm không có ảnh đạt thì dùng pool chung; hết hẳn
  // thì để null — UI tự render ảnh minh hoạ theo seed.
  const categoryPool = poolByCategory[p.category] ?? []
  const pool = categoryPool.length ? categoryPool : genericPool
  const candidates = pool
    .map((img) => downloaded[img.url])
    .filter(Boolean)
    .sort((a, b) => (useCount[a.file] ?? 0) - (useCount[b.file] ?? 0))
  const chosen = candidates[0]
  if (!chosen || (useCount[chosen.file] ?? 0) >= MAX_REUSE) continue // hết ảnh tốt → để null
  useCount[chosen.file] = (useCount[chosen.file] ?? 0) + 1
  p.image = chosen.file
  p.imageKind = "dish"
  const meta = pool.find((img) => img.url === chosen.url)
  assignments.push({ id: p.id, image: chosen.file, credit: meta?.pageUrl ?? chosen.url })
}

const reuse = Object.values(useCount)
console.log(
  `Đã gán ${assignments.length} ảnh | ảnh distinct dùng: ${Object.keys(useCount).length} | lặp tối đa: ${Math.max(0, ...reuse)} lần`,
)

await writeFile(join(dataDir, "places.json"), JSON.stringify(places, null, 2))
await mkdir(dirname(cacheFile), { recursive: true })
await writeFile(cacheFile, JSON.stringify(cache, null, 2))
await writeFile(join(dataDir, ".cache/image-assignments.json"), JSON.stringify(assignments, null, 2))

// Bảng credits TÍCH LUỸ theo file ảnh (mỗi lần chạy chỉ gán một phần nên không
// thể dùng `assignments` của riêng lần cuối để sinh CREDITS).
const creditsPath = join(dataDir, ".cache/image-credits.json")
const credits = existsSync(creditsPath) ? JSON.parse(await readFile(creditsPath, "utf8")) : {}
for (const assignment of assignments) credits[assignment.image] = assignment.credit

// Bảng file → trang nguồn cho MỌI ảnh đã tải (kể cả ảnh không được gán lần này).
const sourcesPath = join(dataDir, ".cache/dish-sources.json")
const sources = existsSync(sourcesPath) ? JSON.parse(await readFile(sourcesPath, "utf8")) : {}
for (const img of Object.values(poolByCategory).flat()) {
  const file = downloaded[img.url]?.file
  if (file) sources[file] = img.pageUrl ?? img.url
}
for (const [file, pageUrl] of Object.entries(sources)) credits[file] ??= pageUrl

await writeFile(sourcesPath, JSON.stringify(sources, null, 2))
await writeFile(creditsPath, JSON.stringify(credits, null, 2))
console.log("Ghi xong places.json + .cache/image-assignments.json (dùng cho CREDITS)")
