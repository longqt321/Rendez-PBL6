#!/usr/bin/env node
/**
 * Pha A — làm giàu địa chỉ từ OSM API v0.6.
 *
 * Truy lại từng `osmId` trong `data/cold-start/places.json`, lấy tag `addr:*`,
 * `opening_hours`, `phone`, `website` và ghi đè các trường tương ứng khi chỗ cũ
 * còn trống. Overpass API bị chặn/quá tải nên dùng OSM API trực tiếp (batch
 * `/nodes?nodes=...`, tối đa 200 id/request — đúng cách dùng được OSM khuyến nghị).
 *
 * Chỉ ĐỌC từ OSM; kết quả cache vào `data/cold-start/.cache/osm-tags.json` để
 * chạy lại không phải gọi mạng. Ghi output ra `places.json` (backup `.bak`).
 *
 * Chạy: node scripts/cold-start/enrich-osm.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const cacheFile = join(dataDir, ".cache/osm-tags.json")
const BATCH = 200
const USER_AGENT = "danang-food-map/1.0 (cold-start data pipeline)"

/** Gọi OSM API và trả JSON; lỗi mạng ném ra để caller đếm + retry. */
async function fetchOsm(path) {
  const res = await fetch(`https://api.openstreetmap.org/api/0.6${path}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  })
  if (res.status === 404) return { elements: [] }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`)
  return res.json()
}

/** Tách osmId hợp lệ ("node/123", "way/456"); trả null nếu sai định dạng. */
function parseOsmId(raw) {
  if (typeof raw !== "string") return null
  const m = raw.match(/^(node|way)\/(\d+)$/)
  return m ? { type: m[1], id: Number(m[2]) } : null
}

/** Ghép địa chỉ từ tag addr:* — "số nhà đường, phường/xã". */
function buildAddress(tags) {
  const parts = []
  const house = tags["addr:housenumber"]
  const street = tags["addr:street"]
  if (house && street) parts.push(`${house} ${street}`)
  else if (street) parts.push(street)
  else if (house) parts.push(house)
  const suburb = tags["addr:suburb"] ?? tags["addr:place"]
  if (suburb) parts.push(suburb)
  return parts.length > 0 ? parts.join(", ") : null
}

/** Chọn giá trị đầu tiên có mặt trong các tag. */
function pick(tags, keys) {
  for (const key of keys) {
    const value = tags[key]
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
  }
  return null
}

const places = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))
const targets = places.places.filter((p) => parseOsmId(p.osmId))
console.log(`Địa điểm có osmId hợp lệ: ${targets.length}/${places.places.length}`)

// Cache: nếu có, dùng kết quả cũ; chỉ fetch id chưa có trong cache.
const cache = existsSync(cacheFile) ? JSON.parse(await readFile(cacheFile, "utf8")) : {}
const missing = targets.filter((p) => !(p.osmId in cache))
console.log(`Cần gọi mạng: ${missing.length} (cache đã có ${targets.length - missing.length})`)

const nodes = missing.filter((p) => parseOsmId(p.osmId).type === "node")
const ways = missing.filter((p) => parseOsmId(p.osmId).type === "way")
let failed = 0

for (const [type, group] of [
  ["nodes", nodes],
  ["ways", ways],
]) {
  for (let i = 0; i < group.length; i += BATCH) {
    const chunk = group.slice(i, i + BATCH)
    const ids = chunk.map((p) => parseOsmId(p.osmId).id)
    try {
      const json = await fetchOsm(`/${type}.json?${type}=${ids.join(",")}`)
      const byId = new Map(json.elements.map((el) => [el.id, el.tags ?? {}]))
      for (const p of chunk) cache[p.osmId] = byId.get(parseOsmId(p.osmId).id) ?? null
    } catch (error) {
      failed += chunk.length
      console.error(`  Lỗi batch ${type} #${i / BATCH}: ${error.message} — sẽ thử lại lần sau`)
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

await mkdir(dirname(cacheFile), { recursive: true })
await writeFile(cacheFile, JSON.stringify(cache, null, 2))

// Ghi đè các trường còn trống.
let filledAddress = 0
let filledPhone = 0
let filledHours = 0
for (const p of targets) {
  const tags = cache[p.osmId]
  if (!tags) continue
  const address = buildAddress(tags)
  if (!p.address && address) {
    p.address = address
    filledAddress++
  }
  const phone = pick(tags, ["phone", "contact:phone"])
  if (!p.phone && phone) {
    p.phone = phone
    filledPhone++
  }
  const hours = pick(tags, ["opening_hours"])
  if (!p.openingHours && hours) {
    p.openingHours = hours
    filledHours++
  }
}

console.log(`\nKết quả: +${filledAddress} địa chỉ, +${filledPhone} SĐT, +${filledHours} giờ mở cửa`)
if (failed > 0) console.warn(`⚠️ ${failed} id lỗi mạng — chạy lại script để lấy nốt (dùng cache)`)

// Backup + ghi file chính.
const out = join(dataDir, "places.json")
if (!existsSync(`${out}.bak`)) {
  await writeFile(`${out}.bak`, JSON.stringify(places, null, 2))
}
await writeFile(out, JSON.stringify(places, null, 2))
console.log(`Đã ghi ${out} (backup ${out}.bak)`)
