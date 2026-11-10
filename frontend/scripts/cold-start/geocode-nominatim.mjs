#!/usr/bin/env node
/**
 * Pha B — geocode ứng viên từ nghiên cứu tinyfish bằng Nominatim.
 *
 * Đọc các file JSON trong `data/cold-start/research/`, truy Nominatim
 * (`<địa chỉ>, Đà Nẵng`) để lấy toạ độ; chỉ giữ kết quả nằm trong địa giới
 * TP Đà Nẵng (bounding box kiểm tra ở rebuild). Nominatim yêu cầu tối đa
 * 1 request/giây — script tự giữ nhịp và cache kết quả.
 *
 * Chạy: node scripts/cold-start/geocode-nominatim.mjs
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const researchDir = join(root, "data/cold-start/research")
const cacheFile = join(root, "data/cold-start/.cache/nominatim.json")
const USER_AGENT = "danang-food-map/1.0 (cold-start data pipeline)"

const cache = existsSync(cacheFile) ? JSON.parse(await readFile(cacheFile, "utf8")) : {}

/** Geocode 1 địa chỉ; trả {lat, lng, displayName, precision} hoặc null. */
async function geocode(address, name) {
  if (address in cache) return cache[address]
  // Thử lần lượt: địa chỉ đầy đủ → "số nhà + đường" (bỏ phường/quận) → chỉ tên
  // đường → tên quán (POI có thể có trong OSM dù địa chỉ viết khác).
  const parts = address.split(",").map((p) => p.trim())
  const variants = [
    { query: address, precision: "address" },
    { query: parts.slice(0, 2).join(", "), precision: "address" },
    { query: parts[0], precision: "street" },
    ...(name ? [{ query: name, precision: "venue" }] : []),
  ]
  for (const variant of variants) {
    const hit = await queryNominatim(variant.query)
    if (hit) {
      const result = {
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        displayName: hit.display_name,
        precision: variant.precision,
      }
      cache[address] = result
      return result
    }
  }
  cache[address] = null
  return null
}

/** Một lần gọi Nominatim cho 1 chuỗi địa chỉ. */
async function queryNominatim(address) {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", `${address}, Đà Nẵng`)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "1")
  url.searchParams.set("countrycodes", "vn")
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const [hit] = await res.json()
  await new Promise((resolve) => setTimeout(resolve, 1100)) // 1 req/s của Nominatim
  return hit ?? null
}

const files = (await readdir(researchDir)).filter((f) => f.endsWith(".json"))
let ok = 0
let miss = 0
for (const file of files) {
  const items = JSON.parse(await readFile(join(researchDir, file), "utf8"))
  for (const item of items) {
    if (item.lat != null) continue
    try {
      const hit = await geocode(item.address, item.name)
      if (hit) {
        item.lat = hit.lat
        item.lng = hit.lng
        item.geoSource = "nominatim"
        item.geoPrecision = hit.precision ?? "address"
        item.displayName = hit.displayName
        ok++
      } else {
        item.geocodeMiss = true
        miss++
      }
    } catch (error) {
      console.error(`  Lỗi geocode "${item.address}": ${error.message}`)
      miss++
    }
  }
  await writeFile(join(researchDir, file), JSON.stringify(items, null, 2))
  console.log(`${file}: ${items.filter((i) => i.lat != null).length}/${items.length} có toạ độ`)
}

await mkdir(dirname(cacheFile), { recursive: true })
await writeFile(cacheFile, JSON.stringify(cache, null, 2))
console.log(
  `\nGeocode xong: ${ok} thành công, ${miss} không tìm thấy (chạy lại chỉ xử lý phần còn thiếu)`,
)
