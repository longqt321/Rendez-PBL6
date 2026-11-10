#!/usr/bin/env node
/**
 * Pha C — tái sinh dataset cold-start theo tiêu chuẩn chất lượng đã chốt.
 *
 * Tiêu chuẩn (quyết định của người dùng 2026-11-09):
 * 1. Mọi địa điểm phải có địa chỉ SỐ NHÀ + TÊN ĐƯỜNG (bỏ hẳn quán chỉ có quận
 *    hoặc chỉ tên đường — "giữ lại chỉ gây loãng").
 * 2. Ưu tiên phân bố đều giữa các quận; quận nghẽn lấy thêm từ nghiên cứu.
 * 3. Loại trùng lặp (cùng tên chuẩn hoá VÀ cách nhau < 120m — cùng tên nhưng
 *    xa nhau là chi nhánh khác, giữ lại).
 *
 * Nguồn: `places.json` (giữ mục đạt chuẩn) + `research/*.json` (curated đợt 2,
 * đã geocode). Output: places.json, places.csv, stats trong README.
 *
 * Chạy: node scripts/cold-start/rebuild.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const dataDir = join(root, "data/cold-start")
const researchDir = join(dataDir, "research")

/**
 * Địa giới TP Đà Nẵng (sau sáp nhập 2025). Hộp rộng hơn sẽ nuốt cả Hội An
 * (15.88, 108.33) và Tam Kỳ — Nominatim hay khớp nhầm tên đường ở đó.
 */
const DANANG_BOUNDS = { minLat: 15.93, maxLat: 16.16, minLng: 107.9, maxLng: 108.3 }
/** Tên địa danh ngoài TP Đà Nẵng — xuất hiện trong displayName là geocode sai. */
const OUTSIDE_PLACES = ["Hội An", "Tam Kỳ", "Điện Bàn", "Duy Xuyên", "Quế Sơn"]

/**
 * Địa chỉ đạt chuẩn: phải có chữ số (số nhà) + tên đường (≥ 2 ký tự chữ), và
 * KHÔNG phải mô tả vị trí tương đối ("đối diện 16 Hoàng Sa", "Lô 02-03…",
 * "bên cạnh nhà 109") — đó không phải số nhà của quán.
 */
function hasHouseNumber(address) {
  if (!address) return false
  const relative = /^(đối diện|lô |bên cạnh|gần |khu |hẻm |kiệt |ngõ )/i.test(address.trim())
  if (relative) return false
  return /\d/.test(address) && /[a-zA-Zàáạảăâđèéẹẻêìíịỉòóọỏôơùúụủưỳýỵỷ]/i.test(address)
}

