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
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const dishDir = join(dataDir, "images/dishes")
const cacheFile = join(dataDir, ".cache/commons-images.json")
const MAX_REUSE = 6
const IMAGES_PER_QUERY = 6
const CONCURRENT_DOWNLOADS = 6

/** Query ảnh theo phân loại — mỗi phân loại nhiều query để đa dạng. */
const QUERIES_BY_CATEGORY = {
  cafe: ["vietnamese coffee shop", "iced coffee vietnam", "coffee shop interior", "cappuccino", "coffee brewing vietnam", "cafe table"],
  "quan-an": ["vietnamese restaurant food", "vietnamese street food", "com tam", "vietnamese rice dish"],
  "an-vat": ["vietnamese street snack", "banh mi", "vietnamese snack food", "spring rolls vietnam"],
  "hai-san": ["seafood grill", "grilled shrimp dish", "seafood plate", "clams dish"],
  banh: ["vietnamese cake", "banh bao", "vietnamese dessert", "banh xeo"],
  pho: ["pho bowl", "vietnamese noodle soup"],
  "mi-quang": ["mi quang", "vietnamese noodles turmeric"],
  bun: ["bun bo hue", "vermicelli bowl vietnam"],
  com: ["com ga", "chicken rice plate"],
  chay: ["vegetarian vietnamese food", "tofu dish"],
  "banh-mi": ["banh mi sandwich", "banh mi"],
  "banh-ngot": ["vietnamese dessert", "che vietnamese"],
  han: ["korean food", "korean barbecue"],
  y: ["pasta dish", "italian pizza"],
  "viet-nam": ["vietnamese food plate", "vietnamese meal"],
  khac: ["restaurant food plate", "asian food dish"],
  "banh-xeo": ["banh xeo", "vietnamese pancake"],
  "bun-cha-ca": ["bun cha ca", "fish cake noodle vietnam"],
  "banh-trang-thit-heo": ["vietnamese pork rolls", "rice paper rolls"],
  "bun-mam-nem": ["bun mam", "vietnamese fermented fish noodle"],
}

const cache = existsSync(cacheFile) ? JSON.parse(await readFile(cacheFile, "utf8")) : {}

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
      // Chỉ nhận ảnh tĩnh; bỏ SVG/PDF.
      if (!info.mime?.startsWith("image/") || info.mime === "image/svg+xml") return null
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
  poolByCategory[category] = pool
  console.log(`${category}: ${pool.length} ảnh khả dụng`)
}

// 2. Tải file ảnh về đĩa (idempotent), tải song song có giới hạn.
await mkdir(dishDir, { recursive: true })
const allUrls = [...new Set(Object.values(poolByCategory).flat().map((img) => img.url))]
const downloaded = {}
let fileSeq = 0
let done = 0
async function download(url) {
  const file = `images/dishes/dish-${String(++fileSeq).padStart(3, "0")}.jpg`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "danang-food-map/1.0 (cold-start data pipeline)" },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 5_000) throw new Error("file quá nhỏ")
    const { writeFile: wf } = await import("node:fs/promises")
    await wf(join(dataDir, file), buf)
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
/** Pool toàn cục — dùng khi phân loại không có ảnh riêng (query bị rate-limit). */
const allPool = Object.values(poolByCategory).flat()
const useCount = {}
const assignments = []
for (const p of places.places) {
  // Giữ ảnh thật của quán (venues/) và ảnh món đã đa dạng hoá (dishes/); mọi ảnh
  // cũ dùng chung theo nhóm (images/cafe.jpg, images/pho.jpg…) đều thay lại.
  if (p.image?.startsWith("images/venues/") || p.image?.startsWith("images/dishes/")) continue
  // Ưu tiên pool theo phân loại; hết (query bị rate-limit) thì dùng pool toàn cục
  // — vẫn đa dạng hơn là để cả nhóm dùng chung một file.
  const categoryPool = poolByCategory[p.category] ?? []
  const pool = categoryPool.length ? categoryPool : allPool
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
console.log("Ghi xong places.json + .cache/image-assignments.json (dùng cho CREDITS)")