/** Chuẩn hoá tên để so trùng: bỏ dấu, lowercase, bỏ ký tự không chữ số. */
function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/** Khoảng cách Euclid thô trên toạ độ (đủ để lọc trùng < 80m). */
function distanceMeters(a, b) {
  const dLat = (a.lat - b.lat) * 111_320
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

const old = JSON.parse(await readFile(join(dataDir, "places.json"), "utf8"))

// 1. Giữ mục đạt chuẩn từ dataset cũ.
const kept = old.places.filter(
  (p) =>
    hasHouseNumber(p.address) &&
    p.lat != null &&
    p.lng != null &&
    p.lat >= DANANG_BOUNDS.minLat &&
    p.lat <= DANANG_BOUNDS.maxLat &&
    p.lng >= DANANG_BOUNDS.minLng &&
    p.lng <= DANANG_BOUNDS.maxLng,
)
console.log(`Dataset cũ: ${old.places.length} → đạt chuẩn: ${kept.length}`)

// 2. Gộp ứng viên nghiên cứu.
const files = (await readdir(researchDir)).filter((f) => f.endsWith(".json"))
const candidates = []
for (const file of files) {
  const items = JSON.parse(await readFile(join(researchDir, file), "utf8"))
  for (const item of items) candidates.push(item)
}
console.log(`Ứng viên nghiên cứu: ${candidates.length}`)

const CATEGORY_SET = new Set(["cafe", "quan-an", "an-vat", "hai-san", "banh", "khac"])
let rejectedBounds = 0
let rejectedNoGeo = 0
let rejectedDupName = 0
let rejectedDupNear = 0
let rejectedBadCategory = 0

const merged = [...kept]

for (const c of candidates) {
  if (c.geocodeMiss || c.lat == null) {
    rejectedNoGeo++
    continue
  }
  if (
    c.lat < DANANG_BOUNDS.minLat ||
    c.lat > DANANG_BOUNDS.maxLat ||
    c.lng < DANANG_BOUNDS.minLng ||
    c.lng > DANANG_BOUNDS.maxLng ||
    OUTSIDE_PLACES.some((place) => (c.displayName ?? "").includes(place))
  ) {
    rejectedBounds++
    continue
  }
  const name = normalizeName(c.name)
  // Cùng tên chỉ là trùng khi cùng vị trí (< 120m); xa nhau là chi nhánh khác.
  const sameNameNear = merged.some(
    (p) => normalizeName(p.name) === name && distanceMeters(p, c) < 120,
  )
  if (sameNameNear) {
    rejectedDupName++
    continue
  }
  if (!CATEGORY_SET.has(c.category)) {
    rejectedBadCategory++
    continue
  }
  const near = merged.some((p) => Math.abs(p.lat - c.lat) < 0.002 && distanceMeters(p, c) < 80)
  if (near) {
    rejectedDupNear++
    continue
  }
  merged.push({
    id: `${normalizeName(c.name).slice(0, 40)}-${merged.length}`,
    name: c.name.trim(),
    category: c.category,
    district: c.district,
    address: c.address.trim(),
    lat: c.lat,
    lng: c.lng,
    geoPrecision: "address",
    geoSource: "nominatim",
    phone: c.phone ?? null,
    openingHours: c.openingHours ?? null,
    description: null,
    sources: [c.sourceUrl],
    image: null,
    imageKind: null,
    verified: false,
    collectedAt: new Date().toISOString().slice(0, 10),
    tier: "curated-v2",
    status: "unknown",
  })
}

console.log(
  `Gộp: +${merged.length - kept.length} mới | loại: ngoài Đà Nẵng ${rejectedBounds}, ` +
    `không toạ độ ${rejectedNoGeo}, trùng tên ${rejectedDupName}, trùng vị trí ${rejectedDupNear}, ` +
    `category lạ ${rejectedBadCategory}`,
)

// 2b. Loại trùng giữa chính các mục giữ lại (OSM có khi map cùng quán 2 node:
// cùng tên chuẩn hoá VÀ cách nhau < 120m).
let rejectedSamePlace = 0
const deduped = []
for (const p of merged) {
  const dup = deduped.some(
    (q) => normalizeName(q.name) === normalizeName(p.name) && distanceMeters(q, p) < 120,
  )
  if (dup) {
    rejectedSamePlace++
    continue
  }
  deduped.push(p)
}
const finalPlaces = deduped
console.log(`Khử trùng trong nội bộ: -${rejectedSamePlace} mục`)

// 3. Thống kê theo quận.
const byDistrict = {}
for (const p of finalPlaces) byDistrict[p.district] = (byDistrict[p.district] ?? 0) + 1
console.log("Theo quận:", JSON.stringify(byDistrict, null, 1))

// 4. Ghi output.
const output = {
  ...old,
  meta: {
    ...old.meta,
    count: finalPlaces.length,
    curatedCount: finalPlaces.filter((p) => p.tier === "curated").length,
    curatedV2Count: finalPlaces.filter((p) => p.tier === "curated-v2").length,
    osmCount: finalPlaces.filter((p) => p.tier === "osm").length,
    note: `${old.meta.note} — tái sinh 2026-11-09: chỉ giữ địa điểm có địa chỉ số nhà + đường (quyết định D-046).`,
  },
  stats: { ...old.stats, byDistrict },
  places: finalPlaces,
}
await writeFile(join(dataDir, "places.json"), JSON.stringify(output, null, 2))

// CSV phẳng để review.
const csvHeader = "id,name,category,district,address,lat,lng,tier,image\n"
const csvBody = finalPlaces
  .map((p) =>
    [p.id, p.name, p.category, p.district, p.address, p.lat, p.lng, p.tier, p.image ?? ""]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  )
  .join("\n")
await writeFile(join(dataDir, "places.csv"), csvHeader + csvBody)
console.log(`\nĐã ghi places.json (${finalPlaces.length} địa điểm) + places.csv`)
